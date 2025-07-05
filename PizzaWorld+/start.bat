@echo off
REM PizzaWorld Secure Start Script for Windows
REM This script sets the required environment variables and starts both backend and frontend

REM Set environment variables (Demo credentials)
set DB_URL=jdbc:postgresql://aws-0-eu-central-1.pooler.supabase.com:6543/postgres?prepareThreshold=0
set DB_USERNAME=postgres.xmjywzcuaajlmghgpcev
set DB_PASSWORD=PizzaWorld.2025
set JWT_SECRET=supergeheimerSchluessel123456789012345

echo.
echo    *     *     *     *     *     *     *   
echo ==========================================
echo     PizzaWorld Dashboard Startup
echo ==========================================
echo    *     *     *     *     *     *     *   
echo.
echo [OK] Environment variables set securely
echo [>>] Starting Backend and Frontend...
echo.
echo    *     *     *     *     *     *     *   

REM Navigate to frontend directory and run both backend and frontend
cd frontend
npm run start:all 