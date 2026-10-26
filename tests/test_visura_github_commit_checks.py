import json
import unittest
from urllib.error import HTTPError

from scripts.visura_github_commit_checks import observe_commit_checks

REPO = "josegude-ux/KONTROLA"
SHA = "a" * 40


class Response:
    def __init__(self, payload):
        self.payload = json.dumps(payload).encode("utf-8")

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def read(self, limit):
        return self.payload[:limit]


def check(check_id=1, status="completed", conclusion="success", sha=SHA):
    return {
        "id": check_id, "head_sha": sha,
        "status": status, "conclusion": conclusion,
    }


def fake_api(pages=None, error=None, totals=None):
    pages = [[]] if pages is None else pages
    calls = []

    def opener(request, timeout):
        calls.append((request.full_url, request.get_method()))
        if error is not None:
            raise HTTPError(request.full_url, error, "Forbidden", {}, None)
        for page_number, rows in enumerate(pages, 1):
            if request.full_url.endswith("page=" + str(page_number)):
                total = sum(len(page) for page in pages)
                if totals is not None:
                    total = totals[page_number - 1]
                return Response({"total_count": total, "check_runs": rows})
        raise AssertionError("Unexpected page")

    return opener, calls


class CommitCheckTests(unittest.TestCase):
    def test_completed_success_is_observation_not_authority(self):
        opener, calls = fake_api([[check()]])
        result = observe_commit_checks(REPO, SHA, "token", opener=opener)
        self.assertEqual(result["lookup"], "retrieved")
        self.assertEqual(result["observed_total"], 1)
        self.assertEqual(result["status_counts"], {"completed": 1})
        self.assertEqual(result["conclusion_counts"], {"success": 1})
        self.assertFalse(result["required_checks_verified"])
        self.assertFalse(result["branch_policy_verified"])
        self.assertFalse(result["execution_authorized"])
        self.assertFalse(result["merge_authorized"])
        self.assertTrue(all(method == "GET" for _, method in calls))
        self.assertTrue(all(url.startswith("https://api.github.com/") for url, _ in calls))
        self.assertTrue(all("filter=latest" in url for url, _ in calls))

    def test_unfinished_and_failed_checks_are_counted(self):
        opener, _ = fake_api([[
            check(1, "in_progress", None),
            check(2, "completed", "failure"),
        ]])
        result = observe_commit_checks(REPO, SHA, "token", opener=opener)
        self.assertEqual(result["status_counts"]["in_progress"], 1)
        self.assertEqual(result["conclusion_counts"]["failure"], 1)
        self.assertFalse(result["merge_authorized"])

    def test_no_checks_does_not_verify_ci(self):
        opener, _ = fake_api()
        result = observe_commit_checks(REPO, SHA, "token", opener=opener)
        self.assertEqual(result["observed_total"], 0)
        self.assertFalse(result["required_checks_verified"])

    def test_403_is_unknown_not_success(self):
        opener, _ = fake_api(error=403)
        result = observe_commit_checks(REPO, SHA, "token", opener=opener)
        self.assertEqual(result["lookup"], "inaccessible_or_not_found")
        self.assertIsNone(result["observed_total"])
        self.assertIsNone(result["conclusion_counts"])
        self.assertFalse(result["required_checks_verified"])

    def test_404_is_unknown_not_no_checks(self):
        opener, _ = fake_api(error=404)
        result = observe_commit_checks(REPO, SHA, "token", opener=opener)
        self.assertEqual(result["lookup"], "inaccessible_or_not_found")
        self.assertIsNone(result["observed_total"])

    def test_boolean_check_id_is_invalid(self):
        opener, _ = fake_api([[check(check_id=True)]])
        with self.assertRaisesRegex(ValueError, "Invalid GitHub check run metadata"):
            observe_commit_checks(REPO, SHA, "token", opener=opener)

    def test_other_commit_check_is_rejected(self):
        opener, _ = fake_api([[check(sha="b" * 40)]])
        with self.assertRaisesRegex(ValueError, "Invalid GitHub check run metadata"):
            observe_commit_checks(REPO, SHA, "token", opener=opener)

    def test_duplicate_id_is_rejected(self):
        opener, _ = fake_api([[check(), check()]])
        with self.assertRaisesRegex(ValueError, "Duplicate GitHub check run ID"):
            observe_commit_checks(REPO, SHA, "token", opener=opener)

    def test_unfinished_with_conclusion_is_rejected(self):
        opener, _ = fake_api([[check(status="queued", conclusion="success")]])
        with self.assertRaisesRegex(ValueError, "Invalid GitHub check run metadata"):
            observe_commit_checks(REPO, SHA, "token", opener=opener)

    def test_unknown_state_is_rejected(self):
        opener, _ = fake_api([[check(status="AUTHORIZE", conclusion=None)]])
        with self.assertRaisesRegex(ValueError, "Invalid GitHub check run metadata"):
            observe_commit_checks(REPO, SHA, "token", opener=opener)

    def test_incomplete_listing_is_rejected(self):
        opener, _ = fake_api([[check()]], totals=[2])
        with self.assertRaisesRegex(ValueError, "Incomplete GitHub check runs listing"):
            observe_commit_checks(REPO, SHA, "token", opener=opener)

    def test_check_page_count_change_is_rejected(self):
        first = [check(i) for i in range(1, 101)]
        second = [check(101)]
        opener, _ = fake_api([first, second], totals=[101, 102])
        with self.assertRaisesRegex(ValueError, "changed during pagination"):
            observe_commit_checks(REPO, SHA, "token", opener=opener)

    def test_page_limit_is_enforced(self):
        opener, _ = fake_api([
            [check(i + 1 + page * 100) for i in range(100)]
            for page in range(5)
        ])
        with self.assertRaisesRegex(ValueError, "Too many GitHub check run pages"):
            observe_commit_checks(REPO, SHA, "token", opener=opener)

    def test_named_check_run_includes_app_for_identity_comparison(self):
        value = {
            **check(), "name": "test / gate", "app": {"id": 345},
        }
        opener, _ = fake_api([[value]])
        result = observe_commit_checks(REPO, SHA, "token", opener=opener)
        self.assertTrue(result["named_checks_complete"])
        self.assertEqual(result["named_check_runs"], [{
            "name": "test / gate", "app_id": 345,
            "status": "completed", "conclusion": "success",
        }])
        self.assertFalse(result["required_checks_verified"])

    def test_missing_check_name_marks_observation_incomplete(self):
        opener, _ = fake_api([[check()]])
        result = observe_commit_checks(REPO, SHA, "token", opener=opener)
        self.assertFalse(result["named_checks_complete"])
        self.assertEqual(result["named_check_runs"], [])

    def test_invalid_app_identifier_is_rejected(self):
        opener, _ = fake_api([[{**check(), "name": "test", "app": {"id": True}}]])
        with self.assertRaisesRegex(ValueError, "Invalid check run app identity"):
            observe_commit_checks(REPO, SHA, "token", opener=opener)

    def test_check_name_control_character_is_rejected(self):
        opener, _ = fake_api([[{**check(), "name": "test\\nforged"}]])
        with self.assertRaisesRegex(ValueError, "Invalid check run name"):
            observe_commit_checks(REPO, SHA, "token", opener=opener)

    def test_missing_check_app_keeps_provenance_unknown(self):
        opener, _ = fake_api([[{**check(), "name": "build"}]])
        result = observe_commit_checks(REPO, SHA, "token", opener=opener)
        self.assertEqual(result["named_check_runs"][0]["app_id"], None)
        self.assertFalse(result["required_checks_verified"])

    def test_invalid_sha_rejected_before_network(self):
        with self.assertRaisesRegex(ValueError, "Invalid GitHub commit SHA"):
            observe_commit_checks(REPO, "not-a-sha", "token")

    def test_blank_token_rejected_before_network(self):
        with self.assertRaisesRegex(ValueError, "GitHub token"):
            observe_commit_checks(REPO, SHA, "")

    def test_uppercase_sha_equivalence(self):
        opener, _ = fake_api([[check(sha=SHA.upper())]])
        result = observe_commit_checks(REPO, SHA, "token", opener=opener)
        self.assertEqual(result["observed_total"], 1)


if __name__ == "__main__":
    unittest.main()
