"""Phase-2 controls. Actual Git repository operations run in disposable fixtures."""
import copy
import json
import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

from scripts import visura_auto_dev_configurable as m


def strings(**kwargs):
    return m.example_task('VISURA-STR-02', 'string_pipeline', {'steps': ['strip', 'upper']}, **kwargs)


def numbers(offset=7, **kwargs):
    return m.example_task('VISURA-NUM-02', 'integer_offset', {'offset': offset}, **kwargs)


class ConfigurableFixtureTests(unittest.TestCase):
    def test_strings_real_failure_repair_diff_and_commit(self):
        r = m.run_configurable_task(strings())
        self.assertEqual(r['status'], 'passed')
        self.assertEqual([a['test_exit'] for a in r['attempts']], [1, 0])
        self.assertEqual(r['files_changed'], ['src/strings.py'])
        self.assertIn('+    return value.strip().upper()', r['diff'])
        self.assertNotEqual(r['base_sha'], r['head_sha'])
        self.assertTrue(r['fixture_commit_created'])
        self.assertTrue(r['workspace_cleaned_on_exit'])
        self.assertFalse(r['external_writes'])
        self.assertFalse(r['untrusted_code_execution_authorized'])
        self.assertFalse(r['human_authorization_verified'])

    def test_integer_real_patch_first_attempt(self):
        r = m.run_configurable_task(numbers(-9))
        self.assertEqual(r['status'], 'passed')
        self.assertEqual([a['test_exit'] for a in r['attempts']], [0])
        self.assertIn('+    return value + -9', r['diff'])
        self.assertEqual(r['files_changed'], ['src/numbers.py'])

    def test_different_tasks_really_configurable(self):
        r1 = m.run_configurable_task(m.example_task('VISURA-LOW-02', 'string_pipeline',
                                                       {'steps': ['strip', 'lower']}))
        r2 = m.run_configurable_task(numbers(13))
        self.assertIn('value.strip().lower()', r1['diff'])
        self.assertIn('value + 13', r2['diff'])

    def test_idempotent_contents_and_diff(self):
        r1 = m.run_configurable_task(numbers(-4))
        r2 = m.run_configurable_task(numbers(-4))
        self.assertEqual(r1['final_source_sha256'], r2['final_source_sha256'])
        self.assertEqual(r1['diff_sha256'], r2['diff_sha256'])

    def test_task_validation_is_not_authorization(self):
        r = m.validate_configurable_task(strings())
        self.assertFalse(r['execution_authorized'])
        self.assertFalse(r['human_authorization_verified'])

    def test_reject_unknown_manifest_key(self):
        task = strings()
        task['command'] = 'ls'
        with self.assertRaisesRegex(ValueError, 'required/unknown'):
            m.run_configurable_task(task)

    def test_reject_shell_key_in_legacy_task(self):
        task = strings()
        task['task']['shell_command'] = 'curl example.com'
        with self.assertRaisesRegex(ValueError, 'Unknown fields'):
            m.run_configurable_task(task)

    def test_reject_other_fixture_or_repository(self):
        task = strings()
        task['fixture'] = 'https://github.com/example/private'
        with self.assertRaisesRegex(ValueError, 'external fixture'):
            m.run_configurable_task(task)

    def test_reject_path_traversal_and_absolute(self):
        for malicious in ['../../etc/passwd', '/tmp/outside.py', 'src/../outside.py']:
            task = strings()
            task['allowed_paths'] = [malicious]
            with self.subTest(malicious=malicious):
                with self.assertRaisesRegex(ValueError, 'Path outside'):
                    m.run_configurable_task(task)

    def test_reject_bad_actions_and_checks(self):
        for key, val in [('allowed_actions', ['shell']),
                         ('required_checks', ['curl']),
                         ('required_checks', []),
                         ('initial_state', 'production'),
                         ('expected_result', 'no_tests')]:
            task = strings()
            task[key] = val
            with self.subTest(key=key):
                with self.assertRaises(ValueError):
                    m.validate_configurable_task(task)

    def test_reject_malicious_source_in_params(self):
        task = strings()
        task['parameters'] = {'steps': ['__import__("os").system("echo pwned")']}
        with self.assertRaisesRegex(ValueError, 'Unsupported string transform'):
            m.run_configurable_task(task)

    def test_reject_extra_param_field(self):
        task = numbers()
        task['parameters']['eval'] = 'bad'
        with self.assertRaisesRegex(ValueError, 'required/unknown'):
            m.run_configurable_task(task)

    def test_reject_boolean_and_large_offset(self):
        for offset in [True, 21, -21, 2.5, '7']:
            with self.subTest(offset=offset):
                with self.assertRaisesRegex(ValueError, 'Offset outside'):
                    m.run_configurable_task(numbers(offset))

    def test_reject_paid_cost(self):
        task = strings()
        task['task']['max_cost_eur'] = 1
        with self.assertRaisesRegex(ValueError, 'Paid calls prohibited'):
            m.run_configurable_task(task)

    def test_attempt_and_deadline_bounds(self):
        for value in [0, 3, True, '2']:
            task = strings()
            task['max_attempts'] = value
            with self.subTest(max_attempts=value):
                with self.assertRaisesRegex(ValueError, 'Max attempts'):
                    m.run_configurable_task(task)
        task = strings()
        task['timeout_seconds'] = 100
        with self.assertRaisesRegex(ValueError, 'Timeout outside'):
            m.run_configurable_task(task)

    def test_failed_attempt_limit_no_commit(self):
        task = strings(max_attempts=2)
        with patch.object(m, '_source_for', return_value=m.FIXTURES['string_pipeline'][1]):
            r = m.run_configurable_task(task)
        self.assertEqual(r['status'], 'failed_no_commit')
        self.assertEqual(len(r['attempts']), 2)
        self.assertTrue(all(a['test_exit'] for a in r['attempts']))
        self.assertNotIn('head_sha', r)

    def test_reject_symlink_file(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            (root / 'src').mkdir()
            outside = root / 'outside.py'
            outside.write_text('safe')
            (root / 'src' / 'strings.py').symlink_to(outside)
            with self.assertRaisesRegex(ValueError, 'Symbolic links prohibited'):
                m._secure_fixture_file(root, 'src/strings.py')
            self.assertEqual(outside.read_text(), 'safe')

    def test_reject_symlink_directory(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            (root / 'other').mkdir()
            (root / 'other' / 'strings.py').write_text('safe')
            (root / 'src').symlink_to(root / 'other', target_is_directory=True)
            with self.assertRaisesRegex(ValueError, 'Symbolic links prohibited'):
                m._secure_fixture_file(root, 'src/strings.py')

    def test_reject_path_escape_helper(self):
        with tempfile.TemporaryDirectory() as d:
            for p in ['../foo.py', '/etc/passwd', 'src/../../foo.py']:
                with self.subTest(path=p):
                    with self.assertRaisesRegex(ValueError, 'Invalid fixture file path'):
                        m._secure_fixture_file(d, p)

    def test_strips_secrets_and_proxies_from_children(self):
        env = m._child_env('/tmp/a')
        self.assertEqual(env['HOME'], '/tmp/a')
        for secret in ['GITHUB_TOKEN', 'GH_TOKEN', 'AWS_SECRET_ACCESS_KEY',
                       'OPENAI_API_KEY', 'HTTP_PROXY', 'HTTPS_PROXY', 'PYTHONPATH']:
            self.assertNotIn(secret, env)

    def test_real_subprocess_deadline(self):
        with tempfile.TemporaryDirectory() as d:
            r = m._run([sys.executable, '-I', '-B', '-c', 'import time;time.sleep(5)'],
                       d, d, timeout=0.2)
        self.assertEqual(r['code'], 124)
        self.assertTrue(r['timed_out'])

    def test_git_head_conflict_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            repo, home = root / 'repo', root / 'home'
            repo.mkdir()
            home.mkdir()
            m._git(repo, home, 'init', '-q', '-b', 'main')
            (repo / 'a.txt').write_text('initial')
            m._git(repo, home, 'add', '--', 'a.txt')
            m._git(repo, home, '-c', 'user.name=Fixture', '-c',
                   'user.email=fixture@invalid.example', 'commit', '-qm', 'First')
            with self.assertRaisesRegex(RuntimeError, 'HEAD changed'):
                m._assert_head(repo, home, '0' * 40)

    def test_duplicate_json_field_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / 'manifest.json'
            p.write_text('{"fixture":"builtin_v2","fixture":"evil"}')
            with self.assertRaisesRegex(ValueError, 'Duplicate task JSON key'):
                m.read_manifest(p)

    def test_manifest_symlink_and_oversize_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            big = root / 'big.json'
            big.write_text('x' * (m.MAX_TASK_BYTES + 1))
            with self.assertRaisesRegex(ValueError, 'oversized'):
                m.read_manifest(big)
            link = root / 'linked.json'
            link.symlink_to(big)
            with self.assertRaisesRegex(ValueError, 'Invalid or oversized'):
                m.read_manifest(link)

    def test_task_file_cli_real(self):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / 'task.json'
            path.write_text(json.dumps(numbers(3)))
            loaded = m.read_manifest(path)
            r = m.run_configurable_task(loaded)
        self.assertEqual(r['status'], 'passed')
        self.assertIn('value + 3', r['diff'])


if __name__ == '__main__':
    unittest.main()
