#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# OpenClaw AppFactory -- Deploy / Update Script
# Pulls latest images, restarts the stack, and verifies health.
#
# Usage: ./scripts/deploy.sh
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

GREEN='\033[0;32m'
CYAN='\033[0;36m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

info() { echo -e "${CYAN}[DEPLOY]${NC} $*"; }
ok()   { echo -e "${GREEN}[DEPLOY]${NC} $*"; }
err()  { echo -e "${RED}[DEPLOY]${NC} $*" >&2; }
warn() { echo -e "${YELLOW}[DEPLOY]${NC} $*"; }

cd "$PROJECT_DIR"

if [[ ! -f .env ]]; then
    err ".env file not found. Run bootstrap.sh first."
    exit 1
fi

source .env

info "Pulling latest images..."
docker compose pull

info "Restarting stack..."
docker compose up -d --remove-orphans

info "Waiting for OpenClaw to be healthy..."
RETRIES=20
READY=false
for i in $(seq 1 $RETRIES); do
    if docker compose exec openclaw sh -c "curl -sf http://localhost:18789/health" &>/dev/null 2>&1; then
        READY=true
        break
    fi
    echo -n "."
    sleep 3
done
echo ""

if $READY; then
    ok "OpenClaw is healthy."
else
    warn "Health check did not pass within $(( RETRIES * 3 ))s."
    warn "Check logs: docker compose logs openclaw"
fi

info "Checking public HTTPS..."
if curl -sf "https://${DOMAIN}/health" &>/dev/null 2>&1; then
    ok "https://${DOMAIN} is live."
else
    warn "Public endpoint not responding yet. May need a moment."
fi

echo ""
ok "Deploy complete."
docker compose ps
