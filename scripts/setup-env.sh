#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/.env"

if [[ -f "$ENV_FILE" ]] && grep -q 'shpat_' "$ENV_FILE" 2>/dev/null && ! grep -q 'shpat_xxxxxxxx' "$ENV_FILE"; then
  echo ".env already configured."
  exit 0
fi

cp "$ROOT/.env.example" "$ENV_FILE"

echo ""
echo "Oh Norman — Shopify preview credentials"
echo "========================================"
echo ""
echo "1. Open: https://admin.shopify.com/store/oh-norman/settings/apps/development"
echo "2. Create app 'Cursor Email Preview' with read_orders scope only"
echo "3. Install app → Reveal token once (starts with shpat_)"
echo ""
read -rsp "Paste Admin API token: " TOKEN
echo ""

if [[ -z "${TOKEN// /}" ]]; then
  echo "No token entered. Edit $ENV_FILE manually."
  exit 1
fi

cat > "$ENV_FILE" <<EOF
SHOPIFY_STORE=oh-norman.myshopify.com
SHOPIFY_ADMIN_TOKEN=${TOKEN}
EOF

chmod 600 "$ENV_FILE"
echo "Saved $ENV_FILE"
echo "Run: ruby scripts/fetch-order-preview.rb 87897"
