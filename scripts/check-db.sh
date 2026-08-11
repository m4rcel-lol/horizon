#!/bin/sh
# Inspect whether the Postgres volume still has data (run on the host).
set -e
echo "=== compose volumes ==="
docker volume ls | grep -i horizon || true
echo "=== postgres container ==="
docker compose ps postgres 2>/dev/null || docker compose ps
echo "=== table counts (if postgres is up) ==="
docker compose exec -T postgres psql -U "${POSTGRES_USER:-horizon}" -d "${POSTGRES_DB:-horizon}" -c "
SELECT
  (SELECT count(*) FROM \"User\") AS users,
  (SELECT count(*) FROM \"Post\") AS posts,
  (SELECT count(*) FROM \"UserSession\") AS sessions,
  (SELECT count(*) FROM \"Community\") AS communities;
" 2>&1 || echo "Could not query — is postgres running?"
