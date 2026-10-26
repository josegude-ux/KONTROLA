import io
import json
import os
import unittest
from contextlib import redirect_stdout
from unittest.mock import patch
from scripts.visura_github_readonly_snapshot import fetch_readonly_review_snapshot, main

SHA = "a" * 40
REPOSITORY = "josegude-ux/KONTROLA"


class FakeResponse:
    def __init__(self, payload):
        self.payload = json.dumps(payload).encode("utf-8")

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def read(self, limit):
        return self.payload[:limit]


def pr_data(**changes):
    result = {
        "head": {"sha": SHA}, "user": {"id": 123},
        "base": {"repo": {"full_name": REPOSITORY}}, "state": "open",
    }
    result.update(changes)
    return result


def review_data(**changes):
    result = {
        "id": 11, "user": {"id": 456, "login": "bob"},
        "state": "APPROVED", "commit_id": SHA,
    }
    result.update(changes)
    return result


def fake_api(pr=None, pages=None):
    pr = pr_data() if pr is None else pr
    pages = [[]] if pages is None else pages
    seen = []

    def opener(request, timeout):
        seen.append((request.full_url, request.get_method(), timeout))
        if request.full_url.endswith("/pulls/37"):
            return FakeResponse(pr)
        for number, page in enumerate(pages, 1):
            if request.full_url.endswith("reviews?per_page=100&page=" + str(number)):
                return FakeResponse(page)
        raise AssertionError("Unexpected API request")

    return opener, seen


class GitHubReadOnlySnapshotTests(unittest.TestCase):
    def test_reads_realistic_pr_and_review(self):
        opener, calls = fake_api(pages=[[review_data()]])
        result = fetch_readonly_review_snapshot(REPOSITORY, 37, "token", opener=opener)
        self.assertEqual(result["author_numeric_id"], 123)
        self.assertEqual(result["reviews"][0]["reviewer_numeric_id"], 456)
        self.assertEqual(result["head_sha"], SHA)
        self.assertFalse(result["execution_authorized"])
        self.assertFalse(result["repository_policy_verified"])
        self.assertTrue(all(method == "GET" for _, method, _ in calls))
        self.assertTrue(all(url.startswith("https://api.github.com/") for url, _, _ in calls))

    def test_no_approvals_still_blocked(self):
        opener, _ = fake_api()
        result = fetch_readonly_review_snapshot(REPOSITORY, 37, "token", opener=opener)
        self.assertEqual(result["reviews"], [])
        self.assertFalse(result["merge_authorized"])

    def test_rejects_untrusted_repository_path(self):
        with self.assertRaisesRegex(ValueError, "Invalid repository"):
            fetch_readonly_review_snapshot("../escape", 37, "token")

    def test_rejects_boolean_pr(self):
        with self.assertRaisesRegex(ValueError, "Invalid pull request number"):
            fetch_readonly_review_snapshot(REPOSITORY, True, "token")

    def test_rejects_missing_token_before_io(self):
        with self.assertRaisesRegex(ValueError, "GitHub token"):
            fetch_readonly_review_snapshot(REPOSITORY, 37, "")

    def test_rejects_foreign_base_repository(self):
        opener, _ = fake_api(pr=pr_data(base={"repo": {"full_name": "other/repo"}}))
        with self.assertRaisesRegex(ValueError, "Invalid pull request metadata"):
            fetch_readonly_review_snapshot(REPOSITORY, 37, "token", opener=opener)

    def test_rejects_malformed_user_id(self):
        opener, _ = fake_api(pages=[[review_data(user={"id": True, "login": "bob"})]])
        with self.assertRaisesRegex(ValueError, "Invalid GitHub review metadata"):
            fetch_readonly_review_snapshot(REPOSITORY, 37, "token", opener=opener)

    def test_rejects_unknown_review_state(self):
        opener, _ = fake_api(pages=[[review_data(state="AUTHORIZE_EXECUTION")]])
        with self.assertRaisesRegex(ValueError, "Invalid GitHub review metadata"):
            fetch_readonly_review_snapshot(REPOSITORY, 37, "token", opener=opener)

    def test_manual_cli_uses_environment_token_without_echo(self):
        output = io.StringIO()
        with patch.dict(os.environ, {"GITHUB_TOKEN": "secret-do-not-echo"}):
            with patch(
                "scripts.visura_github_readonly_snapshot.fetch_readonly_review_snapshot",
                return_value={"execution_authorized": False},
            ) as mocked:
                with redirect_stdout(output):
                    self.assertEqual(main([REPOSITORY, "37"]), 0)
        mocked.assert_called_once_with(REPOSITORY, 37, "secret-do-not-echo")
        self.assertNotIn("secret-do-not-echo", output.getvalue())
        self.assertFalse(json.loads(output.getvalue())["execution_authorized"])

    def test_cli_rejects_missing_token_before_network(self):
        with patch.dict(os.environ, {}, clear=True):
            with self.assertRaisesRegex(ValueError, "GitHub token"):
                main([REPOSITORY, "37"])

    def test_pagination_truncation_is_rejected(self):
        opener, _ = fake_api(pages=[[review_data()] * 100] * 5)
        with self.assertRaisesRegex(ValueError, "Too many review pages"):
            fetch_readonly_review_snapshot(REPOSITORY, 37, "token", opener=opener)


if __name__ == "__main__":
    unittest.main()
