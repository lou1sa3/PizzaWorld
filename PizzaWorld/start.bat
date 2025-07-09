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
set GOOGLE_AI_ENABLED=false
REM keep key but disabling

REM OpenRouter Multi-Model Configuration
set OPENROUTER_API_KEY=a
set OPENROUTER_ENABLED=true

REM Primary Model
set OPENROUTER_MODEL_1=openrouter/cypher-alpha:free
set OPENROUTER_MAX_TOKENS_1=5000

REM Fallback Models
set OPENROUTER_MODEL_2=google/gemini-2.0-flash-exp:free
set OPENROUTER_MAX_TOKENS_2=8000

set OPENROUTER_MODEL_3=deepseek/deepseek-chat-v3-0324:free
set OPENROUTER_MAX_TOKENS_3=4000

set OPENROUTER_MODEL_4=qwen/qwq-32b:free
set OPENROUTER_MAX_TOKENS_4=6000

set OPENROUTER_MODEL_5=nvidia/llama-3.3-nemotron-super-49b-v1:free
set OPENROUTER_MAX_TOKENS_5=4000

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