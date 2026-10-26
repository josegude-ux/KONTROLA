import unittest
from scripts.visura_review_context import inspect_review_context

SHA = "a" * 40
TASK = {"task_id": "task-1", "repository": "josegude-ux/KONTROLA",
        "pr_number": 37, "head_sha": SHA, "author_id": "alice"}
REVIEW = {"task_id": "task-1", "repository": "josegude-ux/KONTROLA",
          "pr_number": 37, "head_sha": SHA, "reviewer_id": "bob", "decision": "APPROVED"}


class ReviewContextTests(unittest.TestCase):
    def test_matching_claim_still_cannot_execute(self):
        result = inspect_review_context(TASK, REVIEW)
        self.assertTrue(result["claimed_approval_matches_context"])
        self.assertFalse(result["source_authenticated"])
        self.assertFalse(result["execution_authorized"])

    def test_cross_repository_replay_is_not_eligible(self):
        result = inspect_review_context(TASK, {**REVIEW, "repository": "other/repo"})
        self.assertFalse(result["claimed_approval_matches_context"])

    def test_cross_pr_replay_is_not_eligible(self):
        result = inspect_review_context(TASK, {**REVIEW, "pr_number": 38})
        self.assertFalse(result["claimed_approval_matches_context"])

    def test_cross_task_replay_is_not_eligible(self):
        result = inspect_review_context(TASK, {**REVIEW, "task_id": "task-2"})
        self.assertFalse(result["claimed_approval_matches_context"])

    def test_boolean_pr_number_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "Invalid PR number"):
            inspect_review_context(TASK, {**REVIEW, "pr_number": True})


if __name__ == "__main__":
    unittest.main()
