import io
import json
import os
import unittest
from contextlib import redirect_stdout
from unittest.mock import patch
from urllib.error import HTTPError

from scripts.visura_github_policy_probe import inspect_branch_policy, main

REPO = "josegude-ux/KONTROLA"


class FakeResponse:
    def __init__(self, payload):
        self.payload = json.dumps(payload).encode("utf-8")

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def read(self, limit):
        return self.payload[:limit]


def fake_api(classic=None, rulesets=None, classic_error=None, rulesets_error=None):
    classic = {} if classic is None else classic
    rulesets = [[]] if rulesets is None else rulesets
    calls = []

    def opener(request, timeout):
        url = request.full_url
        calls.append((url, request.get_method()))
        if url.endswith("/protection"):
            if classic_error:
                raise HTTPError(url, classic_error, "No access", {}, None)
            return FakeResponse(classic)
        if "/rulesets?" in url:
            if rulesets_error:
                raise HTTPError(url, rulesets_error, "No access", {}, None)
            for page, data in enumerate(rulesets, 1):
                if url.endswith("page=" + str(page)):
                    return FakeResponse(data)
        raise AssertionError("Unexpected REST request " + url)

    return opener, calls


class GitHubPolicyProbeTests(unittest.TestCase):
    def test_classic_requirements_are_only_observations(self):
        opener, calls = fake_api(
            classic={
                "required_pull_request_reviews": {"required_approving_review_count": 2},
                "required_status_checks": {"contexts": ["tests"]},
                "enforce_admins": {"enabled": True},
            }
        )
        result = inspect_branch_policy(REPO, "main", "secret", opener=opener)
        self.assertEqual(result["classic_protection"]["lookup"], "retrieved")
        self.assertEqual(
            result["classic_protection"]["required_approving_review_count"], 2
        )
        self.assertTrue(result["classic_protection"]["enforce_admins_enabled"])
        self.assertFalse(result["repository_policy_verified"])
        self.assertFalse(result["execution_authorized"])
        self.assertFalse(result["merge_authorized"])
        self.assertTrue(all(method == "GET" for _, method in calls))
        self.assertTrue(all(url.startswith("https://api.github.com/") for url, _ in calls))

    def test_classic_404_is_unknown_not_unprotected(self):
        opener, _ = fake_api(classic_error=404)
        result = inspect_branch_policy(REPO, "main", "secret", opener=opener)
        self.assertEqual(
            result["classic_protection"]["lookup"], "not_found_or_inaccessible"
        )
        self.assertIsNone(result["classic_protection"]["pull_request_reviews_configured"])
        self.assertFalse(result["repository_policy_verified"])

    def test_classic_403_and_ruleset_403_remain_unknown(self):
        opener, _ = fake_api(classic_error=403, rulesets_error=403)
        result = inspect_branch_policy(REPO, "main", "secret", opener=opener)
        self.assertEqual(result["classic_protection"]["lookup"], "inaccessible")
        self.assertEqual(result["rulesets"]["lookup"], "inaccessible")
        self.assertIsNone(result["rulesets"]["listed_count"])
        self.assertFalse(result["merge_authorized"])

    def test_listed_rulesets_do_not_verify_applicability(self):
        opener, _ = fake_api(
            rulesets=[[{"id": 12, "enforcement": "active"},
                       {"id": 13, "enforcement": "disabled"}]]
        )
        result = inspect_branch_policy(REPO, "main", "secret", opener=opener)
        self.assertEqual(result["rulesets"]["listed_count"], 2)
        self.assertEqual(result["rulesets"]["listed_active_count"], 1)
        self.assertFalse(result["rulesets"]["branch_applicability_verified"])
        self.assertFalse(result["repository_policy_verified"])

    def test_ruleset_pages_are_collected(self):
        first = [{"id": i, "enforcement": "active"} for i in range(1, 101)]
        second = [{"id": 101, "enforcement": "disabled"}]
        opener, _ = fake_api(rulesets=[first, second])
        result = inspect_branch_policy(REPO, "main", "secret", opener=opener)
        self.assertEqual(result["rulesets"]["listed_count"], 101)
        self.assertEqual(result["rulesets"]["listed_active_count"], 100)

    def test_truncated_rulesets_fail_closed(self):
        page = [{"id": i, "enforcement": "active"} for i in range(1, 101)]
        opener, _ = fake_api(rulesets=[page] * 5)
        with self.assertRaisesRegex(ValueError, "incomplete result"):
            inspect_branch_policy(REPO, "main", "secret", opener=opener)

    def test_malformed_ruleset_fails_closed(self):
        opener, _ = fake_api(rulesets=[[{"id": True, "enforcement": "active"}]])
        with self.assertRaisesRegex(ValueError, "Invalid GitHub ruleset record"):
            inspect_branch_policy(REPO, "main", "secret", opener=opener)

    def test_invalid_review_count_fails_closed(self):
        opener, _ = fake_api(
            classic={"required_pull_request_reviews":
                     {"required_approving_review_count": "2"}}
        )
        with self.assertRaisesRegex(ValueError, "Invalid required approving"):
            inspect_branch_policy(REPO, "main", "secret", opener=opener)

    def test_branch_input_rejected_before_any_http(self):
        with self.assertRaisesRegex(ValueError, "Invalid branch"):
            inspect_branch_policy(REPO, "../main", "secret")

    def test_missing_token_rejected(self):
        with self.assertRaisesRegex(ValueError, "GitHub token"):
            inspect_branch_policy(REPO, "main", "")

    def test_branch_slash_is_url_encoded(self):
        opener, calls = fake_api()
        inspect_branch_policy(REPO, "release/test", "secret", opener=opener)
        self.assertIn("/branches/release%2Ftest/protection", calls[0][0])

    def test_cli_prints_no_token_or_execution_authorization(self):
        output = io.StringIO()
        with patch.dict(os.environ, {"GITHUB_TOKEN": "hidden-token"}):
            with patch(
                "scripts.visura_github_policy_probe.inspect_branch_policy",
                return_value={"execution_authorized": False},
            ):
                with redirect_stdout(output):
                    self.assertEqual(main([REPO, "main"]), 0)
        self.assertNotIn("hidden-token", output.getvalue())
        self.assertFalse(json.loads(output.getvalue())["execution_authorized"])


if __name__ == "__main__":
    unittest.main()
