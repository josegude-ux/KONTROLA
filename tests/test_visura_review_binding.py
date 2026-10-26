import unittest
from scripts.visura_review_binding import inspect_task_review_binding

SHA = "a" * 40
TASK = {"task_id": "task-1", "head_sha": SHA, "author_id": "alice"}
REVIEW = {"task_id": "task-1", "head_sha": SHA, "reviewer_id": "bob", "decision": "APPROVED"}


class ReviewBindingTests(unittest.TestCase):
    def test_matching_claim_still_cannot_authorize(self):
        result = inspect_task_review_binding(TASK, REVIEW)
        self.assertTrue(result["approval_claim_eligible_for_external_verification"])
        self.assertFalse(result["reviewer_authenticated"])
        self.assertFalse(result["execution_authorized"])

    def test_mismatched_commit_rejected_as_claim(self):
        result = inspect_task_review_binding(TASK, {**REVIEW, "head_sha": "b" * 40})
        self.assertFalse(result["approval_claim_eligible_for_external_verification"])

    def test_self_review_not_eligible(self):
        result = inspect_task_review_binding(TASK, {**REVIEW, "reviewer_id": "ALICE"})
        self.assertTrue(result["self_review"])
        self.assertFalse(result["approval_claim_eligible_for_external_verification"])

    def test_unexpected_permission_field_rejected(self):
        with self.assertRaisesRegex(ValueError, "Unexpected"):
            inspect_task_review_binding(TASK, {**REVIEW, "execution_authorized": True})

    def test_malformed_sha_rejected(self):
        with self.assertRaisesRegex(ValueError, "Invalid commit SHA"):
            inspect_task_review_binding(TASK, {**REVIEW, "head_sha": "abc"})


if __name__ == "__main__":
    unittest.main()
