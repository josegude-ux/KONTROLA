"""Read-only GitHub REST snapshot for audit; never an authorization gate.

Fetches the PR and paginated reviews over fixed HTTPS api.github.com.
Credentials must be supplied by a trusted caller with pull-requests:read.
No writes, execution, merge or deploy capabilities are provided.
"""
import json
import re
from urllib.request import HTTPRedirectHandler, Request, build_opener

from scripts.visura_github_review_audit import summarize_readonly_review_snapshot

API_ROOT = "https://api.github.com"
MAX_JSON_BYTES = 1024 * 1024
MAX_REVIEW_PAGES = 5
SHA_PATTERN = re.compile(r"[0-9a-fA-F]{40}\Z")
REPO_PART_PATTERN = re.compile(r"[A-Za-z0-9_.-]+\Z")
REVIEW_STATES = {"APPROVED", "CHANGES_REQUESTED", "COMMENTED", "DISMISSED", "PENDING"}


class _NoRedirectHandler(HTTPRedirectHandler):
    """Do not forward GitHub bearer tokens to a redirected URL."""

    def redirect_request(self, request, fp, code, msg, headers, newurl):
        return None


def _validate_repo(repo):
    if not isinstance(repo, str):
        raise ValueError("Invalid repository")
    parts = repo.split("/")
    if len(parts) != 2 or any(
        not REPO_PART_PATTERN.fullmatch(p) or p in {".", ".."} for p in parts
    ):
        raise ValueError("Invalid repository")


def _get_json(path, token, opener):
    request = Request(
        API_ROOT + path,
        headers={
            "Accept": "application/vnd.github+json",
            "Authorization": "Bearer " + token,
            "User-Agent": "VISURA-AUTO-DEV-readonly-audit",
            "X-GitHub-Api-Version": "2022-11-28",
        },
        method="GET",
    )
    with opener(request, timeout=10) as response:
        raw = response.read(MAX_JSON_BYTES + 1)
    if len(raw) > MAX_JSON_BYTES:
        raise ValueError("GitHub API response too large")
    try:
        return json.loads(raw)
    except (ValueError, UnicodeDecodeError) as exc:
        raise ValueError("Invalid GitHub API JSON") from exc


def _positive_int(value):
    return type(value) is int and value > 0


def fetch_readonly_review_snapshot(repository, pr_number, token, opener=None):
    """Return externally retrieved data, never evidence of execution permission.

    The token and transport must be controlled by the trusted caller. This
    function cannot attest branch protection or repository reviewer policy.
    It checks PR metadata twice to detect changes during pagination, but a
    later change or newly submitted review can still invalidate this report.
    """
    _validate_repo(repository)
    if not _positive_int(pr_number):
        raise ValueError("Invalid pull request number")
    if not isinstance(token, str) or not token.strip() or "\r" in token or "\n" in token:
        raise ValueError("Missing or invalid GitHub token")
    # A GitHub API redirect is unexpected. Never risk forwarding a token.
    opener = build_opener(_NoRedirectHandler()).open if opener is None else opener
    prefix = "/repos/" + repository + "/pulls/" + str(pr_number)
    pr = _get_json(prefix, token, opener)
    if not isinstance(pr, dict):
        raise ValueError("Invalid pull request response")
    try:
        head_sha = pr["head"]["sha"]
        author_id = pr["user"]["id"]
        base_repository = pr["base"]["repo"]["full_name"]
        base_branch = pr["base"]["ref"]
        base_sha = pr["base"]["sha"]
        pr_state = pr["state"]
    except (KeyError, TypeError):
        raise ValueError("Incomplete pull request response") from None
    if (not isinstance(head_sha, str) or not SHA_PATTERN.fullmatch(head_sha)
        or not _positive_int(author_id) or base_repository != repository
        or not isinstance(base_sha, str) or not SHA_PATTERN.fullmatch(base_sha)
        or not isinstance(base_branch, str)
        or not re.fullmatch(r"[A-Za-z0-9_./-]{1,200}", base_branch)
        or any(part in {"", ".", ".."} for part in base_branch.split("/"))
        or pr_state not in {"open", "closed"}):
        raise ValueError("Invalid pull request metadata")

    reviews = []
    for page in range(1, MAX_REVIEW_PAGES + 1):
        data = _get_json(prefix + "/reviews?per_page=100&page=" + str(page), token, opener)
        if not isinstance(data, list) or len(data) > 100:
            raise ValueError("Invalid GitHub reviews response")
        for item in data:
            if not isinstance(item, dict):
                raise ValueError("Malformed GitHub review record")
            try:
                user_id = item["user"]["id"]
                login = item["user"]["login"]
                state = item["state"]
                review_sha = item["commit_id"]
                review_id = item["id"]
            except (KeyError, TypeError):
                raise ValueError("Incomplete GitHub review record") from None
            if (
                not _positive_int(user_id) or not _positive_int(review_id)
                or not isinstance(login, str) or not login
                or not isinstance(state, str) or state not in REVIEW_STATES
                or not isinstance(review_sha, str) or not SHA_PATTERN.fullmatch(review_sha)
            ):
                raise ValueError("Invalid GitHub review metadata")
            reviews.append({
                "review_id": review_id,
                "reviewer_numeric_id": user_id,
                "reviewer_login": login,
                "state": state,
                "commit_sha": review_sha,
            })
        if len(data) < 100:
            break
    else:
        raise ValueError("Too many review pages; refusing incomplete snapshot")

    # A PR can change while review pages are retrieved. Reject a mixed snapshot.
    latest_pr = _get_json(prefix, token, opener)
    if not isinstance(latest_pr, dict):
        raise ValueError("Invalid final pull request response")
    try:
        latest_sha = latest_pr["head"]["sha"]
        latest_author_id = latest_pr["user"]["id"]
        latest_base_repository = latest_pr["base"]["repo"]["full_name"]
        latest_base_branch = latest_pr["base"]["ref"]
        latest_base_sha = latest_pr["base"]["sha"]
        latest_state = latest_pr["state"]
    except (KeyError, TypeError):
        raise ValueError("Incomplete final pull request response") from None
    if (
        latest_sha != head_sha
        or latest_author_id != author_id
        or latest_base_repository != base_repository
        or latest_base_branch != base_branch
        or latest_base_sha != base_sha
        or latest_state != pr_state
    ):
        raise ValueError("Pull request changed during review retrieval")

    snapshot = {
        "repository": repository,
        "pr_number": pr_number,
        "head_sha": head_sha,
        "author_numeric_id": author_id,
        "base_branch": base_branch,
        "base_sha": base_sha,
        "pr_state": pr_state,
        "reviews": reviews,
        "retrieval_method": "github_rest_https_token",
        "repository_policy_verified": False,
        "execution_authorized": False,
        "merge_authorized": False,
        "deployment_authorized": False,
    }
    # The audit is observational. It cannot grant execution or merge rights.
    snapshot["review_audit"] = summarize_readonly_review_snapshot(snapshot)
    return snapshot


def main(argv=None):
    """CLI entrypoint for a manual, read-only GitHub Actions audit."""
    import argparse
    import os

    parser = argparse.ArgumentParser(description="Inspect GitHub PR reviews (read only)")
    parser.add_argument("repository")
    parser.add_argument("pr_number", type=int)
    args = parser.parse_args(argv)
    result = fetch_readonly_review_snapshot(
        args.repository, args.pr_number, os.environ.get("GITHUB_TOKEN", "")
    )
    print(json.dumps(result, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
