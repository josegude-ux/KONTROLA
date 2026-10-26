import unittest
from scripts.visura_task_spec import validate_task


def valid_task():
    return {
        "task_id": "VISURA-CSV-01",
        "title": "Add CSV preflight validation",
        "scope": "Add a read-only CSV validation helper and tests.",
        "checks": ["python -m unittest", "Review changes"],
        "max_cost_eur": 0,
    }


class TaskSpecTests(unittest.TestCase):
    def test_valid_task_stays_unauthorized(self):
        result = validate_task(valid_task())
        self.assertFalse(result["execution_authorized"])
        self.assertTrue(result["requires_human_approval"])

    def test_rejects_unknown_fields(self):
        task = valid_task()
        task["shell_command"] = "rm -rf /"
        with self.assertRaisesRegex(ValueError, "Unknown fields"):
            validate_task(task)

    def test_rejects_missing_fields(self):
        task = valid_task()
        del task["checks"]
        with self.assertRaisesRegex(ValueError, "Missing fields"):
            validate_task(task)

    def test_rejects_invalid_task_id(self):
        task = valid_task()
        task["task_id"] = "../../main"
        with self.assertRaisesRegex(ValueError, "Invalid task_id"):
            validate_task(task)

    def test_rejects_blank_title(self):
        task = valid_task()
        task["title"] = " "
        with self.assertRaisesRegex(ValueError, "Invalid title"):
            validate_task(task)

    def test_rejects_empty_checks(self):
        task = valid_task()
        task["checks"] = []
        with self.assertRaisesRegex(ValueError, "Invalid checks"):
            validate_task(task)

    def test_rejects_cost_over_ten_euros(self):
        task = valid_task()
        task["max_cost_eur"] = 10.01
        with self.assertRaisesRegex(ValueError, "between 0 and 10"):
            validate_task(task)

    def test_rejects_boolean_cost(self):
        task = valid_task()
        task["max_cost_eur"] = True
        with self.assertRaisesRegex(ValueError, "between 0 and 10"):
            validate_task(task)

    def test_rejects_nan_cost(self):
        task = valid_task()
        task["max_cost_eur"] = float("nan")
        with self.assertRaisesRegex(ValueError, "between 0 and 10"):
            validate_task(task)

    def test_rejects_infinite_cost(self):
        task = valid_task()
        task["max_cost_eur"] = float("inf")
        with self.assertRaisesRegex(ValueError, "between 0 and 10"):
            validate_task(task)

    def test_rejects_overlong_scope(self):
        task = valid_task()
        task["scope"] = "x" * 2001
        with self.assertRaisesRegex(ValueError, "Invalid scope"):
            validate_task(task)

    def test_rejects_non_object_task(self):
        with self.assertRaisesRegex(ValueError, "Task must be an object"):
            validate_task(["not", "a", "dict"])

    def test_rejects_overlong_title(self):
        task = valid_task()
        task["title"] = "T" * 121
        with self.assertRaisesRegex(ValueError, "Invalid title"):
            validate_task(task)

    def test_rejects_non_string_check(self):
        task = valid_task()
        task["checks"] = ["unit tests", 42]
        with self.assertRaisesRegex(ValueError, "Invalid checks"):
            validate_task(task)

    def test_rejects_overlong_check(self):
        task = valid_task()
        task["checks"] = ["x" * 201]
        with self.assertRaisesRegex(ValueError, "Invalid checks"):
            validate_task(task)

    def test_rejects_blank_scope(self):
        task = valid_task()
        task["scope"] = "   "
        with self.assertRaisesRegex(ValueError, "Invalid scope"):
            validate_task(task)

    def test_rejects_too_many_checks(self):
        task = valid_task()
        task["checks"] = ["check"] * 11
        with self.assertRaisesRegex(ValueError, "Invalid checks"):
            validate_task(task)


if __name__ == "__main__":
    unittest.main()
