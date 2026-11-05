"""VISURA AUTO-DEV 09 phase 2: configurable, trusted-fixture-only executor.

Tasks are data, never commands. This is NOT a security sandbox: generated
trusted code is the only executable material. Untrusted repositories, tests,
code, network isolation, and authenticated real-repo writes are NOT supported.
"""
import argparse
import ast
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import subprocess
import sys
import tempfile
import time

from scripts.visura_task_spec import validate_task

POLICY_VERSION = 'fixture-policy-v2'
REQUIRED_CHECKS = ['fixture_unittest', 'git_diff_check']
MAX_TASK_BYTES = 12_000
MAX_LOG_BYTES = 1800
FIXTURES = {
    'string_pipeline': ('src/strings.py', 'def transform(value):\n    return value\n'),
    'integer_offset': ('src/numbers.py', 'def transform(value):\n    return value\n'),
}
REQUIRED_KEYS = {'task', 'fixture', 'operation', 'parameters', 'allowed_paths',
                 'allowed_actions', 'required_checks', 'max_attempts',
                 'timeout_seconds', 'initial_state', 'expected_result'}


def _sha(text):
    return hashlib.sha256(text.encode('utf-8')).hexdigest()


def _no_extra(obj, expected, label):
    if not isinstance(obj, dict) or set(obj) != set(expected):
        raise ValueError(label + ': required/unknown fields')


def validate_configurable_task(manifest):
    """Validate intent only; this DOES NOT grant authorization."""
    _no_extra(manifest, REQUIRED_KEYS, 'manifest')
    old = validate_task(manifest['task'])
    if old['max_cost_eur'] != 0:
        raise ValueError('Paid calls prohibited')
    op = manifest['operation']
    if not isinstance(op, str) or op not in FIXTURES or manifest['fixture'] != 'builtin_v2':
        raise ValueError('Unsupported operation or external fixture')
    path, _ = FIXTURES[op]
    if (type(manifest['allowed_paths']) is not list
            or manifest['allowed_paths'] != [path]):
        raise ValueError('Path outside fixture allowlist')
    if manifest['allowed_actions'] != ['edit_trusted_fixture']:
        raise ValueError('Action outside fixture allowlist')
    if manifest['required_checks'] != REQUIRED_CHECKS or old['checks'] != REQUIRED_CHECKS:
        raise ValueError('Unapproved checks')
    if manifest['initial_state'] != 'builtin-fixture-v2' or manifest['expected_result'] != 'tests_pass':
        raise ValueError('Invalid initial state or expected result')
    if type(manifest['max_attempts']) is not int or not 1 <= manifest['max_attempts'] <= 2:
        raise ValueError('Max attempts outside policy')
    if type(manifest['timeout_seconds']) is not int or not 1 <= manifest['timeout_seconds'] <= 8:
        raise ValueError('Timeout outside policy')
    params = manifest['parameters']
    if op == 'string_pipeline':
        _no_extra(params, {'steps'}, 'string parameters')
        steps = params['steps']
        if (type(steps) is not list or not 1 <= len(steps) <= 3
                or any(type(s) is not str or s not in {'strip', 'upper', 'lower'} for s in steps)):
            raise ValueError('Unsupported string transform')
    else:
        _no_extra(params, {'offset'}, 'integer parameters')
        offset = params['offset']
        if type(offset) is not int or not -20 <= offset <= 20:
            raise ValueError('Offset outside policy')
    return {'task_id': old['task_id'], 'operation': op, 'path': path,
            'execution_authorized': False, 'human_authorization_verified': False,
            'fixture_policy_eligible': True}


def example_task(task_id, operation, parameters, max_attempts=2):
    """Build example data; explicit validation still occurs at run time."""
    path = FIXTURES[operation][0]
    return {
        'task': {'task_id': task_id, 'title': 'Trusted fixture code change',
                 'scope': 'Apply a bounded operation to a disposable built-in fixture.',
                 'checks': REQUIRED_CHECKS[:], 'max_cost_eur': 0},
        'fixture': 'builtin_v2', 'operation': operation,
        'parameters': parameters, 'allowed_paths': [path],
        'allowed_actions': ['edit_trusted_fixture'],
        'required_checks': REQUIRED_CHECKS[:], 'max_attempts': max_attempts,
        'timeout_seconds': 5, 'initial_state': 'builtin-fixture-v2',
        'expected_result': 'tests_pass',
    }


def _secure_fixture_file(root, relpath):
    """Reject absolute/traversal paths and links at every component."""
    if not isinstance(relpath, str) or not re.fullmatch(r'src/[a-z_]+\.py', relpath):
        raise ValueError('Invalid fixture file path')
    pieces = Path(relpath).parts
    if '..' in pieces or any(part in ('', '.') for part in pieces):
        raise ValueError('Path traversal')
    path = Path(root)
    for part in pieces:
        path = path / part
        mode = path.lstat().st_mode
        if stat.S_ISLNK(mode):
            raise ValueError('Symbolic links prohibited')
    if not stat.S_ISREG(path.lstat().st_mode):
        raise ValueError('Not a regular file')
    if not path.resolve().is_relative_to(Path(root).resolve()):
        raise ValueError('Path escape')
    return path


def _child_env(home):
    """No inherited tokens, proxies, Git credentials or arbitrary host variables."""
    return {'PATH': os.defpath, 'HOME': str(home), 'LANG': 'C', 'LC_ALL': 'C',
            'GIT_CONFIG_NOSYSTEM': '1', 'GIT_CONFIG_GLOBAL': os.devnull,
            'GIT_NO_REPLACE_OBJECTS': '1', 'GIT_TERMINAL_PROMPT': '0',
            'PYTHONNOUSERSITE': '1', 'PYTHONDONTWRITEBYTECODE': '1',
            'GIT_LFS_SKIP_SMUDGE': '1'}


def _linux_limits():
    """Defense-in-depth resource limits, NOT isolation of untrusted code."""
    if not sys.platform.startswith('linux'):
        return None
    import resource
    def limit():
        resource.setrlimit(resource.RLIMIT_CPU, (4, 4))
        resource.setrlimit(resource.RLIMIT_AS, (512 * 1024 * 1024, 512 * 1024 * 1024))
        resource.setrlimit(resource.RLIMIT_FSIZE, (2 * 1024 * 1024, 2 * 1024 * 1024))
        resource.setrlimit(resource.RLIMIT_NOFILE, (64, 64))
    return limit


def _run(argv, cwd, home, timeout=5):
    started = time.monotonic()
    try:
        proc = subprocess.run(argv, cwd=cwd, env=_child_env(home), shell=False,
                              capture_output=True, timeout=timeout, text=True,
                              preexec_fn=_linux_limits(), check=False)
        output = (proc.stdout + proc.stderr)[-MAX_LOG_BYTES:]
        return {'code': proc.returncode, 'timed_out': False,
                'elapsed_ms': int((time.monotonic() - started) * 1000), 'output': output}
    except subprocess.TimeoutExpired:
        return {'code': 124, 'timed_out': True,
                'elapsed_ms': int((time.monotonic() - started) * 1000),
                'output': 'Trusted fixture subprocess exceeded deadline'}


def _git(repo, home, *args):
    out = _run(['git', '-c', 'core.hooksPath=/dev/null',
                '-c', 'protocol.file.allow=never', '--no-pager', *args], repo, home)
    if out['code']:
        raise RuntimeError('Git fixture failure: ' + out['output'])
    return out['output'].strip()


def _assert_head(repo, home, expected):
    if _git(repo, home, 'rev-parse', 'HEAD') != expected:
        raise RuntimeError('Git HEAD changed concurrently')


def _oracle(manifest, value):
    if manifest['operation'] == 'integer_offset':
        return value + manifest['parameters']['offset']
    for step in manifest['parameters']['steps']:
        value = getattr(value, step)()
    return value


def _source_for(manifest, first_attempt=False):
    """Synthesize safe Python AST, not user-provided source or shell commands."""
    op = manifest['operation']
    base = FIXTURES[op][1]
    tree = ast.parse(base)
    expr = ast.Name(id='value', ctx=ast.Load())
    if op == 'string_pipeline':
        steps = manifest['parameters']['steps']
        # A bounded first candidate may omit the last step; the acceptance test
        # diagnoses and the second attempt repairs using the full specification.
        if first_attempt and len(steps) > 1:
            steps = steps[:-1]
        for step in steps:
            expr = ast.Call(func=ast.Attribute(value=expr, attr=step, ctx=ast.Load()),
                            args=[], keywords=[])
    else:
        expr = ast.BinOp(left=expr, op=ast.Add(),
                         right=ast.Constant(value=manifest['parameters']['offset']))
    tree.body[0].body[0].value = expr
    return ast.unparse(ast.fix_missing_locations(tree)) + '\n'


def _trusted_tests(manifest):
    """The oracle is independently computed from a bounded operation grammar."""
    samples = (['  aB-1  ', 'MixEd', '  x y  '] if manifest['operation'] == 'string_pipeline'
               else [-7, 0, 12])
    assertions = '\n'.join(
        f'    def test_case_{i}(self):\n'
        f'        self.assertEqual(module.transform({value!r}), { _oracle(manifest, value)!r})'
        for i, value in enumerate(samples))
    path = FIXTURES[manifest['operation']][0]
    return ("import importlib.util\nfrom pathlib import Path\nimport unittest\n"
            f"source = Path(__file__).resolve().parent.parent / {path!r}\n"
            "spec = importlib.util.spec_from_file_location('trusted_fixture', source)\n"
            "module = importlib.util.module_from_spec(spec)\n"
            "spec.loader.exec_module(module)\n"
            "class AcceptanceTests(unittest.TestCase):\n" + assertions + '\n')


def run_configurable_task(manifest):
    validated = validate_configurable_task(manifest)
    path, base = FIXTURES[validated['operation']]
    # This code has NO ability to choose a repository. Always creates its own.
    with tempfile.TemporaryDirectory(prefix='visura-auto-dev-v2-') as temp:
        root = Path(temp)
        repo, home = root / 'repo', root / 'home'
        repo.mkdir(mode=0o700)
        home.mkdir(mode=0o700)
        (repo / 'src').mkdir()
        (repo / 'tests').mkdir()
        target = repo / path
        target.write_text(base, encoding='utf-8')
        (repo / 'tests' / 'test_acceptance.py').write_text(_trusted_tests(manifest), encoding='utf-8')
        _git(repo, home, 'init', '-q', '-b', 'main')
        _git(repo, home, 'add', '--', path, 'tests/test_acceptance.py')
        _git(repo, home, '-c', 'user.name=VISURA Fixture', '-c',
             'user.email=fixture@invalid.example', 'commit', '-qm', 'Trusted fixture baseline')
        base_sha = _git(repo, home, 'rev-parse', 'HEAD')
        _git(repo, home, 'checkout', '-qb', 'auto-dev/' + validated['task_id'].lower())
        attempts = []
        prior = base
        for n in range(1, manifest['max_attempts'] + 1):
            _assert_head(repo, home, base_sha)
            actual = _secure_fixture_file(repo, path)
            if actual.read_text(encoding='utf-8') != prior:
                raise RuntimeError('Unexpected concurrent source change')
            candidate = _source_for(manifest, first_attempt=(n == 1 and manifest['max_attempts'] > 1))
            # In addition to the grammar, every candidate must be well-formed Python.
            ast.parse(candidate)
            actual.write_text(candidate, encoding='utf-8')
            prior = candidate
            result = _run([sys.executable, '-I', '-B', '-m', 'unittest', 'discover',
                           '-s', 'tests', '-p', 'test_acceptance.py', '-v'],
                          repo, home, timeout=manifest['timeout_seconds'])
            attempts.append({'attempt': n, 'patch_sha256': _sha(candidate),
                             'files_changed': [path], 'test_exit': result['code'],
                             'test_elapsed_ms': result['elapsed_ms'],
                             'test_timed_out': result['timed_out'],
                             'test_log_excerpt': result['output'],
                             'diagnosis': ('acceptance_tests_failed' if result['code'] else 'passed'),
                             'repair_reason': ('complete_requested_transform' if n > 1 else 'initial_candidate')})
            if result['code'] == 0:
                break
        if attempts[-1]['test_exit']:
            return {'task_id': validated['task_id'], 'status': 'failed_no_commit',
                    'attempts': attempts, 'max_attempts': manifest['max_attempts'],
                    'workspace_cleaned_on_exit': True, 'external_writes': False,
                    'human_authorization_verified': False}
        _assert_head(repo, home, base_sha)
        if _secure_fixture_file(repo, path).read_text(encoding='utf-8') != prior:
            raise RuntimeError('Source modified outside executor')
        if _run(['git', '--no-pager', 'diff', '--check', '--'], repo, home)['code']:
            raise RuntimeError('Diff whitespace check failed')
        changed = _git(repo, home, 'diff', '--name-only', '--')
        if changed != path:
            raise RuntimeError('Unexpected changed file')
        diff = _git(repo, home, 'diff', '--no-ext-diff', '--', path)
        _git(repo, home, 'add', '--', path)
        _assert_head(repo, home, base_sha)
        _git(repo, home, '-c', 'user.name=VISURA Fixture', '-c',
             'user.email=fixture@invalid.example', 'commit', '-qm', 'Apply safe fixture transform')
        head_sha = _git(repo, home, 'rev-parse', 'HEAD')
        if _git(repo, home, 'status', '--porcelain'):
            raise RuntimeError('Fixture worktree not clean')
        return {'task_id': validated['task_id'], 'status': 'passed',
                'mode': 'trusted_fixture_only', 'operation': validated['operation'],
                'plan': ['Validate closed manifest', 'Create clean owned Git fixture',
                         'Synthesize bounded Python AST', 'Run trusted tests',
                         'Retry within fixed bounds', 'Audit changed paths and diff',
                         'Commit locally; discard temporary workspace'],
                'branch': 'auto-dev/' + validated['task_id'].lower(),
                'base_sha': base_sha, 'head_sha': head_sha, 'files_changed': [path],
                'attempts': attempts, 'max_attempts': manifest['max_attempts'],
                'diff': diff, 'diff_sha256': _sha(diff),
                'final_source_sha256': _sha(prior),
                'fixture_commit_created': True, 'workspace_cleaned_on_exit': True,
                'external_writes': False, 'external_cost_eur': 0,
                'provider_calls': 0, 'network_isolated': False,
                'unprivileged_user_verified': False,
                'untrusted_code_execution_authorized': False,
                'human_authorization_verified': False, 'github_pr_created_by_agent': False,
                'merge_authorized': False, 'deployment_authorized': False}


def _unique_pairs(pairs):
    obj = {}
    for key, value in pairs:
        if key in obj:
            raise ValueError('Duplicate task JSON key')
        obj[key] = value
    return obj


def read_manifest(path):
    item = Path(path)
    if item.is_symlink() or not item.is_file() or item.stat().st_size > MAX_TASK_BYTES:
        raise ValueError('Invalid or oversized task manifest')
    with item.open('rb') as stream:
        raw = stream.read(MAX_TASK_BYTES + 1)
    if len(raw) > MAX_TASK_BYTES:
        raise ValueError('Oversized task manifest')
    return json.loads(raw.decode('utf-8'), object_pairs_hook=_unique_pairs)


def main(argv=None):
    parser = argparse.ArgumentParser(description='Run only trusted disposable fixture tasks')
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--demo', action='store_true')
    group.add_argument('--task-file')
    args = parser.parse_args(argv)
    if args.demo:
        tasks = [
            example_task('VISURA-STR-02', 'string_pipeline', {'steps': ['strip', 'upper']}),
            example_task('VISURA-NUM-02', 'integer_offset', {'offset': 7}),
        ]
    else:
        tasks = [read_manifest(args.task_file)]
    results = [run_configurable_task(task) for task in tasks]
    print(json.dumps(results, ensure_ascii=True, indent=2))
    return 0 if all(item['status'] == 'passed' for item in results) else 2


if __name__ == '__main__':
    raise SystemExit(main())
