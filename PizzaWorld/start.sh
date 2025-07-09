#!/bin/bash

# PizzaWorld Secure Start Script for Mac/Linux
# This script sets the required environment variables and starts both backend and frontend

# Set JVM Memory Options to prevent OutOfMemoryError
export JAVA_OPTS="-Xms512m -Xmx2048m -XX:+UseG1GC -XX:+UseStringDeduplication -XX:MaxGCPauseMillis=200"

# Set environment variables (Demo credentials)
export DB_URL="jdbc:postgresql://aws-0-eu-central-1.pooler.supabase.com:6543/postgres?prepareThreshold=0"
export DB_USERNAME="postgres.xmjywzcuaajlmghgpcev"
export DB_PASSWORD="PizzaWorld.2025"
export JWT_SECRET="supergeheimerSchluessel123456789012345"
export GMAIL_APP_PASSWORD="obcs zapk yyqb wedb"
# Google AI Configuration for Local Testing
export GOOGLE_AI_ENABLED=false

# OpenRouter Multi-Model Configuration
export OPENROUTER_API_KEY="abc"
export OPENROUTER_ENABLED=true

# Primary Model
export OPENROUTER_MODEL_1="openrouter/cypher-alpha:free"
export OPENROUTER_MAX_TOKENS_1=5000

# Fallback Models
export OPENROUTER_MODEL_2="google/gemini-2.0-flash-exp:free"
export OPENROUTER_MAX_TOKENS_2=8000

export OPENROUTER_MODEL_3="deepseek/deepseek-chat-v3-0324:free"
export OPENROUTER_MAX_TOKENS_3=4000

export OPENROUTER_MODEL_4="qwen/qwq-32b:free"
export OPENROUTER_MAX_TOKENS_4=6000

export OPENROUTER_MODEL_5="nvidia/llama-3.3-nemotron-super-49b-v1:free"
export OPENROUTER_MAX_TOKENS_5=4000

echo ""
echo "   *     *     *     *     *     *     *   "
echo "=========================================="
echo "    PizzaWorld Dashboard Startup"
echo "=========================================="
echo "   *     *     *     *     *     *     *   "
echo ""
echo "[OK] Environment variables set securely"
echo "[OK] JVM Memory configured: $JAVA_OPTS"
echo "[>>] Starting Backend and Frontend..."
echo ""
echo "   *     *     *     *     *     *     *   "

# Navigate to frontend directory and run both backend and frontend
cd frontend
npm run start:all 