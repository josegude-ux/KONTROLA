"""Deterministic, read-only readiness report for VISURA AUTO-DEV.

This report cannot verify GitHub authentication or grant execution privileges.
"""
from scripts.visura_activation_gate import assess_activation_gate
from scripts.visura_review_binding import inspect_task_review_binding


def build_readiness_report(task, review, external_claims):
    binding = inspect_task_review_binding(task, review)
    gate = assess_activation_gate(external_claims)
    blockers = list(gate["missing_requirements"])
    if not binding["task_and_commit_match"]:
        blockers.append("task_commit_mismatch")
    if binding["self_review"]:
        blockers.append("self_review")
    if not binding["approval_claim_eligible_for_external_verification"]:
        blockers.append("approval_not_eligible")
    blockers.append("trusted_external_authorization_not_implemented")
    return {
        "blockers": sorted(set(blockers)),
        "ready_for_execution": False,
        "ready_for_merge": False,
        "ready_for_deployment": False,
        "external_claims_authenticated": False,
        "task_review_binding": binding,
        "activation_gate": gate,
    }
