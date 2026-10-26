"""Normalize a minimal GitHub review API response for offline inspection.

Only pass responses retrieved by a trusted GitHub API client. This parser
does not authenticate data, query GitHub or grant any execution permission.
"""
from scripts.visura_github_review_projection import summarize_pr_reviews


def inspect_github_reviews(api_reviews, expected_head_sha):
    if not isinstance(api_reviews, list):
        raise ValueError("GitHub review payload must be a list")
    normalized = []
    for item in api_reviews:
        if not isinstance(item, dict):
            raise ValueError("Invalid GitHub review")
        user = item.get("user")
        commit_id = item.get("commit_id")
        state = item.get("state")
        if not isinstance(user, dict) or not isinstance(user.get("login"), str):
            raise ValueError("Missing GitHub reviewer login")
        if not isinstance(commit_id, str) or not isinstance(state, str):
            raise ValueError("Missing GitHub review state or commit")
        normalized.append({
            "reviewer_id": user["login"],
            "state": state,
            "head_sha": commit_id,
        })
    result = summarize_pr_reviews(normalized, expected_head_sha)
    result["source_authenticated"] = False
    result["requires_trusted_github_api_client"] = True
    return result
