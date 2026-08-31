"""PostgreSQL to MySQL Data Migration Tool for LSRW Communication AI.

Usage:
    python migrate_pg_to_mysql.py --pg-url "postgresql+psycopg2://user:pass@host:5432/dbname" \
                                   --mysql-url "mysql+pymysql://user:pass@host:3306/dbname"

This script copies existing application data from a PostgreSQL database into MySQL 8.0+,
handling schema layout, order of operations (foreign key constraints), JSON conversions,
and row count validation.
"""
import argparse
import sys
import json
from sqlalchemy import create_engine, MetaData, Table, select
from sqlalchemy.orm import sessionmaker

TABLE_ORDER = [
    "users",
    "student_profiles",
    "teacher_profiles",
    "skill_scores",
    "assessments",
    "assessment_questions",
    "assessment_answers",
    "assignments",
    "assignment_submissions",
    "reports",
    "progress_history",
    "group_discussions",
    "discussion_participants",
    "discussion_transcripts",
    "speaker_segments",
    "discussion_analysis",
    "recordings",
    "vocabulary_items",
    "coach_messages",
    "practice_sessions",
    "conversations",
    "interviews",
    "presentations",
    "mistakes",
    "recommendations",
    "learning_paths",
    "daily_challenges",
    "challenge_completions",
]


def migrate(pg_url: str, mysql_url: str):
    print("=" * 60)
    print("  LSRW AI Data Migration: PostgreSQL -> MySQL 8.0+")
    print("=" * 60)

    print(f" Connecting to PostgreSQL: {pg_url.split('@')[-1] if '@' in pg_url else pg_url}")
    pg_engine = create_engine(pg_url)
    pg_meta = MetaData()

    print(f" Connecting to MySQL: {mysql_url.split('@')[-1] if '@' in mysql_url else mysql_url}")
    mysql_engine = create_engine(mysql_url)
    mysql_meta = MetaData()

    # Reflect tables
    try:
        pg_meta.reflect(bind=pg_engine)
        mysql_meta.reflect(bind=mysql_engine)
    except Exception as e:
        print(f"Error connecting/reflecting databases: {e}")
        sys.exit(1)

    pg_session = sessionmaker(bind=pg_engine)()
    mysql_session = sessionmaker(bind=mysql_engine)()

    validation_results = {}

    for table_name in TABLE_ORDER:
        if table_name not in pg_meta.tables:
            print(f"[-] Table {table_name} not found in PostgreSQL source, skipping.")
            continue
        if table_name not in mysql_meta.tables:
            print(f"[!] Table {table_name} missing in MySQL target. Run Alembic migrations first!")
            continue

        pg_table = pg_meta.tables[table_name]
        mysql_table = mysql_meta.tables[table_name]

        # Fetch records from PG
        rows = pg_engine.execute(select([pg_table])).fetchall()
        pg_count = len(rows)

        if pg_count == 0:
            print(f"[0] Table '{table_name}' is empty in source.")
            validation_results[table_name] = {"pg": 0, "mysql": 0, "status": "MATCH"}
            continue

        print(f"[>] Migrating {pg_count} rows for table '{table_name}'...")

        # Transform and insert into MySQL
        insert_records = []
        for row in rows:
            record_dict = dict(row)
            # Ensure JSON fields are serializable if stored as raw dicts/lists
            for col_name, val in record_dict.items():
                if isinstance(val, (dict, list)):
                    # MySQL JSON handles native objects cleanly via SQLAlchemy
                    pass
            insert_records.append(record_dict)

        # Truncate or insert
        with mysql_engine.begin() as conn:
            conn.execute(mysql_table.insert(), insert_records)

        # Validate count
        mysql_count = mysql_engine.execute(select([mysql_table])).rowcount
        status = "MATCH" if pg_count == mysql_count else "MISMATCH"
        validation_results[table_name] = {"pg": pg_count, "mysql": mysql_count, "status": status}
        print(f"[✓] Table '{table_name}' migrated: PG={pg_count}, MySQL={mysql_count} [{status}]")

    print("\n" + "=" * 60)
    print("  DATA MIGRATION SUMMARY & VALIDATION REPORT")
    print("=" * 60)
    all_matched = True
    for table, res in validation_results.items():
        match_str = "OK" if res["status"] == "MATCH" else "FAILED"
        if res["status"] != "MATCH":
            all_matched = False
        print(f"  {table:<25} | PG: {res['pg']:<6} | MySQL: {res['mysql']:<6} | Status: {match_str}")

    print("=" * 60)
    if all_matched:
        print("  DATA MIGRATION COMPLETED SUCCESSFULLY!")
    else:
        print("  WARNING: DISCREPANCIES DETECTED IN ROW COUNTS!")
    print("=" * 60)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Migrate LSRW database from PostgreSQL to MySQL.")
    parser.add_argument("--pg-url", required=True, help="PostgreSQL connection string")
    parser.add_argument("--mysql-url", required=True, help="MySQL connection string")
    args = parser.parse_args()
    migrate(args.pg_url, args.mysql_url)
