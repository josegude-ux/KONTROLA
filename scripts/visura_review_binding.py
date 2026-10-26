"""Read-only binding check for task and review metadata.

The input is untrusted and no result from this module authorizes execution.
"""


def inspect_task_review_binding(task, review):
    if not isinstance(task, dict) or not isinstance(review, dict):
        raise ValueError("Task and review must be dictionaries")
    task_keys = {"task_id", "head_sha", "author_id"}
    review_keys = {"task_id", "head_sha", "reviewer_id", "decision"}
    if set(task) != task_keys or set(review) != review_keys:
        raise ValueError("Unexpected task or review fields")
    for obj, keys in ((task, task_keys), (review, review_keys)):
        if any(not isinstance(obj[key], str) or not obj[key].strip() for key in keys):
            raise ValueError("Task and review fields must be nonempty strings")
    for sha in (task["head_sha"], review["head_sha"]):
        if len(sha) != 40 or any(ch not in "0123456789abcdefABCDEF" for ch in sha):
            raise ValueError("Invalid commit SHA")
    if review["decision"] not in {"APPROVED", "CHANGES_REQUESTED", "DISMISSED"}:
        raise ValueError("Invalid review decision")
    matching = (
        task["task_id"] == review["task_id"]
        and task["head_sha"].lower() == review["head_sha"].lower()
    )
    self_review = task["author_id"].casefold() == review["reviewer_id"].casefold()
    return {
        "task_and_commit_match": matching,
        "self_review": self_review,
        "approval_claim_eligible_for_external_verification": (
            matching and not self_review and review["decision"] == "APPROVED"
        ),
        "reviewer_authenticated": False,
        "execution_authorized": False,
        "merge_authorized": False,
    }
