#!/usr/bin/env bash
# ---------------------------------------------------------------
# IronLog deploy helper
#
# Usage:
#   ./deploy.sh                 install + test + build + deploy to PRODUCTION
#   ./deploy.sh --preview       deploy a preview URL instead (private, throwaway)
#   ./deploy.sh --skip-tests    skip the test suite (faster, less safe)
#   ./deploy.sh --skip-install  skip "npm install" (faster when nothing changed)
#   ./deploy.sh --help          show this help
#
# Exits non-zero at the first failing step (set -e).
# Designed to be re-runnable: idempotent install, no cleanup of .vercel/.
# ---------------------------------------------------------------

set -euo pipefail

cd "$(dirname "$0")"

PROD=true
RUN_TESTS=true
RUN_INSTALL=true
show_help() {
  cat <<'EOF'
IronLog deploy helper

Usage:
  ./deploy.sh                 install + test + build + deploy to PRODUCTION
  ./deploy.sh --preview       deploy a preview URL instead (private, throwaway)
  ./deploy.sh --skip-tests    skip the test suite (faster, less safe)
  ./deploy.sh --skip-install  skip "npm install" (faster when nothing changed)
  ./deploy.sh --help          show this help
EOF
}
for arg in "$@"; do
  case "$arg" in
    --preview)      PROD=false ;;
    --skip-tests)   RUN_TESTS=false ;;
    --skip-install) RUN_INSTALL=false ;;
    -h|--help)      show_help; exit 0 ;;
    *) echo "Unknown flag: $arg (try --help)" >&2; exit 1 ;;
  esac
done

# Pretty step header.
step() { printf "\n\033[1;36m→ %s\033[0m\n" "$*"; }
ok()   { printf "\033[1;32m✓ %s\033[0m\n"   "$*"; }

# Sanity: we're in a project folder.
if [[ ! -f package.json ]]; then
  echo "Error: no package.json here. Run from project root." >&2
  exit 1
fi

# Sanity: vercel CLI is on PATH.
if ! command -v vercel >/dev/null 2>&1; then
  cat >&2 <<'EOF'
Error: 'vercel' CLI not found.
Install it once with:   npm install -g vercel
Then log in once with:  vercel login
EOF
  exit 1
fi

# 1) Install. npm install is safe to re-run; it just verifies the tree
# (~3-5s) when nothing changed. Skip with --skip-install if you're sure.
if $RUN_INSTALL; then
  step "Installing dependencies..."
  npm install --silent
else
  echo "(skipping install)"
fi

# 2) Build. Has to come before tests because the bundle/runtime tests
# read from dist/.
step "Building production bundle..."
npm run build

# 3) Tests. Catches obvious regressions before they reach production.
if $RUN_TESTS; then
  step "Running tests..."
  npm test
else
  echo "(skipping tests — risky)"
fi

# 4) Deploy. The .vercel/ folder must already exist (it does after your
# first run of `vercel`). If you ever lose it, just run `vercel link`
# once before re-running this script.
if $PROD; then
  step "Deploying to production..."
  vercel --prod
else
  step "Deploying a preview..."
  vercel
fi

ok "Done."
