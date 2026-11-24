#!/bin/bash
# Cloud sessions only: Node 24, the workspace's packages and each app's
# .env.local, so the dev servers, linters and tests run right away.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-.}"

# The repository needs Node >= 24; the image defaults to 22.
if [ -d /opt/node24/bin ]; then
  export PATH="/opt/node24/bin:$PATH"
  if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
    echo 'export PATH="/opt/node24/bin:$PATH"' >> "$CLAUDE_ENV_FILE"
  fi
fi

# Install only when the lockfile, a manifest or this script changed.
hashes=node_modules/.session-start.sha256
if ! sha256sum --check --status "$hashes" 2>/dev/null; then
  rm -f "$hashes"
  pnpm install --frozen-lockfile
  sha256sum .claude/hooks/session-start.sh package.json pnpm-lock.yaml \
    pnpm-workspace.yaml apps/*/package.json packages/*/package.json \
    > "$hashes" || rm -f "$hashes"
fi

# Every session: the environment's variables may have changed.
bash scripts/sync-env.sh
