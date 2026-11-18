"""Offline verification path for a future independent VISURA supervisor.

This component *observes* signatures and atomically consumes valid nonces.
It does not authenticate a human or the provenance of trust snapshots;
a trusted out-of-agent service must provide those. Even valid signatures
never grant execution, GitHub writes, merge, production access or deployment.
"""
import hashlib
from pathlib import Path

from scripts.visura_auto_dev_phase3_security import (
    canonical_json,
    utc_timestamp,
    verify_signed_grant,
)
from scripts.visura_nonce_replay_guard import consume_nonce


def review_signed_grant_once(envelope, manifest, *, trust, now, ledger_path):
    decision = {
        "signature_verified": False,
        "scope_verified": False,
        "nonce_consumed": False,
        "human_identity_verified": False,
        "supervisor_origin_authenticated": False,
        "runtime_independently_attested": False,
        "execution_authorized": False,
        "github_write_authorized": False,
        "merge_authorized": False,
        "deployment_authorized": False,
    }
    # Validate signature and exact task/head/scope first. Never spend a nonce
    # on malformed or untrusted input.
    checked = verify_signed_grant(envelope, manifest, trust, now)
    decision["signature_verified"] = checked["signature_verified"]
    decision["scope_verified"] = checked["exact_scope_verified"]
    if not (checked["signature_verified"] and checked["exact_scope_verified"]
            and checked["fresh_observations"]):
        return dict(decision, reason="grant_rejected:" + checked["reason"])
    claims = envelope["claims"]
    claim_hash = hashlib.sha256(canonical_json(claims)).hexdigest()
    result = consume_nonce(
        Path(ledger_path), key_id=claims["key_id"],
        nonce=claims["nonce"], grant_digest=claim_hash,
        now=now, expires_at=utc_timestamp(claims["expires_at"]),
    )
    decision["nonce_consumed"] = result["nonce_accepted"]
    return dict(decision, reason=result["reason"] + ":human_auth_and_attestation_missing")
