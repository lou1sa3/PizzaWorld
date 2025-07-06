@echo off
REM PizzaWorld Secure Start Script for Windows
REM This script sets the required environment variables and starts both backend and frontend

REM Set JVM Memory Options to prevent OutOfMemoryError
set JAVA_OPTS=-Xms512m -Xmx2048m -XX:+UseG1GC -XX:+UseStringDeduplication -XX:MaxGCPauseMillis=200

REM Set environment variables (Demo credentials)
set DB_URL=jdbc:postgresql://aws-0-eu-central-1.pooler.supabase.com:6543/postgres?prepareThreshold=0
set DB_USERNAME=postgres.xmjywzcuaajlmghgpcev
set DB_PASSWORD=PizzaWorld.2025
set JWT_SECRET=supergeheimerSchluessel123456789012345
set GMAIL_APP_PASSWORD=obcs zapk yyqb wedb
REM Google AI Configuration for Local Testing
set GOOGLE_AI_API_KEY=xyz
set GOOGLE_AI_MODEL=gemma-3n-e2b-it

echo.
echo    *     *     *     *     *     *     *   
echo ==========================================
echo     PizzaWorld Dashboard Startup
echo ==========================================
echo    *     *     *     *     *     *     *   
echo.
echo [OK] Environment variables set securely
echo [OK] JVM Memory configured: %JAVA_OPTS%
echo [>>] Starting Backend and Frontend...
echo.
echo    *     *     *     *     *     *     *   

REM Navigate to frontend directory and run both backend and frontend
cd frontend
npm run start:all 