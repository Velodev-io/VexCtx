#!/usr/bin/env bash
# ============================================================
# VexCTX — Updater Signing Key Generator
# Run this ONCE before your first release.
# Store the output keys as GitHub Secrets.
# ============================================================

set -euo pipefail

DESKTOP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../desktop" && pwd)"
KEY_DIR="$HOME/.tauri"
KEY_FILE="$KEY_DIR/vexctx.key"

echo ""
echo "══════════════════════════════════════════════════"
echo "  VexCTX Updater Key Generator"
echo "══════════════════════════════════════════════════"
echo ""

if [ -f "$KEY_FILE" ]; then
  echo "⚠️  Key already exists at: $KEY_FILE"
  read -p "Regenerate? This invalidates existing update signatures. (y/N): " confirm
  if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
    echo "Aborted. Using existing key."
    exit 0
  fi
fi

mkdir -p "$KEY_DIR"

echo "Generating new signing keypair..."
cd "$DESKTOP_DIR"

# Generate keypair using Tauri CLI (force overwrite if it already exists)
FORCE_FLAG=""
if [ -f "$KEY_FILE" ]; then
  FORCE_FLAG="--force"
fi
npm run tauri signer generate -- -w "$KEY_FILE" $FORCE_FLAG 2>&1

echo ""
echo "══════════════════════════════════════════════════"
echo "  ✅ Keys generated successfully!"
echo "══════════════════════════════════════════════════"
echo ""
echo "📁 Private key: $KEY_FILE"
echo "📁 Public key:  ${KEY_FILE}.pub"
echo ""
echo "══════════════════════════════════════════════════"
echo "  NEXT STEPS — Store these as GitHub Secrets:"
echo "══════════════════════════════════════════════════"
echo ""
echo "1. Go to: GitHub → Your Repo → Settings → Secrets and variables → Actions"
echo ""
echo "2. Add secret: TAURI_SIGNING_PRIVATE_KEY"
echo "   Value (copy everything between the lines):"
echo "   ─────────────────────────────────────────"
cat "$KEY_FILE"
echo "   ─────────────────────────────────────────"
echo ""
echo "3. Add secret: TAURI_SIGNING_PRIVATE_KEY_PASSWORD"
echo "   Value: (the password you chose above, or leave blank if none)"
echo ""
echo "4. Copy the PUBLIC KEY and paste it into tauri.conf.json:"
echo "   Field: plugins.updater.pubkey"
echo "   Value:"
echo "   ─────────────────────────────────────────"
cat "${KEY_FILE}.pub"
echo "   ─────────────────────────────────────────"
echo ""
echo "5. Upload latest.json to https://vexctx.io/latest.json"
echo "   (The CI workflow will keep it up to date after each release)"
echo ""
echo "══════════════════════════════════════════════════"
echo "  Once done, push a v* tag to trigger a release:"
echo "  git tag v1.0.1 && git push origin v1.0.1"
echo "══════════════════════════════════════════════════"
echo ""
