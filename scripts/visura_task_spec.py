"""Validate a VISURA AUTO-DEV task proposal without executing it.

This is a local policy gate only: it does not call an AI provider, run shell
commands, create branches, or write repository files.
"""
import re

ALLOWED_KEYS = {"task_id", "title", "scope", "checks", "max_cost_eur"}
TASK_ID = re.compile(r"^[A-Z][A-Z0-9_-]{2,39}$")
MAX_TITLE = 120
MAX_SCOPE = 2000
MAX_CHECKS = 10
MAX_COST_EUR = 10.0


def validate_task(task):
    if not isinstance(task, dict):
        raise ValueError("Task must be an object")
    unknown = set(task) - ALLOWED_KEYS
    missing = ALLOWED_KEYS - set(task)
    if unknown:
        raise ValueError("Unknown fields: " + ", ".join(sorted(unknown)))
    if missing:
        raise ValueError("Missing fields: " + ", ".join(sorted(missing)))
    task_id = task["task_id"]
    if not isinstance(task_id, str) or not TASK_ID.fullmatch(task_id):
        raise ValueError("Invalid task_id")
    title = task["title"]
    if not isinstance(title, str) or not title.strip() or len(title) > MAX_TITLE:
        raise ValueError("Invalid title")
    scope = task["scope"]
    if not isinstance(scope, str) or not scope.strip() or len(scope) > MAX_SCOPE:
        raise ValueError("Invalid scope")
    checks = task["checks"]
    if (not isinstance(checks, list) or not checks or len(checks) > MAX_CHECKS
            or any(not isinstance(check, str) or not check.strip() or len(check) > 200
                   for check in checks)):
        raise ValueError("Invalid checks")
    cost = task["max_cost_eur"]
    if isinstance(cost, bool) or not isinstance(cost, (int, float)) or cost < 0 or cost > MAX_COST_EUR:
        raise ValueError("max_cost_eur must be between 0 and 10")
    return {
        "task_id": task_id,
        "title": title.strip(),
        "scope": scope.strip(),
        "checks": [check.strip() for check in checks],
        "max_cost_eur": float(cost),
        "execution_authorized": False,
        "requires_human_approval": True,
    }
