@echo off
cls
echo ======================================
echo  InterviewGuru — Bootstrap Installer
echo ======================================

REM ---------------------------
REM 1) Check Node
REM ---------------------------
echo.
echo Checking Node.js...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Node.js not found. Install Node 18+ and retry.
    pause
    exit /b
)
for /f "delims=" %%v in ('node -v') do set NODEV=%%v
echo  Node found: %NODEV%

REM ---------------------------
REM 2) Check Ollama
REM ---------------------------
echo.
echo Checking Ollama...
where ollama >nul 2>nul
if %errorlevel% neq 0 (
    echo Ollama is not installed.
    echo Install from https://ollama.com/download
    pause
    exit /b
)
echo  Ollama found

REM ---------------------------
REM 3) Check Model llama3.1
REM ---------------------------
echo.
echo Checking if llama3.1 model is installed...
ollama list | findstr /i "llama3:8b" >nul 2>nul
if %errorlevel% neq 0 (
    echo ⬇ Pulling llama3.1...
    ollama pull llama3.1
) else (
    echo  llama3.1 already installed
)

REM ---------------------------
REM 4) Install server
REM ---------------------------
echo.
echo Installing server dependencies...
cd server
call npm install

echo Starting server...
start "" /B cmd /c "node index.js > server.log 2>&1"
echo  Backend running on port 4000
cd ..

REM ---------------------------
REM 5) Install client
REM ---------------------------
echo.
echo Installing client dependencies...
cd client
call npm install

echo.
echo Starting client...
call npm run dev

echo.
pause
