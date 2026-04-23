#!/usr/bin/env bash
set -euo pipefail

# Bump extension patch version, build VSIX, install into Cursor.
# Run from anywhere: npm run bump-install-extension (repo root).

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EXT="$ROOT/packages/extension"
cd "$EXT"

echo "Bumping patch version (nuveon-time-keeper)..."
npm version patch --no-git-tag-version

VERSION="$(node -p "require('./package.json').version")"
VSIX="$EXT/nuveon-time-keeper-${VERSION}.vsix"

echo "Installing extension dependencies (local node_modules; avoids vsce workspace symlink issues)..."
npm install

echo "Packaging ${VERSION}..."
npm run package

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
