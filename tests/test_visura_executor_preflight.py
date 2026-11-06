"""Isolated safety tests for the VISURA AUTO-DEV preflight."""
import unittest
from scripts.visura_executor_preflight import plan_task


class ExecutorPreflightTests(unittest.TestCase):
    def setUp(self):
        self.task = {
            "task_id": "VISURA_AUTO_DEV_PILOT_001",
            "title": "Safe documentation pilot",
            "scope": "Create a proposed documentation change",
            "checks": ["Review generated diff"],
            "max_cost_eur": 0,
        }
        self.kwargs = dict(
            repository="josegude-ux/KONTROLA",
            base_branch="feat/visura-auto-dev-task-spec",
            output_path="docs/VISURA_AUTO_DEV_PILOT_001.md",
        )

    def test_approved_plan_is_read_only(self):
        result = plan_task(self.task, **self.kwargs)
        self.assertEqual(result["mode"], "PLAN_ONLY")
        self.assertFalse(result["writes_enabled"])
        self.assertFalse(result["model_calls_enabled"])
        self.assertTrue(result["requires_human_approval"])

    def test_rejects_wrong_repository(self):
        with self.assertRaises(ValueError):
            plan_task(self.task, **{**self.kwargs, "repository": "other/repo"})

    def test_rejects_unsafe_paths(self):
        for path in ("../docs/x.md", "docs/../x.md", ".github/workflows/x.yml",
                     "supabase/migrations/x.sql", "docs/x.txt", "docs/\\evil.md"):
            with self.subTest(path=path), self.assertRaises(ValueError):
                plan_task(self.task, **{**self.kwargs, "output_path": path})

    def test_rejects_paid_calls(self):
        with self.assertRaises(ValueError):
            plan_task({**self.task, "max_cost_eur": 0.01}, **self.kwargs)

    def test_rejects_unapproved_base(self):
        with self.assertRaises(ValueError):
            plan_task(self.task, **{**self.kwargs, "base_branch": "main"})


if __name__ == "__main__":
    unittest.main()
