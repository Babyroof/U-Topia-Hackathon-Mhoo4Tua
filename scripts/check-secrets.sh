#!/usr/bin/env bash
# Fails if a private key, API secret or .env file is tracked by git.
# Run locally: bash scripts/check-secrets.sh
set -uo pipefail

fail=0

tracked_env=$(git ls-files | grep -E '(^|/)\.env(\.local|\.production|\.development)?$' || true)
if [ -n "$tracked_env" ]; then
  echo "❌ .env files are tracked by git (remove with: git rm --cached <file>):"
  echo "$tracked_env"
  fail=1
fi

patterns=(
  'PRIVATE_KEY[[:space:]]*[=:][[:space:]]*["'"'"']?(0x)?[0-9a-fA-F]{64}'
  '-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----'
  'sk_[0-9a-f]{40,}'
  'sk-(proj-|ant-)?[A-Za-z0-9_-]{32,}'
  'AIza[0-9A-Za-z_-]{35}'
)

for p in "${patterns[@]}"; do
  hits=$(git grep -nIE -e "$p" -- . ':!yarn.lock' ':!.yarn/**' ':!scripts/check-secrets.sh' ':!**/node_modules/**' || true)
  if [ -n "$hits" ]; then
    echo "❌ Possible secret matching /$p/:"
    echo "$hits" | cut -c1-160
    fail=1
  fi
done

if [ "$fail" -eq 0 ]; then
  echo "✅ No secrets found in tracked files"
fi
exit "$fail"
