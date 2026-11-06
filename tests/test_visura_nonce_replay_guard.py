"""Tests for the external-supervisor nonce primitive; never authorize execution."""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from pathlib import Path
import tempfile
import threading
import unittest

from scripts.visura_nonce_replay_guard import consume_nonce

NOW = datetime(2026, 11, 6, 20, 45, tzinfo=timezone.utc)
NONCE = "visura-test-nonce-00000000001"
DIGEST = "a" * 64


class NonceReplayGuardTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.db = Path(self.tmp.name) / "supervisor.sqlite"
        self.request = dict(
            key_id="trust-fixture-01", nonce=NONCE, grant_digest=DIGEST,
            now=NOW, expires_at=NOW + timedelta(minutes=5),
        )

    def record(self, **changes):
        return consume_nonce(self.db, **{**self.request, **changes})

    def test_one_consumption_still_does_not_authorize(self):
        result = self.record()
        self.assertTrue(result["nonce_accepted"])
        self.assertFalse(result["execution_authorized"])
        self.assertFalse(result["github_write_authorized"])
        self.assertFalse(result["merge_authorized"])
        self.assertTrue(self.db.exists())

    def test_duplicate_rejected_after_connection_closed(self):
        self.assertTrue(self.record()["nonce_accepted"])
        result = self.record()
        self.assertFalse(result["nonce_accepted"])
        self.assertEqual(result["reason"], "nonce_already_consumed")

    def test_nonce_reuse_different_key_or_digest_rejected(self):
        self.record()
        self.assertFalse(self.record(key_id="trust-fixture-02")["nonce_accepted"])
        self.assertFalse(self.record(grant_digest="b" * 64)["nonce_accepted"])

    def test_distinct_nonce_allowed_but_never_authorized(self):
        self.record()
        result = self.record(nonce="visura-test-nonce-00000000002")
        self.assertTrue(result["nonce_accepted"])
        self.assertFalse(result["execution_authorized"])

    def test_expired_and_overlong_grants_rejected_without_insert(self):
        for expiry in (NOW, NOW - timedelta(seconds=1),
                       NOW + timedelta(minutes=16)):
            with self.subTest(expiry=expiry):
                result = self.record(expires_at=expiry)
                self.assertFalse(result["nonce_accepted"])
        self.assertFalse(self.db.exists())

    def test_invalid_input_does_not_create_db(self):
        for changes in ({"nonce": "../escape"}, {"grant_digest": "bad"},
                        {"key_id": ""}, {"now": NOW.replace(tzinfo=None)}):
            with self.subTest(changes=changes), self.assertRaises(ValueError):
                self.record(**changes)
        self.assertFalse(self.db.exists())

    def test_relative_or_symlink_database_rejected(self):
        with self.assertRaises(ValueError):
            consume_nonce("relative.sqlite", **self.request)
        link = Path(self.tmp.name) / "link.sqlite"
        link.symlink_to(self.db)
        with self.assertRaises(ValueError):
            consume_nonce(link, **self.request)

    def test_competing_consumers_only_one_succeeds(self):
        barrier = threading.Barrier(5)
        def attempt(_):
            barrier.wait(timeout=10)
            return self.record()["nonce_accepted"]
        with ThreadPoolExecutor(max_workers=5) as pool:
            outcomes = list(pool.map(attempt, range(5)))
        self.assertEqual(sum(outcomes), 1)


if __name__ == "__main__":
    unittest.main()
