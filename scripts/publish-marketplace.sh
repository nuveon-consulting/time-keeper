#!/usr/bin/env bash
# Publish the VS Code extension to the Marketplace using vsce.
# Docs: https://code.visualstudio.com/api/working-with-extensions/publishing-extension
#
# Credentials: repo-root `.vscode-publish` (gitignored). Use an Azure DevOps PAT with
# organization "All accessible organizations" and scope Marketplace → Manage.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EXT="$ROOT/packages/extension"
CONFIG="$ROOT/.vscode-publish"

cd "$EXT"

MANIFEST_PUBLISHER="$(node -p "require('./package.json').publisher")"
MANIFEST_NAME="$(node -p "require('./package.json').name")"
MANIFEST_VERSION="$(node -p "require('./package.json').version")"
MANIFEST_DISPLAY="$(node -p "require('./package.json').displayName || ''")"

if [[ -z "$MANIFEST_PUBLISHER" || -z "$MANIFEST_NAME" ]]; then
  echo "error: packages/extension/package.json must define publisher and name" >&2
  exit 1
fi

write_config() {
  local pub="$1"
  local pat="$2"
  CONFIG_PATH="$CONFIG" PUBLISHER_JSON="$pub" PAT_JSON="$pat" node -e "
const fs = require('fs');
const path = process.env.CONFIG_PATH;
const pub = process.env.PUBLISHER_JSON;
const pat = process.env.PAT_JSON;
const lines = [
  '# VS Code Marketplace credentials — do not commit (see .gitignore)',
  '# How to create a PAT:',
  '# https://code.visualstudio.com/api/working-with-extensions/publishing-extension',
  '# Organization: All accessible organizations; Scope: Marketplace (Manage)',
  '',
  'PUBLISHER=' + JSON.stringify(pub),
  'VSCE_PAT=' + JSON.stringify(pat),
];
fs.writeFileSync(path, lines.join('\\n') + '\\n', { encoding: 'utf8', mode: 0o600 });
"
  chmod 600 "$CONFIG"
  echo "Wrote ${CONFIG} (permissions 600)."
}

prompt_and_create_config() {
  echo ""
  echo "Extension (from packages/extension/package.json):"
  echo "  Publisher: ${MANIFEST_PUBLISHER}"
  echo "  Name:      ${MANIFEST_NAME}"
  echo "  Version:   ${MANIFEST_VERSION}"
  echo "  Display:   ${MANIFEST_DISPLAY}"
  echo ""
  echo "Creating ${CONFIG}"
  read -r -p "Publisher ID [${MANIFEST_PUBLISHER}]: " pub_in
  local pub="${pub_in:-$MANIFEST_PUBLISHER}"
  echo "Paste Azure DevOps Personal Access Token (input hidden):"
  read -r -s pat
  echo ""
  if [[ -z "${pat// }" ]]; then
    echo "error: PAT cannot be empty" >&2
    exit 1
  fi
  write_config "$pub" "$pat"
}

load_config() {
  # shellcheck disable=SC1090
  set -a
  # shellcheck source=/dev/null
  source "$CONFIG"
  set +a
}

if [[ ! -f "$CONFIG" ]]; then
  prompt_and_create_config
else
  load_config
  if [[ -z "${VSCE_PAT:-}" ]]; then
    echo "${CONFIG} exists but VSCE_PAT is empty; re-enter credentials."
    prompt_and_create_config
  fi
fi

load_config

if [[ -z "${VSCE_PAT:-}" ]]; then
  echo "error: VSCE_PAT is not set in ${CONFIG}" >&2
  exit 1
fi

if [[ "${PUBLISHER:-}" != "$MANIFEST_PUBLISHER" ]]; then
  echo "warning: .vscode-publish PUBLISHER=${PUBLISHER:-} differs from package.json publisher=${MANIFEST_PUBLISHER}; vsce uses package.json." >&2
fi

echo ""
echo "Installing dependencies..."
npm install

echo "Publishing ${MANIFEST_PUBLISHER}.${MANIFEST_NAME}@${MANIFEST_VERSION} (vsce runs vscode:prepublish → compile, then uploads)..."
npx vsce publish -p "$VSCE_PAT" "$@"

echo "Done."
