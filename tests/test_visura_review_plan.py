import unittest
from scripts.visura_review_plan import build_review_plan


class ReviewPlanTests(unittest.TestCase):
    def test_plan_is_review_only(self):
        task = {
            "task_id": "VISURA-PLAN-01",
            "title": "Improve CSV checks",
            "scope": "Add more parser tests.",
            "checks": ["python -m unittest"],
            "max_cost_eur": 0,
        }
        plan = build_review_plan(task)
        self.assertFalse(plan["execution_authorized"])
        self.assertFalse(plan["merge_authorized"])
        self.assertTrue(plan["human_approval_required"])
        self.assertEqual(
            [step["id"] for step in plan["steps"]],
            ["inspect", "implement", "test", "review", "approval"],
        )

    def test_rejects_unvalidated_shell_command(self):
        task = {
            "task_id": "VISURA-PLAN-02",
            "title": "Unsafe",
            "scope": "No execution.",
            "checks": ["unit tests"],
            "max_cost_eur": 0,
            "shell_command": "echo unsafe",
        }
        with self.assertRaisesRegex(ValueError, "Unknown fields"):
            build_review_plan(task)


if __name__ == "__main__":
    unittest.main()
