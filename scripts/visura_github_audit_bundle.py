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
from scripts.visura_github_reviewer_permissions import observe_snapshot_reviewer_permissions
from scripts.visura_github_action_summary import render_readonly_audit_summary
from scripts.visura_github_commit_checks import (
    observe_commit_checks, compare_required_check_observations,
)
from scripts.visura_github_legacy_statuses import (
    observe_legacy_commit_statuses, compare_legacy_status_candidates,
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

    # Check runs are bound to the reviewed head SHA, not the default branch.
    # They are observations only, not proof of passing required status checks.
    head_checks = observe_commit_checks(
        repository, pr["head_sha"], token, opener=opener
    )

    # Legacy commit statuses are a different API from check-runs; read both.
    # A candidate name/app match never attests satisfaction of branch rules.
    legacy_statuses = observe_legacy_commit_statuses(
        repository, pr["head_sha"], token, opener=opener
    )
    candidate_requirements = compare_required_check_observations(
        target_policy, head_checks
    )
    legacy_candidates = compare_legacy_status_candidates(
        target_policy, legacy_statuses
    )

    reviewer_permissions = observe_snapshot_reviewer_permissions(
        repository, pr, token, opener=opener
    )

    # Check the PR again after all observations, which are not atomic.
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
        "reviewer_repository_permissions": reviewer_permissions,
        "head_check_runs": head_checks,
        "required_check_observations": candidate_requirements,
        "legacy_commit_statuses": legacy_statuses,
        "legacy_status_observations": legacy_candidates,
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
    summary_path = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary_path:
        summary = render_readonly_audit_summary(result)
        # GitHub Actions supplies a step-local summary file. This is the only
        # local write; no repository, app or production data is modified.
        with open(summary_path, "a", encoding="utf-8") as summary_file:
            summary_file.write(summary + "\n")
    print(json.dumps(result, sort_keys=True, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
