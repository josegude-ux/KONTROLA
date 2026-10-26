"""Persistent SQLite budget reservations for a *single-host* prototype.

Not a distributed ledger and NOT suitable as the sole safeguard in ephemeral
GitHub Actions. Paid API calls remain disabled. Amounts are EUR cents.
"""
import sqlite3
import uuid

LIMIT_CENTS = 1000


def reserve(db_path, *, month, amount_cents, reservation_id=None):
    """Atomically reserve cents for one month in one shared SQLite database.

    Returns (allowed, reservation_id). Idempotent by reservation ID.
    """
    if not isinstance(month, str) or len(month) != 7 or month[4] != "-":
        raise ValueError("month must be YYYY-MM")
    try:
        year, number = (int(x) for x in month.split("-"))
        if not 1 <= number <= 12 or not 2000 <= year <= 9999:
            raise ValueError
    except (ValueError, TypeError):
        raise ValueError("invalid month") from None
    if type(amount_cents) is not int or amount_cents <= 0 or amount_cents > LIMIT_CENTS:
        raise ValueError("invalid amount")
    reservation_id = reservation_id or str(uuid.uuid4())
    if not isinstance(reservation_id, str) or not reservation_id.strip():
        raise ValueError("invalid reservation id")

    with sqlite3.connect(db_path, timeout=10, isolation_level=None) as db:
        db.execute("PRAGMA busy_timeout = 10000")
        db.execute("BEGIN IMMEDIATE")
        try:
            db.execute("""CREATE TABLE IF NOT EXISTS reservations (
                id TEXT PRIMARY KEY, month TEXT NOT NULL,
                cents INTEGER NOT NULL CHECK(cents > 0),
                status TEXT NOT NULL DEFAULT 'reserved'
                CHECK(status IN ('reserved', 'settled'))
            )""")
            previous = db.execute(
                "SELECT month, cents FROM reservations WHERE id = ?",
                (reservation_id,),
            ).fetchone()
            if previous:
                allowed = previous == (month, amount_cents)
            else:
                used = db.execute(
                    "SELECT COALESCE(SUM(cents), 0) FROM reservations WHERE month = ?",
                    (month,),
                ).fetchone()[0]
                allowed = used + amount_cents <= LIMIT_CENTS
                if allowed:
                    db.execute(
                        "INSERT INTO reservations(id, month, cents) VALUES(?,?,?)",
                        (reservation_id, month, amount_cents),
                    )
            db.execute("COMMIT")
        except BaseException:
            db.execute("ROLLBACK")
            raise
    return allowed, reservation_id


if __name__ == "__main__":
    print("Local reservation prototype only; no paid API calls.")
