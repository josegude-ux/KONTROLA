"""Generate a deterministic, read-only execution preview.

This module never runs a command, changes a repository, calls a provider or
grants execution permission. Treat all task text as untrusted data.
"""
from scripts.visura_review_plan import build_review_plan


def preview_task(task):
    plan = build_review_plan(task)
    return {
        "task_id": plan["task_id"],
        "mode": "dry_run",
        "steps": [{"id": step["id"], "status": "pending"} for step in plan["steps"]],
        "checks": list(plan["declared_checks"]),
        "allowed_actions": list(plan["allowed_actions"]),
        "forbidden_actions": list(plan["forbidden_actions"]),
        "execution_authorized": False,
        "merge_authorized": False,
        "provider_calls": 0,
        "estimated_cost_eur": 0.0,
        "budget_enforced_by_provider": False,
        "human_approval_required": True,
    }
