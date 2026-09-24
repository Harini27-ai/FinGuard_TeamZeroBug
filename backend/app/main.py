import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from .config import settings
from .db import init_db
from .api.routes import router
from .services.graph_service import GraphService

app = FastAPI(
    title="FinGuard — Financial Immune System & Real-Time Defense API",
    version="2.0.0",
    description="Production-grade financial health analytics, predictive stress modeling, early warnings, and real-time fraud scoring."
)

origins = [x.strip() for x in settings.cors_origins.split(",") if x.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

graph_service = GraphService(settings.neo4j_uri, settings.neo4j_user, settings.neo4j_password)

@app.on_event("startup")
def startup():
    init_db()

@app.on_event("shutdown")
def shutdown():
    graph_service.close()

# 1. API routes take precedence
app.include_router(router)

# 2. Production static files mount (Single-binary / Unified deployment)
frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../frontend/dist"))

if os.path.exists(frontend_dist):
    assets_dir = os.path.join(frontend_dist, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        # Allow /docs, /redoc, /openapi.json to pass through
        if full_path in ["docs", "redoc", "openapi.json"] or full_path.startswith("api"):
            return None
        file_path = os.path.join(frontend_dist, full_path)
        if full_path and os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))
