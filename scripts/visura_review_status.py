"""Summarize review decisions without granting merge or execution rights.

Input must come from a trusted GitHub integration. Review ordering is the
caller-provided order; this is an offline advisory summary, not an access gate.
"""
from scripts.visura_github_review_projection import summarize_pr_reviews


def advisory_review_status(reviews, head_sha):
    projection = summarize_pr_reviews(reviews, head_sha)
    latest_by_reviewer = {}
    for review in projection["matching_reviews"]:
        state = review["state"]
        if state in {"APPROVED", "CHANGES_REQUESTED", "DISMISSED"}:
            latest_by_reviewer[review["reviewer_id"]] = state
    approvals = sorted(
        reviewer for reviewer, state in latest_by_reviewer.items()
        if state == "APPROVED"
    )
    changes_requested = sorted(
        reviewer for reviewer, state in latest_by_reviewer.items()
        if state == "CHANGES_REQUESTED"
    )
    return {
        "head_sha": projection["head_sha"],
        "approval_reviewers": approvals,
        "changes_requested_by": changes_requested,
        "status": (
            "changes_requested" if changes_requested else
            "has_approvals" if approvals else "no_approvals"
        ),
        "source_authenticated": False,
        "execution_authorized": False,
        "merge_authorized": False,
    }
