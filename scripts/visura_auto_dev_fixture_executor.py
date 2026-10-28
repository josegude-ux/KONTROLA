"""Real, deterministic AUTO-DEV execution in a disposable, owned Git fixture.

NOT a generic code executor. Never accepts external repositories, code or tests.
No GitHub credentials, network calls, paid AI, production writes or PR creation.
"""
import argparse
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile

from scripts.visura_task_spec import validate_task

PILOT_TASK = {
    "task_id": "VISURA-PILOT-09",
    "title": "Normalize fixture references",
    "scope": "In a newly created disposable repository, trim and uppercase references.",
    "checks": ["Trusted fixture unit tests", "Git diff --check"],
    "max_cost_eur": 0,
}
SOURCE = "def normalize_reference(text):\n    return text\n"
TEST = '''import importlib.util
from pathlib import Path
import unittest

path = Path(__file__).resolve().parent.parent / "src" / "reference.py"
spec = importlib.util.spec_from_file_location("fixture_reference", path)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class ReferenceTests(unittest.TestCase):
    def test_trim_and_uppercase(self):
        self.assertEqual(module.normalize_reference("  ab-12  "), "AB-12")
    def test_already_trimmed(self):
        self.assertEqual(module.normalize_reference("cd-34"), "CD-34")

if __name__ == "__main__":
    unittest.main()
'''
BRANCH = "auto-dev/pilot-09-disposable"
MAX_ATTEMPTS = 2
MAX_LOG = 1600


def _env(home):
    # Strict allowlist: no tokens, proxy variables, Git configuration or hooks.
    return {"PATH": os.defpath, "HOME": str(home), "LANG": "C", "LC_ALL": "C",
            "GIT_CONFIG_NOSYSTEM": "1", "GIT_CONFIG_GLOBAL": os.devnull,
            "GIT_TERMINAL_PROMPT": "0", "GIT_NO_REPLACE_OBJECTS": "1",
            "PYTHONDONTWRITEBYTECODE": "1", "PYTHONNOUSERSITE": "1"}


def _process(argv, cwd, home, timeout=8):
    proc = subprocess.run(argv, cwd=cwd, env=_env(home), shell=False,
                          capture_output=True, text=True, timeout=timeout,
                          check=False)
    return {"code": proc.returncode, "output": (proc.stdout + proc.stderr)[-MAX_LOG:]}


def _git(cwd, home, *args):
    result = _process(["git", "-c", "core.hooksPath=/dev/null", "--no-pager", *args], cwd, home)
    if result["code"]:
        raise RuntimeError("Fixture Git operation failed: " + result["output"])
    return result["output"].strip()


def run_fixture_pilot(task=None):
    """Execute a bounded programming task only against our trusted, new fixture.

    A supplied task must match the immutable pilot manifest exactly; task text
    is never parsed into file paths, source code, argv or Git authorizations.
    """
    if task is None:
        task = dict(PILOT_TASK)
    validated = validate_task(task)
    if task != PILOT_TASK or validated["max_cost_eur"] != 0:
        raise ValueError("Only the preapproved disposable fixture task is executable")

    with tempfile.TemporaryDirectory(prefix="visura-auto-dev-09-") as directory:
        root = Path(directory)
        repo = root / "repo"
        home = root / "home"
        repo.mkdir(mode=0o700)
        home.mkdir(mode=0o700)
        (repo / "src").mkdir()
        (repo / "tests").mkdir()
        source = repo / "src" / "reference.py"
        source.write_text(SOURCE, encoding="utf-8")
        (repo / "tests" / "test_reference.py").write_text(TEST, encoding="utf-8")
        _git(repo, home, "init", "-q", "-b", "main")
        _git(repo, home, "add", "--", "src/reference.py", "tests/test_reference.py")
        _git(repo, home, "-c", "user.name=VISURA Fixture", "-c",
             "user.email=fixture@invalid.example", "commit", "-qm", "Fixture baseline")
        initial_sha = _git(repo, home, "rev-parse", "HEAD")
        _git(repo, home, "checkout", "-qb", BRANCH)

        plan = ["Inspect the sole allowed source", "Apply bounded edit",
                "Run fixed trusted unit tests", "Correct within two attempts",
                "Audit diff and create fixture commit"]
        attempts = []
        # A simple two-stage deterministic repair, not AI-based code synthesis.
        candidates = ["def normalize_reference(text):\n    return text.upper()\n",
                      "def normalize_reference(text):\n    return text.strip().upper()\n"]
        for candidate in candidates[:MAX_ATTEMPTS]:
            if source.is_symlink() or source.read_text(encoding="utf-8") not in (SOURCE, *candidates):
                raise RuntimeError("Source changed unexpectedly")
            source.write_text(candidate, encoding="utf-8")
            result = _process([sys.executable, "-I", "-B", "-m", "unittest", "discover",
                               "-s", "tests", "-p", "test_reference.py", "-v"], repo, home)
            attempts.append({"attempt": len(attempts) + 1, "test_exit": result["code"],
                             "test_log_excerpt": result["output"]})
            if result["code"] == 0:
                break
        if not attempts or attempts[-1]["test_exit"] != 0:
            raise RuntimeError("Fixture test failure; no commit created")
        if _process(["git", "--no-pager", "diff", "--check", "--"], repo, home)["code"] != 0:
            raise RuntimeError("Diff whitespace verification failed")
        changed = _git(repo, home, "diff", "--name-only", "--")
        if changed != "src/reference.py":
            raise RuntimeError("File allowlist violation")
        diff = _git(repo, home, "diff", "--no-ext-diff", "--", "src/reference.py")
        _git(repo, home, "add", "--", "src/reference.py")
        _git(repo, home, "-c", "user.name=VISURA Fixture", "-c",
             "user.email=fixture@invalid.example", "commit", "-qm", "Implement fixture normalization")
        head_sha = _git(repo, home, "rev-parse", "HEAD")
        if _git(repo, home, "status", "--porcelain"):
            raise RuntimeError("Fixture worktree not clean")
        return {"task_id": validated["task_id"], "mode": "disposable_fixture_only",
                "branch": BRANCH, "plan": plan, "base_sha": initial_sha,
                "head_sha": head_sha, "files_changed": [changed], "attempts": attempts,
                "tests_passed": True, "diff": diff, "fixture_commit_created": True,
                "workspace_deleted_on_return": True, "pr_created": False,
                "external_cost_eur": 0, "provider_calls": 0,
                "execution_authorized_outside_fixture": False,
                "merge_authorized": False, "deployment_authorized": False}


def main(argv=None):
    parser = argparse.ArgumentParser(description="Run the isolated VISURA AUTO-DEV programming fixture")
    parser.add_argument("--pilot", action="store_true", required=True)
    parser.parse_args(argv)
    print(json.dumps(run_fixture_pilot(), indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
