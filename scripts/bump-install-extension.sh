#!/usr/bin/env bash
set -euo pipefail

# Bump extension patch version, build VSIX, install into Cursor.
# Run from anywhere: npm run bump-install-extension (repo root).

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "Bumping patch version (workspace nuveon-time-keeper)..."
npm version patch -w nuveon-time-keeper --no-git-tag-version

VERSION="$(node -p "require('./packages/extension/package.json').version")"
VSIX="$ROOT/packages/extension/nuveon-time-keeper-${VERSION}.vsix"

echo "Packaging ${VERSION}..."
npm run package -w nuveon-time-keeper

if [[ ! -f "${VSIX}" ]]; then
  echo "error: expected VSIX at ${VSIX}" >&2
  exit 1
fi

CURSOR_BIN="${CURSOR_BIN:-cursor}"
if ! command -v "$CURSOR_BIN" >/dev/null 2>&1; then
  echo "error: '$CURSOR_BIN' not found on PATH (set CURSOR_BIN to the Cursor CLI)" >&2
  exit 1
fi

echo "Installing ${VSIX}..."
"${CURSOR_BIN}" --install-extension "${VSIX}"

echo "Done. Installed nuveon-time-keeper v${VERSION}."
