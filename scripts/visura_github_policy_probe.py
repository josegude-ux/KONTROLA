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
        classic_summary = {
            "lookup": "retrieved",
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
