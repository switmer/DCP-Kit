#!/usr/bin/env bash
# Serve the experiments dashboard locally.
# Usage: ./experiments/serve-dashboard.sh [port]
# Default port: 8000
set -e
PORT="${1:-8000}"
DIR="$(cd "$(dirname "$0")" && pwd)"
echo "Serving $DIR on http://localhost:$PORT"
echo "Open: http://localhost:$PORT/dashboard.html"
cd "$DIR"
python3 -m http.server "$PORT"
