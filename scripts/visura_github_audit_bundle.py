"""Unified, read-only GitHub PR and branch policy audit.

The target branch is taken from the real GitHub PR response, never from
task-provided data. It also inspects the default branch as context.
No result is an authenticated execution, merge, or deployment authorization.
"""
import argparse
import json
import os
from urllib.request import build_opener

from scripts.visura_github_readonly_snapshot import (
    _NoRedirectHandler, _get_json, _validate_repo, _positive_int,
    fetch_readonly_review_snapshot,
)
from scripts.visura_github_policy_probe import (
    _validate_branch, inspect_branch_policy,
)


def inspect_readonly_audit_bundle(
    repository, pr_number, default_branch, token, opener=None
):
    _validate_repo(repository)
    _validate_branch(default_branch)
    if not _positive_int(pr_number):
        raise ValueError("Invalid PR number")
    if not isinstance(token, str) or not token.strip() or "\r" in token or "\n" in token:
        raise ValueError("Missing or invalid GitHub token")

    opener = build_opener(_NoRedirectHandler()).open if opener is None else opener
    pr = fetch_readonly_review_snapshot(repository, pr_number, token, opener=opener)
    target_branch = pr["base_branch"]
    _validate_branch(target_branch)
    target_policy = inspect_branch_policy(repository, target_branch, token, opener=opener)
    if default_branch == target_branch:
        default_policy = target_policy
    else:
        default_policy = inspect_branch_policy(
            repository, default_branch, token, opener=opener
        )

    # Check the PR again after both policy calls, which are not atomic.
    # Even a consistent report can become stale immediately after return.
    endpoint = "/repos/" + repository + "/pulls/" + str(pr_number)
    latest = _get_json(endpoint, token, opener)
    if not isinstance(latest, dict):
        raise ValueError("Invalid final PR response")
    try:
        current = (
            latest["head"]["sha"],
            latest["base"]["ref"],
            latest["base"]["sha"],
            latest["base"]["repo"]["full_name"],
            latest["user"]["id"],
            latest["state"],
        )
    except (KeyError, TypeError):
        raise ValueError("Incomplete final PR response") from None
    expected = (
        pr["head_sha"], pr["base_branch"], pr["base_sha"],
        repository, pr["author_numeric_id"], pr["pr_state"],
    )
    if current != expected:
        raise ValueError("PR changed while reading branch policies")

    return {
        "repository": repository,
        "pr_number": pr_number,
        "review_snapshot": pr,
        "target_branch_policy": target_policy,
        "default_branch": default_branch,
        "default_branch_policy": default_policy,
        "target_differs_from_default": target_branch != default_branch,
        "same_pr_metadata_after_policy_lookup": True,
        "report_is_atomic": False,
        "repository_policy_verified": False,
        "execution_authorized": False,
        "merge_authorized": False,
        "deployment_authorized": False,
        "warning": (
            "Observational audit, not authorization. No atomicity, branch "
            "protection sufficiency, bypass rules or reviewer rights verified."
        ),
    }


def main(argv=None):
    parser = argparse.ArgumentParser(
        description="Read-only GitHub PR reviews and target branch policies"
    )
    parser.add_argument("repository")
    parser.add_argument("pr_number", type=int)
    parser.add_argument("default_branch")
    args = parser.parse_args(argv)
    result = inspect_readonly_audit_bundle(
        args.repository, args.pr_number, args.default_branch,
        os.environ.get("GITHUB_TOKEN", ""),
    )
    print(json.dumps(result, sort_keys=True, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
