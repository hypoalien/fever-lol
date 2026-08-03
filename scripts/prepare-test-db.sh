#!/usr/bin/env bash
# Create the integration-test database if it is missing, then migrate it.
# Kept separate from the development database because the tests truncate.
set -euo pipefail

DB_NAME="${TEST_DB_NAME:-fever_lol_test}"
TEST_DATABASE_URL="${TEST_DATABASE_URL:-postgres://fever:fever@localhost:5433/${DB_NAME}}"

if ! docker exec fever-lol-postgres pg_isready -U fever -q 2>/dev/null; then
  echo "Postgres is not running. Start it with: bun run db:up" >&2
  exit 1
fi

docker exec fever-lol-postgres psql -U fever -d postgres -tAc \
  "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1 \
  || docker exec fever-lol-postgres createdb -U fever "${DB_NAME}"

DATABASE_URL="${TEST_DATABASE_URL}" bunx drizzle-kit migrate
