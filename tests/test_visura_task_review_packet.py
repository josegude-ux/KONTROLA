import io
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from contextlib import redirect_stdout
from unittest.mock import patch
from scripts.visura_task_review_packet import build_task_review_packet, read_task, main, MAX_TASK_CHARS


class TaskReviewPacketTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(); self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        def git(*args):
            return subprocess.check_output(['git', '-C', str(self.root), *args], text=True).strip()
        self.git = git
        git('init', '-q'); git('config', 'user.email', 'test@example.invalid')
        git('config', 'user.name', 'Test'); git('commit', '--allow-empty', '-qm', 'base')
        self.base = git('rev-parse', 'HEAD')
        (self.root / 'docs').mkdir(); (self.root / 'docs/test.md').write_text('example')
        git('add', '.'); git('commit', '-qm', 'example'); self.head = git('rev-parse', 'HEAD')
        self.task = {'task_id': 'TASK-001', 'title': 'Review example', 'scope': 'Review documentation',
                     'checks': ['Inspect documentation'], 'max_cost_eur': 0}

    def build(self):
        return build_task_review_packet(self.task, self.root, self.base, self.head)

    def test_end_to_end_real_commits_and_reproducible_digest(self):
        first = self.build(); second = self.build()
        self.assertEqual(first, second)
        self.assertEqual(first['diff_audit']['changed_file_count'], 1)
        self.assertTrue(first['diff_audit']['within_pilot_scope'])
        self.assertIn('task_implementation_not_verified', first['blockers'])
        for field in ['execution_authorized', 'merge_authorized', 'deployment_authorized', 'signature_verified']:
            self.assertFalse(first[field])
        self.assertEqual(self.git('status', '--porcelain'), '')

    def test_task_text_never_runs_as_command(self):
        self.task['checks'] = ['touch '+str(self.root/'executed')]
        report = self.build()
        self.assertFalse((self.root/'executed').exists())
        self.assertEqual(report['checks'][0]['status'], 'not_executed')

    def test_task_or_commit_change_changes_packet_identity(self):
        first = self.build()
        self.task['scope'] = 'Another scope'
        self.assertNotEqual(first['packet_sha256'], self.build()['packet_sha256'])
        self.task['scope'] = 'Review documentation'
        self.head = self.base
        self.assertNotEqual(first['packet_sha256'], self.build()['packet_sha256'])
        self.assertIn('empty_diff', self.build()['blockers'])

    def test_unknown_authorization_field_rejected_before_git(self):
        self.task['execution_authorized'] = True
        with patch('scripts.visura_task_review_packet.audit_local_diff') as audit:
            with self.assertRaises(ValueError): self.build()
            audit.assert_not_called()

    def test_duplicate_json_keys_rejected(self):
        with self.assertRaises(ValueError): read_task(io.StringIO('{"scope":"a","scope":"b"}'))

    def test_bounded_json_input(self):
        with self.assertRaises(ValueError): read_task(io.StringIO(' '*(MAX_TASK_CHARS+1)))

    def test_cli_outputs_report_without_modifying_repository(self):
        output = io.StringIO()
        with patch('sys.stdin', io.StringIO(json.dumps(self.task))), redirect_stdout(output):
            self.assertEqual(main([str(self.root), self.base, self.head]), 0)
        report = json.loads(output.getvalue())
        self.assertFalse(report['execution_authorized'])
        self.assertEqual(report['diff_audit']['head_sha'], self.head)
        self.assertEqual(self.git('status', '--porcelain'), '')
