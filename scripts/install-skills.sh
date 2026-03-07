#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Verify the custom appfactory skill and its sub-agents are present.
# Called by bootstrap.sh after OpenClaw is healthy.
# =============================================================================

GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

info() { echo -e "${CYAN}[SKILL]${NC} $*"; }
ok()   { echo -e "${GREEN}[SKILL]${NC} $*"; }
fail() { echo -e "${RED}[SKILL]${NC} $*"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
SKILL_DIR="$PROJECT_DIR/openclaw/skills/appfactory"

ERRORS=0

check_file() {
    local file="$1"
    local label="$2"
    if [[ -f "$file" ]]; then
        ok "$label"
    else
        fail "MISSING: $label ($file)"
        ERRORS=$((ERRORS + 1))
    fi
}

info "Verifying appfactory skill..."
echo ""

# Main skill
check_file "$SKILL_DIR/SKILL.md" "appfactory skill"

# Sub-agents
check_file "$SKILL_DIR/agents/scout/SKILL.md"  "sub-agent: scout"
check_file "$SKILL_DIR/agents/ranker/SKILL.md" "sub-agent: ranker"
check_file "$SKILL_DIR/agents/pm/SKILL.md"     "sub-agent: pm"

# Schemas
check_file "$SKILL_DIR/schemas/idea.schema.json" "schema: idea"
check_file "$SKILL_DIR/schemas/spec.schema.json" "schema: spec"

# Prompts
check_file "$SKILL_DIR/prompts/system.md"  "prompt: system"
check_file "$SKILL_DIR/prompts/ideate.md"  "prompt: ideate"
check_file "$SKILL_DIR/prompts/rank.md"    "prompt: rank"
check_file "$SKILL_DIR/prompts/spec.md"    "prompt: spec"

echo ""
if [[ $ERRORS -gt 0 ]]; then
    fail "$ERRORS file(s) missing. Check the openclaw/skills/appfactory directory."
    exit 1
else
    ok "All skill files verified. AppFactory skill is ready."
fi
