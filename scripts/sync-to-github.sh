#!/usr/bin/env bash
# Mirror this working tree into the GitHub repository as a commit by Aman.
# Usage: scripts/sync-to-github.sh "Commit subject" ["Body paragraph"]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MIRROR="${MIRROR_DIR:-$ROOT/repos/target}"
REMOTE_URL="${GITHUB_REMOTE_URL:-https://github.replit.internal/aman161upadhyay/Calamities-Prediction-Tracking-Alert-System-.git}"
SUBJECT="${1:?commit subject required}"
BODY="${2:-}"

if [ ! -d "$MIRROR/.git" ]; then
  mkdir -p "$(dirname "$MIRROR")"
  git clone -q "$REMOTE_URL" "$MIRROR"
fi
cd "$MIRROR"
git config user.name "Aman"
git config user.email "aman161upadhyay@users.noreply.github.com"
git config commit.gpgsign false
git fetch -q origin main && git reset -q --hard origin/main

# copy the tree (rsync is not guaranteed on the host, so use tar with excludes)
EXCLUDES=(.git repos node_modules .venv __pycache__ .pytest_cache .mypy_cache frontend/dist .cache .upm .config .local attached_assets .env '.env.*' ml/data/raw '*.parquet' '*.joblib' '*.safetensors' '*.bin' .replit replit.nix .breakpoints generated-icon.png .agents tmp '*.log')
TAR_EX=()
for e in "${EXCLUDES[@]}"; do TAR_EX+=(--exclude="$e"); done
find "$MIRROR" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
tar -C "$ROOT" "${TAR_EX[@]}" -cf - . | tar -C "$MIRROR" -xf -

# refuse to commit anything that looks like a credential
if grep -rnEI --exclude-dir=.git --exclude-dir=reference \
     '(AKIA[0-9A-Z]{16}|AAAAAAAAAAAAAAAAAAAAA[A-Za-z0-9%]{20,}|sk-[A-Za-z0-9]{20,}|re_[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{30,}|postgres(ql)?://[^ ]+:[^ ]+@)' . ; then
  echo "secret-like string found; refusing to commit" >&2
  exit 1
fi

git add -A
if git diff --cached --quiet; then
  echo "mirror: nothing to commit"
  exit 0
fi
if [ -n "$BODY" ]; then
  git commit -q -m "$SUBJECT" -m "$BODY"
else
  git commit -q -m "$SUBJECT"
fi
git push -q origin main
echo "mirror: pushed $(git rev-parse --short HEAD) $SUBJECT"
