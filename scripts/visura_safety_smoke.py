"""Fail-closed local smoke test for VISURA AUTO-DEV.

No GitHub API, network, secrets, or paid model access.
"""
import os
import tempfile
from scripts.visura_budget_gate import authorize_paid_call
from scripts.visura_budget_ledger import reserve


def main():
    allowed, reason = authorize_paid_call(
        enabled=False,
        hard_provider_cap_verified=False,
        ledger_verified=False,
        committed_eur="0",
        maximum_next_call_eur="0.01",
    )
    assert not allowed, reason
    with tempfile.TemporaryDirectory() as tmp:
        db = os.path.join(tmp, "budget.sqlite")
        assert reserve(db, month="2026-10", amount_cents=1000)[0]
        assert not reserve(db, month="2026-10", amount_cents=1)[0]
    print("PASS: paid calls blocked; 10 EUR local reservation ceiling respected")


if __name__ == "__main__":
    main()
