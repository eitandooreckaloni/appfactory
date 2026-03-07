# OpenClaw AppFactory

A portable, Dockerized OpenClaw orchestrator that builds apps from Telegram messages and pushes them to GitHub. Clone it on any Ubuntu server, run one script, and you're live.

## Quick Start

```bash
ssh root@YOUR_SERVER_IP
git clone https://github.com/eitandooreckaloni/AppFactory.git
cd AppFactory
./scripts/bootstrap.sh
```

The bootstrap script handles everything: Docker installation, firewall, GitHub CLI, secrets collection, DuckDNS auto-update, and stack launch.

---

## Prerequisites

Before running bootstrap, you need these accounts and keys ready:

| What | Where to get it |
|------|----------------|
| Hetzner VPS (CX22) | [console.hetzner.cloud](https://console.hetzner.cloud) -- Ubuntu 24.04, Ashburn datacenter |
| DuckDNS subdomain | Already set up: `eitan-openclaw.duckdns.org`. Log in via GitHub at [duckdns.org](https://www.duckdns.org); token is on the dashboard |
| Telegram bot token | From `@BotFather` for `@OpenclawAppFactoryBot` |
| Anthropic API key | [console.anthropic.com](https://console.anthropic.com) -> API Keys |
| OpenAI API key | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |
| GitHub PAT | [github.com/settings/tokens](https://github.com/settings/tokens) -- classic token with `repo` scope |

## Storing Secrets in GitHub (One-Time)

Store your secrets in GitHub so you always know where they are. From your laptop:

```bash
# Non-sensitive config (readable, pulled automatically by bootstrap)
gh variable set DOMAIN --body "eitan-openclaw.duckdns.org" --repo eitandooreckaloni/AppFactory
gh variable set DUCKDNS_SUBDOMAIN --body "eitan-openclaw" --repo eitandooreckaloni/AppFactory

# Secrets (write-only backup -- you'll paste these during bootstrap)
# Note: GitHub reserves GITHUB_* for Actions; use OPENCLAW_GH_PAT for the PAT
gh secret set ANTHROPIC_API_KEY --repo eitandooreckaloni/AppFactory
gh secret set OPENAI_API_KEY --repo eitandooreckaloni/AppFactory
gh secret set TELEGRAM_BOT_TOKEN --repo eitandooreckaloni/AppFactory
gh secret set OPENCLAW_GH_PAT --repo eitandooreckaloni/AppFactory
gh secret set DUCKDNS_TOKEN --repo eitandooreckaloni/AppFactory
```

GitHub secrets are write-only (can't be read back via API), so during bootstrap the script prompts you to paste each one. They're stored in GitHub as your single source of truth. The GitHub PAT is stored as `OPENCLAW_GH_PAT` because GitHub reserves `GITHUB_*` names for Actions.

---

## What Bootstrap Does

The `scripts/bootstrap.sh` script runs these 15 steps:

1. Updates system packages
2. Creates a `deploy` user (if running as root)
3. Configures UFW firewall (ports 22, 80, 443 only)
4. Installs Docker
5. Installs GitHub CLI
6. Authenticates with GitHub (`gh auth login`)
7. Pulls `DOMAIN` and `DUCKDNS_SUBDOMAIN` from GitHub repo variables
8. Prompts you to paste each secret (Anthropic, OpenAI, Telegram, GitHub PAT, DuckDNS)
9. Generates a 256-bit OpenClaw auth token
10. Writes the `.env` file (chmod 600)
11. Pulls Docker images
12. Starts the stack (`docker compose up -d`)
13. Waits for OpenClaw health check, then installs skills
14. Verifies public HTTPS access
15. Prints success message with next steps

---

## Architecture

```
You (Telegram) ──► @OpenclawAppFactoryBot
                        │
                        ▼
              Telegram Bot API
                        │
                        ▼ (webhook)
              Caddy (auto-HTTPS)
              eitan-openclaw.duckdns.org
                        │
                        ▼ (reverse proxy)
              OpenClaw Container
               ├── Anthropic (Claude)
               ├── OpenAI (GPT-4o)
               ├── Agent Orchestrator
               └── AppFactory Skill
                        │
                        ▼
              Generated App ──► GitHub Repo
```

### Docker Services

| Service | Image | Purpose |
|---------|-------|---------|
| `caddy` | `caddy:2-alpine` | Reverse proxy, auto-HTTPS via Let's Encrypt |
| `openclaw` | `openclaw/openclaw:latest` | Agent gateway (not exposed to host network) |
| `duckdns` | `linuxserver/duckdns` | Updates DuckDNS IP every 5 minutes |

---

## Three Workflows

### 1. First Deploy

```bash
ssh root@HETZNER_IP
git clone https://github.com/eitandooreckaloni/AppFactory.git
cd AppFactory
./scripts/bootstrap.sh
```

### 2. Migrate to a New Server

```bash
# On the NEW server:
ssh root@NEW_SERVER_IP
git clone https://github.com/eitandooreckaloni/AppFactory.git
cd AppFactory
./scripts/bootstrap.sh
```

DuckDNS auto-updates the IP. If you need workspace data from the old server:

```bash
# On OLD server:
./scripts/backup.sh
scp openclaw-backup-*.tar.gz root@NEW_SERVER_IP:~/AppFactory/

# On NEW server:
# (restore instructions printed by backup.sh)
```

### 3. Daily Use

- Message `@OpenclawAppFactoryBot` on Telegram with a command like `ideas`
- OpenClaw orchestrates sub-agents to build it
- Check `github.com/eitandooreckaloni/<app-name>` for the result
- Run `./scripts/deploy.sh` to pull updates
- Run `./scripts/backup.sh` to snapshot your data

---

## Useful Commands

```bash
# View logs
docker compose logs -f              # all services
docker compose logs -f openclaw     # OpenClaw only
docker compose logs -f caddy        # Caddy only

# Restart
docker compose restart              # restart all
docker compose restart openclaw     # restart OpenClaw only

# Stop everything
docker compose down

# Start everything
docker compose up -d

# Check status
docker compose ps

# Update and redeploy
./scripts/deploy.sh

# Backup
./scripts/backup.sh

# Install additional skills
docker compose exec openclaw npx playbooks add skill <author/repo> --skill <skill-name>
```

---

## File Structure

```
AppFactory/
├── docker-compose.yml            # Stack definition
├── .env.example                  # Env var template (committed)
├── .env                          # Actual secrets (git-ignored, generated by bootstrap)
├── .gitignore
├── caddy/
│   └── Caddyfile                 # Reverse proxy config
├── openclaw/
│   ├── config/
│   │   └── gateway.yaml          # OpenClaw gateway configuration
│   └── skills/
│       └── appfactory/
│           └── SKILL.md          # Custom AppFactory orchestration skill
├── scripts/
│   ├── bootstrap.sh              # One-command server setup
│   ├── deploy.sh                 # Pull updates and restart
│   ├── backup.sh                 # Backup data and workspace
│   └── install-skills.sh         # Install OpenClaw community skills
└── README.md                     # This file
```

---

## Security

- **HTTPS**: Caddy handles TLS automatically via Let's Encrypt
- **Firewall**: UFW allows only ports 22 (SSH), 80 (HTTP redirect), 443 (HTTPS)
- **Auth token**: 256-bit random token required for OpenClaw API access
- **mDNS disabled**: Network discovery turned off in gateway config
- **No Docker socket**: OpenClaw container cannot control Docker
- **Read-only mounts**: Config and skills directories are mounted read-only
- **Security headers**: HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy
- **Non-root**: Stack runs under the `deploy` user
- **.env protection**: File permissions set to 600 (owner-only read/write)

---

## Monthly Cost

| Item | Cost |
|------|------|
| Hetzner CX22 (2 vCPU, 4GB RAM) | ~$4.50/mo |
| DuckDNS | Free |
| LLM API usage | ~$20-25/mo (depends on usage) |
| **Total** | **~$25-30/mo** |

---

## Troubleshooting

**Bootstrap fails at Docker install:**
Make sure you're on Ubuntu 22.04+ or Debian 12+. The Docker install script doesn't support all distros.

**Can't reach https://eitan-openclaw.duckdns.org:**
- Check DuckDNS dashboard -- is the IP correct?
- Run `docker compose logs caddy` -- look for TLS errors
- Let's Encrypt rate limits: if you've redeployed many times, you may need to wait

**OpenClaw health check fails:**
- `docker compose logs openclaw` -- check for startup errors
- Verify `.env` has all required variables: `cat .env | grep -c =` should return 9
- Make sure API keys are valid

**Telegram bot doesn't respond:**
- Check the bot token: `curl https://api.telegram.org/bot<TOKEN>/getMe`
- Check webhook: `docker compose logs openclaw | grep -i telegram`
- Make sure HTTPS is working (webhook requires valid TLS)

**Skills fail to install:**
- Network issue: `docker compose exec openclaw ping google.com`
- Run manually: `docker compose exec openclaw npx playbooks add skill openclaw/skills --skill agent-orchestrator`
