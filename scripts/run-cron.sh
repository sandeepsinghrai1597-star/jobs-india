#!/bin/sh
# Scheduled job runner for Hostinger (hPanel -> Advanced -> Cron Jobs).
#
# `vercel.json` crons only exist on Vercel. On Hostinger nothing schedules the
# /api/cron/* endpoints, so without this the job board never refreshes and
# expired listings are never swept.
#
# Usage:
#   scripts/run-cron.sh fetch-jobs
#   scripts/run-cron.sh expire-jobs
#
# Requires SITE_URL and CRON_SECRET in the environment. Suggested schedules:
#   0  3 * * *  /bin/sh /home/USER/app/scripts/run-cron.sh fetch-jobs
#   30 12 * * *  /bin/sh /home/USER/app/scripts/run-cron.sh fetch-jobs
#   0  1 * * *  /bin/sh /home/USER/app/scripts/run-cron.sh expire-jobs

set -eu

TASK="${1:-fetch-jobs}"
BASE_URL="${SITE_URL:-${NEXT_PUBLIC_SITE_URL:-}}"

if [ -z "$BASE_URL" ]; then
  echo "run-cron: set SITE_URL (or NEXT_PUBLIC_SITE_URL) to the live origin." >&2
  exit 1
fi

if [ -z "${CRON_SECRET:-}" ]; then
  echo "run-cron: CRON_SECRET is not set; the endpoint will reject the request." >&2
  exit 1
fi

case "$TASK" in
  fetch-jobs|expire-jobs) ;;
  *)
    echo "run-cron: unknown task '$TASK' (expected fetch-jobs or expire-jobs)." >&2
    exit 1
    ;;
esac

URL="${BASE_URL%/}/api/cron/$TASK"

# --max-time guards against a hung source feed holding the cron slot open.
RESPONSE=$(curl -sS --max-time 300 -w '\n%{http_code}' \
  -H "Authorization: Bearer $CRON_SECRET" \
  "$URL")

STATUS=$(printf '%s' "$RESPONSE" | tail -n 1)
BODY=$(printf '%s' "$RESPONSE" | sed '$d')

echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] $TASK -> HTTP $STATUS"
echo "$BODY"

[ "$STATUS" = "200" ] || exit 1
