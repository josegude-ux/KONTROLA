"""Fail-closed authorization assessment for VISURA development tasks.

This module only evaluates an authorization record; it does not authenticate
a human, verify cryptographic signatures, run commands, or execute a task.
A trusted external service must establish the reviewer's identity.
"""
from scripts.visura_task_preview import preview_task

ALLOWED_REVIEW_DECISIONS = {"approve", "reject"}


def assess_execution_request(task, review):
    preview = preview_task(task)
    if not isinstance(review, dict):
        raise ValueError("Review must be an object")
    if set(review) != {"task_id", "decision", "reviewer_id", "trusted_identity_verified"}:
        raise ValueError("Invalid review fields")
    if review["task_id"] != preview["task_id"]:
        raise ValueError("Review task mismatch")
    if review["decision"] not in ALLOWED_REVIEW_DECISIONS:
        raise ValueError("Invalid review decision")
    reviewer = review["reviewer_id"]
    if not isinstance(reviewer, str) or not reviewer.strip() or len(reviewer) > 120:
        raise ValueError("Invalid reviewer")
    if type(review["trusted_identity_verified"]) is not bool:
        raise ValueError("Invalid identity verification flag")
    return {
        "task_id": preview["task_id"],
        "review_decision": review["decision"],
        "trusted_identity_verified": review["trusted_identity_verified"],
        "review_record_eligible": (
            review["decision"] == "approve" and review["trusted_identity_verified"]
        ),
        "execution_authorized": False,
        "requires_external_authorization_gate": True,
        "merge_authorized": False,
    }
