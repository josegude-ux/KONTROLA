import unittest

from scripts.visura_github_review_audit import summarize_readonly_review_snapshot

SHA = "a" * 40


def snapshot(reviews=None, **changes):
    result = {
        "repository": "josegude-ux/KONTROLA",
        "pr_number": 37,
        "head_sha": SHA,
        "author_numeric_id": 123,
        "pr_state": "open",
        "reviews": [] if reviews is None else reviews,
        "retrieval_method": "github_rest_https_token",
        "repository_policy_verified": False,
        "execution_authorized": False,
        "merge_authorized": False,
        "deployment_authorized": False,
    }
    result.update(changes)
    return result


def review(review_id=1, reviewer_id=456, state="APPROVED", sha=SHA):
    return {
        "review_id": review_id,
        "reviewer_numeric_id": reviewer_id,
        "reviewer_login": "bob",
        "state": state,
        "commit_sha": sha,
    }


class GitHubReviewAuditTests(unittest.TestCase):
    def test_no_reviews_no_authorization(self):
        result = summarize_readonly_review_snapshot(snapshot())
        self.assertEqual(result["observed_review_count"], 0)
        self.assertEqual(result["observed_current_commit_approvals"], [])
        self.assertFalse(result["execution_authorized"])
        self.assertFalse(result["merge_authorized"])

    def test_matching_approval_is_observation_only(self):
        result = summarize_readonly_review_snapshot(snapshot([review()]))
        self.assertEqual(
            result["observed_current_commit_approvals"][0]["reviewer_numeric_id"], 456
        )
        self.assertFalse(result["effective_approval_verification"])
        self.assertFalse(result["deployment_authorized"])

    def test_approval_of_prior_commit_is_not_current(self):
        result = summarize_readonly_review_snapshot(
            snapshot([review(sha="b" * 40)])
        )
        self.assertEqual(result["observed_current_commit_approvals"], [])
        self.assertEqual(result["observed_stale_review_ids"], [1])

    def test_same_account_as_author_is_separated_even_after_rename(self):
        result = summarize_readonly_review_snapshot(
            snapshot([review(reviewer_id=123)])
        )
        self.assertEqual(result["observed_self_review_ids"], [1])
        self.assertEqual(result["observed_current_commit_approvals"], [])

    def test_changes_requested_is_distinct_from_approvals(self):
        result = summarize_readonly_review_snapshot(
            snapshot([review(state="CHANGES_REQUESTED")])
        )
        self.assertEqual(len(result["observed_current_commit_changes_requested"]), 1)
        self.assertEqual(result["observed_current_commit_approvals"], [])

    def test_dismissed_and_pending_are_not_approvals(self):
        result = summarize_readonly_review_snapshot(
            snapshot([review(1, state="DISMISSED"), review(2, state="PENDING")])
        )
        self.assertEqual(result["observed_dismissed_review_ids"], [1])
        self.assertEqual(result["observed_pending_review_ids"], [2])
        self.assertEqual(result["observed_current_commit_approvals"], [])

    def test_duplicate_review_id_fails_closed(self):
        with self.assertRaisesRegex(ValueError, "Duplicate GitHub review ID"):
            summarize_readonly_review_snapshot(
                snapshot([review(), review(state="COMMENTED")])
            )

    def test_forged_authorization_rejected(self):
        with self.assertRaisesRegex(ValueError, "cannot supply authority claims"):
            summarize_readonly_review_snapshot(
                snapshot([review()], execution_authorized=True)
            )

    def test_unknown_review_permissions_field_rejected(self):
        with self.assertRaisesRegex(ValueError, "Unexpected GitHub review record"):
            summarize_readonly_review_snapshot(
                snapshot([{**review(), "merge_authorized": True}])
            )

    def test_boolean_reviewer_id_rejected(self):
        with self.assertRaisesRegex(ValueError, "Invalid GitHub review record"):
            summarize_readonly_review_snapshot(
                snapshot([review(reviewer_id=True)])
            )

    def test_review_sha_case_is_hex_equivalent(self):
        result = summarize_readonly_review_snapshot(
            snapshot([review(sha="A" * 40)])
        )
        self.assertEqual(len(result["observed_current_commit_approvals"]), 1)

    def test_report_is_deterministic_with_reversed_order(self):
        r1, r2 = review(7), review(3, reviewer_id=789)
        result = summarize_readonly_review_snapshot(snapshot([r1, r2]))
        self.assertEqual(
            [r["review_id"] for r in result["observed_current_commit_approvals"]],
            [3, 7],
        )


if __name__ == "__main__":
    unittest.main()
