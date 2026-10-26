import json
import unittest
from urllib.error import HTTPError

from scripts.visura_github_legacy_statuses import (
    observe_legacy_commit_statuses, compare_legacy_status_candidates,
)

REPO = "josegude-ux/KONTROLA"
SHA = "a" * 40


class FakeResponse:
    def __init__(self, data):
        self.payload = json.dumps(data).encode("utf-8")

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def read(self, limit):
        return self.payload[:limit]


def record(identifier=1, context="CI / test", state="success", sha=SHA):
    return {"id": identifier, "sha": sha, "context": context, "state": state}


def fake_api(pages=None, error=None):
    pages = [[]] if pages is None else pages
    calls = []

    def opener(request, timeout):
        calls.append((request.full_url, request.get_method()))
        if error:
            raise HTTPError(request.full_url, error, "No access", {}, None)
        for number, rows in enumerate(pages, 1):
            if request.full_url.endswith("page=" + str(number)):
                return FakeResponse(rows)
        raise AssertionError("Unexpected page")

    return opener, calls


def required_policy(classic=None, active=None, classic_lookup="retrieved",
                    applied_lookup="retrieved"):
    return {
        "classic_protection": {
            "lookup": classic_lookup,
            "required_check_contexts": [] if classic is None else classic,
        },
        "effective_ruleset_rules": {
            "lookup": applied_lookup,
            "required_contexts_available": applied_lookup == "retrieved",
            "required_check_contexts": [] if active is None else active,
        },
        "repository_policy_verified": False,
        "execution_authorized": False,
        "merge_authorized": False,
        "deployment_authorized": False,
    }


def requirement(context="CI / test", app_id=None):
    return {"context": context, "app_id": app_id}


def status_snapshot(rows=None, lookup="retrieved"):
    return {
        "lookup": lookup,
        "latest_context_states": [] if rows is None else rows,
        "required_checks_verified": False,
        "branch_policy_verified": False,
        "execution_authorized": False,
        "merge_authorized": False,
        "deployment_authorized": False,
    }


class LegacyCommitStatusTests(unittest.TestCase):
    def test_reads_success_and_pending_from_exact_commit_without_authority(self):
        opener, calls = fake_api([[record(1), record(2, "lint", "pending")]])
        result = observe_legacy_commit_statuses(REPO, SHA, "secret", opener=opener)
        self.assertEqual(result["observed_status_records"], 2)
        self.assertEqual(result["observed_latest_contexts"], 2)
        self.assertEqual(result["latest_state_counts"]["success"], 1)
        self.assertEqual(result["latest_state_counts"]["pending"], 1)
        self.assertFalse(result["required_checks_verified"])
        self.assertFalse(result["merge_authorized"])
        self.assertTrue(all(method == "GET" for _, method in calls))
        self.assertTrue(all(url.startswith("https://api.github.com/") for url, _ in calls))

    def test_newest_failure_cannot_be_overridden_by_old_success(self):
        opener, _ = fake_api([[record(10, state="failure"),
                               record(9, state="success")]])
        result = observe_legacy_commit_statuses(REPO, SHA, "secret", opener=opener)
        self.assertEqual(result["observed_status_records"], 2)
        self.assertEqual(result["observed_latest_contexts"], 1)
        self.assertEqual(result["latest_context_states"], [
            {"context": "CI / test", "state": "failure"},
        ])
        self.assertEqual(result["latest_state_counts"]["success"], 0)

    def test_errors_are_observed_not_approved(self):
        opener, _ = fake_api([[record(state="error")]])
        result = observe_legacy_commit_statuses(REPO, SHA, "secret", opener=opener)
        self.assertEqual(result["latest_state_counts"]["error"], 1)
        self.assertFalse(result["execution_authorized"])

    def test_no_statuses_never_verifies_requirements(self):
        opener, _ = fake_api([[]])
        result = observe_legacy_commit_statuses(REPO, SHA, "secret", opener=opener)
        self.assertEqual(result["observed_latest_contexts"], 0)
        self.assertFalse(result["required_checks_verified"])

    def test_403_returns_unknown_not_zero(self):
        opener, _ = fake_api(error=403)
        result = observe_legacy_commit_statuses(REPO, SHA, "secret", opener=opener)
        self.assertEqual(result["lookup"], "inaccessible_or_not_found")
        self.assertIsNone(result["observed_latest_contexts"])
        self.assertIsNone(result["latest_context_states"])

    def test_404_returns_unknown_not_zero(self):
        opener, _ = fake_api(error=404)
        result = observe_legacy_commit_statuses(REPO, SHA, "secret", opener=opener)
        self.assertIsNone(result["observed_status_records"])

    def test_pagination_keeps_newest_context_seen_first(self):
        page_one = [record(i, "CI / test", "failure") for i in range(101, 201)]
        page_two = [record(25, "CI / test", "success"),
                    record(20, "lint", "success")]
        opener, _ = fake_api([page_one, page_two])
        result = observe_legacy_commit_statuses(REPO, SHA, "secret", opener=opener)
        self.assertEqual(result["observed_status_records"], 102)
        self.assertEqual(result["observed_latest_contexts"], 2)
        self.assertEqual(result["latest_state_counts"]["failure"], 1)

    def test_too_many_pages_rejected(self):
        opener, _ = fake_api([
            [record(page * 100 + i + 1) for i in range(100)] for page in range(5)
        ])
        with self.assertRaisesRegex(ValueError, "incomplete listing"):
            observe_legacy_commit_statuses(REPO, SHA, "secret", opener=opener)

    def test_other_sha_rejected(self):
        opener, _ = fake_api([[record(sha="b" * 40)]])
        with self.assertRaisesRegex(ValueError, "Invalid legacy status metadata"):
            observe_legacy_commit_statuses(REPO, SHA, "secret", opener=opener)

    def test_boolean_id_rejected(self):
        opener, _ = fake_api([[record(identifier=True)]])
        with self.assertRaisesRegex(ValueError, "Invalid legacy status metadata"):
            observe_legacy_commit_statuses(REPO, SHA, "secret", opener=opener)

    def test_repeated_id_rejected(self):
        opener, _ = fake_api([[record(), record()]])
        with self.assertRaisesRegex(ValueError, "Duplicate legacy status ID"):
            observe_legacy_commit_statuses(REPO, SHA, "secret", opener=opener)

    def test_newline_in_context_rejected(self):
        opener, _ = fake_api([[record(context="CI\nforged")]])
        with self.assertRaisesRegex(ValueError, "Invalid legacy status metadata"):
            observe_legacy_commit_statuses(REPO, SHA, "secret", opener=opener)

    def test_invalid_sha_and_token_rejected_without_network(self):
        with self.assertRaisesRegex(ValueError, "Invalid GitHub commit SHA"):
            observe_legacy_commit_statuses(REPO, "invalid", "secret")
        with self.assertRaisesRegex(ValueError, "GitHub token"):
            observe_legacy_commit_statuses(REPO, SHA, "")


class LegacyCandidateTests(unittest.TestCase):
    def test_matching_latest_success_is_candidate_only(self):
        report = compare_legacy_status_candidates(
            required_policy(classic=[requirement()]),
            status_snapshot([{"context": "CI / test", "state": "success"}]),
        )
        self.assertEqual(report["lookup"], "candidate_contexts_only")
        self.assertEqual(report["candidate_context_match_count"], 1)
        self.assertEqual(report["candidate_latest_success_count"], 1)
        self.assertFalse(report["required_checks_verified"])
        self.assertFalse(report["legacy_context_origin_authenticated"])
        self.assertFalse(report["merge_authorized"])

    def test_failed_latest_state_cannot_count_success(self):
        report = compare_legacy_status_candidates(
            required_policy(classic=[requirement()]),
            status_snapshot([{"context": "CI / test", "state": "failure"}]),
        )
        self.assertEqual(report["candidate_context_match_count"], 1)
        self.assertEqual(report["candidate_latest_success_count"], 0)

    def test_required_app_cannot_be_verified_from_legacy_statuses(self):
        report = compare_legacy_status_candidates(
            required_policy(classic=[requirement(app_id=42)]),
            status_snapshot([{"context": "CI / test", "state": "success"}]),
        )
        self.assertEqual(report["app_pinned_unverifiable_count"], 1)
        self.assertEqual(report["candidate_context_match_count"], 0)
        self.assertEqual(report["candidate_latest_success_count"], 0)

    def test_ruleset_required_context_is_compared_without_origin_authority(self):
        report = compare_legacy_status_candidates(
            required_policy(active=[requirement(app_id=-1)]),
            status_snapshot([{"context": "CI / test", "state": "success"}]),
        )
        self.assertEqual(report["candidate_context_match_count"], 1)
        self.assertFalse(report["execution_authorized"])

    def test_deduplicates_classic_and_ruleset_identical_requirement(self):
        report = compare_legacy_status_candidates(
            required_policy(classic=[requirement()], active=[requirement()]),
            status_snapshot([{"context": "CI / test", "state": "success"}]),
        )
        self.assertEqual(report["required_context_count"], 1)

    def test_inaccessible_policy_stays_unknown(self):
        report = compare_legacy_status_candidates(
            required_policy(classic_lookup="inaccessible"),
            status_snapshot([{"context": "CI / test", "state": "success"}]),
        )
        self.assertEqual(report["lookup"], "unknown_policy_requirements")
        self.assertIsNone(report["candidate_latest_success_count"])

    def test_missing_legacy_data_stays_unknown(self):
        report = compare_legacy_status_candidates(
            required_policy(classic=[requirement()]),
            status_snapshot(lookup="inaccessible_or_not_found"),
        )
        self.assertEqual(report["lookup"], "unknown_legacy_statuses")
        self.assertIsNone(report["candidate_context_match_count"])

    def test_no_requirements_does_not_verify_policy(self):
        report = compare_legacy_status_candidates(
            required_policy(), status_snapshot(),
        )
        self.assertEqual(report["lookup"], "no_requirements_observed")
        self.assertFalse(report["required_checks_verified"])

    def test_unknown_or_duplicate_status_context_rejected(self):
        with self.assertRaisesRegex(ValueError, "Invalid legacy context metadata"):
            compare_legacy_status_candidates(
                required_policy(),
                status_snapshot([
                    {"context": "CI", "state": "success"},
                    {"context": "CI", "state": "failure"},
                ]),
            )

    def test_forged_merge_authority_is_rejected(self):
        observation = status_snapshot()
        observation["merge_authorized"] = True
        with self.assertRaisesRegex(ValueError, "must not grant authority"):
            compare_legacy_status_candidates(required_policy(), observation)

    def test_forged_policy_authority_is_rejected(self):
        policy = required_policy()
        policy["repository_policy_verified"] = True
        with self.assertRaisesRegex(ValueError, "must not grant authority"):
            compare_legacy_status_candidates(policy, status_snapshot())


if __name__ == "__main__":
    unittest.main()
