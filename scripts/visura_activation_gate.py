"""Fail-closed execution activation gate.

This module has no executor, subprocess, network access, or credentials.
An untrusted task/review payload must never be able to unlock execution.
"""


def assess_activation_gate(evidence):
    if not isinstance(evidence, dict):
        raise ValueError("Evidence must be a dictionary")
    allowed = {
        "github_identity_verified_externally",
        "repository_policy_verified_externally",
        "head_sha_verified_externally",
        "ci_verified_externally",
        "human_approval_verified_externally",
        "provider_spending_cap_verified_externally",
    }
    if set(evidence) != allowed:
        raise ValueError("Missing or unknown evidence fields")
    if any(type(evidence[key]) is not bool for key in allowed):
        raise ValueError("Evidence fields must be booleans")
    missing = sorted(key for key in allowed if not evidence[key])
    return {
        "missing_requirements": missing,
        "all_claims_present": not missing,
        "evidence_authenticated": False,
        "execution_authorized": False,
        "merge_authorized": False,
        "deployment_authorized": False,
        "reason": "External attestation and enforcement not implemented",
    }
