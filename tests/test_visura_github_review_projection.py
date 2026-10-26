import unittest
from scripts.visura_github_review_projection import summarize_pr_reviews

SHA = "a" * 40


class GitHubReviewProjectionTests(unittest.TestCase):
    def test_approval_is_not_execution_authority(self):
        result = summarize_pr_reviews(
            [{"reviewer_id": "reviewer", "state": "APPROVED", "head_sha": SHA}], SHA
        )
        self.assertEqual(len(result["matching_reviews"]), 1)
        self.assertFalse(result["execution_authorized"])
        self.assertFalse(result["merge_authorized"])

    def test_stale_review_is_ignored(self):
        result = summarize_pr_reviews(
            [{"reviewer_id": "reviewer", "state": "APPROVED", "head_sha": "b" * 40}], SHA
        )
        self.assertEqual(result["matching_reviews"], [])

    def test_rejects_invalid_head_sha(self):
        with self.assertRaisesRegex(ValueError, "Invalid head SHA"):
            summarize_pr_reviews([], "not-a-sha")

    def test_rejects_extra_permission_fields(self):
        with self.assertRaisesRegex(ValueError, "Invalid review record"):
            summarize_pr_reviews([{
                "reviewer_id": "reviewer", "state": "APPROVED",
                "head_sha": SHA, "execute": True
            }], SHA)


if __name__ == "__main__":
    unittest.main()
