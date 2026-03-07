"""
Seed script for HTE App beta.
Generates invite codes for beta testers.

Usage (from backend/ directory):
    python seed.py generate [count]   -- generate N invite codes (default 10)
    python seed.py list               -- list all unused invite codes
"""
import os
import sys
import secrets
import sqlite3
from pathlib import Path


def _get_db_path():
    """Resolve the SQLite database path from DATABASE_URL env var or default."""
    db_url = os.environ.get('DATABASE_URL', 'sqlite:///hte_beta.db')
    if db_url.startswith('sqlite:///'):
        # Relative path — resolve relative to the instance/ folder next to this script
        rel = db_url[len('sqlite:///'):]
        here = Path(__file__).parent
        candidate = here / 'instance' / rel
        if candidate.exists():
            return str(candidate)
        # Fallback: relative to cwd
        return rel
    raise ValueError(f"Unsupported DATABASE_URL scheme for seed script: {db_url}")


def generate_codes(count=10):
    db_path = _get_db_path()
    con = sqlite3.connect(db_path)
    # Ensure table exists (in case the app hasn't been started yet)
    con.execute("""
        CREATE TABLE IF NOT EXISTS invite_codes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE NOT NULL,
            used_by INTEGER,
            created_at TEXT DEFAULT (datetime('now'))
        )
    """)
    codes = [secrets.token_urlsafe(12) for _ in range(count)]
    con.executemany('INSERT INTO invite_codes (code) VALUES (?)', [(c,) for c in codes])
    con.commit()

    unused = con.execute('SELECT code FROM invite_codes WHERE used_by IS NULL').fetchall()
    con.close()

    print(f"Generated {count} new invite codes. All unused codes:")
    for (c,) in unused:
        print(f"  {c}")


def list_codes():
    db_path = _get_db_path()
    con = sqlite3.connect(db_path)
    unused = con.execute('SELECT code, created_at FROM invite_codes WHERE used_by IS NULL').fetchall()
    con.close()
    print(f"Unused invite codes ({len(unused)}):")
    for code, created in unused:
        print(f"  {code}  (created {created})")


if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'generate'
    if cmd == 'generate':
        n = int(sys.argv[2]) if len(sys.argv) > 2 else 10
        generate_codes(n)
    elif cmd == 'list':
        list_codes()
    else:
        print(__doc__)
