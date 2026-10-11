#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$SCRIPT_DIR"

if ! command -v node >/dev/null 2>&1; then
    echo "Node.js is required. Install Node.js and try again." >&2
    exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
    echo "npm is required. Install Node.js with npm and try again." >&2
    exit 1
fi

if [ ! -f "node_modules/vite/bin/vite.js" ]; then
    echo "Installing project dependencies..."
    npm install
fi

echo "Building the production app..."
npm run build

PORT=${PORT:-3000}
echo "Starting the Vite server on port $PORT..."
exec npm run dev -- --port "$PORT"
