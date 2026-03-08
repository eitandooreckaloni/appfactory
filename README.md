# AppFactory

An [OpenClaw](https://github.com/openclaw/openclaw)-driven orchestration that autonomously ideates, builds, and deploys small web apps — all from a Telegram chat.

You send a message. AI agents research the market, generate ideas, write specs, design the UI, scaffold a Next.js project, implement the code, run QA, and deploy to Vercel. You get back a live URL.

## How It Works

AppFactory is an OpenClaw skill that acts as a router, dispatching commands to a pipeline of 10 specialized sub-agents. Each agent handles one stage of the app lifecycle, runs in its own ephemeral context, and hands off structured JSON to the next.

```
You (Telegram)
  │
  ▼
OpenClaw ──► AppFactory Router
                 │
                 ├── ideas ──► Researcher ──► Scout ──► Ranker ──► filtered ideas
                 │
                 ├── spec N ──► PM ──► detailed build spec
                 │
                 ├── design N ──► Designer ──► design system
                 │
                 └── approve N ──► Builder ──► Developer ──► QA ──► Deployer
                                                                       │
                                                                   live URL
```

The `auto` command runs this entire pipeline end-to-end in one shot.

### The Pipeline

| Stage | Agent | What it does |
|-------|-------|-------------|
| **Research** | Researcher | Searches the web for market signals, trends, and pain points |
| **Ideate** | Scout | Generates 5 app ideas grounded in research |
| **Rank** | Ranker | Scores ideas on pain, feasibility, virality — filters out weak ones (< 5.0) |
| **Spec** | PM | Writes a full build spec: pages, components, API routes, DB schema |
| **Design** | Designer | Creates a design system: colors, typography, components, motion |
| **Build** | Builder | Scaffolds a Next.js project on GitHub with stub files |
| **Develop** | Developer | Implements all stub code into a working app |
| **QA** | QA | Validates the build — pass or fail (auto-retries develop→QA up to 2x) |
| **Deploy** | Deployer | Ships to Vercel + Supabase, returns the live URL |
| **Inspo** | Inspo | Analyzes YouTube videos via Gemini API for design/product inspiration |

### Commands

```
ideas              Generate 5 app ideas from current market trends
ideas <topic>      Same, focused on a topic
refine N "text"    Iterate on idea #N with your feedback
rank               Re-score all active ideas
spec N             Write a build spec for idea #N
design N           Create a design system for idea #N
approve N          Auto-chain: build → develop → QA → deploy (done = live URL)
auto [topic]       Full pipeline in one command: ideas → spec → design → approve → deploy
kill N             Remove an idea
```

Manual re-triggers if a step fails: `build N`, `develop N`, `qa N`, `deploy N`

### State Flow

All state lives in a single `pipeline.json` file:

```
active → specced → designed → building → built → developed → qa_pass → deployed
                                                            → qa_fail (retries 2x)
```

---

## Infrastructure

| Component | What |
|-----------|------|
| **Server** | Hetzner CX22 (2 vCPU, 4GB RAM, ~$4.50/mo) |
| **Domain** | `eitan-openclaw.duckdns.org` (free dynamic DNS) |
| **Proxy** | Caddy (auto-HTTPS via Let's Encrypt) |
| **Gateway** | OpenClaw container (agent orchestration) |
| **Deploys** | GitHub Actions auto-deploy on push to `main` |

### Docker Services

| Service | Image | Purpose |
|---------|-------|---------|
| `caddy` | `caddy:2-alpine` | Reverse proxy with automatic TLS |
| `openclaw` | `openclaw/openclaw:latest` | Agent gateway (not exposed to host network) |
| `duckdns` | `linuxserver/duckdns` | Updates DuckDNS IP every 5 minutes |

---

## Quick Start

```bash
ssh root@YOUR_SERVER_IP
git clone https://github.com/eitandooreckaloni/appfactory.git appfactory
cd appfactory
./scripts/bootstrap.sh
```

The bootstrap script handles everything: Docker, firewall, GitHub CLI, secrets, DuckDNS, and stack launch.

### Prerequisites

| What | Where to get it |
|------|----------------|
| Hetzner VPS (CX22) | [console.hetzner.cloud](https://console.hetzner.cloud) — Ubuntu 24.04 |
| DuckDNS subdomain | [duckdns.org](https://www.duckdns.org) |
| Telegram bot token | `@BotFather` on Telegram |
| Anthropic API key | [console.anthropic.com](https://console.anthropic.com) |
| OpenAI API key | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |
| GitHub PAT | [github.com/settings/tokens](https://github.com/settings/tokens) — classic token with `repo` scope |

### Storing Secrets in GitHub (One-Time)

```bash
# Non-sensitive config
gh variable set DOMAIN --body "eitan-openclaw.duckdns.org" --repo eitandooreckaloni/appfactory
gh variable set DUCKDNS_SUBDOMAIN --body "eitan-openclaw" --repo eitandooreckaloni/appfactory

# Secrets (write-only backup — paste these during bootstrap)
gh secret set ANTHROPIC_API_KEY --repo eitandooreckaloni/appfactory
gh secret set OPENAI_API_KEY --repo eitandooreckaloni/appfactory
gh secret set TELEGRAM_BOT_TOKEN --repo eitandooreckaloni/appfactory
gh secret set OPENCLAW_GH_PAT --repo eitandooreckaloni/appfactory
gh secret set DUCKDNS_TOKEN --repo eitandooreckaloni/appfactory
```

### What Bootstrap Does

1. Updates system packages
2. Creates a `deploy` user (if running as root)
3. Configures UFW firewall (ports 22, 80, 443 only)
4. Installs Docker and GitHub CLI
5. Authenticates with GitHub
6. Pulls config variables from repo
7. Prompts for each secret (Anthropic, OpenAI, Telegram, GitHub PAT, DuckDNS)
8. Generates a 256-bit OpenClaw auth token
9. Writes `.env` (chmod 600)
10. Pulls Docker images and starts the stack
11. Installs skills and verifies HTTPS access

---

## Operations

### Deploy / Migrate / Update

```bash
# First deploy or migrate to new server
ssh root@SERVER_IP
git clone https://github.com/eitandooreckaloni/appfactory.git appfactory
cd appfactory && ./scripts/bootstrap.sh

# Pull updates and restart
./scripts/deploy.sh

# Backup workspace data
./scripts/backup.sh
```

### Useful Commands

```bash
docker compose logs -f              # all logs
docker compose logs -f openclaw     # OpenClaw only
docker compose restart              # restart all
docker compose ps                   # check status
./scripts/deploy.sh                 # update and redeploy
./scripts/backup.sh                 # snapshot data
```

---

## File Structure

```
appfactory/
├── docker-compose.yml               # Stack definition
├── .env.example                     # Env var template
├── caddy/Caddyfile                  # Reverse proxy config
├── openclaw/
│   ├── config/gateway.yaml          # OpenClaw gateway config
│   └── skills/appfactory/
│       ├── SKILL.md                 # Router agent (the brain)
│       ├── README.md                # Detailed skill docs
│       ├── agents/*/SKILL.md        # Sub-agent prompts (10 agents)
│       ├── schemas/*.schema.json    # JSON schemas for agent outputs
│       └── prompts/*.md             # Shared prompt fragments
├── scripts/
│   ├── bootstrap.sh                 # One-command server setup
│   ├── deploy.sh                    # Pull updates and restart
│   ├── backup.sh                    # Backup data
│   └── install-skills.sh            # Install community skills
└── .github/workflows/deploy.yml     # CI/CD auto-deploy
```

---

## Security

- **HTTPS**: Automatic TLS via Caddy + Let's Encrypt
- **Firewall**: UFW allows only ports 22, 80, 443
- **Auth token**: 256-bit random token for OpenClaw API access
- **No Docker socket**: OpenClaw container cannot control Docker
- **Read-only mounts**: Config and skills directories mounted read-only
- **Non-root**: Stack runs under the `deploy` user
- **.env protection**: File permissions set to 600

---

## Troubleshooting

**Can't reach the server:**
- Check DuckDNS dashboard for correct IP
- `docker compose logs caddy` for TLS errors
- Let's Encrypt rate limits if redeployed many times

**OpenClaw won't start:**
- `docker compose logs openclaw` for startup errors
- Verify `.env` has all required variables
- Confirm API keys are valid

**Telegram bot doesn't respond:**
- Verify bot token: `curl https://api.telegram.org/bot<TOKEN>/getMe`
- Check webhook: `docker compose logs openclaw | grep -i telegram`
- HTTPS must be working (webhooks require valid TLS)
