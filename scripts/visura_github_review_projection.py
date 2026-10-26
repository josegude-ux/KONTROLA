"""Conservative projection of GitHub PR review data.

This is NOT a GitHub API client and does NOT authenticate review payloads.
Callers must retrieve reviews through a trusted GitHub integration and bind
them to the exact PR head SHA. No execution or merge authorization is granted.
"""


def summarize_pr_reviews(reviews, expected_head_sha):
    if not isinstance(expected_head_sha, str) or len(expected_head_sha) != 40 or any(
        ch not in "0123456789abcdefABCDEF" for ch in expected_head_sha
    ):
        raise ValueError("Invalid head SHA")
    if not isinstance(reviews, list):
        raise ValueError("Reviews must be a list")
    accepted = []
    for review in reviews:
        if not isinstance(review, dict) or set(review) != {
            "reviewer_id", "state", "head_sha"
        }:
            raise ValueError("Invalid review record")
        reviewer = review["reviewer_id"]
        if not isinstance(reviewer, str) or not reviewer.strip() or len(reviewer) > 120:
            raise ValueError("Invalid reviewer")
        if not isinstance(review["state"], str) or review["state"] not in {
            "APPROVED", "CHANGES_REQUESTED", "COMMENTED", "DISMISSED"
        }:
            raise ValueError("Invalid review state")
        head_sha = review["head_sha"]
        if not isinstance(head_sha, str) or len(head_sha) != 40 or any(
            ch not in "0123456789abcdefABCDEF" for ch in head_sha
        ):
            raise ValueError("Invalid review head SHA")
        if head_sha.lower() != expected_head_sha.lower():
            continue
        accepted.append({"reviewer_id": reviewer, "state": review["state"]})
    return {
        "head_sha": expected_head_sha,
        "matching_reviews": accepted,
        "execution_authorized": False,
        "merge_authorized": False,
        "trusted_github_identity_required": True,
    }
