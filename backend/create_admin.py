"""Create (or reset the password of) an admin account.

Usage (from backend/):
  ../.venv/Scripts/python create_admin.py                    # uses ADMIN_USERNAME / ADMIN_PASSWORD env or defaults
  ../.venv/Scripts/python create_admin.py --username boss --password changeme --full-name "Boss"
"""
import argparse

from app.database.db import SessionLocal, init_db
from app.core.security import hash_password
from app.models.user import User
from app.services.admin import ensure_admin


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--username", default="admin", help="admin username (default: admin)")
    parser.add_argument("--password", default="admin123", help="admin password (default: admin123)")
    parser.add_argument("--full-name", default="Administrator")
    args = parser.parse_args()

    init_db()
    db = SessionLocal()
    try:
        admin = ensure_admin(db, args.username, args.password, args.full_name)
        print(f"Admin account ready -> login: {admin.username} / {args.password}  ({admin.full_name})")
    except ValueError as e:
        print(f"Error: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    main()