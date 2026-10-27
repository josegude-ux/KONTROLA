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
from scripts.visura_github_codeowners_probe import observe_codeowners
from scripts.visura_github_auth_preflight import inspect_readonly_auth_preflight
from scripts.visura_github_action_summary import render_readonly_audit_summary
from scripts.visura_github_commit_checks import (
    observe_commit_checks, compare_required_check_observations,
)
from scripts.visura_github_legacy_statuses import (
    observe_legacy_commit_statuses, compare_legacy_status_candidates,
)


def _stable_review_snapshot_evidence(snapshot):
    """Canonicalize a validated GitHub PR/reviews snapshot for rechecking.

    Review pages can be returned in a different order. Compare reviewer
    decisions and identities, never rely on an unchanged PR head alone.
    This observation is still non-atomic and never supplies approval rights.
    """
    keys = (
        "repository", "pr_number", "head_sha", "base_branch",
        "base_sha", "author_numeric_id", "pr_state",
    )
    fields = ("review_id", "reviewer_numeric_id", "reviewer_login", "state", "commit_sha")
    return (
        tuple(snapshot[key] for key in keys),
        tuple(sorted(tuple(item[key] for key in fields) for item in snapshot["reviews"])),
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

    # One trusted workflow command, one supplied token: observe fixed GET
    # transport before running the existing unified audit. Never authorization.
    transport_evidence = inspect_readonly_auth_preflight(
        repository, pr_number, token, opener=opener
    )
    pr = fetch_readonly_review_snapshot(repository, pr_number, token, opener=opener)
    if transport_evidence["repository_lookup"] == "retrieved" and (
        transport_evidence["pull_request_lookup"] == "retrieved"
    ):
        if (
            transport_evidence["observed_base_branch"] != pr["base_branch"]
            or transport_evidence["observed_head_sha"].lower()
            != pr["head_sha"].lower()
        ):
            raise ValueError("PR changed between transport preflight and review snapshot")
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

    # Read CODEOWNERS paths from the *actual PR target branch*, never a task.
    # Even a visible file is not an effective reviewer-policy verdict.
    codeowners = observe_codeowners(repository, target_branch, token, opener=opener)

    # Re-read *effective policy for the real PR target* after observing CI,
    # CODEOWNERS and reviewers. A branch rule can change independently of
    # the PR head/base SHA. Compare the full normalized observations, without
    # turning a matching snapshot into permission to execute or merge.
    target_policy_recheck = inspect_branch_policy(
        repository, target_branch, token, opener=opener
    )
    if target_policy_recheck != target_policy:
        raise ValueError("Target branch policy changed during the audit")

    # Review decisions (including dismissals) can change without changing
    # the PR's head SHA. Re-fetch the bounded pages and compare actual review
    # identity/state records before calling this an internally consistent audit.
    # A matching pair of snapshots still is NOT an authenticated approval.
    reviews_recheck = fetch_readonly_review_snapshot(
        repository, pr_number, token, opener=opener
    )
    if _stable_review_snapshot_evidence(reviews_recheck) != (
        _stable_review_snapshot_evidence(pr)
    ):
        raise ValueError("Pull request reviews changed during the audit")

    # A reviewer's repository permission can change independently of their
    # vote, review record, and PR head. Re-fetch from the same validated review
    # snapshot AFTER confirming reviews unchanged. A change (including a new
    # access denial) invalidates this point-in-time audit; it never grants
    # reviewer eligibility, execution, merge or deployment authority.
    reviewer_permissions_recheck = observe_snapshot_reviewer_permissions(
        repository, reviews_recheck, token, opener=opener
    )
    if reviewer_permissions_recheck != reviewer_permissions:
        raise ValueError("Reviewer repository permissions changed during the audit")

    # CODEOWNERS may change independently of the PR's head SHA and branch
    # policy. Re-observe its fixed paths and Git blob SHAs after reviewer
    # rechecks. Even two matching reads are only non-atomic observations.
    codeowners_recheck = observe_codeowners(
        repository, target_branch, token, opener=opener
    )
    if codeowners_recheck != codeowners:
        raise ValueError("CODEOWNERS metadata changed during the audit")

    # Check the PR again LAST, after the review/policy/CODEOWNERS rechecks.
    # These reads are non-atomic: subsequent edits remain possible.
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
        "github_transport_preflight": transport_evidence,
        "reviewer_repository_permissions": reviewer_permissions,
        "target_branch_codeowners": codeowners,
        "head_check_runs": head_checks,
        "required_check_observations": candidate_requirements,
        "legacy_commit_statuses": legacy_statuses,
        "legacy_status_observations": legacy_candidates,
        "target_branch_policy": target_policy,
        "default_branch": default_branch,
        "default_branch_policy": default_policy,
        "target_differs_from_default": target_branch != default_branch,
        "same_pr_metadata_after_policy_lookup": True,
        "same_target_policy_after_audit": True,
        "same_review_records_after_audit": True,
        "same_reviewer_repository_permissions_after_audit": True,
        "same_codeowners_metadata_after_audit": True,
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
