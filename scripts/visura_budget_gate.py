"""VISURA AUTO-DEV spending gate.

Fail closed until a trusted, persistent monthly ledger and payment-side cap
are configured. This module does not call any paid API.
"""
from decimal import Decimal, InvalidOperation

MONTHLY_LIMIT_EUR = Decimal("10.00")


def authorize_paid_call(*, enabled, hard_provider_cap_verified, ledger_verified,
                        committed_eur, maximum_next_call_eur):
    """Return a reasoned decision; conservative reservation only.

    An actual executor must atomically reserve costs in a shared persistent
    ledger BEFORE calls. This pure check alone is not a hard monthly cap.
    """
    if enabled is not True:
        return False, "Paid calls disabled"
    if hard_provider_cap_verified is not True or ledger_verified is not True:
        return False, "Provider cap or persistent ledger not verified"
    try:
        committed = Decimal(str(committed_eur))
        maximum = Decimal(str(maximum_next_call_eur))
    except (InvalidOperation, TypeError, ValueError):
        return False, "Invalid spending amount"
    if not committed.is_finite() or not maximum.is_finite():
        return False, "Non-finite spending amount"
    if committed < 0 or maximum <= 0:
        return False, "Invalid spending range"
    if committed + maximum > MONTHLY_LIMIT_EUR:
        return False, "Monthly budget exhausted"
    return True, "Within budget, subject to atomic reservation"


if __name__ == "__main__":
    allowed, reason = authorize_paid_call(
        enabled=False,
        hard_provider_cap_verified=False,
        ledger_verified=False,
        committed_eur="0",
        maximum_next_call_eur="0.10",
    )
    print(f"VISURA paid API gate: {'ALLOW' if allowed else 'BLOCK'} — {reason}")
    if allowed:
        raise SystemExit("Unsafe: default gate must remain closed")
