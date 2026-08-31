import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api.routes import api_router
from app.core.config import PROJECT_DIR, settings
from app.database.db import init_db
from app.websocket.discussion import router as ws_router

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="LSRW Communication AI - Practice & Assessment Platform",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.FRONTEND_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/api/health")
def health():
    return {"status": "ok", "app": settings.APP_NAME}


@app.get("/api/providers")
def providers():
    from app.ai.base import get_provider_info

    return get_provider_info()


app.include_router(api_router)
app.include_router(ws_router)

# Serve uploaded audio / recordings privately (only via authenticated endpoints
# in production; here the storage dir is mounted read-only-ish for demo media).
app.mount("/static", StaticFiles(directory=str(settings.STORAGE_DIR)), name="static")

# Serve built frontend (SPA) if present
frontend_dist = Path(os.getenv("FRONTEND_DIST", str(PROJECT_DIR / "frontend" / "dist")))
if frontend_dist.exists():
    assets_dir = frontend_dist / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        target_file = frontend_dist / full_path
        if full_path and target_file.is_file():
            return FileResponse(target_file)
        index_file = frontend_dist / "index.html"
        if index_file.exists():
            return FileResponse(index_file)
        return {"error": "Frontend build index.html not found"}