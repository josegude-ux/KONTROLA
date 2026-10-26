import unittest
from scripts.visura_task_preview import preview_task


class TaskPreviewTests(unittest.TestCase):
    def setUp(self):
        self.task = {
            "task_id": "VISURA-DRY-01",
            "title": "Review task",
            "scope": "Preview only.",
            "checks": ["unit tests"],
            "max_cost_eur": 0,
        }

    def test_preview_has_no_side_effect_authorization(self):
        result = preview_task(self.task)
        self.assertEqual(result["mode"], "dry_run")
        self.assertEqual(result["provider_calls"], 0)
        self.assertEqual(result["estimated_cost_eur"], 0.0)
        self.assertFalse(result["execution_authorized"])
        self.assertFalse(result["merge_authorized"])
        self.assertTrue(result["human_approval_required"])
        self.assertTrue(all(step["status"] == "pending" for step in result["steps"]))

    def test_preview_rejects_unrecognized_actions(self):
        self.task["shell_command"] = "echo unexpected"
        with self.assertRaisesRegex(ValueError, "Unknown fields"):
            preview_task(self.task)


if __name__ == "__main__":
    unittest.main()
