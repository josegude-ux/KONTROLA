"""Read-only review context check, not a trusted authorization service.

All inputs are untrusted. No result grants permission to execute or merge.
"""


def inspect_review_context(task, review):
    task_keys = {"task_id", "repository", "pr_number", "head_sha", "author_id"}
    review_keys = {"task_id", "repository", "pr_number", "head_sha", "reviewer_id", "decision"}
    if not isinstance(task, dict) or not isinstance(review, dict):
        raise ValueError("Task and review must be dictionaries")
    if set(task) != task_keys or set(review) != review_keys:
        raise ValueError("Unexpected context fields")
    for data in (task, review):
        for key, value in data.items():
            if key == "pr_number":
                if type(value) is not int or value <= 0:
                    raise ValueError("Invalid PR number")
            elif not isinstance(value, str) or not value.strip():
                raise ValueError("Invalid context string")
        sha = data["head_sha"]
        if len(sha) != 40 or any(ch not in "0123456789abcdefABCDEF" for ch in sha):
            raise ValueError("Invalid SHA")
        repo = data["repository"]
        parts = repo.split("/")
        if len(parts) != 2 or any(not part or part in {".", ".."} for part in parts):
            raise ValueError("Invalid repository")
    if review["decision"] not in {"APPROVED", "CHANGES_REQUESTED", "DISMISSED"}:
        raise ValueError("Invalid decision")
    same_context = (
        task["task_id"] == review["task_id"]
        and task["repository"] == review["repository"]
        and task["pr_number"] == review["pr_number"]
        and task["head_sha"].lower() == review["head_sha"].lower()
    )
    self_review = task["author_id"].casefold() == review["reviewer_id"].casefold()
    return {
        "context_matches": same_context,
        "self_review": self_review,
        "claimed_approval_matches_context": (
            same_context and not self_review and review["decision"] == "APPROVED"
        ),
        "source_authenticated": False,
        "execution_authorized": False,
        "merge_authorized": False,
    }
