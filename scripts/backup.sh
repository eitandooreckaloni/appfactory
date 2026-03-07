#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# OpenClaw AppFactory -- Backup Script
# Creates a timestamped tarball of OpenClaw data, workspace, config, and skills.
# Useful before migration or as a periodic snapshot.
#
# Usage: ./scripts/backup.sh [output-directory]
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${1:-$PROJECT_DIR}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="openclaw-backup-${TIMESTAMP}.tar.gz"

GREEN='\033[0;32m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

info() { echo -e "${CYAN}[BACKUP]${NC} $*"; }
ok()   { echo -e "${GREEN}[BACKUP]${NC} $*"; }
err()  { echo -e "${RED}[BACKUP]${NC} $*" >&2; }

cd "$PROJECT_DIR"

info "Backing up OpenClaw data and config..."

# Export Docker volumes to temp dirs so we can tar them
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

info "Exporting openclaw_data volume..."
docker run --rm \
    -v appfactory_openclaw_data:/source:ro \
    -v "$TEMP_DIR":/backup \
    alpine tar czf /backup/openclaw_data.tar.gz -C /source . 2>/dev/null || {
    info "No openclaw_data volume found (first run?). Skipping."
}

info "Exporting openclaw_workspace volume..."
docker run --rm \
    -v appfactory_openclaw_workspace:/source:ro \
    -v "$TEMP_DIR":/backup \
    alpine tar czf /backup/openclaw_workspace.tar.gz -C /source . 2>/dev/null || {
    info "No openclaw_workspace volume found. Skipping."
}

info "Bundling config and skills..."
cp -r openclaw/config "$TEMP_DIR/config" 2>/dev/null || true
cp -r openclaw/skills "$TEMP_DIR/skills" 2>/dev/null || true
cp .env "$TEMP_DIR/dot-env" 2>/dev/null || true

info "Creating archive..."
tar czf "${BACKUP_DIR}/${BACKUP_NAME}" -C "$TEMP_DIR" .

BACKUP_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_NAME}" | cut -f1)

echo ""
ok "Backup complete: ${BACKUP_DIR}/${BACKUP_NAME} (${BACKUP_SIZE})"
echo ""
echo "  To restore on a new server:"
echo "  1. Run bootstrap.sh on the new server first"
echo "  2. docker compose down"
echo "  3. Copy this backup to the new server"
echo "  4. tar xzf ${BACKUP_NAME} -C /tmp/restore"
echo "  5. Restore volumes with docker run + tar"
echo "  6. docker compose up -d"
