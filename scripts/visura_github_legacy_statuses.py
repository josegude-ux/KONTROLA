"""Read-only observation of GitHub's legacy commit-status API.

This API is separate from check-runs. Entries are newest-first, so the first
status per context is its latest observed state. Neither legacy statuses nor
check-runs authenticate branch policy, permissions, or merge eligibility.
"""
from urllib.error import HTTPError
from urllib.request import build_opener

from scripts.visura_github_readonly_snapshot import (
    _NoRedirectHandler, _get_json, _validate_repo, SHA_PATTERN,
)

MAX_STATUS_PAGES = 5
_STATES = {"success", "failure", "pending", "error"}


def observe_legacy_commit_statuses(repository, head_sha, token, opener=None):
    """GET paginated commit statuses for one SHA; never grant authorization."""
    _validate_repo(repository)
    if not isinstance(head_sha, str) or not SHA_PATTERN.fullmatch(head_sha):
        raise ValueError("Invalid GitHub commit SHA")
    if not isinstance(token, str) or not token.strip() or "\r" in token or "\n" in token:
        raise ValueError("Missing or invalid GitHub token")
    opener = build_opener(_NoRedirectHandler()).open if opener is None else opener

    seen_ids = set()
    latest = {}
    status_count = 0
    lookup = "retrieved"
    for page in range(1, MAX_STATUS_PAGES + 1):
        endpoint = (
            "/repos/" + repository + "/commits/" + head_sha
            + "/statuses?per_page=100&page=" + str(page)
        )
        try:
            statuses = _get_json(endpoint, token, opener)
        except HTTPError as exc:
            if exc.code in {403, 404}:
                lookup = "inaccessible_or_not_found"
                latest.clear()
                seen_ids.clear()
                status_count = 0
                break
            raise
        if not isinstance(statuses, list) or len(statuses) > 100:
            raise ValueError("Invalid legacy status page")
        for entry in statuses:
            if not isinstance(entry, dict):
                raise ValueError("Invalid legacy status record")
            status_id = entry.get("id")
            sha = entry.get("sha")
            context = entry.get("context")
            state = entry.get("state")
            if (
                type(status_id) is not int or status_id <= 0
                or not isinstance(sha, str) or sha.lower() != head_sha.lower()
                or not isinstance(context, str) or not context
                or len(context) > 255 or any(ord(ch) < 32 for ch in context)
                or state not in _STATES
            ):
                raise ValueError("Invalid legacy status metadata")
            if status_id in seen_ids:
                raise ValueError("Duplicate legacy status ID")
            seen_ids.add(status_id)
            status_count += 1
            # GitHub returns commit statuses newest-first. Do not let an
            # older success replace a recent failure for the same context.
            if context not in latest:
                latest[context] = {"context": context, "state": state}
        if len(statuses) < 100:
            break
    else:
        raise ValueError("Too many legacy status pages; incomplete listing")

    latest_states = sorted(latest.values(), key=lambda row: row["context"])
    state_counts = {state: sum(
        row["state"] == state for row in latest_states
    ) for state in sorted(_STATES)}

    return {
        "repository": repository,
        "head_sha": head_sha,
        "lookup": lookup,
        "observed_status_records": status_count if lookup == "retrieved" else None,
        "observed_latest_contexts": len(latest) if lookup == "retrieved" else None,
        "latest_context_states": latest_states if lookup == "retrieved" else None,
        "latest_state_counts": state_counts if lookup == "retrieved" else None,
        "required_checks_verified": False,
        "branch_policy_verified": False,
        "execution_authorized": False,
        "merge_authorized": False,
        "deployment_authorized": False,
        "warning": (
            "Latest legacy commit statuses are observations, not required check "
            "satisfaction. Check-runs, required app IDs and merge queue are separate."
        ),
    }


def compare_legacy_status_candidates(target_policy, legacy_statuses):
    """Count context-name candidates only; never verify actual requirements.

    A requirement pinned to an app ID cannot be matched by this source,
    because the legacy statuses endpoint does not authenticate GitHub App IDs.
    """
    if not isinstance(target_policy, dict) or not isinstance(legacy_statuses, dict):
        raise ValueError("Invalid legacy comparison inputs")
    if any(target_policy.get(key) is not False for key in (
        "repository_policy_verified", "execution_authorized",
        "merge_authorized", "deployment_authorized",
    )):
        raise ValueError("Branch policy must not grant authority")
    if any(legacy_statuses.get(key) is not False for key in (
        "required_checks_verified", "branch_policy_verified",
        "execution_authorized", "merge_authorized", "deployment_authorized",
    )):
        raise ValueError("Legacy status report must not grant authority")
    classic = target_policy.get("classic_protection")
    applied = target_policy.get("effective_ruleset_rules")
    if not isinstance(classic, dict) or not isinstance(applied, dict):
        raise ValueError("Missing required check policies")

    requirements_available = (
        classic.get("lookup") == "retrieved"
        and isinstance(classic.get("required_check_contexts"), list)
        and applied.get("lookup") == "retrieved"
        and applied.get("required_contexts_available") is True
        and isinstance(applied.get("required_check_contexts"), list)
    )
    statuses_available = (
        legacy_statuses.get("lookup") == "retrieved"
        and isinstance(legacy_statuses.get("latest_context_states"), list)
    )
    status = (
        "unknown_policy_requirements" if not requirements_available else
        "unknown_legacy_statuses" if not statuses_available else
        "candidate_contexts_only"
    )
    counts = {
        "required_context_count": None,
        "candidate_context_match_count": None,
        "candidate_latest_success_count": None,
        "contexts_not_observed_count": None,
        "app_pinned_unverifiable_count": None,
    }
    if requirements_available and statuses_available:
        requirements = set()
        for source in (classic["required_check_contexts"], applied["required_check_contexts"]):
            for entry in source:
                if not isinstance(entry, dict) or set(entry) != {"context", "app_id"}:
                    raise ValueError("Invalid required context record")
                context, app_id = entry["context"], entry["app_id"]
                if (
                    not isinstance(context, str) or not context
                    or len(context) > 255 or any(ord(ch) < 32 for ch in context)
                    or (app_id is not None and (
                        type(app_id) is not int or (app_id != -1 and app_id <= 0)
                    ))
                ):
                    raise ValueError("Invalid required legacy context")
                requirements.add((context, app_id))
        latest = {}
        for entry in legacy_statuses["latest_context_states"]:
            if not isinstance(entry, dict) or set(entry) != {"context", "state"}:
                raise ValueError("Invalid legacy context entry")
            context, state = entry["context"], entry["state"]
            if (
                not isinstance(context, str) or not context
                or len(context) > 255 or any(ord(ch) < 32 for ch in context)
                or state not in _STATES or context in latest
            ):
                raise ValueError("Invalid legacy context metadata")
            latest[context] = state
        matches = successes = absent = app_pinned = 0
        for context, app_id in requirements:
            if app_id not in (None, -1):
                app_pinned += 1
                # An app-pinned requirement cannot be verified by an
                # unauthenticated legacy status, even with a matching name.
                continue
            if context not in latest:
                absent += 1
            else:
                matches += 1
                if latest[context] == "success":
                    successes += 1
        counts = {
            "required_context_count": len(requirements),
            "candidate_context_match_count": matches,
            "candidate_latest_success_count": successes,
            "contexts_not_observed_count": absent,
            "app_pinned_unverifiable_count": app_pinned,
        }
        if not requirements:
            status = "no_requirements_observed"
    return {
        "lookup": status,
        **counts,
        "legacy_context_origin_authenticated": False,
        "required_checks_verified": False,
        "execution_authorized": False,
        "merge_authorized": False,
        "deployment_authorized": False,
        "warning": (
            "Legacy status context names do not prove required CI passed. "
            "App-pinned requirements cannot be verified from legacy statuses."
        ),
    }
