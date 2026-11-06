"""Atomic replay detection for a future *external trusted* VISURA supervisor.

This is a low-level, fail-closed storage primitive, not an authorization
service. It never grants code execution, GitHub writes, merge or deployment.
The caller must authenticate humans, signed grants, policies and environment
outside the agent and keep this SQLite DB on persistent trusted storage.
"""
from contextlib import closing
from datetime import datetime, timedelta, timezone
from pathlib import Path
import re
import sqlite3

_KEY_ID = re.compile(r"[A-Za-z0-9][A-Za-z0-9_.:@-]{2,79}\Z")
_NONCE = re.compile(r"[A-Za-z0-9_-]{24,100}\Z")
_DIGEST = re.compile(r"[0-9a-f]{64}\Z")
_MAX_TTL = timedelta(minutes=15)


def _utc_datetime(value, name):
    if not isinstance(value, datetime) or value.tzinfo is None:
        raise ValueError(name + " must be timezone-aware")
    return value.astimezone(timezone.utc)


def consume_nonce(db_path, *, key_id, nonce, grant_digest, now, expires_at):
    """Store nonce once, transactionally, then deny any replay.

    The nonce namespace is global across signing keys. No automatic expiry
    cleanup occurs: retaining consumed nonces prevents delayed replay.
    Returns storage outcome only; never an execution authorization decision.
    """
    decision = {"nonce_accepted": False, "execution_authorized": False,
                "github_write_authorized": False, "merge_authorized": False}
    if not isinstance(key_id, str) or not _KEY_ID.fullmatch(key_id):
        raise ValueError("Invalid key ID")
    if not isinstance(nonce, str) or not _NONCE.fullmatch(nonce):
        raise ValueError("Invalid nonce")
    if not isinstance(grant_digest, str) or not _DIGEST.fullmatch(grant_digest):
        raise ValueError("Invalid grant digest")
    start = _utc_datetime(now, "now")
    end = _utc_datetime(expires_at, "expires_at")
    if not timedelta(0) < end - start <= _MAX_TTL:
        return dict(decision, reason="expired_or_invalid_lifetime")
    path = Path(db_path)
    if not path.is_absolute() or str(path) == ":memory:" or path.is_symlink():
        raise ValueError("Supervisor database must be an absolute, non-symlink file")
    if not path.parent.is_dir() or path.parent.is_symlink():
        raise ValueError("Supervisor database parent must be a trusted directory")
    with closing(sqlite3.connect(str(path), timeout=5, isolation_level=None)) as conn:
        conn.execute("PRAGMA busy_timeout=5000")
        conn.execute(
            "CREATE TABLE IF NOT EXISTS consumed_grants ("
            "nonce TEXT PRIMARY KEY, key_id TEXT NOT NULL,"
            "grant_digest TEXT NOT NULL, consumed_at TEXT NOT NULL,"
            "expires_at TEXT NOT NULL)"
        )
        try:
            conn.execute("BEGIN IMMEDIATE")
            conn.execute(
                "INSERT INTO consumed_grants "
                "(nonce, key_id, grant_digest, consumed_at, expires_at) "
                "VALUES (?, ?, ?, ?, ?)",
                (nonce, key_id, grant_digest, start.isoformat(), end.isoformat()),
            )
            conn.execute("COMMIT")
        except sqlite3.IntegrityError:
            conn.execute("ROLLBACK")
            return dict(decision, reason="nonce_already_consumed")
        except Exception:
            conn.execute("ROLLBACK")
            raise
    return dict(decision, nonce_accepted=True, reason="nonce_consumed_not_authorized")
