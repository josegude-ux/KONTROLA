"""Inspect committed changes locally without checking out or executing PR code.

A clean report is a scope observation, never execution or merge authorization.
"""
import argparse
import json
import os
import re
import subprocess

MAX_FILES = 50
MAX_OUTPUT = 1024 * 1024
SHA = re.compile(r'[0-9a-f]{40}\Z')
ALLOWED = re.compile(r'(?:scripts/visura_[A-Za-z0-9_]+\.py|tests/test_visura_[A-Za-z0-9_]+\.py|docs/[A-Za-z0-9_.-]+\.md)\Z')


def audit_local_diff(repository_path, base_sha, head_sha):
    for sha in (base_sha, head_sha):
        if not isinstance(sha, str) or not SHA.fullmatch(sha):
            raise ValueError('Full lowercase commit SHAs required')
    env = {k: v for k, v in os.environ.items() if not k.startswith('GIT_')}
    env.update(GIT_CONFIG_NOSYSTEM='1', GIT_CONFIG_GLOBAL=os.devnull,
               GIT_NO_REPLACE_OBJECTS='1', GIT_TERMINAL_PROMPT='0')
    def git(*args):
        # Never use shell, checkout, hooks, textconv or an external diff driver.
        result = subprocess.run(['git', '--no-pager', '-C', str(repository_path),
            *args], env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            timeout=15, check=False)
        if result.returncode:
            raise ValueError('Local Git inspection failed')
        if len(result.stdout) > MAX_OUTPUT:
            raise ValueError('Diff metadata exceeds inspection limit')
        return result.stdout
    for sha in (base_sha, head_sha):
        if git('cat-file', '-t', sha).strip() != b'commit':
            raise ValueError('Both objects must be commits')
    raw = git('diff', '--raw', '-z', '--no-renames', '--no-ext-diff',
              '--no-textconv', '--no-abbrev', base_sha, head_sha, '--')
    fields = raw.split(b'\0')
    if fields[-1] != b'' or (len(fields) - 1) % 2:
        raise ValueError('Invalid Git diff metadata')
    rows = []
    blockers = set()
    for i in range(0, len(fields)-1, 2):
        header = fields[i].decode('ascii').split()
        path = fields[i+1].decode('utf-8', errors='strict')
        if len(header) != 5 or not header[0].startswith(':'):
            raise ValueError('Malformed Git diff record')
        before, after = header[0][1:], header[1]
        status = header[4]
        reasons = []
        if not ALLOWED.fullmatch(path):
            reasons.append('path_outside_pilot_scope')
        if before not in {'000000', '100644'} or after not in {'000000', '100644'}:
            reasons.append('non_regular_or_executable_file')
        if status not in {'A', 'M'}:
            reasons.append('deletion_or_unsupported_change')
        blockers.update(reasons)
        rows.append({'path': path, 'status': status, 'blockers': reasons})
    if len(rows) > MAX_FILES:
        blockers.add('too_many_changed_files')
    if not rows:
        blockers.add('empty_diff')
    return {'base_sha': base_sha, 'head_sha': head_sha, 'changed_file_count': len(rows),
            'files': rows, 'blockers': sorted(blockers),
            'within_pilot_scope': not blockers,
            'execution_authorized': False, 'merge_authorized': False,
            'deployment_authorized': False,
            'content_reviewed': False, 'tests_executed': False,
            'warning': 'Committed metadata only; content, secrets and behavior require separate review.'}


def main(argv=None):
    parser = argparse.ArgumentParser(description='Audit local committed diff scope (read only)')
    parser.add_argument('repository_path')
    parser.add_argument('base_sha')
    parser.add_argument('head_sha')
    args = parser.parse_args(argv)
    report = audit_local_diff(args.repository_path, args.base_sha, args.head_sha)
    print(json.dumps(report, ensure_ascii=True, indent=2, sort_keys=True))
    return 0 if report['within_pilot_scope'] else 2


if __name__ == '__main__':
    raise SystemExit(main())
