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


def compare_required_check_observations(target_policy, head_checks):
    """Compare *candidate names*, NOT required-check satisfaction.

    Classic protected-branch contexts, applicable ruleset contexts, and
    check-run names are only partial evidence. Commit-status contexts,
    merge queue SHAs, bypass rights and trusted app provenance remain outside
    this comparison; no result authorizes an action.
    """
    if not isinstance(target_policy, dict) or not isinstance(head_checks, dict):
        raise ValueError("Invalid required-check comparison inputs")
    if any(target_policy.get(key) is not False for key in (
        "repository_policy_verified", "execution_authorized", "merge_authorized",
        "deployment_authorized",
    )):
        raise ValueError("Target policy must not grant permissions")
    if any(head_checks.get(key) is not False for key in (
        "required_checks_verified", "branch_policy_verified",
        "execution_authorized", "merge_authorized", "deployment_authorized",
    )):
        raise ValueError("Check observations must not grant permissions")

    classic = target_policy.get("classic_protection")
    effective = target_policy.get("effective_ruleset_rules")
    if not isinstance(classic, dict) or not isinstance(effective, dict):
        raise ValueError("Incomplete branch policy for comparison")

    available = (
        classic.get("lookup") == "retrieved"
        and effective.get("lookup") == "retrieved"
        and effective.get("required_contexts_available") is True
        and isinstance(classic.get("required_check_contexts"), list)
        and isinstance(effective.get("required_check_contexts"), list)
    )
    check_available = (
        head_checks.get("lookup") == "retrieved"
        and head_checks.get("named_checks_complete") is True
        and isinstance(head_checks.get("named_check_runs"), list)
    )
    status = (
        "unknown_policy_requirements" if not available else
        "unknown_check_run_names" if not check_available else
        "candidate_match_only"
    )
    counts = {
        "required_context_count": None,
        "candidate_name_match_count": None,
        "candidate_success_count": None,
        "without_named_check_run_count": None,
        "ambiguous_app_provenance_count": None,
    }
    if available and check_available:
        requirements = {}
        for source in (
            classic["required_check_contexts"],
            effective["required_check_contexts"],
        ):
            for item in source:
                if not isinstance(item, dict) or set(item) != {"context", "app_id"}:
                    raise ValueError("Malformed required check context")
                context, app_id = item["context"], item["app_id"]
                if (
                    not isinstance(context, str) or not context
                    or len(context) > 255
                    or any(ord(ch) < 32 for ch in context)
                    or (app_id is not None and (
                        type(app_id) is not int or (app_id != -1 and app_id <= 0)
                    ))
                ):
                    raise ValueError("Invalid required check context")
                requirements[(context, app_id)] = True

        named = head_checks["named_check_runs"]
        for entry in named:
            if not isinstance(entry, dict) or set(entry) != {
                "name", "app_id", "status", "conclusion"
            }:
                raise ValueError("Malformed named check run")
            if (
                not isinstance(entry["name"], str) or not entry["name"]
                or (entry["app_id"] is not None and (
                    type(entry["app_id"]) is not int or entry["app_id"] <= 0
                ))
                or entry["status"] not in _CHECK_STATUSES
                or (entry["conclusion"] is not None
                    and entry["conclusion"] not in _CHECK_CONCLUSIONS)
            ):
                raise ValueError("Invalid named check run")

        matched = success = absent = ambiguous_app = 0
        for context, required_app in requirements:
            same_name = [c for c in named if c["name"] == context]
            candidates = [
                c for c in same_name
                if required_app in (None, -1) or c["app_id"] == required_app
            ]
            if candidates:
                matched += 1
                if any(
                    c["status"] == "completed" and c["conclusion"] == "success"
                    for c in candidates
                ):
                    success += 1
            else:
                absent += 1
            if required_app not in (None, -1) and any(
                c["app_id"] is None for c in same_name
            ):
                ambiguous_app += 1
        counts = {
            "required_context_count": len(requirements),
            "candidate_name_match_count": matched,
            "candidate_success_count": success,
            "without_named_check_run_count": absent,
            "ambiguous_app_provenance_count": ambiguous_app,
        }
        if not requirements:
            status = "no_requirements_observed"

    return {
        "lookup": status,
        **counts,
        "legacy_commit_statuses_compared": False,
        "app_origin_authenticated": False,
        "required_checks_verified": False,
        "execution_authorized": False,
        "merge_authorized": False,
        "deployment_authorized": False,
        "warning": (
            "Candidate check-run name/app matches only. Legacy commit statuses, "
            "merge queue, enforcement policies and valid app origins are not verified."
        ),
    }
