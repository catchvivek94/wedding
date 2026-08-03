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

# cache-bust: stamp a build id from the asset hashes onto every asset URL,
# so GitHub Pages can never serve you a stale script or stylesheet.
python3 - <<'PYEOF'
import glob, re, hashlib
h = hashlib.sha1()
for f in sorted(glob.glob("assets/**/*.*", recursive=True)):
    if f.endswith((".js", ".css")):
        h.update(open(f, "rb").read())
build = h.hexdigest()[:8]
for f in glob.glob("*.html"):
    s = open(f, encoding="utf-8").read()
    n = re.sub(r'(assets/(?:css|js)/[\w.-]+\.(?:css|js))(\?v=[a-f0-9]+)?', rf'\1?v={build}', s)
    if n != s:
        open(f, "w", encoding="utf-8").write(n)
print("build id:", build)
PYEOF

MSG="${1:-Update site $(date '+%d %b %Y, %H:%M')}"
git add -A
git commit -m "$MSG"
git push

echo
echo "Pushed. GitHub Pages rebuilds in ~1 minute:"
echo "  https://catchvivek94.github.io/wedding/"
echo "Hard-refresh with Cmd+Shift+R to bypass the CSS cache."
