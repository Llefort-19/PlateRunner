"""
Seed script for HTE App beta.
Manages invite codes and admin accounts.

Usage (from backend/ directory):
    python seed.py generate [count]              -- generate N invite codes (default 10)
    python seed.py list                          -- list all unused invite codes
    python seed.py create-admin <user> <pass>   -- create an admin account (no invite code needed)
    python seed.py list-users                    -- list all registered users
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


def _ensure_users_table(con):
    con.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now')),
            is_active INTEGER DEFAULT 1
        )
    """)


def generate_codes(count=10):
    db_path = _get_db_path()
    con = sqlite3.connect(db_path)
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


def create_admin(username, password):
    import bcrypt
    if len(password) < 8:
        print("Error: password must be at least 8 characters.")
        sys.exit(1)

    db_path = _get_db_path()
    con = sqlite3.connect(db_path)
    _ensure_users_table(con)

    existing = con.execute('SELECT id FROM users WHERE username = ?', (username,)).fetchone()
    if existing:
        print(f"Error: username '{username}' already exists.")
        con.close()
        sys.exit(1)

    password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    con.execute(
        'INSERT INTO users (username, password_hash, is_active) VALUES (?, ?, 1)',
        (username, password_hash)
    )
    con.commit()
    con.close()
    print(f"Admin account created: '{username}'")
    print("You can now sign in directly at the app — no invite code needed.")


def list_users():
    db_path = _get_db_path()
    con = sqlite3.connect(db_path)
    rows = con.execute(
        'SELECT id, username, created_at, is_active FROM users ORDER BY id'
    ).fetchall()
    con.close()
    print(f"Registered users ({len(rows)}):")
    for uid, username, created, active in rows:
        status = "active" if active else "disabled"
        print(f"  [{uid}] {username}  ({status}, joined {created})")


if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'help'
    if cmd == 'generate':
        n = int(sys.argv[2]) if len(sys.argv) > 2 else 10
        generate_codes(n)
    elif cmd == 'list':
        list_codes()
    elif cmd == 'create-admin':
        if len(sys.argv) < 4:
            print("Usage: python seed.py create-admin <username> <password>")
            sys.exit(1)
        create_admin(sys.argv[2], sys.argv[3])
    elif cmd == 'list-users':
        list_users()
    else:
        print(__doc__)
