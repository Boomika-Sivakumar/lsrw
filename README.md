# LSRW Communication AI – Practice & Assessment Platform

A full-stack AI platform for **Listening, Speaking, Reading, and Writing (LSRW)** communication practice and assessment. Students take adaptive assessments, practice each skill with instant AI feedback, participate in real-time group discussions (with AI moderation + speaker-level analytics), and complete AI-generated assignments. Teachers get a console for monitoring, class analytics, and report exports.

## Tech Stack

| Layer    | Technology |
| -------- | ---------- |
| Backend  | Python 3.8+, FastAPI, SQLAlchemy 2.0, SQLite (dev) / MySQL 8.0+ (prod via Docker) |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Recharts |
| Real-time| WebSockets (discussion rooms, presence, segments, moderation) |
| AI       | Provider abstraction: `development` (mock, offline) or `openai_compatible` (OpenAI-compatible APIs) for analysis, content generation, moderation, TTS/STT hooks |

## Project Layout

```
project/
├── backend/
│   ├── alembic/           # Alembic database migrations (MySQL schema)
│   ├── app/
│   │   ├── ai/            # providers, speech service, analysis, content, assessment logic
│   │   ├── api/           # FastAPI routers (auth, students, assessments, practice, discussions, teachers, ai)
│   │   ├── auth/          # JWT + role guards
│   │   ├── core/          # config (.env), security (hashing, IDs, codes)
│   │   ├── database/      # SQLAlchemy engine/session
│   │   ├── models/        # User, StudentProfile, TeacherProfile, Assessment, Practice, Discussion, Assignment
│   │   ├── schemas/       # Pydantic request/response models
│   │   ├── services/      # business logic (dashboard, scoring, discussion, assignment, report, speaker-id)
│   │   ├── websocket/     # connection manager + discussion socket
│   │   └── data/banks.py  # static assessment & practice content
│   ├── tests/             # pytest API suite (mock AI, SQLite/MySQL)
│   ├── seed.py            # demo data (1 teacher + 5 students)
│   ├── migrate_pg_to_mysql.py # PostgreSQL to MySQL data migration tool
│   ├── Dockerfile
│   └── requirements*.txt
├── frontend/
│   └── src/
│       ├── pages/         # auth, student, teacher views
│       ├── components/    # ui, charts, results, webrtc (DiscussionRoom)
│       ├── hooks/         # useAuth, useToast, useDiscussionSocket
│       ├── services/      # axios client, auth storage
│       ├── audio/         # recorder (MediaRecorder + Web Speech fallback), TTS
│       └── __tests__/     # vitest unit tests
├── docker-compose.yml     # MySQL 8.0 + backend (production-ish)
└── .env.example
```

## Prerequisites

- **Python 3.8+** and **Node 18+** / npm
- Windows note: if `node`/`npm` are not on your PATH, use the full path, e.g. `export PATH="/c/Program Files/nodejs:$PATH"`.

## Backend Setup

```bash
cd backend
python -m venv ../.venv
../.venv/Scripts/python -m pip install -r requirements.txt -r requirements-dev.txt
../.venv/Scripts/python -m uvicorn app.main:app --reload --port 8000
```

- API docs: http://localhost:8000/docs
- Health check: http://localhost:8000/api/health
- SQLite DB is created automatically at `backend/dev.db` (set `DATABASE_URL` or `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` to use MySQL).
- By default the **development (mock) AI provider** is used — no network or API keys required. All features work offline.

### Database Migrations & Seeding (MySQL)

Run Alembic migrations to build the complete MySQL database schema:

```bash
cd backend
../.venv/Scripts/python -m alembic upgrade head
```

Seed demo data (optional):

```bash
cd backend
../.venv/Scripts/python seed.py
```

Credentials:

| Role    | Username  | Password   |
| ------- | --------- | ---------- |
| Teacher | teacher1  | teacher123 |
| Student | arjun     | arjun      |
| Student | priya     | priya      |
| Student | rahul     | rahul      |
| Student | sneha     | sneha      |
| Student | vikram    | vikram     |

### Migrating Existing PostgreSQL Data to MySQL

If you have an existing PostgreSQL database:

```bash
cd backend
../.venv/Scripts/python migrate_pg_to_mysql.py \
  --pg-url "postgresql+psycopg2://lsrw:lsrw@localhost:5432/lsrw" \
  --mysql-url "mysql+pymysql://root:password@localhost:3306/lsrw_ai"
```

### Run backend tests

```bash
cd backend
../.venv/Scripts/python -m pytest tests -v
```

## Frontend Setup

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173  (proxies /api, /ws to :8000)
```

Other commands: `npm run build` (type-check + production build), `npm test` (vitest).

## Configuring OpenRouter (Free AI Models)

To use live AI models from **OpenRouter** (including **100% free models** like Llama 3.2, Gemma 2, DeepSeek, Qwen):

1. Get a free API key from [OpenRouter.ai](https://openrouter.ai/keys).
2. Set the following in your `.env` file:

```env
AI_PROVIDER=openrouter
AI_API_KEY=sk-or-v1-your-openrouter-key
AI_BASE_URL=https://openrouter.ai/api/v1
AI_MODEL=meta-llama/llama-3.2-1b-instruct:free
```

Popular Free OpenRouter models:
- `meta-llama/llama-3.2-1b-instruct:free`
- `google/gemma-2-9b-it:free`
- `deepseek/deepseek-r1:free`
- `qwen/qwen-2.5-7b-instruct:free`

## Configuring OpenAI or Custom LLM Endpoint

```env
AI_PROVIDER=openai_compatible
AI_API_KEY=sk-...
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini
```

With `AI_PROVIDER=development`, all AI outputs use offline development mocks. Setting `AI_PROVIDER=openrouter` or `openai_compatible` activates live AI model processing for AI Conversation, AI Coach, Assessment scoring, and feedback.


## Key Features

- **Adaptive LSRW assessment** — listening, reading, writing, speaking; auto-scored with level detection, strengths/weaknesses, learning path.
- **Skill practice** — listening (TTS narration), reading (speed + comprehension), writing (grammar correction), speaking (transcript analysis, fluency, fillers, pronunciation hints).
- **AI conversation, mock interview, presentations** — interactive, scored sessions.
- **Real-time group discussions** — WebSocket rooms, AI moderator messages, client-labeled speaker identification, per-participant + group analytics, leaderboards, and a full report after the session.
- **Assignments** — teacher creates or AI-generates; students submit; auto-graded with feedback.
- **Teacher console** — class dashboard, per-student detail/reports, class analytics, CSV/HTML exports.
- **Progress tracking** — before/after comparisons, skill history charts, daily activity, personalized recommendations.

## Speaker Identification Note

The platform ships a `SpeakerIdentificationService` that labels segments using the speaker each client claims (its own user), plus a basic overlap/interruption heuristic. It is **not** a true multi-microphone diarization system; production deployments should substitute a diarization backend (e.g., PyAnnote) behind the same service interface.

## Docker (MySQL 8.0+)

```bash
docker compose up --build
```

Backend runs on :8000 with MySQL on :3306. Frontend is built for production and served by Vite preview or any static host; the dev server with proxies is the simplest local setup.