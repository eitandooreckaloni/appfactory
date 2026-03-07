#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Install OpenClaw community skills + verify custom appfactory skill
# Called by bootstrap.sh after OpenClaw is healthy.
# =============================================================================

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

info() { echo -e "${CYAN}[SKILL]${NC} $*"; }
ok()   { echo -e "${GREEN}[SKILL]${NC} $*"; }
warn() { echo -e "${YELLOW}[SKILL]${NC} $*"; }

SKILLS=(
    "openclaw/skills --skill agent-orchestrator"
    "openclaw/skills --skill agent-orchestration-multi-agent-optimize"
    "openclaw/skills --skill git-manager"
    "openclaw/skills --skill code-generator"
)

for skill_args in "${SKILLS[@]}"; do
    skill_name="${skill_args##*--skill }"
    info "Installing: $skill_name"
    if docker compose exec openclaw npx playbooks add skill $skill_args 2>/dev/null; then
        ok "Installed: $skill_name"
    else
        warn "Failed to install: $skill_name (may not exist or network issue). Continuing."
    fi
done

if [[ -f "openclaw/skills/appfactory/SKILL.md" ]]; then
    ok "Custom appfactory skill found in openclaw/skills/appfactory/SKILL.md"
else
    warn "Custom appfactory skill not found at openclaw/skills/appfactory/SKILL.md"
fi

echo ""
ok "Skill installation complete."
