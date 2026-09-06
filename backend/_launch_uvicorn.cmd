@echo off
cd /d "%~dp0"
call .\.venv\Scripts\activate.bat
start /b "" .\.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000 --log-level info >uvicorn.out 2>uvicorn.err
echo Started uvicorn with PID file:
echo %errorlevel%
