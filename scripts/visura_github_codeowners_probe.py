"""Observe CODEOWNERS file metadata on a GitHub branch using bounded GETs.

A visible file is NOT evidence of applicable ownership, reviewer eligibility,
branch rules, or permission to execute. Missing (404) is not proof of absence.
Never read or print file contents; never follow redirected bearer credentials.
"""
import json
import os
import re
from urllib.parse import quote
from urllib.request import build_opener

from scripts.visura_github_readonly_snapshot import _NoRedirectHandler, _validate_repo
from scripts.visura_github_policy_probe import _validate_branch, _read_status

CODEOWNERS_PATHS = (".github/CODEOWNERS", "CODEOWNERS", "docs/CODEOWNERS")
_BLOB_SHA = re.compile(r"[a-fA-F0-9]{40}\Z")


def observe_codeowners(repository, branch, token, opener=None):
    _validate_repo(repository)
    _validate_branch(branch)
    if not isinstance(token, str) or not token.strip() or "\r" in token or "\n" in token:
        raise ValueError("Missing or invalid GitHub token")
    opener = build_opener(_NoRedirectHandler()).open if opener is None else opener
    root = "/repos/" + repository + "/contents/"
    observations = []
    first_observed_path = None
    all_preceding_visible = True
    unshadowed_candidate = False
    for path in CODEOWNERS_PATHS:
        endpoint = root + path + "?ref=" + quote(branch, safe="")
        status, data = _read_status(endpoint, token, opener)
        if status == "retrieved":
            if (
                not isinstance(data, dict)
                or data.get("type") != "file"
                or data.get("path") != path
                or not isinstance(data.get("sha"), str)
                or not _BLOB_SHA.fullmatch(data["sha"])
            ):
                raise ValueError("Malformed or unsupported CODEOWNERS metadata")
            if first_observed_path is None:
                first_observed_path = path
                # Earlier 404/403 cannot prove a higher-priority file is absent.
                unshadowed_candidate = all_preceding_visible
            # Compare Git blob identities, not merely file visibility. A
            # CODEOWNERS edit can occur while a PR's head SHA stays constant.
            # We never fetch, print or interpret CODEOWNERS file contents.
            observations.append({
                "path": path, "lookup": "file_observed",
                "blob_sha": data["sha"].lower(),
            })
        else:
            # Both 403 and 404 leave existence and precedence uncertain.
            all_preceding_visible = False
            observations.append({
                "path": path, "lookup": status, "blob_sha": None,
            })
    return {
        "repository": repository,
        "branch": branch,
        "lookup": "file_observed" if first_observed_path else "no_file_observed",
        "observations": observations,
        "first_observed_path": first_observed_path,
        "unshadowed_candidate_observed": unshadowed_candidate,
        "file_absence_verified": False,
        "effective_code_ownership_verified": False,
        "reviewer_eligibility_verified": False,
        "repository_policy_verified": False,
        "execution_authorized": False,
        "merge_authorized": False,
        "deployment_authorized": False,
        "warning": (
            "GitHub file metadata only. Missing/inaccessible paths and precedence "
            "are inconclusive; ownership applicability, review eligibility, "
            "bypass and approval remain unknown."
        ),
    }


def main(argv=None):
    import argparse
    parser = argparse.ArgumentParser(description="Read-only CODEOWNERS metadata probe")
    parser.add_argument("repository")
    parser.add_argument("branch")
    args = parser.parse_args(argv)
    report = observe_codeowners(args.repository, args.branch, os.environ.get("GITHUB_TOKEN", ""))
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
