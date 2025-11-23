#!/bin/bash

echo "======================================"
echo " InterviewGuru — Bootstrap Installer  "
echo "======================================"

set -e

# 1) Check Node
echo ""
echo " Checking Node.js..."
if ! command -v node >/dev/null 2>&1; then
  echo " Node.js not found. Install Node 18+ and retry."
  exit 1
fi
echo "✔ Node found: $(node -v)"

# 2) Check Ollama
echo ""
echo " Checking Ollama..."
if ! command -v ollama >/dev/null 2>&1; then
  echo " Ollama is not installed."
  echo " Install from https://ollama.com/download"
  exit 1
fi
echo "✔ Ollama found"

# 3) Check model
echo ""
echo " Checking if llama3.1 model is installed..."
if ! ollama list | grep -q "llama3:8b"; then
  echo "⬇ Pulling llama3.1 model..."
  ollama pull llama3.1
else
  echo "✔ llama3.1 already installed"
fi

# 4) Install server
echo ""
echo " Installing server dependencies..."
cd server
npm install

echo " Starting server..."
nohup node index.js > server.log 2>&1 &
SERVER_PID=$!
echo "✔ Backend running on port 4000 (PID: $SERVER_PID)"
cd ..

# 5) Install client
echo ""
echo " Installing client dependencies..."
cd client
npm install

echo " Starting client..."
npm run dev
