"""Static contract tests for the not-yet-activated manual audit workflow.

These tests detect accidental changes; they do not authenticate GitHub Actions
configuration or substitute for protected branches and human review.
"""
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parent.parent
AUDIT = ROOT / ".github/workflows/visura-auto-dev-manual-review-audit.yml"
CODE_GATE = ROOT / ".github/workflows/visura-auto-dev-code-review.yml"

EXPECTED_COMMANDS = [
    'python3 -m scripts.visura_github_audit_bundle "$REPOSITORY" "$PR_NUMBER" "$DEFAULT_BRANCH"',
]


class ManualAuditWorkflowContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.text = AUDIT.read_text(encoding="utf-8")

    def test_dispatch_only_no_background_or_pr_trigger(self):
        match = re.search(r"(?ms)^on:\s*\n(.*?)^permissions:\s*$", self.text)
        self.assertIsNotNone(match)
        trigger_lines = match.group(1).splitlines()
        top_triggers = [
            re.match(r"^  ([a-z_]+):", line).group(1)
            for line in trigger_lines if re.match(r"^  ([a-z_]+):", line)
        ]
        self.assertEqual(top_triggers, ["workflow_dispatch"])
        self.assertIn("pr_number:", match.group(1))

    def test_permissions_are_exactly_read_only(self):
        match = re.search(r"(?ms)^permissions:\s*\n(.*?)^jobs:\s*$", self.text)
        self.assertIsNotNone(match)
        permission_lines = [
            line.strip() for line in match.group(1).splitlines() if line.strip()
        ]
        self.assertEqual(permission_lines, ["contents: read", "pull-requests: read"])

    def test_only_one_audit_job(self):
        jobs_text = self.text.split("\njobs:\n", 1)[1]
        self.assertEqual(
            re.findall(r"(?m)^  ([a-zA-Z_][\w-]*):\s*$", jobs_text), ["audit"]
        )
        self.assertIn("    timeout-minutes: 5", jobs_text)

    def test_checkout_uses_trusted_default_branch(self):
        self.assertEqual(re.findall(r"(?m)^\s+uses:\s*(.+)$", self.text),
                         ["actions/checkout@v4"])
        self.assertIn("ref: ${{ github.event.repository.default_branch }}",
                      self.text)
        self.assertEqual(self.text.count("persist-credentials: false"), 1)

    def test_only_expected_shell_commands(self):
        lines = self.text.splitlines()
        commands = []
        for index, line in enumerate(lines):
            if line.strip() == "run: |" and line.startswith("        "):
                current = []
                for value in lines[index + 1:]:
                    if not value.startswith("          "):
                        break
                    if value.strip():
                        current.append(value.strip())
                commands.extend(current)
        self.assertEqual(commands, EXPECTED_COMMANDS)
        self.assertEqual(
            sum(line.lstrip().startswith("run:") for line in lines), 1
        )

    def test_api_token_only_comes_from_github_actions(self):
        self.assertEqual(self.text.count("GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}"), 1)
        self.assertEqual(len(re.findall(r"\$\{\{\s*secrets\.", self.text)), 1)
        self.assertNotIn("pull_request_target", self.text)

    def test_unified_query_is_scoped_to_current_repository(self):
        self.assertEqual(self.text.count("REPOSITORY: ${{ github.repository }}"), 1)
        self.assertIn("DEFAULT_BRANCH: ${{ github.event.repository.default_branch }}",
                      self.text)
        self.assertIn("PR_NUMBER: ${{ inputs.pr_number }}", self.text)

    def test_code_review_gate_tracks_changes_to_manual_workflow(self):
        text = CODE_GATE.read_text(encoding="utf-8")
        self.assertIn(".github/workflows/visura-auto-dev-manual-review-audit.yml",
                      text)
        self.assertIn("test_visura_*.py", text)
        self.assertIn("persist-credentials: false", text)
        self.assertIn("  contents: read", text)


if __name__ == "__main__":
    unittest.main()
