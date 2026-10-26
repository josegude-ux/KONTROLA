import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from scripts.visura_local_diff_audit import audit_local_diff


class LocalDiffAuditTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.git('init', '-q')
        self.git('config', 'user.email', 'test@example.invalid')
        self.git('config', 'user.name', 'Test')
        self.git('commit', '--allow-empty', '-qm', 'base')
        self.base = self.git('rev-parse', 'HEAD').strip()

    def git(self, *args):
        return subprocess.check_output(['git', '-C', str(self.root), *args], text=True)

    def commit(self, path='scripts/visura_example.py', text='raise RuntimeError("must not run")\n'):
        p = self.root / path
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(text)
        self.git('add', '--', path)
        self.git('commit', '-qm', 'change')
        return self.git('rev-parse', 'HEAD').strip()

    def test_allowed_diff_is_read_only_and_never_authorizes(self):
        head = self.commit()
        before = self.git('status', '--porcelain')
        report = audit_local_diff(self.root, self.base, head)
        self.assertTrue(report['within_pilot_scope'])
        self.assertEqual(report['changed_file_count'], 1)
        for key in ['execution_authorized', 'merge_authorized', 'deployment_authorized',
                    'content_reviewed', 'tests_executed']:
            self.assertFalse(report[key])
        self.assertEqual(before, self.git('status', '--porcelain'))

    def test_workflow_and_operational_paths_blocked(self):
        for path in ['.github/workflows/attack.yml', 'app.js', '.env', 'supabase/migration.sql']:
            head = self.commit(path)
            report = audit_local_diff(self.root, self.base, head)
            self.assertIn('path_outside_pilot_scope', report['blockers'])

    def test_symlink_not_followed(self):
        self.root.joinpath('scripts').mkdir()
        self.root.joinpath('scripts/visura_link.py').symlink_to('/etc/passwd')
        self.git('add', '.')
        self.git('commit', '-qm', 'link')
        report = audit_local_diff(self.root, self.base, self.git('rev-parse', 'HEAD').strip())
        self.assertIn('non_regular_or_executable_file', report['blockers'])

    def test_deletion_blocked(self):
        base = self.commit()
        self.git('rm', '-q', 'scripts/visura_example.py')
        self.git('commit', '-qm', 'remove')
        report = audit_local_diff(self.root, base, self.git('rev-parse', 'HEAD').strip())
        self.assertIn('deletion_or_unsupported_change', report['blockers'])

    def test_empty_and_large_diffs_blocked(self):
        self.assertIn('empty_diff', audit_local_diff(self.root, self.base, self.base)['blockers'])
        for n in range(51):
            p = self.root / 'docs' / ('test'+str(n)+'.md')
            p.parent.mkdir(exist_ok=True); p.write_text('test')
        self.git('add', '.'); self.git('commit', '-qm', 'many')
        report = audit_local_diff(self.root, self.base, self.git('rev-parse', 'HEAD').strip())
        self.assertIn('too_many_changed_files', report['blockers'])

    def test_shell_like_revisions_rejected(self):
        for sha in ['HEAD', '--help', '$(touch bad)', 'a'*39]:
            with self.assertRaises(ValueError):
                audit_local_diff(self.root, sha, self.base)

    def test_blob_object_rejected(self):
        head = self.commit()
        blob = self.git('rev-parse', head+':scripts/visura_example.py').strip()
        with self.assertRaises(ValueError):
            audit_local_diff(self.root, self.base, blob)

    def test_external_diff_driver_not_executed(self):
        head = self.commit()
        marker = self.root / 'executed'
        self.git('config', 'diff.external', 'touch '+str(marker))
        audit_local_diff(self.root, self.base, head)
        self.assertFalse(marker.exists())
