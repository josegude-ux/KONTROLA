import io
import json
import unittest
from urllib.error import HTTPError

from scripts.visura_github_codeowners_probe import observe_codeowners


REPO = "owner/repo"
SHA = "a" * 40
PATHS = (".github/CODEOWNERS", "CODEOWNERS", "docs/CODEOWNERS")


def opener_for(outcomes):
    calls = []
    def opener(request, timeout):
        calls.append(request)
        path = request.full_url.split("/contents/", 1)[1].split("?", 1)[0]
        status = outcomes.get(path, 404)
        if isinstance(status, int):
            raise HTTPError(request.full_url, status, "Unavailable", {}, None)
        return io.BytesIO(json.dumps(status).encode("utf-8"))
    return opener, calls


def file_metadata(path, **extra):
    return {"type": "file", "path": path, "sha": SHA, **extra}


class CodeownersProbeTests(unittest.TestCase):
    def test_first_precedence_file_is_observation_only(self):
        opener, calls = opener_for({PATHS[0]: file_metadata(PATHS[0])})
        result = observe_codeowners(REPO, "feature/dev", "dummy", opener)
        self.assertEqual(result["lookup"], "file_observed")
        self.assertEqual(result["first_observed_path"], PATHS[0])
        self.assertTrue(result["unshadowed_candidate_observed"])
        self.assertEqual(result["observations"][0]["blob_sha"], SHA)
        self.assertIsNone(result["observations"][1]["blob_sha"])
        self.assertEqual(len(calls), 3)
        self.assertTrue(all(c.get_method() == "GET" for c in calls))
        self.assertTrue(all(c.full_url.startswith("https://api.github.com/repos/owner/repo/contents/")
                            for c in calls))
        self.assertTrue(all("?ref=feature%2Fdev" in c.full_url for c in calls))
        self.assertNotIn("dummy", json.dumps(result))
        self.assertNotIn("content", json.dumps(result))
        for key in ("file_absence_verified", "effective_code_ownership_verified",
                    "reviewer_eligibility_verified", "repository_policy_verified",
                    "execution_authorized", "merge_authorized", "deployment_authorized"):
            self.assertIs(result[key], False)

    def test_content_version_change_is_visible_without_file_contents(self):
        first, _ = opener_for({PATHS[0]: file_metadata(PATHS[0])})
        second, _ = opener_for({
            PATHS[0]: file_metadata(PATHS[0], sha="b" * 40)
        })
        a = observe_codeowners(REPO, "main", "dummy", first)
        b = observe_codeowners(REPO, "main", "dummy", second)
        self.assertNotEqual(a["observations"], b["observations"])
        self.assertNotIn("dummy", json.dumps(a))
        self.assertNotIn("content", json.dumps(a))
        self.assertFalse(a["execution_authorized"])
        self.assertFalse(b["effective_code_ownership_verified"])

    def test_lower_priority_sha_is_recorded_but_not_applied_ownership(self):
        opener, _ = opener_for({PATHS[1]: file_metadata(PATHS[1])})
        evidence = observe_codeowners(REPO, "main", "dummy", opener)
        self.assertEqual(evidence["observations"][1]["blob_sha"], SHA)
        self.assertFalse(evidence["unshadowed_candidate_observed"])
        self.assertFalse(evidence["reviewer_eligibility_verified"])

    def test_earlier_404_makes_lower_priority_file_ambiguous(self):
        opener, _ = opener_for({PATHS[1]: file_metadata(PATHS[1])})
        result = observe_codeowners(REPO, "main", "dummy", opener)
        self.assertEqual(result["first_observed_path"], PATHS[1])
        self.assertFalse(result["unshadowed_candidate_observed"])
        self.assertFalse(result["merge_authorized"])

    def test_earlier_403_makes_lower_priority_file_ambiguous(self):
        opener, _ = opener_for({PATHS[0]: 403, PATHS[1]: file_metadata(PATHS[1])})
        result = observe_codeowners(REPO, "main", "dummy", opener)
        self.assertEqual(result["observations"][0]["lookup"], "inaccessible")
        self.assertFalse(result["unshadowed_candidate_observed"])

    def test_three_404_do_not_prove_absence(self):
        opener, calls = opener_for({})
        result = observe_codeowners(REPO, "main", "dummy", opener)
        self.assertEqual(len(calls), 3)
        self.assertEqual(result["lookup"], "no_file_observed")
        self.assertIsNone(result["first_observed_path"])
        self.assertFalse(result["file_absence_verified"])
        self.assertFalse(result["effective_code_ownership_verified"])

    def test_http_401_and_500_do_not_masquerade_as_missing(self):
        for status in (401, 429, 500):
            with self.subTest(status=status):
                opener, _ = opener_for({PATHS[0]: status})
                with self.assertRaises(HTTPError):
                    observe_codeowners(REPO, "main", "dummy", opener)

    def test_bad_metadata_fails_closed(self):
        for body in (None, [], {}, {"type": "dir", "path": PATHS[0], "sha": SHA},
                     file_metadata("other/CODEOWNERS"), file_metadata(PATHS[0], sha="bad"),
                     file_metadata(PATHS[0], sha=True)):
            with self.subTest(body=body):
                opener, _ = opener_for({PATHS[0]: body})
                with self.assertRaisesRegex(ValueError, "CODEOWNERS metadata"):
                    observe_codeowners(REPO, "main", "dummy", opener)

    def test_invalid_inputs_fail_before_first_get(self):
        for repo, branch, token in (
            ("owner/../repo", "main", "dummy"),
            (REPO, "../bad", "dummy"),
            (REPO, "main", ""),
            (REPO, "main", "abc\nBearer: exposed"),
            (REPO, "main", None),
        ):
            with self.subTest(repo=repo, branch=branch, token=token):
                opener, calls = opener_for({})
                with self.assertRaises(ValueError):
                    observe_codeowners(repo, branch, token, opener)
                self.assertEqual(calls, [])


if __name__ == "__main__":
    unittest.main()
