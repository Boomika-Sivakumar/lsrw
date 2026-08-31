"""Delete user account(s) and all their related data (CLI).

Usage (from backend/):
  ../.venv/Scripts/python delete_user.py --username teacher1
  ../.venv/Scripts/python delete_user.py --username arjun
  ../.venv/Scripts/python delete_user.py --all            # wipe every account
  ../.venv/Scripts/python delete_user.py --list           # show accounts

Run `../.venv/Scripts/python seed.py` afterwards to restore demo data.
"""
import argparse

from app.database.db import SessionLocal, init_db
from app.models.practice import DailyChallenge
from app.models.user import User
from app.services.admin import delete_account


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--username", help="username to delete")
    parser.add_argument("--all", action="store_true", help="delete every account")
    parser.add_argument("--list", action="store_true", help="list all accounts")
    args = parser.parse_args()

    init_db()
    db = SessionLocal()

    if args.list:
        for u in db.query(User).order_by(User.id).all():
            print(f"{u.id}\t{u.role}\t{u.username}\t{u.full_name}\t{u.user_id}")
        return

    if args.all:
        users = db.query(User).all()
        if not users:
            print("No accounts to delete.")
            return
        for u in users:
            delete_account(db, u)
            print(f"Deleted {u.username} ({u.role})")
        db.query(DailyChallenge).delete(synchronize_session=False)
        db.commit()
        print(f"Removed {len(users)} account(s).")
        return

    if not args.username:
        parser.error("provide --username or --all")
    user = db.query(User).filter(User.username == args.username).first()
    if not user:
        print(f"User '{args.username}' not found.")
        return
    delete_account(db, user)
    print(f"Deleted {user.username} ({user.role}, {user.full_name}).")


if __name__ == "__main__":
    main()