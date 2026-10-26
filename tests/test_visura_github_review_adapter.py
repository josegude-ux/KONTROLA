import unittest
from scripts.visura_github_review_adapter import inspect_github_reviews

SHA = "a" * 40


class GitHubReviewAdapterTests(unittest.TestCase):
    def test_empty_reviews_are_not_authorized(self):
        result = inspect_github_reviews([], SHA)
        self.assertEqual(result["matching_reviews"], [])
        self.assertFalse(result["execution_authorized"])
        self.assertFalse(result["source_authenticated"])

    def test_normalizes_approval_but_cannot_authorize(self):
        result = inspect_github_reviews([{
            "user": {"login": "reviewer"},
            "state": "APPROVED",
            "commit_id": SHA,
        }], SHA)
        self.assertEqual(result["matching_reviews"][0]["reviewer_id"], "reviewer")
        self.assertFalse(result["execution_authorized"])

    def test_rejects_blank_login(self):
        with self.assertRaisesRegex(ValueError, "Invalid GitHub reviewer login"):
            inspect_github_reviews([{
                "user": {"login": " "}, "state": "APPROVED", "commit_id": SHA
            }], SHA)

    def test_rejects_login_with_slash(self):
        with self.assertRaisesRegex(ValueError, "Invalid GitHub reviewer login"):
            inspect_github_reviews([{
                "user": {"login": "owner/reviewer"}, "state": "APPROVED", "commit_id": SHA
            }], SHA)

    def test_rejects_overlong_login(self):
        with self.assertRaisesRegex(ValueError, "Invalid GitHub reviewer login"):
            inspect_github_reviews([{
                "user": {"login": "a" * 40}, "state": "APPROVED", "commit_id": SHA
            }], SHA)

    def test_rejects_missing_user(self):
        with self.assertRaisesRegex(ValueError, "Missing GitHub reviewer login"):
            inspect_github_reviews([{"state": "APPROVED", "commit_id": SHA}], SHA)


if __name__ == "__main__":
    unittest.main()
