"""Build a reproducible local task/diff review packet, never an authorization.

Task JSON is data; declared checks are never interpreted as commands.
"""
import argparse
import hashlib
import json
import sys

from scripts.visura_task_spec import validate_task
from scripts.visura_task_preview import preview_task
from scripts.visura_local_diff_audit import audit_local_diff

MAX_TASK_CHARS = 16384


def _unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError('Duplicate task JSON key')
        result[key] = value
    return result


def read_task(stream):
    text = stream.read(MAX_TASK_CHARS + 1)
    if len(text) > MAX_TASK_CHARS:
        raise ValueError('Task JSON exceeds size limit')
    return json.loads(text, object_pairs_hook=_unique_object)


def build_task_review_packet(task, repository_path, base_sha, head_sha):
    validated = validate_task(task)
    preview = preview_task(task)
    # Inspect commits only after task validation. No task text reaches Git argv.
    diff = audit_local_diff(repository_path, base_sha, head_sha)
    canonical = json.dumps(validated, sort_keys=True, ensure_ascii=True,
                           separators=(',', ':'), allow_nan=False)
    task_digest = hashlib.sha256(canonical.encode()).hexdigest()
    packet_digest = hashlib.sha256((task_digest + ':' + base_sha + ':' + head_sha).encode()).hexdigest()
    return {
        'schema_version': 1, 'mode': 'local_review_only',
        'task_id': validated['task_id'], 'task_spec_sha256': task_digest,
        'packet_sha256': packet_digest,
        'task': validated, 'plan': preview, 'diff_audit': diff,
        'checks': [{'description': value, 'status': 'not_executed'} for value in validated['checks']],
        'blockers': sorted(set(diff['blockers'] + [
            'task_approval_not_authenticated', 'task_implementation_not_verified',
            'declared_checks_not_executed', 'content_and_secrets_not_reviewed',
            'github_policies_not_verified', 'execution_isolation_not_available',
        ])),
        'execution_authorized': False, 'merge_authorized': False,
        'deployment_authorized': False, 'provider_calls': 0,
        'signature_verified': False,
        'warning': 'Digests identify inputs, not signatures or approval. Commit scope does not prove task completion.',
    }


def main(argv=None):
    parser = argparse.ArgumentParser(description='Build local review packet from task JSON on stdin')
    parser.add_argument('repository_path')
    parser.add_argument('base_sha')
    parser.add_argument('head_sha')
    args = parser.parse_args(argv)
    packet = build_task_review_packet(read_task(sys.stdin), args.repository_path,
                                      args.base_sha, args.head_sha)
    print(json.dumps(packet, indent=2, sort_keys=True, ensure_ascii=True))
    # Exit 0 means the report was generated, not that execution is permitted.
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
