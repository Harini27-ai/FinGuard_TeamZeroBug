import sys
import os

# Add backend directory to python path
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.abspath(os.path.join(current_dir, "..", "backend"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Set database path to /tmp on serverless environments if using SQLite
if "VERCEL" in os.environ and not os.environ.get("DATABASE_URL"):
    os.environ["DATABASE_URL"] = "sqlite:////tmp/finguard.db"

from app.main import app

# Ensure database is initialized in serverless environment
from app.db import init_db
try:
    init_db()
except Exception:
    pass
