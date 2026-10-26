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
        "allowed_actions": [
            "inspect_repository_files",
            "propose_isolated_diff",
            "run_tests_in_ci",
            "open_draft_pull_request",
        ],
        "forbidden_actions": [
            "execute_task_supplied_shell_commands",
            "access_production_data",
            "merge_pull_request",
            "deploy_application",
            "make_paid_ai_calls_without_verified_budget_gate",
        ],
        "execution_authorized": False,
        "merge_authorized": False,
        "human_approval_required": True,
    }
