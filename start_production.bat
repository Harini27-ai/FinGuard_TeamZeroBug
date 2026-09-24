@echo off
title FinGuard - Financial Immune System
color 0A

echo ========================================================
echo    FinGuard - Financial Immune System ^& Defense OS
echo    Production Deployment Runner
echo ========================================================
echo.

cd /d "%~dp0backend"
echo [1/3] Activating Python Virtual Environment...
call .\.venv\Scripts\activate.bat

echo [2/3] Checking Database and Seeding Demo Data...
python seed.py

echo [3/3] Starting Unified Production Server on Port 8000...
echo.
echo Application will be available at:
echo   - Web App: http://localhost:8000
echo   - Swagger API Docs: http://localhost:8000/docs
echo.
echo Press Ctrl+C to stop the server.
echo.

uvicorn app.main:app --host 0.0.0.0 --port 8000
pause
