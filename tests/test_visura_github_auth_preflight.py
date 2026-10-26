import io
import json
import os
import unittest
from pathlib import Path
from contextlib import redirect_stdout
from unittest.mock import patch
from urllib.error import HTTPError

from scripts.visura_github_auth_preflight import (
    inspect_readonly_auth_preflight, main,
)


REPO = "owner/repo"
SHA = "a" * 40


def repo_metadata(**extra):
    return {"id": 4, "full_name": REPO, "default_branch": "main", **extra}


def pr_metadata(**extra):
    return {
        "number": 47,
        "base": {"repo": {"full_name": REPO}, "ref": "feature/review"},
        "head": {"sha": SHA},
        "state": "open",
        **extra,
    }


class FakeResponse:
    def __init__(self, payload):
        self.data = json.dumps(payload).encode("utf-8")

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def read(self, size):
        return self.data[:size]


def transport(repo_data=None, pr_data=None, repo_error=None, pr_error=None):
    calls = []

    def opener(request, timeout):
        calls.append(request)
        assert timeout == 10
        if request.full_url == "https://api.github.com/repos/owner/repo":
            if repo_error is not None:
                raise HTTPError(request.full_url, repo_error, "unavailable", {}, None)
            return FakeResponse(repo_metadata() if repo_data is None else repo_data)
        if request.full_url == "https://api.github.com/repos/owner/repo/pulls/47":
            if pr_error is not None:
                raise HTTPError(request.full_url, pr_error, "unavailable", {}, None)
            return FakeResponse(pr_metadata() if pr_data is None else pr_data)
        raise AssertionError("Unexpected API URL: " + request.full_url)

    return opener, calls


class ReadonlyAuthPreflightTests(unittest.TestCase):
    def test_uses_only_two_fixed_bearer_gets_without_granting_permission(self):
        opener, calls = transport()
        report = inspect_readonly_auth_preflight(REPO, 47, "test-token", opener)
        self.assertEqual(report["repository_lookup"], "retrieved")
        self.assertEqual(report["pull_request_lookup"], "retrieved")
        self.assertEqual(report["observed_base_branch"], "feature/review")
        self.assertEqual(report["observed_head_sha"], SHA)
        self.assertEqual(len(calls), 2)
        self.assertTrue(all(req.get_method() == "GET" for req in calls))
        self.assertTrue(all(req.data is None for req in calls))
        self.assertTrue(all(req.get_header("Authorization") == "Bearer test-token"
                            for req in calls))
        self.assertNotIn("test-token", json.dumps(report))
        for key in (
            "token_scopes_verified", "authenticated_caller_identity_verified",
            "effective_branch_policy_verified", "reviewer_eligibility_verified",
            "execution_authorized", "merge_authorized", "deployment_authorized",
        ):
            self.assertIs(report[key], False)

    def test_repository_401_403_404_never_queries_pr(self):
        for status, label in ((401, "unauthorized"), (403, "inaccessible"),
                              (404, "not_found_or_inaccessible")):
            with self.subTest(status=status):
                opener, calls = transport(repo_error=status)
                report = inspect_readonly_auth_preflight(REPO, 47, "token", opener)
                self.assertEqual(report["repository_lookup"], label)
                self.assertEqual(report["pull_request_lookup"], "not_queried")
                self.assertIsNone(report["observed_head_sha"])
                self.assertFalse(report["execution_authorized"])
                self.assertEqual(len(calls), 1)

    def test_pr_403_404_are_unknown_not_access_granted(self):
        for status, label in ((403, "inaccessible"), (404, "not_found_or_inaccessible")):
            with self.subTest(status=status):
                opener, calls = transport(pr_error=status)
                report = inspect_readonly_auth_preflight(REPO, 47, "token", opener)
                self.assertEqual(report["repository_lookup"], "retrieved")
                self.assertEqual(report["pull_request_lookup"], label)
                self.assertIsNone(report["observed_base_branch"])
                self.assertEqual(len(calls), 2)

    def test_rate_limit_and_server_error_propagate(self):
        for status in (429, 500):
            with self.subTest(status=status):
                opener, _ = transport(pr_error=status)
                with self.assertRaises(HTTPError):
                    inspect_readonly_auth_preflight(REPO, 47, "token", opener)

    def test_repository_identity_or_type_mismatch_fails_closed(self):
        for mismatch in (
            repo_metadata(full_name="other/repo"),
            repo_metadata(id=True),
            repo_metadata(default_branch="../invalid"),
            [],
            {},
        ):
            with self.subTest(mismatch=mismatch):
                opener, calls = transport(repo_data=mismatch)
                with self.assertRaises(ValueError):
                    inspect_readonly_auth_preflight(REPO, 47, "token", opener)
                self.assertEqual(len(calls), 1)

    def test_pr_identity_sha_and_base_mismatch_fail_closed(self):
        for mismatch in (
            pr_metadata(number=48),
            pr_metadata(number=True),
            pr_metadata(head={"sha": "bad"}),
            pr_metadata(base={"repo": {"full_name": "other/repo"}, "ref": "main"}),
            pr_metadata(base={"repo": {"full_name": REPO}, "ref": "../main"}),
            pr_metadata(state="merged"),
            [],
            {},
        ):
            with self.subTest(mismatch=mismatch):
                opener, calls = transport(pr_data=mismatch)
                with self.assertRaises(ValueError):
                    inspect_readonly_auth_preflight(REPO, 47, "token", opener)
                self.assertEqual(len(calls), 2)

    def test_input_validation_before_network(self):
        invalid = (
            ("owner/../repo", 47, "token"), (REPO, True, "token"),
            (REPO, 0, "token"), (REPO, 47, ""),
            (REPO, 47, " test-token"), (REPO, 47, "token\nInjected: x"),
            (REPO, 47, "token\rBad: x"), (REPO, 47, "token\x00"),
            (REPO, 47, "x" * 2049), (REPO, 47, None),
        )
        for repository, number, token in invalid:
            with self.subTest(repository=repository, number=number):
                opener, calls = transport()
                with self.assertRaises(ValueError):
                    inspect_readonly_auth_preflight(repository, number, token, opener)
                self.assertEqual(calls, [])

    def test_cli_reads_env_only_and_never_echoes_secret(self):
        output = io.StringIO()
        with patch.dict(os.environ, {"GITHUB_TOKEN": "secret-example"}):
            with patch(
                "scripts.visura_github_auth_preflight.inspect_readonly_auth_preflight",
                return_value={"repository_lookup": "retrieved",
                              "execution_authorized": False},
            ) as observer:
                with redirect_stdout(output):
                    self.assertEqual(main([REPO, "47"]), 0)
        self.assertEqual(observer.call_args.args[:3], (REPO, 47, "secret-example"))
        self.assertNotIn("secret-example", output.getvalue())
        self.assertFalse(json.loads(output.getvalue())["execution_authorized"])


class ManualWorkflowPreflightTests(unittest.TestCase):
    def test_manual_audit_uses_trusted_default_and_preflight_first(self):
        path = (
            Path(__file__).resolve().parents[1] / ".github" / "workflows"
            / "visura-auto-dev-manual-review-audit.yml"
        )
        workflow = path.read_text(encoding="utf-8")
        self.assertIn("workflow_dispatch:", workflow)
        self.assertNotIn("pull_request_target:", workflow)
        self.assertNotIn("\npush:", workflow)
        self.assertIn("persist-credentials: false", workflow)
        self.assertIn("ref: ${{ github.event.repository.default_branch }}", workflow)
        preflight = workflow.index("scripts.visura_github_auth_preflight")
        audit = workflow.index("scripts.visura_github_audit_bundle")
        self.assertLess(preflight, audit)
        self.assertIn("contents: read", workflow)
        self.assertIn("pull-requests: read", workflow)
        self.assertIn("checks: read", workflow)
        self.assertNotIn("contents: write", workflow)
        self.assertNotIn("pull-requests: write", workflow)
        self.assertNotIn("permissions: write-all", workflow)


if __name__ == "__main__":
    unittest.main()
