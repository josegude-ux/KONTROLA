"""Create a review-only work plan from a validated VISURA task.

No shell commands are accepted or executed. The output is a checklist for a
human reviewer and is never treated as execution authorization.
"""
from scripts.visura_task_spec import validate_task


def build_review_plan(task):
    validated = validate_task(task)
    return {
        "task_id": validated["task_id"],
        "title": validated["title"],
        "steps": [
            {"id": "inspect", "description": "Inspect the relevant repository files", "done": False},
            {"id": "implement", "description": "Propose a minimal isolated change", "done": False},
            {"id": "test", "description": "Run the declared checks in an isolated CI job", "done": False},
            {"id": "review", "description": "Review the diff and test evidence", "done": False},
            {"id": "approval", "description": "Obtain explicit human approval before merge", "done": False},
        ],
        "declared_checks": validated["checks"],
        "max_cost_eur": validated["max_cost_eur"],
        "execution_authorized": False,
        "merge_authorized": False,
        "human_approval_required": True,
    }
