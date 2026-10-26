import unittest

from scripts.visura_github_action_summary import render_readonly_audit_summary

SHA = "a" * 40


def policy(branch, classic="retrieved", applied="retrieved", count=1):
    return {
        "branch": branch,
        "classic_protection": {"lookup": classic},
        "rulesets": {"lookup": "retrieved"},
        "effective_ruleset_rules": {
            "lookup": applied,
            "observed_rule_count": count,
        },
        "repository_policy_verified": False,
        "reviewer_permissions_verified": False,
        "execution_authorized": False,
        "merge_authorized": False,
        "deployment_authorized": False,
    }


def bundle(target="chore/visura-auto-dev-guardrails", default="main"):
    repo = "josegude-ux/KONTROLA"
    audit = {
        "head_sha": SHA,
        "observed_review_count": 2,
        "observed_latest_approval_records": [{"review_id": 1}],
        "observed_current_commit_changes_requested": [],
        "observed_stale_review_ids": [2],
        "observed_self_review_ids": [],
        "reviewer_permissions_verified": False,
        "repository_policy_verified": False,
        "effective_approval_verification": False,
        "execution_authorized": False,
        "merge_authorized": False,
        "deployment_authorized": False,
    }
    return {
        "repository": repo,
        "pr_number": 37,
        "review_snapshot": {
            "repository": repo, "pr_number": 37,
            "base_branch": target, "head_sha": SHA,
            "review_audit": audit, "repository_policy_verified": False,
            "execution_authorized": False, "merge_authorized": False,
            "deployment_authorized": False,
        },
        "target_branch_policy": policy(target),
        "default_branch": default,
        "default_branch_policy": policy(default),
        "target_differs_from_default": target != default,
        "same_pr_metadata_after_policy_lookup": True,
        "report_is_atomic": False,
        "repository_policy_verified": False,
        "execution_authorized": False,
        "merge_authorized": False,
        "deployment_authorized": False,
    }


class GitHubActionSummaryTests(unittest.TestCase):
    def test_renders_distinct_target_and_default_policy(self):
        result = render_readonly_audit_summary(bundle())
        self.assertIn("Destino `chore/visura-auto-dev-guardrails`", result)
        self.assertIn("Predeterminada `main`", result)
        self.assertIn("Revisiones registradas (no autorizaciones)", result)
        self.assertIn("Aprobaciones observadas: **1**", result)
        self.assertIn("Revisiones antiguas: **1**", result)
        self.assertIn("NO autorización", result)
        self.assertIn("Snapshot atómico | No", result)

    def test_same_target_as_default_has_only_one_policy_row(self):
        result = render_readonly_audit_summary(bundle(target="main"))
        self.assertEqual(result.count("| Destino `main` |"), 1)
        self.assertNotIn("| Predeterminada", result)

    def test_unknown_classic_or_applied_rules_are_not_reported_as_unprotected(self):
        data = bundle()
        data["target_branch_policy"] = policy(
            data["review_snapshot"]["base_branch"],
            classic="not_found_or_inaccessible", applied="inaccessible", count=None,
        )
        result = render_readonly_audit_summary(data)
        self.assertIn("desconocido", result)
        self.assertIn("not_found_or_inaccessible", result)
        self.assertIn("nunca demuestra una rama sin protección", result)

    def test_injected_reviewer_login_and_body_never_appear(self):
        data = bundle()
        data["review_snapshot"]["review_audit"]["observed_latest_approval_records"] = [
            {"review_id": 1, "reviewer_login": "<script>alert(1)</script>"}
        ]
        result = render_readonly_audit_summary(data)
        self.assertNotIn("<script>", result)
        self.assertNotIn("alert(1)", result)

    def test_forged_execution_authorization_is_rejected(self):
        data = bundle()
        data["execution_authorized"] = True
        with self.assertRaisesRegex(ValueError, "non-authorizing"):
            render_readonly_audit_summary(data)

    def test_forged_approval_verification_is_rejected(self):
        data = bundle()
        data["review_snapshot"]["review_audit"]["effective_approval_verification"] = True
        with self.assertRaisesRegex(ValueError, "Review audit must not grant"):
            render_readonly_audit_summary(data)

    def test_wrong_target_branch_policy_is_rejected(self):
        data = bundle()
        data["target_branch_policy"]["branch"] = "main"
        with self.assertRaisesRegex(ValueError, "Branch policy context mismatch"):
            render_readonly_audit_summary(data)

    def test_mismatched_pr_identity_is_rejected(self):
        data = bundle()
        data["review_snapshot"]["pr_number"] = 99
        with self.assertRaisesRegex(ValueError, "PR context mismatch"):
            render_readonly_audit_summary(data)

    def test_non_atomic_claim_must_be_explicitly_false(self):
        data = bundle()
        data["report_is_atomic"] = True
        with self.assertRaisesRegex(ValueError, "non-authorizing and non-atomic"):
            render_readonly_audit_summary(data)

    def test_inaccessible_branch_rule_count_cannot_be_forged(self):
        data = bundle()
        data["target_branch_policy"]["effective_ruleset_rules"] = {
            "lookup": "inaccessible", "observed_rule_count": 10,
        }
        with self.assertRaisesRegex(ValueError, "Invalid inaccessible rule count"):
            render_readonly_audit_summary(data)

    def test_disallow_repository_markdown_injection(self):
        data = bundle()
        data["repository"] = "owner/`evil`"
        data["review_snapshot"]["repository"] = data["repository"]
        with self.assertRaisesRegex(ValueError, "Invalid repository"):
            render_readonly_audit_summary(data)


if __name__ == "__main__":
    unittest.main()
