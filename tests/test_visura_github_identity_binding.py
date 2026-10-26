import unittest
from scripts.visura_github_identity_binding import inspect_github_identity_binding


class GitHubIdentityBindingTests(unittest.TestCase):
    def test_same_id_with_different_login_is_self_review(self):
        result = inspect_github_identity_binding(
            {"id": 123, "login": "old-name"},
            {"id": 123, "login": "new-name"},
        )
        self.assertTrue(result["same_numeric_account"])
        self.assertFalse(result["reviewer_distinct_from_author_claim"])
        self.assertFalse(result["execution_authorized"])

    def test_different_ids_are_not_authenticated(self):
        result = inspect_github_identity_binding(
            {"id": 123, "login": "alice"}, {"id": 456, "login": "bob"}
        )
        self.assertTrue(result["reviewer_distinct_from_author_claim"])
        self.assertFalse(result["identities_authenticated"])
        self.assertFalse(result["merge_authorized"])

    def test_boolean_id_rejected(self):
        with self.assertRaisesRegex(ValueError, "numeric user ID"):
            inspect_github_identity_binding(
                {"id": True, "login": "alice"}, {"id": 456, "login": "bob"}
            )

    def test_missing_id_rejected(self):
        with self.assertRaisesRegex(ValueError, "Invalid identity fields"):
            inspect_github_identity_binding(
                {"login": "alice"}, {"id": 456, "login": "bob"}
            )


if __name__ == "__main__":
    unittest.main()
