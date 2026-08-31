"""001_initial_mysql_schema

Revision ID: 001_initial_mysql_schema
Revises: 
Create Date: 2026-08-21 13:38:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '001_initial_mysql_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. users
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False, auto_increment=True),
        sa.Column('username', sa.String(length=64), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('full_name', sa.String(length=120), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('role', sa.String(length=20), nullable=False),
        sa.Column('user_id', sa.String(length=16), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True, server_default=sa.text('1')),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        mysql_charset='utf8mb4',
        mysql_collate='utf8mb4_unicode_ci'
    )
    op.create_index('ix_users_id', 'users', ['id'], unique=False)
    op.create_index('ix_users_username', 'users', ['username'], unique=True)
    op.create_index('ix_users_email', 'users', ['email'], unique=True)
    op.create_index('ix_users_role', 'users', ['role'], unique=False)
    op.create_index('ix_users_user_id', 'users', ['user_id'], unique=True)

    # 2. student_profiles
    op.create_table(
        'student_profiles',
        sa.Column('id', sa.Integer(), nullable=False, auto_increment=True),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('goals', sa.JSON(), nullable=True),
        sa.Column('learning_level', sa.String(length=40), nullable=True),
        sa.Column('target_level', sa.String(length=40), nullable=True),
        sa.Column('daily_streak', sa.Integer(), nullable=True),
        sa.Column('last_challenge_date', sa.DateTime(), nullable=True),
        sa.Column('bio', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id'),
        mysql_charset='utf8mb4',
        mysql_collate='utf8mb4_unicode_ci'
    )

    # 3. teacher_profiles
    op.create_table(
        'teacher_profiles',
        sa.Column('id', sa.Integer(), nullable=False, auto_increment=True),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('department', sa.String(length=120), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id'),
        mysql_charset='utf8mb4',
        mysql_collate='utf8mb4_unicode_ci'
    )

    # 4. skill_scores
    op.create_table(
        'skill_scores',
        sa.Column('id', sa.Integer(), nullable=False, auto_increment=True),
        sa.Column('student_id', sa.Integer(), nullable=False),
        sa.Column('source_type', sa.String(length=40), nullable=False),
        sa.Column('source_id', sa.Integer(), nullable=True),
        sa.Column('scores', sa.JSON(), nullable=True),
        sa.Column('overall', sa.Float(), nullable=True),
        sa.Column('level', sa.String(length=40), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['student_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        mysql_charset='utf8mb4',
        mysql_collate='utf8mb4_unicode_ci'
    )
    op.create_index('ix_skill_scores_student_id', 'skill_scores', ['student_id'], unique=False)
    op.create_index('ix_skill_scores_created_at', 'skill_scores', ['created_at'], unique=False)

    # 5. assessments
    op.create_table(
        'assessments',
        sa.Column('id', sa.Integer(), nullable=False, auto_increment=True),
        sa.Column('student_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('kind', sa.String(length=30), nullable=True),
        sa.Column('status', sa.String(length=30), nullable=True),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('submitted_at', sa.DateTime(), nullable=True),
        sa.Column('overall_score', sa.Float(), nullable=True),
        sa.Column('level', sa.String(length=40), nullable=True),
        sa.Column('scores', sa.JSON(), nullable=True),
        sa.Column('strengths', sa.JSON(), nullable=True),
        sa.Column('weaknesses', sa.JSON(), nullable=True),
        sa.Column('mistakes', sa.JSON(), nullable=True),
        sa.Column('recommendations', sa.JSON(), nullable=True),
        sa.Column('summary', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['student_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        mysql_charset='utf8mb4',
        mysql_collate='utf8mb4_unicode_ci'
    )
    op.create_index('ix_assessments_student_id', 'assessments', ['student_id'], unique=False)

    # 6. assessment_questions
    op.create_table(
        'assessment_questions',
        sa.Column('id', sa.Integer(), nullable=False, auto_increment=True),
        sa.Column('assessment_id', sa.Integer(), nullable=False),
        sa.Column('skill', sa.String(length=30), nullable=False),
        sa.Column('type', sa.String(length=30), nullable=True),
        sa.Column('prompt', sa.Text(), nullable=False),
        sa.Column('audio_path', sa.String(length=300), nullable=True),
        sa.Column('passage', sa.Text(), nullable=True),
        sa.Column('options', sa.JSON(), nullable=True),
        sa.Column('correct_answer', sa.Text(), nullable=True),
        sa.Column('reference_answer', sa.Text(), nullable=True),
        sa.Column('order_no', sa.Integer(), nullable=True),
        sa.Column('difficulty', sa.String(length=20), nullable=True),
        sa.ForeignKeyConstraint(['assessment_id'], ['assessments.id'], ),
        sa.PrimaryKeyConstraint('id'),
        mysql_charset='utf8mb4',
        mysql_collate='utf8mb4_unicode_ci'
    )

    # 7. assessment_answers
    op.create_table(
        'assessment_answers',
        sa.Column('id', sa.Integer(), nullable=False, auto_increment=True),
        sa.Column('question_id', sa.Integer(), nullable=False),
        sa.Column('student_id', sa.Integer(), nullable=False),
        sa.Column('answer_text', sa.Text(), nullable=True),
        sa.Column('audio_path', sa.String(length=300), nullable=True),
        sa.Column('duration_ms', sa.Integer(), nullable=True),
        sa.Column('is_correct', sa.String(length=10), nullable=True),
        sa.Column('score', sa.Float(), nullable=True),
        sa.Column('feedback', sa.JSON(), nullable=True),
        sa.Column('submitted_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['question_id'], ['assessment_questions.id'], ),
        sa.ForeignKeyConstraint(['student_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        mysql_charset='utf8mb4',
        mysql_collate='utf8mb4_unicode_ci'
    )

    # 8. assignments
    op.create_table(
        'assignments',
        sa.Column('id', sa.Integer(), nullable=False, auto_increment=True),
        sa.Column('teacher_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('skill', sa.String(length=30), nullable=False),
        sa.Column('topic', sa.String(length=300), nullable=True),
        sa.Column('difficulty', sa.String(length=20), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('questions', sa.JSON(), nullable=True),
        sa.Column('assessment_criteria', sa.JSON(), nullable=True),
        sa.Column('deadline', sa.DateTime(), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=True),
        sa.Column('is_ai_generated', sa.String(length=5), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['teacher_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        mysql_charset='utf8mb4',
        mysql_collate='utf8mb4_unicode_ci'
    )

    # 9. assignment_submissions
    op.create_table(
        'assignment_submissions',
        sa.Column('id', sa.Integer(), nullable=False, auto_increment=True),
        sa.Column('assignment_id', sa.Integer(), nullable=False),
        sa.Column('student_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=True),
        sa.Column('answer', sa.JSON(), nullable=True),
        sa.Column('score', sa.Float(), nullable=True),
        sa.Column('feedback', sa.JSON(), nullable=True),
        sa.Column('submitted_at', sa.DateTime(), nullable=True),
        sa.Column('reviewed_by_teacher', sa.String(length=5), nullable=True),
        sa.ForeignKeyConstraint(['assignment_id'], ['assignments.id'], ),
        sa.ForeignKeyConstraint(['student_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        mysql_charset='utf8mb4',
        mysql_collate='utf8mb4_unicode_ci'
    )
    op.create_index('ix_assignment_submissions_assignment_id', 'assignment_submissions', ['assignment_id'], unique=False)
    op.create_index('ix_assignment_submissions_student_id', 'assignment_submissions', ['student_id'], unique=False)

    # 10. reports
    op.create_table(
        'reports',
        sa.Column('id', sa.Integer(), nullable=False, auto_increment=True),
        sa.Column('student_id', sa.Integer(), nullable=False),
        sa.Column('report_type', sa.String(length=40), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=True),
        sa.Column('report', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['student_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        mysql_charset='utf8mb4',
        mysql_collate='utf8mb4_unicode_ci'
    )
    op.create_index('ix_reports_student_id', 'reports', ['student_id'], unique=False)

    # 11. progress_history
    op.create_table(
        'progress_history',
        sa.Column('id', sa.Integer(), nullable=False, auto_increment=True),
        sa.Column('student_id', sa.Integer(), nullable=False),
        sa.Column('history_date', sa.DateTime(), nullable=True),
        sa.Column('scores', sa.JSON(), nullable=True),
        sa.Column('activities', sa.Integer(), nullable=True),
        sa.Column('level', sa.String(length=40), nullable=True),
        sa.ForeignKeyConstraint(['student_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        mysql_charset='utf8mb4',
        mysql_collate='utf8mb4_unicode_ci'
    )
    op.create_index('ix_progress_history_student_id', 'progress_history', ['student_id'], unique=False)
    op.create_index('ix_progress_history_history_date', 'progress_history', ['history_date'], unique=False)

    # 12. group_discussions
    op.create_table(
        'group_discussions',
        sa.Column('id', sa.Integer(), nullable=False, auto_increment=True),
        sa.Column('teacher_id', sa.Integer(), nullable=False),
        sa.Column('session_code', sa.String(length=30), nullable=False),
        sa.Column('topic', sa.String(length=300), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('difficulty', sa.String(length=20), nullable=True),
        sa.Column('duration_seconds', sa.Integer(), nullable=True),
        sa.Column('participant_limit', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=True),
        sa.Column('assessment_criteria', sa.JSON(), nullable=True),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('ended_at', sa.DateTime(), nullable=True),
        sa.Column('recording_path', sa.String(length=300), nullable=True),
        sa.Column('recording_name', sa.String(length=255), nullable=True),
        sa.Column('recording_size', sa.Integer(), nullable=True),
        sa.Column('recording_uploaded_at', sa.DateTime(), nullable=True),
        sa.Column('recap', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('group_score', sa.JSON(), nullable=True),
        sa.Column('group_report', sa.JSON(), nullable=True),
        sa.Column('summary', sa.JSON(), nullable=True),
        sa.ForeignKeyConstraint(['teacher_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        mysql_charset='utf8mb4',
        mysql_collate='utf8mb4_unicode_ci'
    )
    op.create_index('ix_group_discussions_session_code', 'group_discussions', ['session_code'], unique=True)
    op.create_index('ix_group_discussions_status', 'group_discussions', ['status'], unique=False)

    # 13. discussion_participants
    op.create_table(
        'discussion_participants',
        sa.Column('id', sa.Integer(), nullable=False, auto_increment=True),
        sa.Column('discussion_id', sa.Integer(), nullable=False),
        sa.Column('student_id', sa.Integer(), nullable=False),
        sa.Column('role', sa.String(length=20), nullable=True),
        sa.Column('consent_recording', sa.String(length=5), nullable=True),
        sa.Column('connected', sa.String(length=5), nullable=True),
        sa.Column('joined_at', sa.DateTime(), nullable=True),
        sa.Column('left_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['discussion_id'], ['group_discussions.id'], ),
        sa.ForeignKeyConstraint(['student_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        mysql_charset='utf8mb4',
        mysql_collate='utf8mb4_unicode_ci'
    )
    op.create_index('ix_discussion_participants_discussion_id', 'discussion_participants', ['discussion_id'], unique=False)
    op.create_index('ix_discussion_participants_student_id', 'discussion_participants', ['student_id'], unique=False)

    # 14. discussion_transcripts
    op.create_table(
        'discussion_transcripts',
        sa.Column('id', sa.Integer(), nullable=False, auto_increment=True),
        sa.Column('discussion_id', sa.Integer(), nullable=False),
        sa.Column('speaker', sa.String(length=20), nullable=True),
        sa.Column('text', sa.Text(), nullable=False),
        sa.Column('start_time', sa.Float(), nullable=True),
        sa.Column('end_time', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['discussion_id'], ['group_discussions.id'], ),
        sa.PrimaryKeyConstraint('id'),
        mysql_charset='utf8mb4',
        mysql_collate='utf8mb4_unicode_ci'
    )
    op.create_index('ix_discussion_transcripts_discussion_id', 'discussion_transcripts', ['discussion_id'], unique=False)

    # 15. speaker_segments
    op.create_table(
        'speaker_segments',
        sa.Column('id', sa.Integer(), nullable=False, auto_increment=True),
        sa.Column('discussion_id', sa.Integer(), nullable=False),
        sa.Column('participant_id', sa.Integer(), nullable=True),
        sa.Column('user_id', sa.String(length=20), nullable=False),
        sa.Column('text', sa.Text(), nullable=False),
        sa.Column('start_time', sa.Float(), nullable=True),
        sa.Column('end_time', sa.Float(), nullable=True),
        sa.Column('is_interruption', sa.String(length=5), nullable=True),
        sa.Column('interrupted_user_id', sa.String(length=20), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['discussion_id'], ['group_discussions.id'], ),
        sa.ForeignKeyConstraint(['participant_id'], ['discussion_participants.id'], ),
        sa.PrimaryKeyConstraint('id'),
        mysql_charset='utf8mb4',
        mysql_collate='utf8mb4_unicode_ci'
    )
    op.create_index('ix_speaker_segments_discussion_id', 'speaker_segments', ['discussion_id'], unique=False)

    # 16. discussion_analysis
    op.create_table(
        'discussion_analysis',
        sa.Column('id', sa.Integer(), nullable=False, auto_increment=True),
        sa.Column('discussion_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=True),
        sa.Column('group_report', sa.JSON(), nullable=True),
        sa.Column('individual_reports', sa.JSON(), nullable=True),
        sa.Column('summary', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['discussion_id'], ['group_discussions.id'], ),
        sa.PrimaryKeyConstraint('id'),
        mysql_charset='utf8mb4',
        mysql_collate='utf8mb4_unicode_ci'
    )
    op.create_index('ix_discussion_analysis_discussion_id', 'discussion_analysis', ['discussion_id'], unique=False)

    # 17. recordings
    op.create_table(
        'recordings',
        sa.Column('id', sa.Integer(), nullable=False, auto_increment=True),
        sa.Column('discussion_id', sa.Integer(), nullable=True),
        sa.Column('student_id', sa.Integer(), nullable=True),
        sa.Column('kind', sa.String(length=20), nullable=True),
        sa.Column('path', sa.String(length=300), nullable=False),
        sa.Column('consent', sa.String(length=5), nullable=True),
        sa.Column('deleted', sa.String(length=5), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['discussion_id'], ['group_discussions.id'], ),
        sa.ForeignKeyConstraint(['student_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        mysql_charset='utf8mb4',
        mysql_collate='utf8mb4_unicode_ci'
    )

    # 18. vocabulary_items
    op.create_table(
        'vocabulary_items',
        sa.Column('id', sa.Integer(), nullable=False, auto_increment=True),
        sa.Column('student_id', sa.Integer(), nullable=False),
        sa.Column('word', sa.String(length=80), nullable=False),
        sa.Column('definition', sa.Text(), nullable=True),
        sa.Column('example', sa.Text(), nullable=True),
        sa.Column('category', sa.String(length=40), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=True),
        sa.Column('times_practiced', sa.Integer(), nullable=True),
        sa.Column('times_seen', sa.Integer(), nullable=True),
        sa.Column('last_reviewed', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['student_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        mysql_charset='utf8mb4',
        mysql_collate='utf8mb4_unicode_ci'
    )
    op.create_index('ix_vocabulary_items_student_id', 'vocabulary_items', ['student_id'], unique=False)

    # 19. coach_messages
    op.create_table(
        'coach_messages',
        sa.Column('id', sa.Integer(), nullable=False, auto_increment=True),
        sa.Column('student_id', sa.Integer(), nullable=False),
        sa.Column('role', sa.String(length=10), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('context', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['student_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        mysql_charset='utf8mb4',
        mysql_collate='utf8mb4_unicode_ci'
    )
    op.create_index('ix_coach_messages_student_id', 'coach_messages', ['student_id'], unique=False)

    # 20. practice_sessions
    op.create_table(
        'practice_sessions',
        sa.Column('id', sa.Integer(), nullable=False, auto_increment=True),
        sa.Column('student_id', sa.Integer(), nullable=False),
        sa.Column('skill', sa.String(length=30), nullable=False),
        sa.Column('mode', sa.String(length=40), nullable=True),
        sa.Column('topic', sa.String(length=200), nullable=True),
        sa.Column('difficulty', sa.String(length=20), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=True),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('ended_at', sa.DateTime(), nullable=True),
        sa.Column('transcript', sa.Text(), nullable=True),
        sa.Column('audio_path', sa.String(length=300), nullable=True),
        sa.Column('duration_ms', sa.Integer(), nullable=True),
        sa.Column('score', sa.Float(), nullable=True),
        sa.Column('result', sa.JSON(), nullable=True),
        sa.ForeignKeyConstraint(['student_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        mysql_charset='utf8mb4',
        mysql_collate='utf8mb4_unicode_ci'
    )
    op.create_index('ix_practice_sessions_student_id', 'practice_sessions', ['student_id'], unique=False)
    op.create_index('ix_practice_sessions_skill', 'practice_sessions', ['skill'], unique=False)

    # 21. conversations
    op.create_table(
        'conversations',
        sa.Column('id', sa.Integer(), nullable=False, auto_increment=True),
        sa.Column('student_id', sa.Integer(), nullable=False),
        sa.Column('scenario', sa.String(length=60), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=True),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('ended_at', sa.DateTime(), nullable=True),
        sa.Column('messages', sa.JSON(), nullable=True),
        sa.Column('report', sa.JSON(), nullable=True),
        sa.ForeignKeyConstraint(['student_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        mysql_charset='utf8mb4',
        mysql_collate='utf8mb4_unicode_ci'
    )
    op.create_index('ix_conversations_student_id', 'conversations', ['student_id'], unique=False)

    # 22. interviews
    op.create_table(
        'interviews',
        sa.Column('id', sa.Integer(), nullable=False, auto_increment=True),
        sa.Column('student_id', sa.Integer(), nullable=False),
        sa.Column('job_role', sa.String(length=120), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=True),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('ended_at', sa.DateTime(), nullable=True),
        sa.Column('questions', sa.JSON(), nullable=True),
        sa.Column('answers', sa.JSON(), nullable=True),
        sa.Column('report', sa.JSON(), nullable=True),
        sa.ForeignKeyConstraint(['student_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        mysql_charset='utf8mb4',
        mysql_collate='utf8mb4_unicode_ci'
    )
    op.create_index('ix_interviews_student_id', 'interviews', ['student_id'], unique=False)

    # 23. presentations
    op.create_table(
        'presentations',
        sa.Column('id', sa.Integer(), nullable=False, auto_increment=True),
        sa.Column('student_id', sa.Integer(), nullable=False),
        sa.Column('topic', sa.String(length=200), nullable=True),
        sa.Column('duration_seconds', sa.Integer(), nullable=True),
        sa.Column('difficulty', sa.String(length=20), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=True),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('transcript', sa.Text(), nullable=True),
        sa.Column('report', sa.JSON(), nullable=True),
        sa.ForeignKeyConstraint(['student_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        mysql_charset='utf8mb4',
        mysql_collate='utf8mb4_unicode_ci'
    )
    op.create_index('ix_presentations_student_id', 'presentations', ['student_id'], unique=False)

    # 24. mistakes
    op.create_table(
        'mistakes',
        sa.Column('id', sa.Integer(), nullable=False, auto_increment=True),
        sa.Column('student_id', sa.Integer(), nullable=False),
        sa.Column('category', sa.String(length=30), nullable=False),
        sa.Column('text', sa.Text(), nullable=False),
        sa.Column('corrected_text', sa.Text(), nullable=True),
        sa.Column('explanation', sa.Text(), nullable=True),
        sa.Column('occurrences', sa.Integer(), nullable=True),
        sa.Column('first_detected', sa.DateTime(), nullable=True),
        sa.Column('last_detected', sa.DateTime(), nullable=True),
        sa.Column('status', sa.String(length=30), nullable=True),
        sa.ForeignKeyConstraint(['student_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        mysql_charset='utf8mb4',
        mysql_collate='utf8mb4_unicode_ci'
    )
    op.create_index('ix_mistakes_student_id', 'mistakes', ['student_id'], unique=False)

    # 25. recommendations
    op.create_table(
        'recommendations',
        sa.Column('id', sa.Integer(), nullable=False, auto_increment=True),
        sa.Column('student_id', sa.Integer(), nullable=False),
        sa.Column('category', sa.String(length=40), nullable=True),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('detail', sa.Text(), nullable=True),
        sa.Column('activity', sa.Text(), nullable=True),
        sa.Column('source', sa.String(length=40), nullable=True),
        sa.Column('is_done', sa.String(length=5), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['student_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        mysql_charset='utf8mb4',
        mysql_collate='utf8mb4_unicode_ci'
    )
    op.create_index('ix_recommendations_student_id', 'recommendations', ['student_id'], unique=False)

    # 26. learning_paths
    op.create_table(
        'learning_paths',
        sa.Column('id', sa.Integer(), nullable=False, auto_increment=True),
        sa.Column('student_id', sa.Integer(), nullable=False),
        sa.Column('weeks', sa.JSON(), nullable=True),
        sa.Column('based_on', sa.JSON(), nullable=True),
        sa.Column('version', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['student_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        mysql_charset='utf8mb4',
        mysql_collate='utf8mb4_unicode_ci'
    )
    op.create_index('ix_learning_paths_student_id', 'learning_paths', ['student_id'], unique=False)

    # 27. daily_challenges
    op.create_table(
        'daily_challenges',
        sa.Column('id', sa.Integer(), nullable=False, auto_increment=True),
        sa.Column('challenge_date', sa.DateTime(), nullable=True),
        sa.Column('skill', sa.String(length=30), nullable=False),
        sa.Column('topic', sa.String(length=300), nullable=False),
        sa.Column('duration_seconds', sa.Integer(), nullable=True),
        sa.Column('difficulty', sa.String(length=20), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        mysql_charset='utf8mb4',
        mysql_collate='utf8mb4_unicode_ci'
    )
    op.create_index('ix_daily_challenges_challenge_date', 'daily_challenges', ['challenge_date'], unique=False)

    # 28. challenge_completions
    op.create_table(
        'challenge_completions',
        sa.Column('id', sa.Integer(), nullable=False, auto_increment=True),
        sa.Column('challenge_id', sa.Integer(), nullable=False),
        sa.Column('student_id', sa.Integer(), nullable=False),
        sa.Column('score', sa.Float(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['challenge_id'], ['daily_challenges.id'], ),
        sa.ForeignKeyConstraint(['student_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        mysql_charset='utf8mb4',
        mysql_collate='utf8mb4_unicode_ci'
    )


def downgrade() -> None:
    tables = [
        'challenge_completions', 'daily_challenges', 'learning_paths', 'recommendations',
        'mistakes', 'presentations', 'interviews', 'conversations', 'practice_sessions',
        'coach_messages', 'vocabulary_items', 'recordings', 'discussion_analysis',
        'speaker_segments', 'discussion_transcripts', 'discussion_participants',
        'group_discussions', 'progress_history', 'reports', 'assignment_submissions',
        'assignments', 'assessment_answers', 'assessment_questions', 'assessments',
        'skill_scores', 'teacher_profiles', 'student_profiles', 'users'
    ]
    for table in tables:
        op.drop_table(table)
