"""Phase 3: signed fixture grant checks and fail-closed sandbox boundaries.

Test-only signing keys live in a disposable temporary directory, never Git.
These are NOT actual human identities or real authorization to execute code.
"""
import base64
import copy
from datetime import datetime, timedelta, timezone
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
from unittest.mock import patch

from scripts import visura_auto_dev_phase3_security as m
from scripts.visura_auto_dev_configurable import example_task, run_configurable_task


@unittest.skipUnless(shutil.which('openssl'), 'OpenSSL CLI required for signed-fixture test')
class SignedGrantTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls._temp = tempfile.TemporaryDirectory(prefix='visura-test-signing-')
        d = Path(cls._temp.name)
        cls.private = d / 'test-key.pem'
        pub = d / 'test-public.pem'
        subprocess.run(['openssl', 'genpkey', '-algorithm', 'ED25519', '-out', str(cls.private)],
                       check=True, capture_output=True, timeout=5)
        subprocess.run(['openssl', 'pkey', '-in', str(cls.private), '-pubout', '-out', str(pub)],
                       check=True, capture_output=True, timeout=5)
        cls.public_pem = pub.read_text(encoding='ascii')

    @classmethod
    def tearDownClass(cls):
        cls._temp.cleanup()

    def setUp(self):
        self.now = datetime(2026, 10, 28, 9, 0, 0, tzinfo=timezone.utc)
        self.manifest = example_task('VISURA-PHASE3-01', 'string_pipeline', {'steps': ['strip', 'lower']})
        self.head = 'a'*40
        self.trust = m.ExternalTrustSnapshot(key_id='trust-fixture-01',
            public_key_pem=self.public_pem, authorized_identity='test-human-fixture',
            expected_repository='sandbox/example', expected_head_sha=self.head,
            revoked_nonces=frozenset(), observed_at=self.now,
            observed_head_at=self.now)
        self.claims = {'schema':'visura-grant-v1','key_id':'trust-fixture-01',
            'identity':'test-human-fixture','task_id':self.manifest['task']['task_id'],
            'task_digest':m.task_digest(self.manifest),'repository':'sandbox/example',
            'head_sha':self.head, 'paths':self.manifest['allowed_paths'],
            'actions':self.manifest['allowed_actions'],
            'checks':self.manifest['required_checks'],
            'max_attempts':self.manifest['max_attempts'],
            'timeout_seconds':self.manifest['timeout_seconds'],
            'issued_at':'2026-10-28T08:59:30Z',
            'expires_at':'2026-10-28T09:05:00Z',
            'nonce':'synthetic-nonce-0123456789-abcdef'}

    def sign(self, claims):
        with tempfile.TemporaryDirectory(prefix='visura-sign-once-') as td:
            data = Path(td) / 'payload.json'
            signature = Path(td) / 'sig.bin'
            data.write_bytes(m.canonical_json(claims))
            subprocess.run(['openssl', 'pkeyutl', '-sign', '-inkey', str(self.private),
                            '-rawin', '-in', str(data), '-out', str(signature)],
                           check=True, capture_output=True, timeout=5)
            return {'claims': copy.deepcopy(claims),
                    'signature_b64':base64.b64encode(signature.read_bytes()).decode('ascii')}

    def verify(self, claims=None, **kwargs):
        return m.verify_signed_grant(self.sign(claims or self.claims),
            kwargs.get('manifest',self.manifest), kwargs.get('trust',self.trust),
            kwargs.get('now',self.now))

    def test_real_ed25519_fixture_signature_and_exact_binding(self):
        decision = self.verify()
        self.assertTrue(decision['signature_verified'])
        self.assertTrue(decision['exact_scope_verified'])
        self.assertTrue(decision['fresh_observations'])
        self.assertFalse(decision['human_identity_verified'])
        self.assertFalse(decision['execution_authorized'])
        self.assertFalse(decision['github_write_authorized'])

    def test_signature_payload_tampered_after_signing(self):
        envelope = self.sign(self.claims)
        envelope['claims']['paths'] = ['src/evil.py']
        r = m.verify_signed_grant(envelope,self.manifest,self.trust,self.now)
        self.assertFalse(r['signature_verified'])

    def test_fake_signer_key_rejected(self):
        with tempfile.TemporaryDirectory() as td:
            fake = Path(td)/'fake.pem'
            pub = Path(td)/'pub.pem'
            subprocess.run(['openssl','genpkey','-algorithm','ED25519','-out',str(fake)],check=True,capture_output=True)
            subprocess.run(['openssl','pkey','-in',str(fake),'-pubout','-out',str(pub)],check=True,capture_output=True)
            fraud_trust = m.ExternalTrustSnapshot(**dict(self.trust.__dict__, public_key_pem=pub.read_text()))
            self.assertFalse(self.verify(trust=fraud_trust)['signature_verified'])

    def test_expired_grant(self):
        future = self.now + timedelta(minutes=8)
        trust = m.ExternalTrustSnapshot(**dict(self.trust.__dict__, observed_at=future, observed_head_at=future))
        self.assertIn('Expired', self.verify(now=future, trust=trust)['reason'])

    def test_future_issued_grant(self):
        c = copy.deepcopy(self.claims)
        c['issued_at'] = '2026-10-28T09:03:00Z'
        c['expires_at'] = '2026-10-28T09:06:00Z'
        self.assertIn('premature', self.verify(c)['reason'])

    def test_revoked_nonce(self):
        trust = m.ExternalTrustSnapshot(**dict(self.trust.__dict__, revoked_nonces=frozenset({self.claims['nonce']})))
        self.assertIn('Revoked',self.verify(trust=trust)['reason'])

    def test_wrong_head(self):
        c=copy.deepcopy(self.claims);c['head_sha']='b'*40
        self.assertFalse(self.verify(c)['exact_scope_verified'])

    def test_wrong_repository(self):
        c=copy.deepcopy(self.claims);c['repository']='sandbox/wrong'
        self.assertFalse(self.verify(c)['exact_scope_verified'])

    def test_wrong_task_digest(self):
        c=copy.deepcopy(self.claims);c['task_digest']='f'*64
        self.assertFalse(self.verify(c)['exact_scope_verified'])

    def test_wrong_identity(self):
        c=copy.deepcopy(self.claims);c['identity']='test-other-person'
        self.assertFalse(self.verify(c)['exact_scope_verified'])

    def test_wrong_key_id(self):
        c=copy.deepcopy(self.claims);c['key_id']='unauthorized-key'
        self.assertFalse(self.verify(c)['exact_scope_verified'])

    def test_wrong_allowed_path(self):
        c=copy.deepcopy(self.claims);c['paths']=['src/other.py']
        self.assertFalse(self.verify(c)['exact_scope_verified'])

    def test_wrong_operations(self):
        c=copy.deepcopy(self.claims);c['actions']=['execute_anything']
        self.assertFalse(self.verify(c)['exact_scope_verified'])

    def test_wrong_checks(self):
        c=copy.deepcopy(self.claims);c['checks']=['skip_tests']
        self.assertFalse(self.verify(c)['exact_scope_verified'])

    def test_limits_changed(self):
        c=copy.deepcopy(self.claims);c['timeout_seconds']=8
        self.assertFalse(self.verify(c)['exact_scope_verified'])

    def test_task_manipulated_after_signing(self):
        task=copy.deepcopy(self.manifest);task['parameters']['steps']=['upper']
        self.assertFalse(self.verify(manifest=task)['exact_scope_verified'])

    def test_stale_head_observation(self):
        trust=m.ExternalTrustSnapshot(**dict(self.trust.__dict__,observed_head_at=self.now-timedelta(seconds=31)))
        self.assertIn('Stale', self.verify(trust=trust)['reason'])

    def test_stale_revocation_observation(self):
        trust=m.ExternalTrustSnapshot(**dict(self.trust.__dict__,observed_at=self.now-timedelta(seconds=31)))
        self.assertIn('Stale', self.verify(trust=trust)['reason'])

    def test_invalid_lifetime(self):
        c=copy.deepcopy(self.claims);c['expires_at']='2026-10-28T10:00:00Z'
        self.assertIn('lifetime',self.verify(c)['reason'])

    def test_invalid_date_format(self):
        c=copy.deepcopy(self.claims);c['expires_at']='2026-10-28 09:05:00'
        self.assertIn('Timestamp',self.verify(c)['reason'])

    def test_unknown_grant_field(self):
        c=copy.deepcopy(self.claims);c['shell']='whoami'
        self.assertIn('fields',self.verify(c)['reason'])

    def test_unknown_envelope_field(self):
        e=self.sign(self.claims);e['grant_approved']=True
        r=m.verify_signed_grant(e,self.manifest,self.trust,self.now)
        self.assertFalse(r['signature_verified'])

    def test_malformed_base64_fails(self):
        e=self.sign(self.claims);e['signature_b64']='!!!'
        r=m.verify_signed_grant(e,self.manifest,self.trust,self.now)
        self.assertFalse(r['signature_verified'])

    def test_missing_verifier_fails_closed(self):
        with patch.object(m, 'shutil') as sh:
            sh.which.return_value=None
            self.assertFalse(self.verify()['signature_verified'])

    def test_manifest_cannot_inject_approval(self):
        task=copy.deepcopy(self.manifest);task['approval']='yes'
        r=self.verify(manifest=task)
        self.assertFalse(r['signature_verified'])

    def test_rejects_self_provided_trust_dict(self):
        self.assertIn('Trusted snapshot',self.verify(trust={'public_key_pem':self.public_pem})['reason'])


class IsolationBoundaryTests(unittest.TestCase):
    def test_all_required_controls_are_explicit(self):
        result=m.isolation_requirements()
        self.assertGreaterEqual(len(result['required_controls']), 12)
        self.assertTrue(all(result['required_controls'].values()))
        self.assertFalse(result['untrusted_code_allowed'])
        self.assertFalse(result['exec_commands_available'])

    def test_no_launcher_means_no_execution(self):
        self.assertFalse(m.assess_isolation()['untrusted_code_execution_authorized'])

    def test_fake_full_attestation_still_blocked(self):
        fake={k:True for k in m.REQUIRED_BOUNDARY}
        result=m.assess_isolation(fake)
        self.assertFalse(result['trustworthy_runtime_attestation'])
        self.assertFalse(result['untrusted_code_execution_authorized'])
        self.assertTrue(all(not v['independently_attested'] for v in result['boundary'].values()))

    def test_incomplete_controls_are_reported(self):
        result=m.assess_isolation({'network_namespace_disabled':False})
        self.assertFalse(result['boundary']['network_namespace_disabled']['observed'])
        self.assertFalse(result['untrusted_code_execution_authorized'])

    def test_inventory_is_observational(self):
        x=m.host_capability_inventory()
        self.assertFalse(x['untrusted_code_execution_authorized'])
        self.assertFalse(x['runtime_attestation_verified'])

    def test_phase2_string_pilot_preserved(self):
        result=run_configurable_task(example_task('VISURA-STR-03','string_pipeline',{'steps':['strip','upper']}))
        self.assertEqual(result['status'],'passed')
        self.assertFalse(result['human_authorization_verified'])

    def test_phase2_integer_pilot_preserved(self):
        result=run_configurable_task(example_task('VISURA-NUM-03','integer_offset',{'offset':8}))
        self.assertEqual(result['status'],'passed')
        self.assertFalse(result['untrusted_code_execution_authorized'])


if __name__ == '__main__':
    unittest.main()
