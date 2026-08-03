#!/bin/bash
# Deploy ShaadiDesk to GitHub Pages.
# Usage:  ./deploy.sh            → commits with a timestamp message
#         ./deploy.sh "message"  → commits with your message
set -e
cd "$(dirname "$0")"

if [ -z "$(git status --porcelain)" ]; then
  echo "Nothing to deploy — no changes since last push."
  exit 0
fi

echo "Changes to deploy:"
git status --short
echo

MSG="${1:-Update site $(date '+%d %b %Y, %H:%M')}"
git add -A
git commit -m "$MSG"
git push

echo
echo "Pushed. GitHub Pages rebuilds in ~1 minute:"
echo "  https://catchvivek94.github.io/wedding/"
echo "Hard-refresh with Cmd+Shift+R to bypass the CSS cache."
