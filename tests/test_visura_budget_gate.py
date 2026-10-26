import unittest
from scripts.visura_budget_gate import authorize_paid_call


class BudgetGateTests(unittest.TestCase):
    def check_blocked(self, **overrides):
        arguments = dict(enabled=False, hard_provider_cap_verified=False,
                         ledger_verified=False, committed_eur="0",
                         maximum_next_call_eur="0.10")
        arguments.update(overrides)
        allowed, _ = authorize_paid_call(**arguments)
        self.assertFalse(allowed)

    def test_default_closed(self):
        self.check_blocked()

    def test_provider_cap_missing(self):
        self.check_blocked(enabled=True, ledger_verified=True)

    def test_ledger_missing(self):
        self.check_blocked(enabled=True, hard_provider_cap_verified=True)

    def test_over_budget(self):
        self.check_blocked(enabled=True, hard_provider_cap_verified=True,
                           ledger_verified=True, committed_eur="9.99",
                           maximum_next_call_eur="0.02")

    def test_invalid_values(self):
        for value in ("NaN", "Infinity", "-1", "not-a-number"):
            self.check_blocked(enabled=True, hard_provider_cap_verified=True,
                               ledger_verified=True, committed_eur=value)

    def test_exact_limit_passes_pure_check_only(self):
        allowed, _ = authorize_paid_call(
            enabled=True, hard_provider_cap_verified=True,
            ledger_verified=True, committed_eur="9.90",
            maximum_next_call_eur="0.10")
        self.assertTrue(allowed)


if __name__ == "__main__":
    unittest.main()
