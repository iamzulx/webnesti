#!/bin/sh
set -e

if [ "${SEED_ON_START:-true}" = "true" ]; then
  echo "[startup] Running seed..."
  npm run seed || echo "[startup] Seed failed or already applied"
fi

exec npm run start:prod
