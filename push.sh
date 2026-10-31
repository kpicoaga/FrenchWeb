#!/usr/bin/env bash
# push.sh — Stage, commit and push all changes in the FrenchWeb repo.
# Usage: ./push.sh "Commit message"
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_DIR"

# 1. Stage everything (respecting .gitignore)
git add -A

# 2. Commit if there is something to commit
if git diff --cached --quiet; then
  echo "Nothing to commit — working tree clean."
  exit 0
fi

MSG="${1:-Auto-update $(date '+%Y-%m-%d %H:%M')}"
git commit -m "$MSG"

# 3. Push to the active branch's upstream
git push

echo "Done: pushed '$MSG' to $(git rev-parse --abbrev-ref HEAD)."