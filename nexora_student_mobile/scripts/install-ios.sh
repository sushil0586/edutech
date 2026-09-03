#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required but was not found in PATH."
  exit 1
fi

if ! command -v npx >/dev/null 2>&1; then
  echo "npx is required but was not found in PATH."
  exit 1
fi

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Created .env from .env.example"
fi

set -a
source .env
set +a

API_BASE_URL="${EXPO_PUBLIC_API_BASE_URL:-http://127.0.0.1:8000}"
API_TIMEOUT_MS="${EXPO_PUBLIC_API_REQUEST_TIMEOUT_MS:-20000}"
HOST_IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)"
if [[ -n "$HOST_IP" ]]; then
  if [[ "$API_BASE_URL" == *"10.0.2.2"* ]]; then
    API_BASE_URL="${API_BASE_URL/10.0.2.2/$HOST_IP}"
  fi
fi

echo "Installing dependencies for iPhone simulator..."
npm install

echo "Launching iOS build with API base URL: ${API_BASE_URL}"
EXPO_PUBLIC_API_BASE_URL="$API_BASE_URL" \
EXPO_PUBLIC_API_REQUEST_TIMEOUT_MS="$API_TIMEOUT_MS" \
npx expo run:ios
