"""Fail-closed, zero-cost VISURA AUTO-DEV task planner.

This module prepares a deterministic execution plan. It never executes commands,
writes files, contacts external services, or invokes a paid model.
"""
import json
import sys
from scripts.visura_task_spec import validate_task

ALLOWED_REPO = "josegude-ux/KONTROLA"
ALLOWED_BASE = "feat/visura-auto-dev-task-spec"
ALLOWED_PATH_PREFIX = "docs/"
FORBIDDEN_PATH_PARTS = ("..", "\\", ".github/", "supabase/", ".env")


def plan_task(task, *, repository, base_branch, output_path):
    validated = validate_task(task)
    if repository != ALLOWED_REPO or base_branch != ALLOWED_BASE:
        raise ValueError("Repository or base branch not approved for pilot")
    if not isinstance(output_path, str) or not output_path.startswith(ALLOWED_PATH_PREFIX):
        raise ValueError("Only documentation output is allowed")
    if any(part in output_path for part in FORBIDDEN_PATH_PARTS):
        raise ValueError("Unsafe output path")
    if not output_path.endswith(".md"):
        raise ValueError("Output must be Markdown")
    if validated["max_cost_eur"] != 0:
        raise ValueError("Pilot requires zero model spend")
    return {
        "task_id": validated["task_id"],
        "repository": repository,
        "base_branch": base_branch,
        "output_path": output_path,
        "mode": "PLAN_ONLY",
        "writes_enabled": False,
        "model_calls_enabled": False,
        "requires_human_approval": True,
        "checks": validated["checks"],
    }


def main():
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python -m scripts.visura_executor_preflight task.json")
    with open(sys.argv[1], encoding="utf-8") as stream:
        payload = json.load(stream)
    plan = plan_task(
        payload["task"],
        repository=payload["repository"],
        base_branch=payload["base_branch"],
        output_path=payload["output_path"],
    )
    print(json.dumps(plan, ensure_ascii=False, sort_keys=True))


if __name__ == "__main__":
    main()
