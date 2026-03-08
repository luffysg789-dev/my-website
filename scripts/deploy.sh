#!/usr/bin/env bash
set -euo pipefail

# One-command deploy for claw800 on Linux server:
# - pulls latest code
# - installs deps
# - reloads pm2
#
# Assumptions:
# - repo is already cloned on server
# - pm2 is installed globally
#
# Usage:
#   ./scripts/deploy.sh

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "[deploy] pwd: $ROOT_DIR"

if command -v git >/dev/null 2>&1; then
  echo "[deploy] git pull"
  git pull --ff-only
fi

if command -v npm >/dev/null 2>&1; then
  if [[ -f package-lock.json ]]; then
    echo "[deploy] npm ci"
    npm ci --omit=dev
  else
    echo "[deploy] npm install"
    npm install --omit=dev
  fi
fi

if ! command -v pm2 >/dev/null 2>&1; then
  echo "[deploy] ERROR: pm2 not found"
  exit 1
fi

echo "[deploy] pm2 startOrReload"
pm2 startOrReload ecosystem.config.cjs
pm2 save

echo "[deploy] done"

