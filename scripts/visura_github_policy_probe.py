"""Conservative GitHub branch-policy probe using read-only REST requests.

Never interprets retrieved settings as authorization. A classic protection
404 can indicate either absence or inadequate visibility. Rulesets need
separate applicability evaluation; their mere presence proves nothing.
"""
import argparse
import json
import os
import re
from urllib.error import HTTPError
from urllib.parse import quote
from urllib.request import build_opener

from scripts.visura_github_readonly_snapshot import (
    _NoRedirectHandler, _get_json, _validate_repo,
)

MAX_RULESET_PAGES = 5
MAX_APPLIED_RULE_PAGES = 5
_BRANCH = re.compile(r"[a-zA-Z0-9_./-]{1,200}\Z")


def _validate_branch(branch):
    if (
        not isinstance(branch, str)
        or not _BRANCH.fullmatch(branch)
        or branch.startswith("/")
        or branch.endswith("/")
        or any(part in {"", ".", ".."} for part in branch.split("/"))
        or "*" in branch
    ):
        raise ValueError("Invalid branch name")


def _read_status(path, token, opener):
    try:
        return "retrieved", _get_json(path, token, opener)
    except HTTPError as exc:
        # A 404 does not prove rules are absent; access restrictions also exist.
        if exc.code == 404:
            return "not_found_or_inaccessible", None
        if exc.code == 403:
            return "inaccessible", None
        raise


def _parse_required_checks(rows, app_key):
    """Normalize required contexts for observation, NOT enforcement."""
    if not isinstance(rows, list) or len(rows) > 500:
        raise ValueError("Invalid required checks list")
    results = []
    seen = set()
    for item in rows:
        if not isinstance(item, dict):
            raise ValueError("Invalid required check item")
        context = item.get("context")
        app_id = item.get(app_key)
        if (
            not isinstance(context, str) or not context or len(context) > 255
            or any(ord(ch) < 32 for ch in context)
            or (app_id is not None and (
                type(app_id) is not int or (app_id != -1 and app_id <= 0)
            ))
        ):
            raise ValueError("Invalid required check context or app ID")
        key = (context, app_id)
        if key in seen:
            raise ValueError("Duplicate required check context")
        seen.add(key)
        results.append({"context": context, "app_id": app_id})
    return results


# These are observations from the applied-rules endpoint, not evidence that
# a PR has satisfied a rule. Missing response fields must remain unknown.
_ACTIVE_REVIEW_BOOLEAN_FIELDS = (
    "dismiss_stale_reviews_on_push",
    "require_code_owner_review",
    "require_last_push_approval",
    "required_review_thread_resolution",
    "require_extra_approval_for_unattributed_changes",
)


def _read_active_review_boolean_fields(parameters):
    observed = {}
    for field in _ACTIVE_REVIEW_BOOLEAN_FIELDS:
        value = parameters.get(field)
        if field in parameters and type(value) is not bool:
            raise ValueError("Invalid active pull request review control: " + field)
        observed[field] = value
    return observed


def inspect_branch_policy(repository, branch_name, token, opener=None):
    """Return observations, never permissions or a sufficient-policy verdict."""
    _validate_repo(repository)
    _validate_branch(branch_name)
    if not isinstance(token, str) or not token.strip() or "\r" in token or "\n" in token:
        raise ValueError("Missing or invalid GitHub token")
    opener = build_opener(_NoRedirectHandler()).open if opener is None else opener
    path = "/repos/" + repository
    encoded_branch = quote(branch_name, safe="")
    status, classic = _read_status(
        path + "/branches/" + encoded_branch + "/protection", token, opener
    )
    review_details = None
    if status == "retrieved":
        if not isinstance(classic, dict):
            raise ValueError("Invalid branch protection response")
        review_details = classic.get("required_pull_request_reviews")
        if review_details is not None and not isinstance(review_details, dict):
            raise ValueError("Invalid branch review requirements")
        if review_details is not None:
            review_count = review_details.get("required_approving_review_count")
            if type(review_count) is not int or review_count < 0:
                raise ValueError("Invalid required approving review count")
        else:
            review_count = None
        enforce_admins = classic.get("enforce_admins")
        if enforce_admins is not None and (
            not isinstance(enforce_admins, dict)
            or type(enforce_admins.get("enabled")) is not bool
        ):
            raise ValueError("Invalid enforce_admins setting")
        classic_status_config = classic.get("required_status_checks")
        if classic_status_config is None:
            classic_checks = []
        else:
            if not isinstance(classic_status_config, dict):
                raise ValueError("Invalid classic required status checks")
            checks = classic_status_config.get("checks")
            contexts = classic_status_config.get("contexts")
            if checks:
                classic_checks = _parse_required_checks(checks, "app_id")
            elif contexts is not None:
                if not isinstance(contexts, list):
                    raise ValueError("Invalid classic check contexts")
                classic_checks = _parse_required_checks(
                    [{"context": name} for name in contexts], "app_id"
                )
            elif checks == []:
                classic_checks = []
            else:
                # A setting without check details cannot prove no requirements.
                classic_checks = None
        classic_summary = {
            "lookup": "retrieved",
            "required_check_contexts": classic_checks,
            "pull_request_reviews_configured": review_details is not None,
            "required_approving_review_count": review_count,
            "status_checks_configured": classic.get("required_status_checks") is not None,
            "enforce_admins_enabled": (
                enforce_admins["enabled"] if enforce_admins is not None else None
            ),
        }
    else:
        classic_summary = {
            "lookup": status,
            "required_check_contexts": None,
            "pull_request_reviews_configured": None,
            "required_approving_review_count": None,
            "status_checks_configured": None,
            "enforce_admins_enabled": None,
        }

    listed = []
    listing_status = "retrieved"
    for page in range(1, MAX_RULESET_PAGES + 1):
        lookup, data = _read_status(
            path + "/rulesets?includes_parents=true&per_page=100&page=" + str(page),
            token, opener,
        )
        if lookup != "retrieved":
            listing_status = lookup
            listed = []
            break
        if not isinstance(data, list) or len(data) > 100:
            raise ValueError("Invalid rulesets listing")
        for item in data:
            if (
                not isinstance(item, dict)
                or type(item.get("id")) is not int
                or item["id"] <= 0
                or not isinstance(item.get("enforcement"), str)
                or item["enforcement"] not in {"active", "evaluate", "disabled"}
            ):
                raise ValueError("Invalid GitHub ruleset record")
            listed.append({"id": item["id"], "enforcement": item["enforcement"]})
        if len(data) < 100:
            break
    else:
        raise ValueError("Rulesets listing too long; incomplete result")

    # This endpoint returns active rulesets actually applying to the named
    # branch, unlike the repository-wide listing above. It does not replace
    # classic branch protection checks or prove bypass permissions.
    applied_rules = []
    applied_requirements = []
    applied_requirements_complete = True
    observed_review_requirements = []
    review_requirements_complete = True
    review_control_fields_complete = True
    applied_status = "retrieved"
    for page in range(1, MAX_APPLIED_RULE_PAGES + 1):
        lookup, data = _read_status(
            path + "/rules/branches/" + encoded_branch
            + "?per_page=100&page=" + str(page),
            token, opener,
        )
        if lookup != "retrieved":
            applied_status = lookup
            applied_rules = []
            applied_requirements = []
            applied_requirements_complete = False
            review_requirements_complete = False
            review_control_fields_complete = False
            break
        if not isinstance(data, list) or len(data) > 100:
            raise ValueError("Invalid active branch rules response")
        for rule in data:
            if not isinstance(rule, dict):
                raise ValueError("Invalid active branch rule record")
            rule_type = rule.get("type")
            rule_id = rule.get("ruleset_id")
            source_type = rule.get("ruleset_source_type")
            if (
                not isinstance(rule_type, str) or not rule_type.strip()
                or (rule_id is not None and (
                    type(rule_id) is not int or rule_id <= 0
                ))
                or (source_type is not None and not isinstance(source_type, str))
            ):
                raise ValueError("Invalid active branch rule metadata")
            if rule_type == "pull_request":
                parameters = rule.get("parameters")
                if parameters is None:
                    review_requirements_complete = False
                    review_control_fields_complete = False
                elif not isinstance(parameters, dict):
                    raise ValueError("Invalid active pull request parameters")
                else:
                    count = parameters.get("required_approving_review_count")
                    if type(count) is not int or count < 0:
                        raise ValueError("Invalid active required approving review count")
                    controls = _read_active_review_boolean_fields(parameters)
                    if any(value is None for value in controls.values()):
                        review_control_fields_complete = False
                    observed_review_requirements.append({
                        "ruleset_id": rule_id,
                        "required_approving_review_count": count,
                        **controls,
                    })
            if rule_type == "required_status_checks":
                parameters = rule.get("parameters")
                if parameters is None:
                    applied_requirements_complete = False
                elif not isinstance(parameters, dict):
                    raise ValueError("Invalid active required check parameters")
                else:
                    rows = parameters.get("required_status_checks")
                    if rows is None:
                        applied_requirements_complete = False
                    else:
                        applied_requirements.extend(
                            _parse_required_checks(rows, "integration_id")
                        )
            applied_rules.append({
                "type": rule_type,
                "ruleset_id": rule_id,
                "ruleset_source_type": source_type,
            })
        if len(data) < 100:
            break
    else:
        raise ValueError("Active branch rules listing too long; incomplete result")

    return {
        "repository": repository,
        "branch": branch_name,
        "classic_protection": classic_summary,
        "rulesets": {
            "lookup": listing_status,
            "listed_count": len(listed) if listing_status == "retrieved" else None,
            "listed_active_count": (
                sum(item["enforcement"] == "active" for item in listed)
                if listing_status == "retrieved" else None
            ),
            "branch_applicability_verified": False,
        },
        "effective_ruleset_rules": {
            "lookup": applied_status,
            "observed_rule_count": (
                len(applied_rules) if applied_status == "retrieved" else None
            ),
            "observed_rule_types": (
                sorted({rule["type"] for rule in applied_rules})
                if applied_status == "retrieved" else None
            ),
            "rules": applied_rules if applied_status == "retrieved" else None,
            "required_check_contexts": (
                applied_requirements
                if applied_status == "retrieved" and applied_requirements_complete
                else None
            ),
            "required_contexts_available": (
                applied_status == "retrieved" and applied_requirements_complete
            ),
            "pull_request_approval_requirements": (
                observed_review_requirements
                if applied_status == "retrieved" and review_requirements_complete
                else None
            ),
            "review_requirements_available": (
                applied_status == "retrieved" and review_requirements_complete
            ),
            "active_review_control_fields_complete": (
                applied_status == "retrieved" and review_requirements_complete
                and review_control_fields_complete
            ),
            "applied_ruleset_api_responded": applied_status == "retrieved",
            "includes_classic_branch_protection": False,
        },
        "repository_policy_verified": False,
        "reviewer_permissions_verified": False,
        "execution_authorized": False,
        "merge_authorized": False,
        "deployment_authorized": False,
        "warning": (
            "Classic protection may be inaccessible. The applied-rules endpoint "
            "reports active rulesets, but cannot prove classic protection, "
            "reviewer eligibility, bypass rights or an enforcement verdict."
        ),
    }


def main(argv=None):
    parser = argparse.ArgumentParser(description="Read-only GitHub branch policy audit")
    parser.add_argument("repository")
    parser.add_argument("branch_name")
    args = parser.parse_args(argv)
    result = inspect_branch_policy(
        args.repository, args.branch_name, os.environ.get("GITHUB_TOKEN", "")
    )
    print(json.dumps(result, sort_keys=True, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
