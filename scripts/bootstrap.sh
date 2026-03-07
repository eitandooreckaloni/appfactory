#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# OpenClaw AppFactory -- Bootstrap Script
# Run this on a fresh Ubuntu server to go from zero to running stack.
#
# Usage: ./scripts/bootstrap.sh
# =============================================================================

REPO="eitandooreckaloni/AppFactory"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${CYAN}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
err()   { echo -e "${RED}[ERROR]${NC} $*" >&2; }

prompt_secret() {
    local var_name="$1"
    local description="$2"
    local value=""
    echo ""
    echo -e "${CYAN}==> ${var_name}${NC}"
    echo "    $description"
    while [[ -z "$value" ]]; do
        read -rsp "    Paste value (hidden): " value
        echo ""
        if [[ -z "$value" ]]; then
            err "Cannot be empty. Try again."
        fi
    done
    eval "$var_name='$value'"
}

# -----------------------------------------------------------------------------
# Step 1: System update
# -----------------------------------------------------------------------------
info "Step 1/15: Updating system packages..."
export DEBIAN_FRONTEND=noninteractive
if command -v apt-get &>/dev/null; then
    sudo apt-get update -qq
    sudo apt-get upgrade -y -qq
    sudo apt-get install -y -qq curl git ufw
    ok "System updated."
else
    warn "Not a Debian/Ubuntu system. Skipping apt. Make sure curl, git, ufw are installed."
fi

# -----------------------------------------------------------------------------
# Step 2: Create deploy user (if running as root)
# -----------------------------------------------------------------------------
info "Step 2/15: Checking user setup..."
if [[ "$EUID" -eq 0 ]]; then
    if ! id "deploy" &>/dev/null; then
        adduser --disabled-password --gecos "" deploy
        usermod -aG sudo deploy
        if [[ -d /root/.ssh ]]; then
            mkdir -p /home/deploy/.ssh
            cp /root/.ssh/authorized_keys /home/deploy/.ssh/ 2>/dev/null || true
            chown -R deploy:deploy /home/deploy/.ssh
            chmod 700 /home/deploy/.ssh
        fi
        ok "Created 'deploy' user with sudo access."
    else
        ok "'deploy' user already exists."
    fi
else
    ok "Running as non-root user: $(whoami)"
fi

# -----------------------------------------------------------------------------
# Step 3: Firewall
# -----------------------------------------------------------------------------
info "Step 3/15: Configuring firewall (UFW)..."
sudo ufw allow OpenSSH >/dev/null 2>&1
sudo ufw allow 80/tcp >/dev/null 2>&1
sudo ufw allow 443/tcp >/dev/null 2>&1
echo "y" | sudo ufw enable >/dev/null 2>&1
sudo ufw default deny incoming >/dev/null 2>&1
sudo ufw default allow outgoing >/dev/null 2>&1
ok "Firewall active: SSH (22), HTTP (80), HTTPS (443) allowed."

# -----------------------------------------------------------------------------
# Step 4: Install Docker
# -----------------------------------------------------------------------------
info "Step 4/15: Installing Docker..."
if command -v docker &>/dev/null; then
    ok "Docker already installed: $(docker --version)"
else
    curl -fsSL https://get.docker.com | sh
    ok "Docker installed: $(docker --version)"
fi

CURRENT_USER="$(whoami)"
if ! groups "$CURRENT_USER" | grep -q docker; then
    sudo usermod -aG docker "$CURRENT_USER"
    warn "Added $CURRENT_USER to docker group. If docker commands fail later, log out and back in."
fi

# -----------------------------------------------------------------------------
# Step 5: Install GitHub CLI
# -----------------------------------------------------------------------------
info "Step 5/15: Installing GitHub CLI..."
if command -v gh &>/dev/null; then
    ok "GitHub CLI already installed: $(gh --version | head -1)"
else
    curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
    sudo apt-get update -qq
    sudo apt-get install -y -qq gh
    ok "GitHub CLI installed: $(gh --version | head -1)"
fi

# -----------------------------------------------------------------------------
# Step 6: GitHub authentication
# -----------------------------------------------------------------------------
info "Step 6/15: Authenticating with GitHub..."
if gh auth status &>/dev/null 2>&1; then
    ok "Already authenticated with GitHub."
else
    warn "You need to log in to GitHub. Follow the prompts:"
    gh auth login
    ok "GitHub authentication complete."
fi

# -----------------------------------------------------------------------------
# Step 7: Pull variables from GitHub
# -----------------------------------------------------------------------------
info "Step 7/15: Pulling config from GitHub repo variables..."
DOMAIN=""
DUCKDNS_SUBDOMAIN=""

if gh variable list --repo "$REPO" &>/dev/null 2>&1; then
    DOMAIN=$(gh variable list --repo "$REPO" --json name,value -q '.[] | select(.name=="DOMAIN") | .value' 2>/dev/null || true)
    DUCKDNS_SUBDOMAIN=$(gh variable list --repo "$REPO" --json name,value -q '.[] | select(.name=="DUCKDNS_SUBDOMAIN") | .value' 2>/dev/null || true)
fi

if [[ -z "$DOMAIN" ]]; then
    warn "Could not pull DOMAIN from GitHub variables."
    read -rp "    Enter your domain (e.g. eitan-openclaw.duckdns.org): " DOMAIN
fi
if [[ -z "$DUCKDNS_SUBDOMAIN" ]]; then
    warn "Could not pull DUCKDNS_SUBDOMAIN from GitHub variables."
    read -rp "    Enter your DuckDNS subdomain (e.g. eitan-openclaw): " DUCKDNS_SUBDOMAIN
fi

ok "Domain: $DOMAIN"
ok "DuckDNS subdomain: $DUCKDNS_SUBDOMAIN"

# -----------------------------------------------------------------------------
# Step 8: Collect secrets
# -----------------------------------------------------------------------------
info "Step 8/15: Collecting secrets..."
echo ""
echo -e "${YELLOW}You'll now paste each secret. They're stored in your GitHub repo secrets"
echo -e "at github.com/$REPO/settings/secrets/actions as a backup/reference.${NC}"
echo -e "GitHub PAT: store as OPENCLAW_GH_PAT (GitHub reserves GITHUB_* names).${NC}"
echo ""

prompt_secret ANTHROPIC_API_KEY "Anthropic Claude API key (from console.anthropic.com)"
prompt_secret OPENAI_API_KEY    "OpenAI API key (from platform.openai.com/api-keys)"
prompt_secret TELEGRAM_BOT_TOKEN "Telegram bot token (from @BotFather for @OpenclawAppFactoryBot)"
prompt_secret GITHUB_TOKEN      "GitHub PAT with repo scope (from github.com/settings/tokens)"
prompt_secret DUCKDNS_TOKEN     "DuckDNS token (log in via GitHub at duckdns.org, token on dashboard)"

ok "All secrets collected."

# -----------------------------------------------------------------------------
# Step 9: Generate OpenClaw auth token
# -----------------------------------------------------------------------------
info "Step 9/15: Generating OpenClaw auth token..."
OPENCLAW_AUTH_TOKEN=$(openssl rand -hex 32)
ok "Generated 256-bit auth token."

# -----------------------------------------------------------------------------
# Step 10: Write .env file
# -----------------------------------------------------------------------------
info "Step 10/15: Writing .env file..."
cat > "$PROJECT_DIR/.env" <<EOF
DOMAIN=${DOMAIN}
DUCKDNS_SUBDOMAIN=${DUCKDNS_SUBDOMAIN}
DUCKDNS_TOKEN=${DUCKDNS_TOKEN}
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
OPENAI_API_KEY=${OPENAI_API_KEY}
TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
GITHUB_TOKEN=${GITHUB_TOKEN}
GITHUB_USER=eitandooreckaloni
OPENCLAW_AUTH_TOKEN=${OPENCLAW_AUTH_TOKEN}
EOF
chmod 600 "$PROJECT_DIR/.env"
ok ".env written and permissions set to 600."

# -----------------------------------------------------------------------------
# Step 11: Pull Docker images
# -----------------------------------------------------------------------------
info "Step 11/15: Pulling Docker images..."
cd "$PROJECT_DIR"
docker compose pull
ok "All images pulled."

# -----------------------------------------------------------------------------
# Step 12: Start the stack
# -----------------------------------------------------------------------------
info "Step 12/15: Starting the stack..."
docker compose up -d
ok "Stack is starting."

# -----------------------------------------------------------------------------
# Step 13: Wait for healthy + install skills
# -----------------------------------------------------------------------------
info "Step 13/15: Waiting for OpenClaw to be ready..."
RETRIES=30
READY=false
for i in $(seq 1 $RETRIES); do
    if docker compose exec openclaw sh -c "curl -sf http://localhost:18789/health" &>/dev/null 2>&1; then
        READY=true
        break
    fi
    echo -n "."
    sleep 5
done
echo ""

if $READY; then
    ok "OpenClaw is healthy."
    info "Installing skills..."
    if [[ -x "$SCRIPT_DIR/install-skills.sh" ]]; then
        bash "$SCRIPT_DIR/install-skills.sh"
    else
        warn "install-skills.sh not found or not executable. Skipping skill installation."
    fi
else
    warn "OpenClaw did not become healthy within $(( RETRIES * 5 ))s."
    warn "Check logs: docker compose logs openclaw"
fi

# -----------------------------------------------------------------------------
# Step 14: Verify public access
# -----------------------------------------------------------------------------
info "Step 14/15: Verifying public HTTPS access..."
sleep 5
if curl -sf "https://${DOMAIN}/health" &>/dev/null 2>&1; then
    ok "https://${DOMAIN} is live and responding."
else
    warn "Could not reach https://${DOMAIN} -- this may take a minute for DNS + TLS to propagate."
    warn "Try manually: curl https://${DOMAIN}/health"
fi

# -----------------------------------------------------------------------------
# Step 15: Done
# -----------------------------------------------------------------------------
echo ""
echo -e "${GREEN}============================================================${NC}"
echo -e "${GREEN}  OpenClaw AppFactory is running!${NC}"
echo -e "${GREEN}============================================================${NC}"
echo ""
echo -e "  Domain:    https://${DOMAIN}"
echo -e "  Telegram:  t.me/OpenclawAppFactoryBot"
echo -e "  Auth:      ${OPENCLAW_AUTH_TOKEN:0:8}... (full token in .env)"
echo ""
echo -e "  ${CYAN}Next steps:${NC}"
echo -e "  1. Open Telegram and message @OpenclawAppFactoryBot"
echo -e "  2. Describe an app you want to build"
echo -e "  3. Watch the magic happen"
echo ""
echo -e "  ${CYAN}Useful commands:${NC}"
echo -e "  docker compose logs -f        # watch all logs"
echo -e "  docker compose logs openclaw  # OpenClaw logs only"
echo -e "  ./scripts/deploy.sh           # pull updates & restart"
echo -e "  ./scripts/backup.sh           # backup data & workspace"
echo ""
