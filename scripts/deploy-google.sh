#!/usr/bin/env bash
# Deploy Google Calendar + Tasks edge functions to Supabase
# Prerequisites: npx supabase@2.105.0 login (once)
set -euo pipefail

cd "$(dirname "$0")/.."

SUPABASE="npx supabase@2.105.0"
PROJECT_REF="cifkxvyuhkvochqnijmw"
WEBHOOK_URL="https://${PROJECT_REF}.supabase.co/functions/v1/google-webhook"

# Load Client ID from .env
if [[ -f .env ]]; then
  set -a
  source <(grep -E '^VITE_GOOGLE_CLIENT_ID=' .env)
  set +a
fi

if [[ -z "${VITE_GOOGLE_CLIENT_ID:-}" ]]; then
  echo "Error: VITE_GOOGLE_CLIENT_ID not set in .env"
  exit 1
fi

if [[ -z "${GOOGLE_CLIENT_SECRET:-}" ]]; then
  echo "Error: Set GOOGLE_CLIENT_SECRET before running:"
  echo "  export GOOGLE_CLIENT_SECRET='your-secret-from-google-cloud'"
  exit 1
fi

echo "→ Checking Supabase login..."
if ! $SUPABASE projects list &>/dev/null; then
  echo "Not logged in. Run: npx supabase@2.105.0 login"
  exit 1
fi

echo "→ Linking project ${PROJECT_REF}..."
$SUPABASE link --project-ref "$PROJECT_REF" 2>/dev/null || true

echo "→ Setting secrets..."
$SUPABASE secrets set \
  GOOGLE_CLIENT_ID="$VITE_GOOGLE_CLIENT_ID" \
  GOOGLE_CLIENT_SECRET="$GOOGLE_CLIENT_SECRET" \
  GOOGLE_WEBHOOK_URL="$WEBHOOK_URL" \
  --project-ref "$PROJECT_REF"

echo "→ Deploying edge functions..."
$SUPABASE functions deploy google-oauth --project-ref "$PROJECT_REF"
$SUPABASE functions deploy google-sync --project-ref "$PROJECT_REF"
$SUPABASE functions deploy google-reset --project-ref "$PROJECT_REF"
$SUPABASE functions deploy google-webhook --project-ref "$PROJECT_REF"

echo ""
echo "✓ Done! Webhook URL: $WEBHOOK_URL"
echo "  Run: npm run dev"
echo "  Then Settings → Connect Google Calendar & Tasks"
