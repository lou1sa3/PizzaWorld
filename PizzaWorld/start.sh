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
export GOOGLE_AI_API_KEY="noapikeys"
export GOOGLE_AI_MODEL="gemma-3n-e4b-it"

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