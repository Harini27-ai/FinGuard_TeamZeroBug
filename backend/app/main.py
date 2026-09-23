from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .db import init_db
from .api.routes import router
from .services.graph_service import GraphService

app = FastAPI(title="FinGuard AI Fraud Prevention API", version="1.0.0")
origins=[x.strip() for x in settings.cors_origins.split(",") if x.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins or ["*"],
                   allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
graph_service=GraphService(settings.neo4j_uri,settings.neo4j_user,settings.neo4j_password)

@app.on_event("startup")
def startup():
    init_db()

@app.on_event("shutdown")
def shutdown():
    graph_service.close()

app.include_router(router)
