"""Phase 3: fail-closed boundary specifications and off-agent signed grant verification.

No code, tests, containers, network connections or GitHub operations are executed.
A signature verification does NOT imply a human approved anything: signer identity,
trust distribution and revocation freshness require an external trusted service.
"""
import base64
import binascii
from dataclasses import dataclass
from datetime import datetime, timezone, timedelta
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile

from scripts.visura_auto_dev_configurable import validate_configurable_task

_ALLOWED_KEYS = frozenset({'schema', 'key_id', 'identity', 'task_id', 'task_digest',
    'repository', 'head_sha', 'paths', 'actions', 'checks', 'max_attempts',
    'timeout_seconds', 'issued_at', 'expires_at', 'nonce'})
_SIGNED_ENVELOPE_KEYS = frozenset({'claims', 'signature_b64'})
_HEX40 = re.compile(r'[0-9a-f]{40}\Z')
_HEX64 = re.compile(r'[0-9a-f]{64}\Z')
_IDENT = re.compile(r'[A-Za-z0-9][A-Za-z0-9_.:@-]{2,79}\Z')
_NONCE = re.compile(r'[A-Za-z0-9_-]{24,100}\Z')
_REPOSITORY = re.compile(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+\Z')
_UTC_TIME = re.compile(r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z\Z')
_MAX_GRANT_BYTES = 8192
_MAX_TTL = timedelta(minutes=15)
_MAX_FRESHNESS = timedelta(seconds=30)

# These requirements are NOT a runnable container definition or evidence that
# any of them are enforced. Only an out-of-process trusted launcher may attest.
REQUIRED_BOUNDARY = {
    'rootless_or_unprivileged_user': True,
    'isolated_user_namespace': True,
    'network_namespace_disabled': True,
    'read_only_root_filesystem': True,
    'separate_disposable_workspace': True,
    'no_host_home_mount': True,
    'no_credentials_mounted': True,
    'resource_cgroup_limits': True,
    'max_processes_enforced': True,
    'timeout_and_process_tree_kill': True,
    'no_new_privileges': True,
    'symlink_and_path_escape_blocked': True,
    'cleanup_confirmed': True,
}


def canonical_json(value):
    """Canonicalize only JSON-compatible values, rejecting NaN and duplicates at ingestion."""
    return json.dumps(value, sort_keys=True, separators=(',', ':'),
                      ensure_ascii=True, allow_nan=False).encode('ascii')


def task_digest(manifest):
    validate_configurable_task(manifest)
    return hashlib.sha256(canonical_json(manifest)).hexdigest()


def utc_timestamp(value):
    if type(value) is not str or not _UTC_TIME.fullmatch(value):
        raise ValueError('Timestamp must be UTC seconds with Z suffix')
    try:
        return datetime.strptime(value, '%Y-%m-%dT%H:%M:%SZ').replace(tzinfo=timezone.utc)
    except ValueError as exc:
        raise ValueError('Invalid calendar timestamp') from exc


def _field_str(value, regex, label):
    if type(value) is not str or not regex.fullmatch(value):
        raise ValueError('Invalid ' + label)
    return value


def _exact_dict(obj, keys, label):
    if type(obj) is not dict or set(obj) != keys:
        raise ValueError('Missing or unknown ' + label + ' fields')


def _valid_claims(claims):
    _exact_dict(claims, _ALLOWED_KEYS, 'grant')
    if claims['schema'] != 'visura-grant-v1':
        raise ValueError('Unknown grant schema')
    for field in ('identity', 'key_id'):
        _field_str(claims[field], _IDENT, field)
    _field_str(claims['task_id'], _IDENT, 'task_id')
    _field_str(claims['task_digest'], _HEX64, 'task_digest')
    _field_str(claims['repository'], _REPOSITORY, 'repository')
    _field_str(claims['head_sha'], _HEX40, 'head_sha')
    _field_str(claims['nonce'], _NONCE, 'nonce')
    for field in ('paths', 'actions', 'checks'):
        value = claims[field]
        if (type(value) is not list or not value or len(value) > 10
                or any(type(s) is not str or not s or len(s) > 120 for s in value)
                or len(set(value)) != len(value)):
            raise ValueError('Invalid grant ' + field)
    if type(claims['max_attempts']) is not int or not 1 <= claims['max_attempts'] <= 2:
        raise ValueError('Invalid max_attempts')
    if type(claims['timeout_seconds']) is not int or not 1 <= claims['timeout_seconds'] <= 8:
        raise ValueError('Invalid timeout_seconds')
    start, end = utc_timestamp(claims['issued_at']), utc_timestamp(claims['expires_at'])
    if not timedelta(0) < end - start <= _MAX_TTL:
        raise ValueError('Invalid grant lifetime')
    return start, end


@dataclass(frozen=True)
class ExternalTrustSnapshot:
    """Supplied only by a separate trusted supervisor, never by task data.

    The verifier has no signing key. A caller controlled by the agent cannot
    turn this class into a secure trust anchor. Deployment must protect inputs.
    """
    key_id: str
    public_key_pem: str
    authorized_identity: str
    expected_repository: str
    expected_head_sha: str
    revoked_nonces: frozenset
    observed_at: datetime
    observed_head_at: datetime


def _verify_ed25519_with_openssl(public_pem, payload, signature):
    """Use public-key verification only. No sign operation or private key in runtime."""
    if not isinstance(public_pem, str) or 'BEGIN PUBLIC KEY' not in public_pem or 'PRIVATE KEY' in public_pem or len(public_pem) > 2048:
        return False
    if shutil.which('openssl') is None:
        return False
    with tempfile.TemporaryDirectory(prefix='visura-verify-') as directory:
        d = Path(directory)
        (d / 'key.pem').write_text(public_pem, encoding='ascii')
        (d / 'claims.json').write_bytes(payload)
        (d / 'signature.bin').write_bytes(signature)
        try:
            p = subprocess.run(['openssl', 'pkeyutl', '-verify', '-pubin',
                '-inkey', str(d/'key.pem'), '-rawin', '-in', str(d/'claims.json'),
                '-sigfile', str(d/'signature.bin')], shell=False, capture_output=True,
                timeout=3, env={'PATH':os.defpath, 'LANG':'C'}, check=False)
        except (OSError, subprocess.TimeoutExpired):
            return False
        return p.returncode == 0


def verify_signed_grant(envelope, manifest, trust, now):
    """Observe grant validity, never permit execution or remote writes.

    This is a *cryptographic signature and exact-binding* verifier. It does
    not prove that authorized_identity is a real human or that a GitHub policy
    is satisfied; those facts must come from the external control plane.
    """
    base = {'signature_verified': False, 'exact_scope_verified': False,
            'fresh_observations': False, 'human_identity_verified': False,
            'execution_authorized': False, 'untrusted_execution_authorized': False,
            'github_write_authorized': False, 'merge_authorized': False}
    try:
        validated = validate_configurable_task(manifest)
        _exact_dict(envelope, _SIGNED_ENVELOPE_KEYS, 'signed envelope')
        claims = envelope['claims']
        start, end = _valid_claims(claims)
        blob = canonical_json(claims)
        if len(blob) > _MAX_GRANT_BYTES:
            raise ValueError('Grant too large')
        if type(envelope['signature_b64']) is not str or len(envelope['signature_b64']) > 128:
            raise ValueError('Malformed signature')
        signature = base64.b64decode(envelope['signature_b64'], validate=True)
        if len(signature) != 64:
            raise ValueError('Incorrect signature length')
        if not isinstance(trust, ExternalTrustSnapshot):
            raise ValueError('Trusted snapshot required')
        if not isinstance(now, datetime) or now.tzinfo is None:
            raise ValueError('Timezone-aware current time required')
        now = now.astimezone(timezone.utc)
        for moment in (trust.observed_at, trust.observed_head_at):
            if not isinstance(moment, datetime) or moment.tzinfo is None or not timedelta(0) <= now - moment.astimezone(timezone.utc) <= _MAX_FRESHNESS:
                raise ValueError('Stale or invalid trusted snapshot')
        base['fresh_observations'] = True
        if not start - timedelta(seconds=30) <= now < end:
            raise ValueError('Expired or premature grant')
        if claims['nonce'] in trust.revoked_nonces:
            raise ValueError('Revoked grant')
        if not _verify_ed25519_with_openssl(trust.public_key_pem, blob, signature):
            raise ValueError('Cryptographic signature invalid')
        base['signature_verified'] = True
        expected = {'key_id': trust.key_id, 'identity': trust.authorized_identity,
                    'repository': trust.expected_repository, 'head_sha':trust.expected_head_sha,
                    'task_id':validated['task_id'], 'task_digest':task_digest(manifest),
                    'paths':manifest['allowed_paths'], 'actions':manifest['allowed_actions'],
                    'checks':manifest['required_checks'],
                    'max_attempts':manifest['max_attempts'],
                    'timeout_seconds':manifest['timeout_seconds']}
        if any(claims[field] != value for field, value in expected.items()):
            raise ValueError('Scope or identity mismatch')
        base['exact_scope_verified'] = True
        return dict(base, reason='signature_and_scope_valid_but_execution_blocked')
    except (ValueError, TypeError, KeyError, UnicodeError, binascii.Error, OverflowError) as exc:
        return dict(base, reason='rejected:' + str(exc)[:140])


def isolation_requirements():
    return {'policy_version':'phase3-fail-closed-v1',
            'required_controls': dict(REQUIRED_BOUNDARY),
            'mode':'specification_only', 'untrusted_code_allowed':False,
            'exec_commands_available':False, 'remote_repository_writes_allowed':False}


def assess_isolation(observations=None):
    """No self-reported host flags or mock attestations can authorize execution."""
    observations = observations if type(observations) is dict else {}
    report = {key: {'required':True, 'observed':observations.get(key) is True,
                    'independently_attested':False} for key in REQUIRED_BOUNDARY}
    return {'boundary':report, 'launcher_implemented':False,
            'trustworthy_runtime_attestation':False,
            'untrusted_code_execution_authorized':False,
            'reason':'No isolated trusted launcher / signed runtime attestation'}


def host_capability_inventory():
    """Read-only capability inventory, not an isolation proof or launcher."""
    return {'os_name':os.name,
            'unprivileged_process':(hasattr(os,'geteuid') and os.geteuid() != 0),
            'podman_cli_present':shutil.which('podman') is not None,
            'bubblewrap_cli_present':shutil.which('bwrap') is not None,
            'cgroup_v2_control_file_present':Path('/sys/fs/cgroup/cgroup.controllers').exists(),
            'untrusted_code_execution_authorized':False,
            'runtime_attestation_verified':False}
