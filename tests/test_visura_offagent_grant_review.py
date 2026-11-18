"""Integration tests: signed grant -> one-time ledger -> still denied."""
import base64
from datetime import datetime, timezone
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

from scripts.visura_auto_dev_configurable import example_task
from scripts.visura_auto_dev_phase3_security import (
    ExternalTrustSnapshot, canonical_json, task_digest,
)
from scripts.visura_offagent_grant_review import review_signed_grant_once


@unittest.skipUnless(shutil.which("openssl"), "OpenSSL signing fixture unavailable")
class OffAgentGrantReviewTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        root = Path(self.tmp.name)
        self.ledger = root / "trusted-supervisor.sqlite"
        self.key = root / "private.pem"
        public = root / "public.pem"
        subprocess.run(["openssl", "genpkey", "-algorithm", "ED25519",
                        "-out", str(self.key)], check=True, capture_output=True)
        subprocess.run(["openssl", "pkey", "-in", str(self.key),
                        "-pubout", "-out", str(public)],
                       check=True, capture_output=True)
        self.now = datetime(2026, 10, 28, 9, 0, tzinfo=timezone.utc)
        self.task = example_task(
            "VISURA-SUPERVISOR-01", "string_pipeline", {"steps": ["strip", "lower"]}
        )
        self.head = "f" * 40
        self.trust = ExternalTrustSnapshot(
            key_id="trust-test-fixture-01",
            public_key_pem=public.read_text(encoding="ascii"),
            authorized_identity="fixture-approver-01",
            expected_repository="sandbox/example",
            expected_head_sha=self.head,
            revoked_nonces=frozenset(),
            observed_at=self.now,
            observed_head_at=self.now,
        )
        self.claims = {
            "schema": "visura-grant-v1",
            "key_id": self.trust.key_id,
            "identity": self.trust.authorized_identity,
            "task_id": self.task["task"]["task_id"],
            "task_digest": task_digest(self.task),
            "repository": self.trust.expected_repository,
            "head_sha": self.head,
            "paths": self.task["allowed_paths"],
            "actions": self.task["allowed_actions"],
            "checks": self.task["required_checks"],
            "max_attempts": self.task["max_attempts"],
            "timeout_seconds": self.task["timeout_seconds"],
            "issued_at": "2026-10-28T08:59:30Z",
            "expires_at": "2026-10-28T09:05:00Z",
            "nonce": "trusted-test-nonce-0123456789-abcdef",
        }

    def signed_envelope(self):
        with tempfile.TemporaryDirectory() as directory:
            payload = Path(directory) / "claims.json"
            signature = Path(directory) / "signature.bin"
            payload.write_bytes(canonical_json(self.claims))
            subprocess.run(
                ["openssl", "pkeyutl", "-sign", "-inkey", str(self.key),
                 "-rawin", "-in", str(payload), "-out", str(signature)],
                check=True, capture_output=True,
            )
            return {
                "claims": dict(self.claims),
                "signature_b64": base64.b64encode(signature.read_bytes()).decode("ascii"),
            }

    def review(self, envelope, **kwargs):
        return review_signed_grant_once(
            envelope, self.task, trust=kwargs.get("trust", self.trust),
            now=self.now, ledger_path=self.ledger,
        )

    def test_authentic_signature_consumes_nonce_but_never_authorizes(self):
        result = self.review(self.signed_envelope())
        self.assertTrue(result["signature_verified"])
        self.assertTrue(result["scope_verified"])
        self.assertTrue(result["nonce_consumed"])
        for property_name in (
            "human_identity_verified", "supervisor_origin_authenticated",
            "runtime_independently_attested", "execution_authorized",
            "github_write_authorized", "merge_authorized", "deployment_authorized"
        ):
            self.assertFalse(result[property_name], property_name)

    def test_replay_rejected_on_same_database(self):
        envelope = self.signed_envelope()
        self.assertTrue(self.review(envelope)["nonce_consumed"])
        result = self.review(envelope)
        self.assertFalse(result["nonce_consumed"])
        self.assertIn("already_consumed", result["reason"])
        self.assertFalse(result["execution_authorized"])

    def test_tampered_claim_does_not_consume_nonce(self):
        envelope = self.signed_envelope()
        envelope["claims"]["paths"] = ["src/evil.py"]
        result = self.review(envelope)
        self.assertFalse(result["signature_verified"])
        self.assertFalse(result["nonce_consumed"])
        self.assertFalse(self.ledger.exists())

    def test_untrusted_snapshot_dict_cannot_reserve_nonce(self):
        result = self.review(
            self.signed_envelope(), trust={"key_id": self.trust.key_id}
        )
        self.assertFalse(result["signature_verified"])
        self.assertFalse(result["nonce_consumed"])
        self.assertFalse(self.ledger.exists())

    def test_explicitly_revoked_nonce_cannot_reserve(self):
        from dataclasses import replace
        revoked = replace(self.trust, revoked_nonces=frozenset({self.claims["nonce"]}))
        result = self.review(self.signed_envelope(), trust=revoked)
        self.assertFalse(result["nonce_consumed"])
        self.assertFalse(self.ledger.exists())


if __name__ == "__main__":
    unittest.main()
