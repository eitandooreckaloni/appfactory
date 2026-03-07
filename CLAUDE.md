# AppFactory - Claude Code Instructions

## What This Is

An autonomous idea-to-deployment pipeline that ships small apps via Telegram. Users message a Telegram bot, OpenClaw routes commands to the AppFactory skill, which orchestrates sub-agents to research, ideate, spec, design, build, test, and deploy apps.

## Infrastructure

- **Server**: `ssh root@89.167.116.2` (Hetzner CX22, Ubuntu)
- **Domain**: `eitan-openclaw.duckdns.org` (auto-HTTPS via Caddy)
- **Stack**: Docker Compose — Caddy (reverse proxy) + OpenClaw (agent gateway) + DuckDNS (IP updater)
- **Deploys**: GitHub Actions auto-deploy on push to `main` (`.github/workflows/deploy.yml`)
- **Repo**: `eitandooreckaloni/appfactory`

## Pipeline (the "pipe")

```
ideas [topic]  -->  spec N  -->  design N  -->  approve N  -->  deploy N
                                                   |
                                          [build -> develop -> qa]
```

### Full Command Set

| Command | Agents | Status Transition |
|---------|--------|-------------------|
| `ideas [topic]` | [Inspo if YouTube URLs] -> Researcher -> [Inspo for YT refs] -> Scout -> Ranker (auto-filter >= 5.0) | -> `active` or `filtered` |
| `refine N "feedback"` | Scout (refine) -> Ranker | original -> `superseded`, new -> `active`/`filtered` |
| `rank` | Ranker | (re-scores active ideas) |
| `spec N` | PM | `active` -> `specced` |
| `design N` | Designer | `specced` -> `designed` |
| `approve N` | Builder -> Developer -> QA (auto-chain) | `designed` -> `building` -> `built` -> `developed` -> `qa_pass`/`qa_fail` |
| `build N` | Builder (manual re-trigger) | `designed`/`building` -> `built` |
| `develop N` | Developer (manual re-trigger) | `built` -> `developed` |
| `qa N` | QA (manual re-trigger) | `developed` -> `qa_pass`/`qa_fail` |
| `deploy N` | Deployer | `qa_pass` -> `deployed` |
| `inspo "url"` | Inspo (Gemini API) | saves to `inspirations/` |
| `inspo N "url"` | Inspo (Gemini API) | saves + attaches to idea #N |
| `auto [topic]` | Full pipeline end-to-end | -> `deployed` |
| `kill N` | (router direct) | -> `killed` |

### Status Flow

```
active -> specced -> designed -> building -> built -> developed -> qa_pass -> deployed
                                                                -> qa_fail
```

### Sub-Agents (10 total)

| Agent | Location | Role |
|-------|----------|------|
| Researcher | `agents/researcher/` | Web search for market signals |
| Scout | `agents/scout/` | Generate 5 app ideas (or 1 in refine mode) |
| Ranker | `agents/ranker/` | Score/rank ideas (weighted_score) |
| PM | `agents/pm/` | Write detailed build spec |
| Designer | `agents/designer/` | Create design system (colors, typography, components) |
| Builder | `agents/builder/` | Scaffold Next.js project on GitHub |
| Developer | `agents/developer/` | Implement all stub code |
| QA | `agents/qa/` | Validate build, pass/fail verdict |
| Inspo | `agents/inspo/` | Analyze YouTube videos via Gemini API (used by Router, Researcher refs, Designer, or standalone) |
| Deployer | `agents/deployer/` | Deploy to Vercel + Supabase, return live URL |

## Key File Paths

```
openclaw/skills/appfactory/
  SKILL.md                    # Router agent (the brain — parses commands, dispatches)
  README.md                   # Detailed architecture docs
  agents/*/SKILL.md           # Each sub-agent's prompt
  schemas/*.schema.json       # JSON schemas for agent outputs
  prompts/*.md                # Shared prompt fragments

scripts/
  bootstrap.sh                # One-command server setup (15 steps)
  deploy.sh                   # Pull updates and restart
  backup.sh                   # Snapshot data
  install-skills.sh           # Install OpenClaw community skills

docker-compose.yml            # Stack definition (caddy, openclaw, duckdns)
caddy/Caddyfile               # Reverse proxy config
openclaw/config/gateway.yaml  # OpenClaw gateway config
.github/workflows/deploy.yml  # CI/CD auto-deploy
```

### Runtime State (on server, not in repo)

```
workspace/appfactory/
  pipeline.json               # All idea state (source of truth)
  research.json               # Cached research brief
  specs/spec-N.json           # PM specs
  designs/design-N.json       # Design specs
  inspirations/inspo-M.json   # YouTube video inspiration analyses
```

## Adding a New Token/Secret

1. Add to local `.env` (git-ignored)
2. `gh secret set TOKEN_NAME --repo eitandooreckaloni/appfactory`
3. Add to `.github/workflows/deploy.yml` heredoc block
4. Add to `scripts/bootstrap.sh` (prompt_secret + .env cat block)
5. Commit & push deploy.yml + bootstrap.sh (never .env)

The openclaw container gets all vars via `env_file: .env` in docker-compose.yml.

## Architecture Principles

- **Router stays lean**: SKILL.md is a thin command dispatcher, never generates content itself
- **Sub-agents are ephemeral**: Spun up per command, torn down after — keeps context small
- **All state in pipeline.json**: Single source of truth, only the router reads/writes it
- **Auto-validation gate**: Ideas must score >= 5.0 to stay `active`
- **Fail-fast chaining**: If any step in `approve` or `auto` fails, stop immediately and report
