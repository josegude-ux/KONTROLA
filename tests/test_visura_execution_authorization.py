import unittest
from scripts.visura_execution_authorization import assess_execution_request


class ExecutionAuthorizationTests(unittest.TestCase):
    def setUp(self):
        self.task = {
            "task_id": "VISURA-AUTH-01",
            "title": "Review",
            "scope": "Only inspect files",
            "checks": ["unit tests"],
            "max_cost_eur": 0,
        }
        self.review = {
            "task_id": "VISURA-AUTH-01",
            "decision": "approve",
            "reviewer_id": "external-reviewer",
            "trusted_identity_verified": True,
        }

    def test_approved_record_still_cannot_execute(self):
        result = assess_execution_request(self.task, self.review)
        self.assertTrue(result["review_record_eligible"])
        self.assertFalse(result["execution_authorized"])
        self.assertTrue(result["requires_external_authorization_gate"])
        self.assertFalse(result["merge_authorized"])

    def test_unverified_identity_is_ineligible(self):
        self.review["trusted_identity_verified"] = False
        self.assertFalse(assess_execution_request(self.task, self.review)["review_record_eligible"])

    def test_rejection_is_ineligible(self):
        self.review["decision"] = "reject"
        self.assertFalse(assess_execution_request(self.task, self.review)["review_record_eligible"])

    def test_task_cannot_embed_approval(self):
        self.task["approved"] = True
        with self.assertRaises(ValueError):
            assess_execution_request(self.task, self.review)

    def test_unhashable_decision_fails_closed(self):
        self.review["decision"] = ["approve"]
        with self.assertRaisesRegex(ValueError, "Invalid review decision"):
            assess_execution_request(self.task, self.review)

    def test_review_cannot_add_execution_permission(self):
        self.review["execution_authorized"] = True
        with self.assertRaisesRegex(ValueError, "Invalid review fields"):
            assess_execution_request(self.task, self.review)

    def test_identity_flag_must_be_boolean(self):
        self.review["trusted_identity_verified"] = "true"
        with self.assertRaisesRegex(ValueError, "Invalid identity verification flag"):
            assess_execution_request(self.task, self.review)

    def test_task_id_must_match(self):
        self.review["task_id"] = "VISURA-OTHER"
        with self.assertRaisesRegex(ValueError, "mismatch"):
            assess_execution_request(self.task, self.review)


if __name__ == "__main__":
    unittest.main()
