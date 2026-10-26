import unittest
from scripts.visura_readiness_report import build_readiness_report

SHA = "a" * 40
TASK = {"task_id": "task-1", "head_sha": SHA, "author_id": "alice"}
REVIEW = {"task_id": "task-1", "head_sha": SHA, "reviewer_id": "bob", "decision": "APPROVED"}
FIELDS = (
    "github_identity_verified_externally",
    "repository_policy_verified_externally",
    "head_sha_verified_externally",
    "ci_verified_externally",
    "human_approval_verified_externally",
    "provider_spending_cap_verified_externally",
)


class ReadinessReportTests(unittest.TestCase):
    def test_all_claims_true_still_block(self):
        report = build_readiness_report(TASK, REVIEW, {key: True for key in FIELDS})
        self.assertFalse(report["ready_for_execution"])
        self.assertFalse(report["ready_for_merge"])
        self.assertFalse(report["ready_for_deployment"])
        self.assertIn("trusted_external_authorization_not_implemented", report["blockers"])

    def test_missing_ci_is_reported(self):
        evidence = {key: True for key in FIELDS}
        evidence["ci_verified_externally"] = False
        report = build_readiness_report(TASK, REVIEW, evidence)
        self.assertIn("ci_verified_externally", report["blockers"])

    def test_self_review_is_reported(self):
        report = build_readiness_report(
            TASK, {**REVIEW, "reviewer_id": "ALICE"}, {key: True for key in FIELDS}
        )
        self.assertIn("self_review", report["blockers"])

    def test_mismatched_commit_is_reported(self):
        report = build_readiness_report(
            TASK, {**REVIEW, "head_sha": "b" * 40}, {key: True for key in FIELDS}
        )
        self.assertIn("task_commit_mismatch", report["blockers"])


if __name__ == "__main__":
    unittest.main()
