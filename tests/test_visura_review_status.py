import unittest
from scripts.visura_review_status import advisory_review_status

SHA = "a" * 40


def review(state, reviewer="alice", sha=SHA):
    return {"reviewer_id": reviewer, "state": state, "head_sha": sha}


class AdvisoryReviewStatusTests(unittest.TestCase):
    def test_later_changes_requested_overrides_approval(self):
        result = advisory_review_status(
            [review("APPROVED"), review("CHANGES_REQUESTED")], SHA
        )
        self.assertEqual(result["status"], "changes_requested")
        self.assertEqual(result["approval_reviewers"], [])
        self.assertFalse(result["execution_authorized"])

    def test_later_dismissal_revokes_approval(self):
        result = advisory_review_status([review("APPROVED"), review("DISMISSED")], SHA)
        self.assertEqual(result["status"], "no_approvals")

    def test_stale_approval_does_not_count(self):
        result = advisory_review_status([review("APPROVED", sha="b" * 40)], SHA)
        self.assertEqual(result["approval_reviewers"], [])

    def test_comment_does_not_override_approval(self):
        result = advisory_review_status([review("APPROVED"), review("COMMENTED")], SHA)
        self.assertEqual(result["status"], "has_approvals")
        self.assertFalse(result["merge_authorized"])


if __name__ == "__main__":
    unittest.main()
