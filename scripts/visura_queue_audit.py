"""VISURA AUTO-DEV: read-only GitHub issue metadata validation.

No issue body is executed or passed to a shell. No external AI calls.
"""
import json
import os
import urllib.request


def validate_issue(issue):
    if not isinstance(issue, dict):
        raise ValueError("Invalid issue payload")
    if issue.get("number") != 31 or "pull_request" in issue:
        raise ValueError("Unexpected task type")
    if issue.get("state") not in ("open", "closed"):
        raise ValueError("Unexpected task state")
    return {"number": 31, "state": issue["state"]}


def main():
    repo = os.environ["GITHUB_REPOSITORY"]
    if repo != "josegude-ux/KONTROLA":
        raise ValueError("Unexpected repository")
    token = os.environ["GITHUB_TOKEN"]
    request = urllib.request.Request(
        f"https://api.github.com/repos/{repo}/issues/31",
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "User-Agent": "visura-queue-audit",
        },
    )
    with urllib.request.urlopen(request, timeout=15) as response:
        issue = json.load(response)
    task = validate_issue(issue)
    print(f"Read-only task audit: issue #{task['number']} is {task['state']}")
    with open(os.environ["GITHUB_STEP_SUMMARY"], "a", encoding="utf-8") as report:
        report.write(
            "## VISURA AUTO-DEV — Queue Audit\n"
            f"- Issue #31: {task['state']}\n"
            "- Issue body: NOT EXECUTED\n"
            "- OpenRouter: NOT CALLED\n"
            "- Repository writes: DISABLED\n"
        )


if __name__ == "__main__":
    main()
