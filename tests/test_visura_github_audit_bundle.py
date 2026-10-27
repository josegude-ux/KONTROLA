import io
import json
import os
import tempfile
import unittest
from pathlib import Path
from contextlib import redirect_stdout
from unittest.mock import patch

from scripts.visura_github_audit_bundle import (
    inspect_readonly_audit_bundle, main,
)
from scripts.visura_github_action_summary import render_readonly_audit_summary

REPO = "josegude-ux/KONTROLA"
HEAD = "a" * 40
BASE = "c" * 40


def fixture_snapshot(branch="chore/visura-auto-dev-guardrails"):
    return {
        "repository": REPO, "pr_number": 37, "reviews": [],
        "head_sha": HEAD, "base_branch": branch, "base_sha": BASE,
        "author_numeric_id": 123, "pr_state": "open",
        "execution_authorized": False,
    }


def fixture_pr(branch="chore/visura-auto-dev-guardrails", head=HEAD, base=BASE):
    return {
        "head": {"sha": head},
        "base": {
            "ref": branch, "sha": base, "repo": {"full_name": REPO},
        },
        "user": {"id": 123},
        "state": "open",
    }


class AuditBundleTests(unittest.TestCase):
    def setUp(self):
        self.preflight_mock_patch = patch(
            "scripts.visura_github_audit_bundle.inspect_readonly_auth_preflight",
            return_value={
                "repository": REPO,
                "pr_number": 37,
                "repository_lookup": "retrieved",
                "pull_request_lookup": "retrieved",
                "observed_base_branch": "chore/visura-auto-dev-guardrails",
                "observed_head_sha": HEAD,
                "get_only_transport": True,
                "token_scopes_verified": False,
                "authenticated_caller_identity_verified": False,
                "effective_branch_policy_verified": False,
                "reviewer_eligibility_verified": False,
                "execution_authorized": False,
                "merge_authorized": False,
                "deployment_authorized": False,
            },
        )
        self.preflight_mock = self.preflight_mock_patch.start()
        self.addCleanup(self.preflight_mock_patch.stop)
        self.codeowners_mock_patch = patch(
            "scripts.visura_github_audit_bundle.observe_codeowners",
            return_value={
                "repository": REPO,
                "branch": "chore/visura-auto-dev-guardrails",
                "lookup": "no_file_observed",
                "observations": [
                    {"path": path, "lookup": "not_found_or_inaccessible"}
                    for path in (".github/CODEOWNERS", "CODEOWNERS", "docs/CODEOWNERS")
                ],
                "first_observed_path": None,
                "unshadowed_candidate_observed": False,
                "file_absence_verified": False,
                "effective_code_ownership_verified": False,
                "reviewer_eligibility_verified": False,
                "repository_policy_verified": False,
                "execution_authorized": False,
                "merge_authorized": False,
                "deployment_authorized": False,
            },
        )
        self.codeowners_mock = self.codeowners_mock_patch.start()
        self.addCleanup(self.codeowners_mock_patch.stop)
        self.check_mock_patch = patch(
            "scripts.visura_github_audit_bundle.observe_commit_checks",
            return_value={
                "repository": REPO, "head_sha": HEAD,
                "lookup": "retrieved", "observed_total": 1,
                "status_counts": {"completed": 1},
                "conclusion_counts": {"success": 1},
                "required_checks_verified": False,
                "branch_policy_verified": False,
                "execution_authorized": False,
                "merge_authorized": False,
                "deployment_authorized": False,
            },
        )
        self.check_mock = self.check_mock_patch.start()
        self.addCleanup(self.check_mock_patch.stop)
        self.comparison_mock_patch = patch(
            "scripts.visura_github_audit_bundle.compare_required_check_observations",
            return_value={
                "lookup": "unknown_policy_requirements",
                "required_context_count": None,
                "candidate_name_match_count": None,
                "candidate_success_count": None,
                "without_named_check_run_count": None,
                "ambiguous_app_provenance_count": None,
                "legacy_commit_statuses_compared": False,
                "app_origin_authenticated": False,
                "required_checks_verified": False,
                "execution_authorized": False,
                "merge_authorized": False,
                "deployment_authorized": False,
            },
        )
        self.comparison_mock = self.comparison_mock_patch.start()
        self.addCleanup(self.comparison_mock_patch.stop)
        self.legacy_mock_patch = patch(
            "scripts.visura_github_audit_bundle.observe_legacy_commit_statuses",
            return_value={
                "repository": REPO, "head_sha": HEAD,
                "lookup": "retrieved", "observed_status_records": 0,
                "observed_latest_contexts": 0, "latest_context_states": [],
                "latest_state_counts": {"success": 0, "failure": 0,
                                        "error": 0, "pending": 0},
                "required_checks_verified": False, "branch_policy_verified": False,
                "execution_authorized": False, "merge_authorized": False,
                "deployment_authorized": False,
            },
        )
        self.legacy_mock = self.legacy_mock_patch.start()
        self.addCleanup(self.legacy_mock_patch.stop)
        self.legacy_comparison_patch = patch(
            "scripts.visura_github_audit_bundle.compare_legacy_status_candidates",
            return_value={
                "lookup": "unknown_policy_requirements",
                "required_context_count": None,
                "candidate_context_match_count": None,
                "candidate_latest_success_count": None,
                "contexts_not_observed_count": None,
                "app_pinned_unverifiable_count": None,
                "legacy_context_origin_authenticated": False,
                "required_checks_verified": False,
                "execution_authorized": False, "merge_authorized": False,
                "deployment_authorized": False,
            },
        )
        self.legacy_comparison = self.legacy_comparison_patch.start()
        self.addCleanup(self.legacy_comparison_patch.stop)

    def test_inspects_actual_target_and_default_separately(self):
        policy_calls = []
        def policy(repo, branch, token, opener):
            policy_calls.append(branch)
            return {"branch": branch, "merge_authorized": False}

        with patch(
            "scripts.visura_github_audit_bundle.fetch_readonly_review_snapshot",
            return_value=fixture_snapshot(),
        ), patch(
            "scripts.visura_github_audit_bundle.inspect_branch_policy",
            side_effect=policy,
        ), patch(
            "scripts.visura_github_audit_bundle._get_json",
            return_value=fixture_pr(),
        ):
            result = inspect_readonly_audit_bundle(REPO, 37, "main", "secret", opener=lambda *a: None)
        self.assertEqual(policy_calls, ["chore/visura-auto-dev-guardrails", "main", "chore/visura-auto-dev-guardrails"])
        self.assertTrue(result["target_differs_from_default"])
        self.assertEqual(
            result["target_branch_policy"]["branch"],
            "chore/visura-auto-dev-guardrails",
        )
        self.assertEqual(result["default_branch_policy"]["branch"], "main")
        self.assertFalse(result["report_is_atomic"])
        self.assertFalse(result["execution_authorized"])
        self.assertFalse(result["merge_authorized"])

    def test_codeowners_probe_receives_real_target_and_never_authorizes(self):
        with patch(
            "scripts.visura_github_audit_bundle.fetch_readonly_review_snapshot",
            return_value=fixture_snapshot(),
        ), patch(
            "scripts.visura_github_audit_bundle.inspect_branch_policy",
            return_value={"branch": "any"},
        ), patch(
            "scripts.visura_github_audit_bundle._get_json",
            return_value=fixture_pr(),
        ):
            result = inspect_readonly_audit_bundle(
                REPO, 37, "main", "secret", opener=lambda *args: None
            )
        self.assertEqual(self.codeowners_mock.call_count, 2)
        self.assertEqual(
            [call.args[:3] for call in self.codeowners_mock.call_args_list],
            [(REPO, "chore/visura-auto-dev-guardrails", "secret")] * 2,
        )
        self.assertFalse(result["target_branch_codeowners"]["file_absence_verified"])
        self.assertFalse(result["execution_authorized"])

    def test_codeowners_content_sha_change_aborts_before_final_pr(self):
        original = dict(self.codeowners_mock.return_value)
        original["lookup"] = "file_observed"
        original["observations"] = [
            {"path": ".github/CODEOWNERS", "lookup": "file_observed",
             "blob_sha": "a" * 40},
            {"path": "CODEOWNERS", "lookup": "not_found_or_inaccessible",
             "blob_sha": None},
            {"path": "docs/CODEOWNERS", "lookup": "not_found_or_inaccessible",
             "blob_sha": None},
        ]
        original["first_observed_path"] = ".github/CODEOWNERS"
        original["unshadowed_candidate_observed"] = True
        changed = dict(original)
        changed["observations"] = [
            dict(original["observations"][0], blob_sha="b" * 40),
            *original["observations"][1:],
        ]
        self.codeowners_mock.side_effect = [original, changed]
        with patch(
            "scripts.visura_github_audit_bundle.fetch_readonly_review_snapshot",
            return_value=fixture_snapshot(),
        ), patch(
            "scripts.visura_github_audit_bundle.inspect_branch_policy",
            return_value={"branch": "any"},
        ), patch(
            "scripts.visura_github_audit_bundle._get_json",
        ) as final_pr:
            with self.assertRaisesRegex(
                ValueError, "CODEOWNERS metadata changed during the audit"
            ):
                inspect_readonly_audit_bundle(
                    REPO, 37, "main", "secret", opener=lambda *args: None
                )
            final_pr.assert_not_called()
        self.assertEqual(self.codeowners_mock.call_count, 2)

    def test_codeowners_access_becomes_inaccessible_fails_closed(self):
        first = self.codeowners_mock.return_value
        second = dict(first, observations=[
            {"path": ".github/CODEOWNERS", "lookup": "inaccessible",
             "blob_sha": None},
            *first["observations"][1:],
        ])
        self.codeowners_mock.side_effect = [first, second]
        with patch(
            "scripts.visura_github_audit_bundle.fetch_readonly_review_snapshot",
            return_value=fixture_snapshot(),
        ), patch(
            "scripts.visura_github_audit_bundle.inspect_branch_policy",
            return_value={"branch": "any"},
        ):
            with self.assertRaisesRegex(
                ValueError, "CODEOWNERS metadata changed during the audit"
            ):
                inspect_readonly_audit_bundle(
                    REPO, 37, "main", "secret", opener=lambda *args: None
                )

    def test_codeowners_recheck_precedes_final_pr_get(self):
        events = []
        evidence = self.codeowners_mock.return_value
        self.codeowners_mock.side_effect = lambda *args, **kwargs: (
            events.append("codeowners") or evidence
        )

        def last_pr(*args):
            events.append("final_pr")
            return fixture_pr()

        with patch(
            "scripts.visura_github_audit_bundle.fetch_readonly_review_snapshot",
            return_value=fixture_snapshot(),
        ), patch(
            "scripts.visura_github_audit_bundle.inspect_branch_policy",
            return_value={"branch": "any"},
        ), patch(
            "scripts.visura_github_audit_bundle._get_json",
            side_effect=last_pr,
        ):
            result = inspect_readonly_audit_bundle(
                REPO, 37, "main", "secret", opener=lambda *args: None
            )
        self.assertEqual(events, ["codeowners", "codeowners", "final_pr"])
        self.assertIs(result["same_codeowners_metadata_after_audit"], True)
        self.assertFalse(result["repository_policy_verified"])

    def test_preflight_scopes_repo_and_pr_with_single_supplied_token(self):
        with patch(
            "scripts.visura_github_audit_bundle.fetch_readonly_review_snapshot",
            return_value=fixture_snapshot(),
        ), patch(
            "scripts.visura_github_audit_bundle.inspect_branch_policy",
            return_value={"branch": "any"},
        ), patch(
            "scripts.visura_github_audit_bundle._get_json",
            return_value=fixture_pr(),
        ):
            result = inspect_readonly_audit_bundle(
                REPO, 37, "main", "secret", opener=lambda *args: None
            )
        self.preflight_mock.assert_called_once()
        self.assertEqual(
            self.preflight_mock.call_args.args[:3], (REPO, 37, "secret")
        )
        self.assertIs(
            result["github_transport_preflight"]["execution_authorized"], False
        )

    def test_changed_sha_between_preflight_and_snapshot_fails_closed(self):
        self.preflight_mock.return_value = dict(
            self.preflight_mock.return_value,
            observed_head_sha="b" * 40,
        )
        with patch(
            "scripts.visura_github_audit_bundle.fetch_readonly_review_snapshot",
            return_value=fixture_snapshot(),
        ), patch(
            "scripts.visura_github_audit_bundle.inspect_branch_policy",
        ) as policy:
            with self.assertRaisesRegex(
                ValueError, "changed between transport preflight"
            ):
                inspect_readonly_audit_bundle(
                    REPO, 37, "main", "secret", opener=lambda *args: None
                )
            policy.assert_not_called()

    def test_changed_base_between_preflight_and_snapshot_fails_closed(self):
        self.preflight_mock.return_value = dict(
            self.preflight_mock.return_value, observed_base_branch="main"
        )
        with patch(
            "scripts.visura_github_audit_bundle.fetch_readonly_review_snapshot",
            return_value=fixture_snapshot(),
        ), patch(
            "scripts.visura_github_audit_bundle.inspect_branch_policy",
        ) as policy:
            with self.assertRaisesRegex(
                ValueError, "changed between transport preflight"
            ):
                inspect_readonly_audit_bundle(
                    REPO, 37, "main", "secret", opener=lambda *args: None
                )
            policy.assert_not_called()

    def test_inaccessible_preflight_cannot_authorize_and_audit_continues(self):
        self.preflight_mock.return_value = dict(
            self.preflight_mock.return_value,
            repository_lookup="inaccessible",
            pull_request_lookup="not_queried",
            observed_head_sha=None,
            observed_base_branch=None,
        )
        with patch(
            "scripts.visura_github_audit_bundle.fetch_readonly_review_snapshot",
            return_value=fixture_snapshot(),
        ), patch(
            "scripts.visura_github_audit_bundle.inspect_branch_policy",
            return_value={"branch": "any"},
        ), patch(
            "scripts.visura_github_audit_bundle._get_json",
            return_value=fixture_pr(),
        ):
            result = inspect_readonly_audit_bundle(
                REPO, 37, "main", "secret", opener=lambda *args: None
            )
        self.assertEqual(
            result["github_transport_preflight"]["repository_lookup"],
            "inaccessible",
        )
        self.assertFalse(result["execution_authorized"])

    def test_ci_evidence_uses_exact_pr_head_not_base_sha(self):
        with patch(
            "scripts.visura_github_audit_bundle.fetch_readonly_review_snapshot",
            return_value=fixture_snapshot(),
        ), patch(
            "scripts.visura_github_audit_bundle.inspect_branch_policy",
            return_value={"branch": "any"},
        ), patch(
            "scripts.visura_github_audit_bundle._get_json",
            return_value=fixture_pr(),
        ):
            result = inspect_readonly_audit_bundle(
                REPO, 37, "main", "secret", opener=lambda *args: None
            )
        self.assertEqual(result["head_check_runs"]["head_sha"], HEAD)
        self.assertFalse(result["head_check_runs"]["required_checks_verified"])
        self.check_mock.assert_called_once()
        self.assertEqual(self.check_mock.call_args.args[:3], (REPO, HEAD, "secret"))

    def test_missing_checks_cannot_authorize_bundle(self):
        self.check_mock.return_value = {
            "repository": REPO, "head_sha": HEAD, "lookup": "inaccessible_or_not_found",
            "observed_total": None, "status_counts": None,
            "conclusion_counts": None,
            "required_checks_verified": False,
            "branch_policy_verified": False,
            "execution_authorized": False,
            "merge_authorized": False,
            "deployment_authorized": False,
        }
        with patch(
            "scripts.visura_github_audit_bundle.fetch_readonly_review_snapshot",
            return_value=fixture_snapshot(),
        ), patch(
            "scripts.visura_github_audit_bundle.inspect_branch_policy",
            return_value={"branch": "any"},
        ), patch(
            "scripts.visura_github_audit_bundle._get_json",
            return_value=fixture_pr(),
        ):
            result = inspect_readonly_audit_bundle(
                REPO, 37, "main", "secret", opener=lambda *args: None
            )
        self.assertIsNone(result["head_check_runs"]["observed_total"])
        self.assertFalse(result["execution_authorized"])

    def test_comparison_uses_target_branch_policy_never_default_policy(self):
        calls = []
        def observe_policy(repo, branch, token, opener):
            calls.append(branch)
            return {"branch": branch, "repository_policy_verified": False,
                    "execution_authorized": False, "merge_authorized": False,
                    "deployment_authorized": False}
        with patch(
            "scripts.visura_github_audit_bundle.fetch_readonly_review_snapshot",
            return_value=fixture_snapshot(),
        ), patch(
            "scripts.visura_github_audit_bundle.inspect_branch_policy",
            side_effect=observe_policy,
        ), patch(
            "scripts.visura_github_audit_bundle._get_json",
            return_value=fixture_pr(),
        ):
            result = inspect_readonly_audit_bundle(
                REPO, 37, "main", "secret", opener=lambda *args: None
            )
        self.assertEqual(calls, ["chore/visura-auto-dev-guardrails", "main", "chore/visura-auto-dev-guardrails"])
        self.comparison_mock.assert_called_once()
        self.assertEqual(
            self.comparison_mock.call_args.args[0]["branch"],
            "chore/visura-auto-dev-guardrails",
        )
        self.assertEqual(
            result["required_check_observations"]["lookup"],
            "unknown_policy_requirements",
        )
        self.assertFalse(result["merge_authorized"])

    def test_legacy_api_uses_exact_pr_head_and_target_branch_policy(self):
        with patch(
            "scripts.visura_github_audit_bundle.fetch_readonly_review_snapshot",
            return_value=fixture_snapshot(),
        ), patch(
            "scripts.visura_github_audit_bundle.inspect_branch_policy",
            side_effect=lambda repo, branch, token, opener: {
                "branch": branch, "repository_policy_verified": False,
                "execution_authorized": False, "merge_authorized": False,
                "deployment_authorized": False,
            },
        ), patch(
            "scripts.visura_github_audit_bundle._get_json",
            return_value=fixture_pr(),
        ):
            result = inspect_readonly_audit_bundle(
                REPO, 37, "main", "secret", opener=lambda *args: None
            )
        self.legacy_mock.assert_called_once()
        self.assertEqual(self.legacy_mock.call_args.args[:3], (REPO, HEAD, "secret"))
        self.legacy_comparison.assert_called_once()
        self.assertEqual(
            self.legacy_comparison.call_args.args[0]["branch"],
            "chore/visura-auto-dev-guardrails",
        )
        self.assertFalse(result["legacy_status_observations"]["merge_authorized"])
        self.assertFalse(result["execution_authorized"])

    def test_same_target_as_default_is_queried_once(self):
        self.preflight_mock.return_value = dict(
            self.preflight_mock.return_value,
            observed_base_branch="main",
        )
        with patch(
            "scripts.visura_github_audit_bundle.fetch_readonly_review_snapshot",
            return_value=fixture_snapshot("main"),
        ), patch(
            "scripts.visura_github_audit_bundle.inspect_branch_policy",
            return_value={"branch": "main"},
        ) as policy, patch(
            "scripts.visura_github_audit_bundle._get_json",
            return_value=fixture_pr(branch="main"),
        ):
            result = inspect_readonly_audit_bundle(REPO, 37, "main", "secret", opener=lambda *a: None)
        self.assertEqual(policy.call_count, 2)
        self.assertFalse(result["target_differs_from_default"])

    def test_target_policy_is_rechecked_after_evidence_before_final_pr(self):
        events = []

        def policy(repo, branch, token, opener):
            events.append("policy:" + branch)
            return {"branch": branch, "lookup": "inaccessible"}

        def final_pr(*args):
            events.append("final_pr")
            return fixture_pr()

        with patch(
            "scripts.visura_github_audit_bundle.fetch_readonly_review_snapshot",
            return_value=fixture_snapshot(),
        ), patch(
            "scripts.visura_github_audit_bundle.inspect_branch_policy",
            side_effect=policy,
        ), patch(
            "scripts.visura_github_audit_bundle._get_json",
            side_effect=final_pr,
        ):
            result = inspect_readonly_audit_bundle(
                REPO, 37, "main", "secret", opener=lambda *a: None
            )
        self.assertEqual(events, [
            "policy:chore/visura-auto-dev-guardrails",
            "policy:main",
            "policy:chore/visura-auto-dev-guardrails",
            "final_pr",
        ])
        self.assertTrue(result["same_target_policy_after_audit"])
        self.assertFalse(result["repository_policy_verified"])
        self.assertFalse(result["merge_authorized"])

    def test_changed_target_policy_during_checks_fails_closed(self):
        counter = [0]

        def changing_policy(repo, branch, token, opener):
            if branch == "chore/visura-auto-dev-guardrails":
                counter[0] += 1
                return {"branch": branch, "observed_rule_count": counter[0]}
            return {"branch": branch, "observed_rule_count": 1}

        with patch(
            "scripts.visura_github_audit_bundle.fetch_readonly_review_snapshot",
            return_value=fixture_snapshot(),
        ), patch(
            "scripts.visura_github_audit_bundle.inspect_branch_policy",
            side_effect=changing_policy,
        ), patch(
            "scripts.visura_github_audit_bundle._get_json",
        ) as final_pr:
            with self.assertRaisesRegex(
                ValueError, "Target branch policy changed during the audit"
            ):
                inspect_readonly_audit_bundle(
                    REPO, 37, "main", "secret", opener=lambda *a: None
                )
            final_pr.assert_not_called()
        self.assertEqual(counter[0], 2)

    def test_target_policy_becoming_inaccessible_is_not_treated_as_absence(self):
        target_reads = [0]

        def changing_policy(repo, branch, token, opener):
            if branch == "chore/visura-auto-dev-guardrails":
                target_reads[0] += 1
                return {"branch": branch, "lookup": (
                    "retrieved" if target_reads[0] == 1 else "inaccessible"
                )}
            return {"branch": branch, "lookup": "retrieved"}

        with patch(
            "scripts.visura_github_audit_bundle.fetch_readonly_review_snapshot",
            return_value=fixture_snapshot(),
        ), patch(
            "scripts.visura_github_audit_bundle.inspect_branch_policy",
            side_effect=changing_policy,
        ):
            with self.assertRaisesRegex(
                ValueError, "Target branch policy changed during the audit"
            ):
                inspect_readonly_audit_bundle(
                    REPO, 37, "main", "secret", opener=lambda *a: None
                )

    def test_review_dismissal_during_audit_is_detected_with_same_sha(self):
        first = fixture_snapshot()
        first["reviews"] = [{
            "review_id": 41, "reviewer_numeric_id": 7,
            "reviewer_login": "reviewer", "state": "APPROVED", "commit_sha": HEAD,
        }]
        second = dict(first, reviews=[dict(first["reviews"][0], state="DISMISSED")])
        with patch(
            "scripts.visura_github_audit_bundle.observe_snapshot_reviewer_permissions",
            return_value={
                "lookup": "incomplete", "observations": [],
                "reviewer_eligibility_verified": False,
                "execution_authorized": False,
                "merge_authorized": False,
                "deployment_authorized": False,
            },
        ), patch(
            "scripts.visura_github_audit_bundle.fetch_readonly_review_snapshot",
            side_effect=[first, second],
        ) as review_fetch, patch(
            "scripts.visura_github_audit_bundle.inspect_branch_policy",
            return_value={"branch": "any"},
        ), patch(
            "scripts.visura_github_audit_bundle._get_json",
        ) as last_pr:
            with self.assertRaisesRegex(
                ValueError, "reviews changed during the audit"
            ):
                inspect_readonly_audit_bundle(
                    REPO, 37, "main", "secret", opener=lambda *args: None
                )
            last_pr.assert_not_called()
        self.assertEqual(review_fetch.call_count, 2)

    def test_new_review_during_audit_is_rejected(self):
        first = fixture_snapshot()
        second = dict(first, reviews=[{
            "review_id": 9, "reviewer_numeric_id": 88,
            "reviewer_login": "changed", "state": "CHANGES_REQUESTED",
            "commit_sha": HEAD,
        }])
        with patch(
            "scripts.visura_github_audit_bundle.fetch_readonly_review_snapshot",
            side_effect=[first, second],
        ), patch(
            "scripts.visura_github_audit_bundle.inspect_branch_policy",
            return_value={"branch": "any"},
        ):
            with self.assertRaisesRegex(ValueError, "reviews changed during the audit"):
                inspect_readonly_audit_bundle(
                    REPO, 37, "main", "secret", opener=lambda *args: None
                )

    def test_reordered_pages_without_change_do_not_fail(self):
        first = fixture_snapshot()
        first["reviews"] = [
            {"review_id": 40, "reviewer_numeric_id": 8, "reviewer_login": "alpha",
             "state": "COMMENTED", "commit_sha": HEAD},
            {"review_id": 50, "reviewer_numeric_id": 9, "reviewer_login": "beta",
             "state": "APPROVED", "commit_sha": HEAD},
        ]
        second = dict(first, reviews=list(reversed(first["reviews"])))
        with patch(
            "scripts.visura_github_audit_bundle.observe_snapshot_reviewer_permissions",
            return_value={
                "lookup": "incomplete", "observations": [],
                "reviewer_eligibility_verified": False,
                "execution_authorized": False,
                "merge_authorized": False,
                "deployment_authorized": False,
            },
        ), patch(
            "scripts.visura_github_audit_bundle.fetch_readonly_review_snapshot",
            side_effect=[first, second],
        ) as review_fetch, patch(
            "scripts.visura_github_audit_bundle.inspect_branch_policy",
            return_value={"branch": "any"},
        ), patch(
            "scripts.visura_github_audit_bundle._get_json",
            return_value=fixture_pr(),
        ):
            result = inspect_readonly_audit_bundle(
                REPO, 37, "main", "secret", opener=lambda *args: None
            )
        self.assertTrue(result["same_review_records_after_audit"])
        self.assertFalse(result["execution_authorized"])
        self.assertEqual(review_fetch.call_count, 2)

    def test_second_review_fetch_is_bound_to_same_repo_pr_and_token(self):
        with patch(
            "scripts.visura_github_audit_bundle.fetch_readonly_review_snapshot",
            return_value=fixture_snapshot(),
        ) as reviews, patch(
            "scripts.visura_github_audit_bundle.inspect_branch_policy",
            return_value={"branch": "any"},
        ), patch(
            "scripts.visura_github_audit_bundle._get_json",
            return_value=fixture_pr(),
        ):
            result = inspect_readonly_audit_bundle(
                REPO, 37, "main", "secret", opener=lambda *args: None
            )
        self.assertEqual(
            [call.args[:3] for call in reviews.call_args_list],
            [(REPO, 37, "secret"), (REPO, 37, "secret")],
        )
        self.assertTrue(result["same_review_records_after_audit"])
        self.assertFalse(result["merge_authorized"])


    def test_reviewer_permission_downgrade_same_review_and_sha_rejected(self):
        initial = fixture_snapshot()
        initial["reviews"] = [{
            "review_id": 55, "reviewer_numeric_id": 7,
            "reviewer_login": "reviewer", "state": "APPROVED",
            "commit_sha": HEAD,
        }]
        first = {
            "lookup": "observed",
            "observations": [{"reviewer_numeric_id": 7,
                              "lookup": "retrieved", "observed_base_permission": "write"}],
            "reviewer_eligibility_verified": False,
            "execution_authorized": False, "merge_authorized": False,
            "deployment_authorized": False,
        }
        downgraded = {
            **first, "observations": [{
                "reviewer_numeric_id": 7,
                "lookup": "retrieved", "observed_base_permission": "read",
            }],
        }
        with patch(
            "scripts.visura_github_audit_bundle.observe_snapshot_reviewer_permissions",
            side_effect=[first, downgraded],
        ) as permissions, patch(
            "scripts.visura_github_audit_bundle.fetch_readonly_review_snapshot",
            return_value=initial,
        ), patch(
            "scripts.visura_github_audit_bundle.inspect_branch_policy",
            return_value={"branch": "any"},
        ), patch(
            "scripts.visura_github_audit_bundle._get_json",
        ) as final_get:
            with self.assertRaisesRegex(
                ValueError, "Reviewer repository permissions changed during the audit"
            ):
                inspect_readonly_audit_bundle(
                    REPO, 37, "main", "secret", opener=lambda *a: None
                )
            final_get.assert_not_called()
        self.assertEqual(permissions.call_count, 2)
        self.assertEqual(
            [call.args[:3] for call in permissions.call_args_list],
            [(REPO, initial, "secret"), (REPO, initial, "secret")],
        )

    def test_reviewer_permission_access_lost_during_audit_rejected(self):
        initial = fixture_snapshot()
        initial["reviews"] = [{
            "review_id": 59, "reviewer_numeric_id": 8,
            "reviewer_login": "reviewer", "state": "COMMENTED",
            "commit_sha": HEAD,
        }]
        observed = {"lookup": "observed", "observations": [{
            "reviewer_numeric_id": 8, "lookup": "retrieved",
            "observed_base_permission": "write",
        }]}
        inaccessible = {"lookup": "incomplete", "observations": [{
            "reviewer_numeric_id": 8, "lookup": "inaccessible",
            "observed_base_permission": None,
        }]}
        with patch(
            "scripts.visura_github_audit_bundle.observe_snapshot_reviewer_permissions",
            side_effect=[observed, inaccessible],
        ), patch(
            "scripts.visura_github_audit_bundle.fetch_readonly_review_snapshot",
            return_value=initial,
        ), patch(
            "scripts.visura_github_audit_bundle.inspect_branch_policy",
            return_value={"branch": "any"},
        ), patch(
            "scripts.visura_github_audit_bundle._get_json",
        ) as final_get:
            with self.assertRaisesRegex(
                ValueError, "Reviewer repository permissions changed during the audit"
            ):
                inspect_readonly_audit_bundle(
                    REPO, 37, "main", "secret", opener=lambda *a: None
                )
            final_get.assert_not_called()

    def test_same_reviewer_permissions_rechecked_but_not_authority(self):
        initial = fixture_snapshot()
        first = {"lookup": "observed", "observations": [],
                 "reviewer_eligibility_verified": False,
                 "execution_authorized": False, "merge_authorized": False,
                 "deployment_authorized": False}
        with patch(
            "scripts.visura_github_audit_bundle.observe_snapshot_reviewer_permissions",
            return_value=first,
        ) as permissions, patch(
            "scripts.visura_github_audit_bundle.fetch_readonly_review_snapshot",
            return_value=initial,
        ), patch(
            "scripts.visura_github_audit_bundle.inspect_branch_policy",
            return_value={"branch": "any"},
        ), patch(
            "scripts.visura_github_audit_bundle._get_json",
            return_value=fixture_pr(),
        ):
            result = inspect_readonly_audit_bundle(
                REPO, 37, "main", "secret", opener=lambda *a: None
            )
        self.assertTrue(result["same_reviewer_repository_permissions_after_audit"])
        self.assertFalse(result["execution_authorized"])
        self.assertFalse(result["merge_authorized"])
        self.assertFalse(result["reviewer_repository_permissions"]["reviewer_eligibility_verified"])
        self.assertEqual(permissions.call_count, 2)

    def test_reviewer_permissions_recheck_occurs_before_last_pr_get(self):
        initial = fixture_snapshot()
        stages = []
        def observe(*args, **kwargs):
            stages.append("permissions")
            return {"lookup": "observed", "observations": [],
                    "execution_authorized": False}
        def final(*args, **kwargs):
            stages.append("final_pr")
            return fixture_pr()
        with patch(
            "scripts.visura_github_audit_bundle.observe_snapshot_reviewer_permissions",
            side_effect=observe,
        ), patch(
            "scripts.visura_github_audit_bundle.fetch_readonly_review_snapshot",
            return_value=initial,
        ), patch(
            "scripts.visura_github_audit_bundle.inspect_branch_policy",
            return_value={"branch": "any"},
        ), patch(
            "scripts.visura_github_audit_bundle._get_json",
            side_effect=final,
        ):
            inspect_readonly_audit_bundle(REPO, 37, "main", "secret", opener=lambda *a: None)
        self.assertEqual(stages, ["permissions", "permissions", "final_pr"])

    def test_pr_retargeting_during_policy_fetch_rejected(self):
        with patch(
            "scripts.visura_github_audit_bundle.fetch_readonly_review_snapshot",
            return_value=fixture_snapshot(),
        ), patch(
            "scripts.visura_github_audit_bundle.inspect_branch_policy",
            return_value={"branch": "any"},
        ), patch(
            "scripts.visura_github_audit_bundle._get_json",
            return_value=fixture_pr("main"),
        ):
            with self.assertRaisesRegex(ValueError, "changed while reading"):
                inspect_readonly_audit_bundle(REPO, 37, "main", "secret", opener=lambda *a: None)

    def test_pr_head_mutation_during_policy_fetch_rejected(self):
        with patch(
            "scripts.visura_github_audit_bundle.fetch_readonly_review_snapshot",
            return_value=fixture_snapshot(),
        ), patch(
            "scripts.visura_github_audit_bundle.inspect_branch_policy",
            return_value={"branch": "any"},
        ), patch(
            "scripts.visura_github_audit_bundle._get_json",
            return_value=fixture_pr(head="b" * 40),
        ):
            with self.assertRaisesRegex(ValueError, "changed while reading"):
                inspect_readonly_audit_bundle(REPO, 37, "main", "secret", opener=lambda *a: None)

    def test_incomplete_final_pr_fails_closed(self):
        with patch(
            "scripts.visura_github_audit_bundle.fetch_readonly_review_snapshot",
            return_value=fixture_snapshot(),
        ), patch(
            "scripts.visura_github_audit_bundle.inspect_branch_policy",
            return_value={"branch": "any"},
        ), patch(
            "scripts.visura_github_audit_bundle._get_json",
            return_value={"state": "open"},
        ):
            with self.assertRaisesRegex(ValueError, "Incomplete final PR"):
                inspect_readonly_audit_bundle(REPO, 37, "main", "secret", opener=lambda *a: None)

    def test_invalid_default_branch_is_rejected_before_network(self):
        with self.assertRaisesRegex(ValueError, "Invalid branch"):
            inspect_readonly_audit_bundle(REPO, 37, "../main", "secret")

    def test_missing_token_is_rejected_before_network(self):
        with self.assertRaisesRegex(ValueError, "GitHub token"):
            inspect_readonly_audit_bundle(REPO, 37, "main", "")

    def test_full_readonly_bundle_uses_real_target_from_pr_response(self):
        class FakeResponse:
            def __init__(self, value):
                self.payload = json.dumps(value).encode("utf-8")
            def __enter__(self):
                return self
            def __exit__(self, *args):
                return False
            def read(self, limit):
                return self.payload[:limit]

        called = []
        def opener(request, timeout):
            url = request.full_url
            called.append((url, request.get_method()))
            if url.endswith("/pulls/37"):
                return FakeResponse(fixture_pr())
            if "/pulls/37/reviews?" in url:
                return FakeResponse([])
            if "/branches/" in url and url.endswith("/protection"):
                return FakeResponse({})
            if "/rulesets?" in url or "/rules/branches/" in url:
                return FakeResponse([])
            raise AssertionError("Unexpected URL: " + url)

        result = inspect_readonly_audit_bundle(
            REPO, 37, "main", "secret", opener=opener
        )
        self.assertEqual(
            result["target_branch_policy"]["branch"],
            "chore/visura-auto-dev-guardrails",
        )
        self.assertEqual(result["default_branch_policy"]["branch"], "main")
        self.assertEqual(result["review_snapshot"]["review_audit"]["observed_review_count"], 0)
        self.assertEqual(sum(url.endswith("/pulls/37") for url, _ in called), 5)
        self.assertTrue(all(method == "GET" for _, method in called))
        self.assertTrue(all(url.startswith("https://api.github.com/") for url, _ in called))
        self.assertFalse(result["repository_policy_verified"])
        self.assertFalse(result["execution_authorized"])

    def test_full_mock_rest_audit_compares_target_required_checks_without_authority(self):
        # Exercise the real snapshot + policy + check-run + comparison + summary
        # together, while never contacting GitHub or granting merge rights.
        self.check_mock_patch.stop()
        self.comparison_mock_patch.stop()
        self.legacy_mock_patch.stop()
        self.legacy_comparison_patch.stop()

        class FakeResponse:
            def __init__(self, payload):
                self.payload = json.dumps(payload).encode("utf-8")
            def __enter__(self):
                return self
            def __exit__(self, *args):
                return False
            def read(self, length):
                return self.payload[:length]

        calls = []
        def opener(request, timeout):
            url = request.full_url
            calls.append((url, request.get_method()))
            if url.endswith("/pulls/37"):
                return FakeResponse(fixture_pr())
            if "/pulls/37/reviews?" in url:
                return FakeResponse([])
            if "/branches/" in url and url.endswith("/protection"):
                if "chore%2Fvisura-auto-dev-guardrails" in url:
                    return FakeResponse({
                        "required_status_checks": {
                            "checks": [
                                {"context": "CI / review", "app_id": 42},
                                {"context": "legacy / status"},
                            ],
                        },
                    })
                return FakeResponse({})
            if "/rulesets?" in url or "/rules/branches/" in url:
                return FakeResponse([])
            if "/check-runs?" in url:
                return FakeResponse({"total_count": 1, "check_runs": [{
                    "id": 1234, "head_sha": HEAD, "name": "CI / review",
                    "app": {"id": 42}, "status": "completed",
                    "conclusion": "success",
                }]})
            if "/statuses?" in url:
                return FakeResponse([{
                    "id": 50, "sha": HEAD, "context": "legacy / status",
                    "state": "success",
                }, {
                    "id": 49, "sha": HEAD, "context": "legacy / status",
                    "state": "failure",
                }, {
                    "id": 48, "sha": HEAD, "context": "CI / review",
                    "state": "success",
                }])
            raise AssertionError("Unexpected REST URL: " + url)

        result = inspect_readonly_audit_bundle(
            REPO, 37, "main", "fake-token", opener=opener
        )
        observation = result["required_check_observations"]
        self.assertEqual(observation["lookup"], "candidate_match_only")
        self.assertEqual(observation["required_context_count"], 2)
        self.assertEqual(observation["candidate_success_count"], 1)
        legacy = result["legacy_status_observations"]
        self.assertEqual(legacy["required_context_count"], 2)
        self.assertEqual(legacy["candidate_latest_success_count"], 1)
        self.assertEqual(legacy["app_pinned_unverifiable_count"], 1)
        self.assertFalse(legacy["required_checks_verified"])
        self.assertEqual(
            result["legacy_commit_statuses"]["latest_state_counts"]["success"], 2
        )
        self.assertFalse(observation["required_checks_verified"])
        self.assertFalse(result["merge_authorized"])
        markdown = render_readonly_audit_summary(result)
        self.assertIn("Coincidencias candidatas", markdown)
        self.assertIn("NO confirma", markdown)
        self.assertTrue(all(method == "GET" for _, method in calls))
        self.assertEqual(sum(url.endswith("/pulls/37") for url, _ in calls), 5)

    def test_cli_writes_step_summary_without_exposing_token(self):
        output = io.StringIO()
        with tempfile.TemporaryDirectory() as directory:
            summary_path = Path(directory) / "audit-summary.md"
            summary_path.write_text("# Existing summary\\n", encoding="utf-8")
            with patch.dict(os.environ, {
                "GITHUB_TOKEN": "very-secret-token",
                "GITHUB_STEP_SUMMARY": str(summary_path),
            }):
                with patch(
                    "scripts.visura_github_audit_bundle.inspect_readonly_audit_bundle",
                    return_value={"execution_authorized": False},
                ):
                    with patch(
                        "scripts.visura_github_audit_bundle.render_readonly_audit_summary",
                        return_value="# VISURA\\nNo authorization.",
                    ) as renderer:
                        with redirect_stdout(output):
                            self.assertEqual(main([REPO, "37", "main"]), 0)
            summary = summary_path.read_text(encoding="utf-8")
            self.assertTrue(summary.startswith("# Existing summary"))
            self.assertIn("# VISURA", summary)
            self.assertIn("No authorization.", summary)
            self.assertNotIn("very-secret-token", summary)
            self.assertNotIn("very-secret-token", output.getvalue())
            renderer.assert_called_once()

    def test_cli_rejects_invalid_report_before_writing_summary(self):
        with tempfile.TemporaryDirectory() as directory:
            summary_path = Path(directory) / "audit-summary.md"
            with patch.dict(os.environ, {
                "GITHUB_TOKEN": "token",
                "GITHUB_STEP_SUMMARY": str(summary_path),
            }):
                with patch(
                    "scripts.visura_github_audit_bundle.inspect_readonly_audit_bundle",
                    return_value={"execution_authorized": True},
                ):
                    with self.assertRaisesRegex(ValueError, "non-authorizing"):
                        main([REPO, "37", "main"])
            self.assertFalse(summary_path.exists())

    def test_cli_does_not_print_secret(self):
        output = io.StringIO()
        with patch.dict(os.environ, {"GITHUB_TOKEN": "secret-not-for-logs", "GITHUB_STEP_SUMMARY": ""}):
            with patch(
                "scripts.visura_github_audit_bundle.inspect_readonly_audit_bundle",
                return_value={"execution_authorized": False},
            ):
                with redirect_stdout(output):
                    self.assertEqual(main([REPO, "37", "main"]), 0)
        self.assertNotIn("secret-not-for-logs", output.getvalue())
        self.assertFalse(json.loads(output.getvalue())["execution_authorized"])


    def test_real_permission_observer_runs_before_final_pr_recheck(self):
        snapshot = fixture_snapshot()
        snapshot['reviews'] = [{'review_id': 600, 'reviewer_numeric_id': 456,
            'reviewer_login': 'reviewer', 'state': 'APPROVED', 'commit_sha': HEAD}]
        events = []
        def transport(request, timeout):
            events.append('permission')
            self.assertEqual(request.get_method(), 'GET')
            self.assertTrue(request.full_url.endswith('/collaborators/reviewer/permission'))
            return io.BytesIO(json.dumps({'permission': 'write',
                'user': {'id': 456, 'login': 'reviewer'}}).encode())
        def final(*args):
            events.append('final_pr')
            return fixture_pr()
        with patch('scripts.visura_github_audit_bundle.fetch_readonly_review_snapshot', return_value=snapshot), patch(
            'scripts.visura_github_audit_bundle.inspect_branch_policy', return_value={}), patch(
            'scripts.visura_github_audit_bundle._get_json', side_effect=final):
            result = inspect_readonly_audit_bundle(REPO, 37, 'main', 'token', opener=transport)
        self.assertEqual(events, ['permission', 'permission', 'final_pr'])
        evidence = result['reviewer_repository_permissions']
        self.assertEqual(evidence['lookup'], 'observed')
        self.assertEqual(evidence['observations'][0]['reviewer_numeric_id'], 456)
        self.assertFalse(result['execution_authorized'])


if __name__ == "__main__":
    unittest.main()
