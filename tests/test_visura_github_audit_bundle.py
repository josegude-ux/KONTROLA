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

REPO = "josegude-ux/KONTROLA"
HEAD = "a" * 40
BASE = "c" * 40


def fixture_snapshot(branch="chore/visura-auto-dev-guardrails"):
    return {
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
        self.assertEqual(policy_calls, ["chore/visura-auto-dev-guardrails", "main"])
        self.assertTrue(result["target_differs_from_default"])
        self.assertEqual(
            result["target_branch_policy"]["branch"],
            "chore/visura-auto-dev-guardrails",
        )
        self.assertEqual(result["default_branch_policy"]["branch"], "main")
        self.assertFalse(result["report_is_atomic"])
        self.assertFalse(result["execution_authorized"])
        self.assertFalse(result["merge_authorized"])

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

    def test_same_target_as_default_is_queried_once(self):
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
        self.assertEqual(policy.call_count, 1)
        self.assertFalse(result["target_differs_from_default"])

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
        self.assertEqual(sum(url.endswith("/pulls/37") for url, _ in called), 3)
        self.assertTrue(all(method == "GET" for _, method in called))
        self.assertTrue(all(url.startswith("https://api.github.com/") for url, _ in called))
        self.assertFalse(result["repository_policy_verified"])
        self.assertFalse(result["execution_authorized"])

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


if __name__ == "__main__":
    unittest.main()
