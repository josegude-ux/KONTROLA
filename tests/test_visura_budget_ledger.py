import os
import tempfile
import threading
import unittest
from scripts.visura_budget_ledger import reserve


class BudgetLedgerTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.db = os.path.join(self.tmp.name, "budget.sqlite")

    def tearDown(self):
        self.tmp.cleanup()

    def test_reservation_and_limit(self):
        self.assertTrue(reserve(self.db, month="2026-10", amount_cents=999)[0])
        self.assertFalse(reserve(self.db, month="2026-10", amount_cents=2)[0])
        self.assertTrue(reserve(self.db, month="2026-10", amount_cents=1)[0])

    def test_idempotent_reservation(self):
        self.assertTrue(reserve(self.db, month="2026-10", amount_cents=600,
                                reservation_id="a")[0])
        self.assertTrue(reserve(self.db, month="2026-10", amount_cents=600,
                                reservation_id="a")[0])
        self.assertFalse(reserve(self.db, month="2026-10", amount_cents=401,
                                 reservation_id="b")[0])
        self.assertFalse(reserve(self.db, month="2026-10", amount_cents=601,
                                 reservation_id="a")[0])

    def test_separate_months(self):
        self.assertTrue(reserve(self.db, month="2026-10", amount_cents=1000)[0])
        self.assertTrue(reserve(self.db, month="2026-11", amount_cents=1000)[0])

    def test_invalid_inputs(self):
        for month in ("2026-13", "2026-00", "bad", "2026-1"):
            with self.assertRaises(ValueError):
                reserve(self.db, month=month, amount_cents=1)
        for amount in (-1, 0, 1001, 1.2, True):
            with self.assertRaises(ValueError):
                reserve(self.db, month="2026-10", amount_cents=amount)

    def test_concurrent_requests(self):
        outcomes = []
        lock = threading.Lock()

        def worker(i):
            allowed, _ = reserve(self.db, month="2026-10",
                                 amount_cents=100, reservation_id=f"req-{i}")
            with lock:
                outcomes.append(allowed)

        threads = [threading.Thread(target=worker, args=(i,)) for i in range(20)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        self.assertEqual(sum(outcomes), 10)


if __name__ == "__main__":
    unittest.main()
