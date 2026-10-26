"""Observe GitHub check runs bound to a specific PR head SHA.

Read-only audit: check results are not a substitute for required check rules,
GitHub mergeability, reviewer approval, or a trusted authorization service.
"""
from urllib.error import HTTPError
from urllib.request import build_opener

from scripts.visura_github_readonly_snapshot import (
    _NoRedirectHandler, _get_json, _validate_repo, SHA_PATTERN,
)

MAX_CHECK_PAGES = 5
_CHECK_STATUSES = {
    "queued", "in_progress", "completed", "waiting", "pending", "requested",
}
_CHECK_CONCLUSIONS = {
    "success", "failure", "neutral", "cancelled", "timed_out",
    "action_required", "skipped", "stale", "startup_failure",
}


def observe_commit_checks(repository, head_sha, token, opener=None):
    """Inspect recent checks on the exact commit; never grant permissions."""
    _validate_repo(repository)
    if not isinstance(head_sha, str) or not SHA_PATTERN.fullmatch(head_sha):
        raise ValueError("Invalid GitHub commit SHA")
    if not isinstance(token, str) or not token.strip() or "\r" in token or "\n" in token:
        raise ValueError("Missing or invalid GitHub token")
    opener = build_opener(_NoRedirectHandler()).open if opener is None else opener

    counts = {}
    conclusions = {}
    seen_ids = set()
    named_checks = []
    named_checks_complete = True
    expected_total = None
    lookup = "retrieved"
    for page in range(1, MAX_CHECK_PAGES + 1):
        path = (
            "/repos/" + repository + "/commits/" + head_sha
            + "/check-runs?filter=latest&per_page=100&page=" + str(page)
        )
        try:
            payload = _get_json(path, token, opener)
        except HTTPError as exc:
            if exc.code in {403, 404}:
                lookup = "inaccessible_or_not_found"
                counts = {}
                conclusions = {}
                seen_ids = set()
                named_checks = []
                named_checks_complete = False
                break
            raise
        if not isinstance(payload, dict):
            raise ValueError("Invalid GitHub check runs response")
        total = payload.get("total_count")
        rows = payload.get("check_runs")
        if type(total) is not int or total < 0 or not isinstance(rows, list) or len(rows) > 100:
            raise ValueError("Invalid GitHub check runs page")
        if expected_total is None:
            expected_total = total
        elif expected_total != total:
            raise ValueError("Check runs changed during pagination")
        for check in rows:
            if not isinstance(check, dict):
                raise ValueError("Invalid GitHub check run")
            check_id = check.get("id")
            sha = check.get("head_sha")
            status = check.get("status")
            conclusion = check.get("conclusion")
            if (
                type(check_id) is not int or check_id <= 0
                or not isinstance(sha, str) or sha.lower() != head_sha.lower()
                or status not in _CHECK_STATUSES
                or (conclusion is not None and conclusion not in _CHECK_CONCLUSIONS)
                or (status != "completed" and conclusion is not None)
            ):
                raise ValueError("Invalid GitHub check run metadata")
            if check_id in seen_ids:
                raise ValueError("Duplicate GitHub check run ID")
            seen_ids.add(check_id)
            check_name = check.get("name")
            app = check.get("app")
            if check_name is None:
                named_checks_complete = False
            else:
                if (
                    not isinstance(check_name, str)
                    or not check_name or len(check_name) > 255
                    or any(ord(ch) < 32 for ch in check_name)
                ):
                    raise ValueError("Invalid check run name")
                if app is not None and (
                    not isinstance(app, dict)
                    or type(app.get("id")) is not int or app["id"] <= 0
                ):
                    raise ValueError("Invalid check run app identity")
                named_checks.append({
                    "name": check_name,
                    "app_id": app["id"] if app is not None else None,
                    "status": status,
                    "conclusion": conclusion,
                })
            counts[status] = counts.get(status, 0) + 1
            if conclusion is not None:
                conclusions[conclusion] = conclusions.get(conclusion, 0) + 1
        if len(rows) < 100:
            break
    else:
        raise ValueError("Too many GitHub check run pages")

    if lookup == "retrieved" and expected_total != len(seen_ids):
        raise ValueError("Incomplete GitHub check runs listing")

    return {
        "repository": repository,
        "head_sha": head_sha,
        "lookup": lookup,
        "observed_total": len(seen_ids) if lookup == "retrieved" else None,
        "status_counts": counts if lookup == "retrieved" else None,
        "conclusion_counts": conclusions if lookup == "retrieved" else None,
        "named_check_runs": named_checks if lookup == "retrieved" else None,
        "named_checks_complete": lookup == "retrieved" and named_checks_complete,
        "required_checks_verified": False,
        "branch_policy_verified": False,
        "execution_authorized": False,
        "merge_authorized": False,
        "deployment_authorized": False,
        "warning": (
            "Check results are observations only. Required contexts, other "
            "commit statuses, check authorizations and policy are not verified."
        ),
    }
