#!/usr/bin/env bash
# link-domain.sh — wire obrasdelpais.info to the existing here.now site
# once DNS is verified.
#
# Usage:
#   ./scripts/link-domain.sh                      # uses defaults below
#   ./scripts/link-domain.sh other.example.com    # custom domain
#
# Requires: ~/.herenow/credentials (created when you first authenticated).
set -euo pipefail

DOMAIN="${1:-obrasdelpais.info}"
SLUG="${2:-steady-glacier-drz3}"
KEY_FILE="${HOME}/.herenow/credentials"

if [ ! -f "$KEY_FILE" ]; then
  echo "Missing $KEY_FILE — run any 'publish.sh' once first to authenticate." >&2
  exit 1
fi

API_KEY="$(cat "$KEY_FILE")"

echo "→ Checking domain status for ${DOMAIN}…"
status="$(curl -sS "https://here.now/api/v1/domains/$DOMAIN" \
  -H "Authorization: Bearer $API_KEY" \
  | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("status",""))')"

if [ "$status" != "active" ]; then
  echo "  domain status is '$status' (need 'active'). DNS may not be propagated yet."
  echo "  Required records:"
  curl -sS "https://here.now/api/v1/domains/$DOMAIN" \
    -H "Authorization: Bearer $API_KEY" \
    | python3 -c "
import json, sys
d = json.load(sys.stdin)
for r in d.get('dns_instructions', []):
    print('    {:6} {:8} {}'.format(r['type'], r['host'], r['value']))
"
  exit 2
fi

echo "→ Linking $DOMAIN root → $SLUG…"
curl -sS -X POST https://here.now/api/v1/links \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"location\": \"\", \"slug\": \"$SLUG\", \"domain\": \"$DOMAIN\"}" \
  | python3 -m json.tool

echo ""
echo "✓ Done. Visit https://$DOMAIN/ — propagation across Cloudflare KV takes up to 60 seconds."
