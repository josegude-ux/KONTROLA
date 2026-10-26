"""Conservative audit of GitHub review records from a read-only snapshot.

This reports *observations*, not effective approvals. GitHub branch policy,
reviewer permissions, dismissal rules and later changes remain unverified.
This code never grants execution, merge or deployment permissions.
"""
import re

_SHA = re.compile(r"[0-9a-fA-F]{40}\Z")
_STATES = {"APPROVED", "CHANGES_REQUESTED", "COMMENTED", "DISMISSED", "PENDING"}
_KEYS = {
    "repository", "pr_number", "head_sha", "author_numeric_id",
    "pr_state", "reviews", "retrieval_method", "repository_policy_verified",
    "execution_authorized", "merge_authorized", "deployment_authorized",
}
_REVIEW_KEYS = {
    "review_id", "reviewer_numeric_id", "reviewer_login", "state", "commit_sha",
}


def _positive_int(value):
    return type(value) is int and value > 0


def summarize_readonly_review_snapshot(snapshot):
    """Summarize observed records, without treating them as authorization."""
    if not isinstance(snapshot, dict) or set(snapshot) != _KEYS:
        raise ValueError("Unexpected GitHub review snapshot schema")
    if (
        not isinstance(snapshot["repository"], str)
        or not snapshot["repository"].strip()
        or not _positive_int(snapshot["pr_number"])
        or not isinstance(snapshot["head_sha"], str)
        or not _SHA.fullmatch(snapshot["head_sha"])
        or not _positive_int(snapshot["author_numeric_id"])
        or snapshot["pr_state"] not in ("open", "closed")
        or snapshot["retrieval_method"] != "github_rest_https_token"
        or not isinstance(snapshot["reviews"], list)
    ):
        raise ValueError("Invalid GitHub review snapshot")
    if any(
        snapshot[key] is not False
        for key in (
            "repository_policy_verified", "execution_authorized",
            "merge_authorized", "deployment_authorized",
        )
    ):
        raise ValueError("Snapshot cannot supply authority claims")

    at_head_approvals = []
    at_head_changes = []
    stale_review_ids = []
    self_review_ids = []
    dismissed_review_ids = []
    pending_review_ids = []
    seen_review_ids = set()

    for review in snapshot["reviews"]:
        if not isinstance(review, dict) or set(review) != _REVIEW_KEYS:
            raise ValueError("Unexpected GitHub review record schema")
        review_id = review["review_id"]
        reviewer_id = review["reviewer_numeric_id"]
        login = review["reviewer_login"]
        state = review["state"]
        commit = review["commit_sha"]
        if (
            not _positive_int(review_id)
            or not _positive_int(reviewer_id)
            or not isinstance(login, str)
            or not login.strip()
            or not isinstance(state, str)
            or state not in _STATES
            or not isinstance(commit, str)
            or not _SHA.fullmatch(commit)
        ):
            raise ValueError("Invalid GitHub review record")
        if review_id in seen_review_ids:
            raise ValueError("Duplicate GitHub review ID")
        seen_review_ids.add(review_id)
        if reviewer_id == snapshot["author_numeric_id"]:
            self_review_ids.append(review_id)
            continue
        if commit.lower() != snapshot["head_sha"].lower():
            stale_review_ids.append(review_id)
            continue
        if state == "DISMISSED":
            dismissed_review_ids.append(review_id)
        elif state == "PENDING":
            pending_review_ids.append(review_id)
        elif state in {"APPROVED", "CHANGES_REQUESTED"}:
            observed = {"review_id": review_id, "reviewer_numeric_id": reviewer_id,
                        "reviewer_login": login}
            if state == "APPROVED":
                at_head_approvals.append(observed)
            else:
                at_head_changes.append(observed)

    return {
        "repository": snapshot["repository"],
        "pr_number": snapshot["pr_number"],
        "head_sha": snapshot["head_sha"],
        "pr_state": snapshot["pr_state"],
        "observed_review_count": len(seen_review_ids),
        "observed_current_commit_approvals": sorted(
            at_head_approvals, key=lambda item: item["review_id"]
        ),
        "observed_current_commit_changes_requested": sorted(
            at_head_changes, key=lambda item: item["review_id"]
        ),
        "observed_stale_review_ids": sorted(stale_review_ids),
        "observed_self_review_ids": sorted(self_review_ids),
        "observed_dismissed_review_ids": sorted(dismissed_review_ids),
        "observed_pending_review_ids": sorted(pending_review_ids),
        "reviewer_permissions_verified": False,
        "repository_policy_verified": False,
        "effective_approval_verification": False,
        "execution_authorized": False,
        "merge_authorized": False,
        "deployment_authorized": False,
        "warning": (
            "Observational audit only. Reviews may be superseded or dismissed, "
            "and GitHub repository policy is not verified."
        ),
    }
