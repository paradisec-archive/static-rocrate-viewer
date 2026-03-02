#!/usr/bin/env bash
set -euo pipefail

REPO="paradisec-archive/static-rocrate-viewer"
TARBALL="static-rocrate-viewer.tar.gz"

echo "Static RO-Crate Viewer — Installer"
echo "===================================="

# Check prerequisites
for cmd in curl tar node; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "Error: $cmd is required but not found." >&2
    exit 1
  fi
done

# Check Node.js version (need v20+)
NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  echo "Error: Node.js v20+ is required (found v$NODE_VERSION)." >&2
  exit 1
fi

# Download latest release
echo "Downloading latest release..."
DOWNLOAD_URL="https://github.com/${REPO}/releases/latest/download/${TARBALL}"
curl -fsSL -o "$TARBALL" "$DOWNLOAD_URL"

# Extract
echo "Extracting..."
tar -xzf "$TARBALL"
rm "$TARBALL"

# Check for data directory
if [ ! -d "./data" ]; then
  echo ""
  echo "Warning: No ./data directory found."
  echo "Place your RO-Crate data in ./data/{CollectionId}/{ItemId}/pdsc_admin/ro-crate-metadata.json"
  echo ""
  exit 0
fi

# Generate catalog
echo "Generating catalog from ./data..."
node generate-catalog.js --data-dir ./data --output-dir .

echo ""
echo "Done! You can:"
echo "  - Open directly: open index.html"
echo "  - Serve over HTTP: python3 -m http.server 8080"
echo ""

# Open in browser
open_browser() {
  local url="$1"
  if command -v open &>/dev/null; then
    open "$url"
  elif command -v xdg-open &>/dev/null; then
    xdg-open "$url"
  else
    echo "Open $url in your browser."
  fi
}

open_browser "$(pwd)/index.html"
