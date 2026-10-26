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


def fake_api(
    classic=None, rulesets=None, classic_error=None, rulesets_error=None,
    effective=None, effective_error=None,
):
    classic = {} if classic is None else classic
    rulesets = [[]] if rulesets is None else rulesets
    effective = [[]] if effective is None else effective
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
        if "/rules/branches/" in url:
            if effective_error:
                raise HTTPError(url, effective_error, "No access", {}, None)
            for page, data in enumerate(effective, 1):
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

    def test_active_branch_rule_endpoint_distinguishes_applied_from_listed(self):
        opener, calls = fake_api(
            rulesets=[[{"id": 1, "enforcement": "active"},
                       {"id": 2, "enforcement": "active"}]],
            effective=[[{
                "type": "pull_request",
                "ruleset_id": 1,
                "ruleset_source_type": "Repository",
            }]],
        )
        result = inspect_branch_policy(REPO, "main", "secret", opener=opener)
        self.assertEqual(result["rulesets"]["listed_active_count"], 2)
        rules = result["effective_ruleset_rules"]
        self.assertEqual(rules["lookup"], "retrieved")
        self.assertEqual(rules["observed_rule_count"], 1)
        self.assertEqual(rules["observed_rule_types"], ["pull_request"])
        self.assertTrue(rules["applied_ruleset_api_responded"])
        self.assertFalse(rules["includes_classic_branch_protection"])
        self.assertFalse(result["repository_policy_verified"])
        self.assertFalse(result["merge_authorized"])
        self.assertTrue(any("/rules/branches/main?per_page=" in u for u, _ in calls))

    def test_empty_applied_rules_never_claims_branch_unprotected(self):
        opener, _ = fake_api(classic_error=404, effective=[[]])
        result = inspect_branch_policy(REPO, "main", "secret", opener=opener)
        self.assertEqual(result["effective_ruleset_rules"]["observed_rule_count"], 0)
        self.assertEqual(
            result["classic_protection"]["lookup"], "not_found_or_inaccessible"
        )
        self.assertFalse(result["repository_policy_verified"])

    def test_active_branch_rule_lookup_403_stays_unknown(self):
        opener, _ = fake_api(effective_error=403)
        result = inspect_branch_policy(REPO, "main", "secret", opener=opener)
        self.assertEqual(result["effective_ruleset_rules"]["lookup"], "inaccessible")
        self.assertIsNone(
            result["effective_ruleset_rules"]["observed_rule_count"]
        )
        self.assertFalse(result["execution_authorized"])

    def test_active_branch_rule_lookup_404_stays_unknown(self):
        opener, _ = fake_api(effective_error=404)
        result = inspect_branch_policy(REPO, "main", "secret", opener=opener)
        self.assertEqual(
            result["effective_ruleset_rules"]["lookup"],
            "not_found_or_inaccessible",
        )
        self.assertFalse(result["repository_policy_verified"])

    def test_active_rules_pagination_is_complete(self):
        first = [{"type": "pull_request", "ruleset_id": 1}] * 100
        second = [{"type": "required_status_checks", "ruleset_id": 2}]
        opener, _ = fake_api(effective=[first, second])
        result = inspect_branch_policy(REPO, "main", "secret", opener=opener)
        self.assertEqual(result["effective_ruleset_rules"]["observed_rule_count"], 101)
        self.assertEqual(
            result["effective_ruleset_rules"]["observed_rule_types"],
            ["pull_request", "required_status_checks"],
        )

    def test_active_rules_truncation_fails_closed(self):
        page = [{"type": "pull_request", "ruleset_id": 1}] * 100
        opener, _ = fake_api(effective=[page] * 5)
        with self.assertRaisesRegex(ValueError, "incomplete result"):
            inspect_branch_policy(REPO, "main", "secret", opener=opener)

    def test_active_rule_invalid_id_fails_closed(self):
        opener, _ = fake_api(effective=[[{"type": "pull_request", "ruleset_id": True}]])
        with self.assertRaisesRegex(ValueError, "Invalid active branch rule metadata"):
            inspect_branch_policy(REPO, "main", "secret", opener=opener)

    def test_branch_name_is_encoded_for_applied_endpoint(self):
        opener, calls = fake_api()
        inspect_branch_policy(REPO, "release/test", "secret", opener=opener)
        self.assertTrue(any(
            "/rules/branches/release%2Ftest?" in u for u, _ in calls
        ))

    def test_classic_required_check_contexts_and_app_id_are_extracted(self):
        opener, _ = fake_api(classic={"required_status_checks": {
            "checks": [
                {"context": "test / build", "app_id": 123},
                {"context": "lint", "app_id": -1},
            ],
            "contexts": ["legacy-name"],
        }})
        result = inspect_branch_policy(REPO, "main", "secret", opener=opener)
        self.assertEqual(result["classic_protection"]["required_check_contexts"], [
            {"context": "test / build", "app_id": 123},
            {"context": "lint", "app_id": -1},
        ])
        self.assertFalse(result["repository_policy_verified"])

    def test_classic_contexts_fallback_does_not_claim_app_identity(self):
        opener, _ = fake_api(classic={"required_status_checks": {
            "contexts": ["build", "tests"],
        }})
        result = inspect_branch_policy(REPO, "main", "secret", opener=opener)
        self.assertEqual(result["classic_protection"]["required_check_contexts"], [
            {"context": "build", "app_id": None},
            {"context": "tests", "app_id": None},
        ])

    def test_no_classic_status_checks_means_empty_classic_only(self):
        opener, _ = fake_api()
        result = inspect_branch_policy(REPO, "main", "secret", opener=opener)
        self.assertEqual(result["classic_protection"]["required_check_contexts"], [])
        self.assertEqual(result["effective_ruleset_rules"]["required_check_contexts"], [])
        self.assertFalse(result["repository_policy_verified"])

    def test_inaccessible_classic_requirements_are_unknown(self):
        opener, _ = fake_api(classic_error=403)
        result = inspect_branch_policy(REPO, "main", "secret", opener=opener)
        self.assertIsNone(result["classic_protection"]["required_check_contexts"])

    def test_active_ruleset_required_check_contexts_are_extracted(self):
        opener, _ = fake_api(effective=[[{
            "type": "required_status_checks", "ruleset_id": 1,
            "parameters": {"required_status_checks": [
                {"context": "CI / test", "integration_id": 321}
            ]},
        }]])
        result = inspect_branch_policy(REPO, "main", "secret", opener=opener)
        applied = result["effective_ruleset_rules"]
        self.assertTrue(applied["required_contexts_available"])
        self.assertEqual(applied["required_check_contexts"], [
            {"context": "CI / test", "app_id": 321},
        ])
        self.assertFalse(result["merge_authorized"])

    def test_missing_ruleset_parameters_never_looks_like_no_requirements(self):
        opener, _ = fake_api(effective=[[{
            "type": "required_status_checks", "ruleset_id": 2,
        }]])
        result = inspect_branch_policy(REPO, "main", "secret", opener=opener)
        applied = result["effective_ruleset_rules"]
        self.assertIsNone(applied["required_check_contexts"])
        self.assertFalse(applied["required_contexts_available"])

    def test_bad_required_app_id_rejected(self):
        opener, _ = fake_api(classic={"required_status_checks": {
            "checks": [{"context": "CI", "app_id": True}],
        }})
        with self.assertRaisesRegex(ValueError, "Invalid required check"):
            inspect_branch_policy(REPO, "main", "secret", opener=opener)

    def test_duplicate_required_checks_rejected(self):
        opener, _ = fake_api(effective=[[{
            "type": "required_status_checks", "ruleset_id": 3,
            "parameters": {"required_status_checks": [
                {"context": "tests"}, {"context": "tests"},
            ]},
        }]])
        with self.assertRaisesRegex(ValueError, "Duplicate required check"):
            inspect_branch_policy(REPO, "main", "secret", opener=opener)

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



class AppliedPullRequestApprovalObservationsTests(unittest.TestCase):
    def test_zero_approvals_is_observed_without_authorization(self):
        opener, calls = fake_api(effective=[[{
            "type": "pull_request", "ruleset_id": 25846536,
            "parameters": {"required_approving_review_count": 0},
        }]])
        result = inspect_branch_policy(REPO, "main", "secret", opener=opener)
        applied = result["effective_ruleset_rules"]
        self.assertTrue(applied["review_requirements_available"])
        self.assertEqual(applied["pull_request_approval_requirements"], [{
            "ruleset_id": 25846536, "required_approving_review_count": 0,
            "dismiss_stale_reviews_on_push": None,
            "require_code_owner_review": None,
            "require_last_push_approval": None,
            "required_review_thread_resolution": None,
            "require_extra_approval_for_unattributed_changes": None,
        }])
        self.assertFalse(applied["active_review_control_fields_complete"])
        self.assertFalse(result["repository_policy_verified"])
        self.assertFalse(result["execution_authorized"])
        self.assertFalse(result["merge_authorized"])
        self.assertTrue(all(method == "GET" for _, method in calls))

    def test_all_active_review_controls_are_observed_without_authorization(self):
        controls = {
            "dismiss_stale_reviews_on_push": True,
            "require_code_owner_review": False,
            "require_last_push_approval": True,
            "required_review_thread_resolution": True,
            "require_extra_approval_for_unattributed_changes": False,
        }
        opener, calls = fake_api(effective=[[{
            "type": "pull_request", "ruleset_id": 10,
            "parameters": {"required_approving_review_count": 2, **controls},
        }]])
        result = inspect_branch_policy(REPO, "base/agent", "test-token", opener=opener)
        policy = result["effective_ruleset_rules"]
        self.assertTrue(policy["review_requirements_available"])
        self.assertTrue(policy["active_review_control_fields_complete"])
        self.assertEqual(policy["pull_request_approval_requirements"], [{
            "ruleset_id": 10, "required_approving_review_count": 2, **controls,
        }])
        for field in ("repository_policy_verified", "execution_authorized",
                      "merge_authorized", "deployment_authorized"):
            self.assertFalse(result[field])
        self.assertTrue(all(method == "GET" for _, method in calls))

    def test_incomplete_review_controls_remain_unknown(self):
        opener, _ = fake_api(effective=[[{
            "type": "pull_request", "ruleset_id": 10,
            "parameters": {
                "required_approving_review_count": 1,
                "require_code_owner_review": False,
            },
        }]])
        policy = inspect_branch_policy(
            REPO, "main", "token", opener=opener
        )["effective_ruleset_rules"]
        self.assertTrue(policy["review_requirements_available"])
        self.assertFalse(policy["active_review_control_fields_complete"])
        observation = policy["pull_request_approval_requirements"][0]
        self.assertIs(observation["require_code_owner_review"], False)
        self.assertIsNone(observation["require_last_push_approval"])

    def test_invalid_review_control_types_fail_closed(self):
        for field in (
            "dismiss_stale_reviews_on_push",
            "require_code_owner_review",
            "require_last_push_approval",
            "required_review_thread_resolution",
            "require_extra_approval_for_unattributed_changes",
        ):
            for invalid in ("false", 0, None, [], {}):
                with self.subTest(field=field, invalid=invalid):
                    opener, _ = fake_api(effective=[[{
                        "type": "pull_request", "ruleset_id": 10,
                        "parameters": {"required_approving_review_count": 1,
                                       field: invalid},
                    }]])
                    with self.assertRaisesRegex(
                        ValueError, "Invalid active pull request review control"
                    ):
                        inspect_branch_policy(REPO, "main", "token", opener=opener)

    def test_inaccessible_active_controls_do_not_claim_completeness(self):
        opener, _ = fake_api(effective_error=403)
        policy = inspect_branch_policy(
            REPO, "main", "token", opener=opener
        )["effective_ruleset_rules"]
        self.assertFalse(policy["active_review_control_fields_complete"])
        self.assertIsNone(policy["pull_request_approval_requirements"])

    def test_missing_review_parameters_stay_unknown(self):
        opener, _ = fake_api(effective=[[{
            "type": "pull_request", "ruleset_id": 25846536,
        }]])
        applied = inspect_branch_policy(
            REPO, "main", "secret", opener=opener
        )["effective_ruleset_rules"]
        self.assertFalse(applied["review_requirements_available"])
        self.assertIsNone(applied["pull_request_approval_requirements"])

    def test_inaccessible_effective_rules_stay_unknown(self):
        opener, _ = fake_api(effective_error=403)
        applied = inspect_branch_policy(
            REPO, "main", "secret", opener=opener
        )["effective_ruleset_rules"]
        self.assertFalse(applied["review_requirements_available"])
        self.assertIsNone(applied["pull_request_approval_requirements"])

    def test_invalid_review_counts_fail_closed(self):
        for bad in (True, -1, "0", None):
            with self.subTest(bad=bad):
                opener, _ = fake_api(effective=[[{
                    "type": "pull_request", "ruleset_id": 25846536,
                    "parameters": {"required_approving_review_count": bad},
                }]])
                with self.assertRaisesRegex(
                    ValueError, "Invalid active required approving review count"
                ):
                    inspect_branch_policy(REPO, "main", "secret", opener=opener)


if __name__ == "__main__":
    unittest.main()
