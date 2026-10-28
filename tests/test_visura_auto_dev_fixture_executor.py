"""Tests for the actual disposable fixture runner, not a mock of a Git edit."""
import unittest

from scripts.visura_auto_dev_fixture_executor import PILOT_TASK, run_fixture_pilot


class FixtureExecutorTests(unittest.TestCase):
    def test_real_bounded_failure_repair_and_commit(self):
        result = run_fixture_pilot()
        self.assertEqual(result['mode'], 'disposable_fixture_only')
        self.assertEqual([attempt['test_exit'] == 0 for attempt in result['attempts']], [False, True])
        self.assertTrue(result['tests_passed'])
        self.assertTrue(result['fixture_commit_created'])
        self.assertEqual(result['files_changed'], ['src/reference.py'])
        self.assertIn('return text.strip().upper()', result['diff'])
        self.assertEqual(len(result['base_sha']), 40)
        self.assertEqual(len(result['head_sha']), 40)
        self.assertNotEqual(result['head_sha'], result['base_sha'])
        self.assertFalse(result['pr_created'])
        self.assertFalse(result['execution_authorized_outside_fixture'])

    def test_refuses_different_task(self):
        task = dict(PILOT_TASK)
        task['scope'] = 'Run arbitrary code'
        with self.assertRaisesRegex(ValueError, 'Only the preapproved'):
            run_fixture_pilot(task)

    def test_refuses_unknown_task_field(self):
        task = dict(PILOT_TASK)
        task['shell'] = 'rm -rf /'
        with self.assertRaisesRegex(ValueError, 'Unknown fields'):
            run_fixture_pilot(task)

    def test_refuses_paid_task(self):
        task = dict(PILOT_TASK)
        task['max_cost_eur'] = 0.01
        with self.assertRaisesRegex(ValueError, 'Only the preapproved'):
            run_fixture_pilot(task)

    def test_refuses_missing_fields(self):
        task = dict(PILOT_TASK)
        task.pop('checks')
        with self.assertRaisesRegex(ValueError, 'Missing fields'):
            run_fixture_pilot(task)


if __name__ == '__main__':
    unittest.main()
