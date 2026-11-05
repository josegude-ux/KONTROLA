"""Bounded read-only GitHub token transport preflight for VISURA AUTO-DEV.

Only GET /repos/{owner}/{repo} and GET /repos/{owner}/{repo}/pulls/{n}.
Results demonstrate observations, NOT scope, identity, review eligibility,
branch protection or authorization. Supply GITHUB_TOKEN only via trusted env.
Never include the bearer value in returned JSON, errors or CLI arguments.
"""
import argparse
import json
import os
import re
from urllib.error import HTTPError
from urllib.request import build_opener

from scripts.visura_github_readonly_snapshot import (
    _NoRedirectHandler, _get_json, _positive_int, _validate_repo,
)
from scripts.visura_github_policy_probe import _validate_branch

_SHA = re.compile(r"[0-9a-fA-F]{40}\Z")
_HTTP_LOOKUPS = {
    401: "unauthorized",
    403: "inaccessible",
    404: "not_found_or_inaccessible",
}


def _read_metadata(path, token, opener):
    try:
        return "retrieved", _get_json(path, token, opener)
    except HTTPError as error:
        if error.code in _HTTP_LOOKUPS:
            return _HTTP_LOOKUPS[error.code], None
        # Rate limit and server failures must not masquerade as policy evidence.
        raise


def inspect_readonly_auth_preflight(repository, pr_number, token, opener=None):
    """Inspect only GET transport. Public resources can return 200 even though
    bearer scope, installation identity or later access is not proven.
    """
    _validate_repo(repository)
    if not _positive_int(pr_number):
        raise ValueError("Invalid pull request number")
    if (
        not isinstance(token, str) or not token or token != token.strip()
        or len(token) > 2048 or any(ord(ch) < 33 or ord(ch) > 126 for ch in token)
    ):
        raise ValueError("Missing or invalid GitHub token")
    opener = build_opener(_NoRedirectHandler()).open if opener is None else opener
    prefix = "/repos/" + repository
    repo_lookup, repo_data = _read_metadata(prefix, token, opener)
    pr_lookup = "not_queried"
    observed_branch = None
    observed_head = None
    if repo_lookup == "retrieved":
        if (
            not isinstance(repo_data, dict)
            or not isinstance(repo_data.get("full_name"), str)
            or repo_data["full_name"].casefold() != repository.casefold()
            or not _positive_int(repo_data.get("id"))
        ):
            raise ValueError("Invalid or mismatched GitHub repository metadata")
        default = repo_data.get("default_branch")
        _validate_branch(default)
        pr_lookup, pr_data = _read_metadata(
            prefix + "/pulls/" + str(pr_number), token, opener
        )
        if pr_lookup == "retrieved":
            try:
                number = pr_data["number"]
                target_repo = pr_data["base"]["repo"]["full_name"]
                target_branch = pr_data["base"]["ref"]
                head_sha = pr_data["head"]["sha"]
                state = pr_data["state"]
            except (KeyError, TypeError):
                raise ValueError("Incomplete pull request metadata") from None
            if (
                not _positive_int(number) or number != pr_number
                or not isinstance(target_repo, str)
                or target_repo.casefold() != repository.casefold()
                or not isinstance(head_sha, str) or not _SHA.fullmatch(head_sha)
                or state not in {"open", "closed"}
            ):
                raise ValueError("Invalid or mismatched GitHub pull request metadata")
            _validate_branch(target_branch)
            observed_branch = target_branch
            observed_head = head_sha
    return {
        "repository": repository,
        "pr_number": pr_number,
        "repository_lookup": repo_lookup,
        "pull_request_lookup": pr_lookup,
        "observed_base_branch": observed_branch,
        "observed_head_sha": observed_head,
        "get_only_transport": True,
        "token_scopes_verified": False,
        "authenticated_caller_identity_verified": False,
        "effective_branch_policy_verified": False,
        "reviewer_eligibility_verified": False,
        "execution_authorized": False,
        "merge_authorized": False,
        "deployment_authorized": False,
        "warning": (
            "GET response observations only; not proof that the bearer is "
            "sufficiently scoped, that the branch is protected, or that the "
            "caller may execute, merge or deploy. No secrets are reported."
        ),
    }


def main(argv=None):
    parser = argparse.ArgumentParser(description="Read-only GitHub transport preflight")
    parser.add_argument("repository")
    parser.add_argument("pr_number", type=int)
    args = parser.parse_args(argv)
    report = inspect_readonly_auth_preflight(
        args.repository, args.pr_number, os.environ.get("GITHUB_TOKEN", "")
    )
    print(json.dumps(report, sort_keys=True, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
