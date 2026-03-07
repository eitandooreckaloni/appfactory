# AppFactory Skill

An autonomous idea-to-deployment pipeline for shipping small apps fast. Talk to it via Telegram through OpenClaw.

## Architecture

```
User (Telegram)
    |
    v
OpenClaw  -->  AppFactory Router (SKILL.md)
                   |
                   |-- ideas ---------> Researcher --> Scout --> Ranker (auto-filter)
                   |-- ideas <topic> -> Researcher --> Scout --> Ranker (auto-filter)
                   |-- refine N ------> Scout (refine) --> Ranker (auto-filter)
                   |-- rank ----------> Ranker Agent   --> JSON scores
                   |-- spec N --------> PM Agent       --> JSON spec
                   |-- design N ------> Designer Agent --> JSON design spec
                   |-- approve N -----> Builder --> Developer --> QA (auto-chain)
                   |-- build N -------> Builder Agent  --> GitHub repo scaffold
                   |-- develop N -----> Developer Agent --> implemented code
                   |-- qa N ----------> QA Agent       --> pass/fail verdict
                   |-- deploy N ------> Deployer Agent --> Vercel live URL
                   |-- auto [topic] --> full pipeline (ideas → spec → design → build → develop → qa → deploy)
                   |-- kill N --------> (router handles directly)
                   |
                   v
              pipeline.json  (all state lives here)
```

**Key principle:** OpenClaw's context window stays lean. The router parses commands, dispatches to sub-agents, and relays short summaries. All heavy thinking happens in sub-agent contexts that are spun up and torn down per command.

## Commands

```
ideas              Research trends, generate 5 ideas, auto-validate (score >= 5.0)
ideas <topic>      Same as above, focused on a topic
refine <N> "text"  Iterate on idea #N with feedback, auto-validate
rank               Manually re-rank all active ideas
spec <number>      PM writes a full build spec for idea #N
design <number>    Designer creates a design system for idea #N
approve <number>   Approve #N, then auto-chain: scaffold → implement → QA
build <number>     Manually (re-)trigger Builder for idea #N
develop <number>   Manually (re-)trigger Developer for idea #N
qa <number>        Manually (re-)trigger QA for idea #N
deploy <number>    Deploy idea #N to Vercel
auto               Full autonomous pipeline: ideas → spec → design → build → develop → qa → deploy
auto <topic>       Same as auto, focused on a topic
kill <number>      Router removes idea #N
```

## Workflow

```
                                   auto (runs everything below)
                                          |
ideas  -->  [research → generate → rank → filter]  -->  spec  -->  design  -->  approve  -->  deploy
                                              |           |          |             |             |
                                              v           v          v             v             v
                                       refine/kill      kill       kill    [build→develop→qa]  LIVE
```

## Pipeline Agents

| Agent | Role | Input | Output |
|-------|------|-------|--------|
| **Researcher** | Web search for market signals | Topic or broad query | Research brief (trends, pain points, gaps) |
| **Scout** | Generate app ideas | User context + research brief | 5 idea objects (or 1 in refine mode) |
| **Ranker** | Score and rank ideas | Active ideas | Weighted scores + recommendations |
| **PM** | Write detailed build spec | Single idea object | Full spec (pages, components, API, DB schema) |
| **Designer** | Create design system | PM spec | Design spec (colors, typography, components, motion) |
| **Builder** | Scaffold Next.js project | Idea + spec + design | GitHub repo with stub files |
| **Developer** | Implement all code | Idea + spec + design + scaffold | Working app with all TODOs filled in |
| **QA** | Validate the build | Idea + spec + developer output | Pass/fail verdict with issues list |
| **Deployer** | Deploy to Vercel + Supabase | Idea + spec + QA output | Live URL |

## Data Flow

1. **ideas** -- Router runs a 3-step pipeline: Researcher gathers market signals (saved to `research.json`), Scout generates 5 ideas grounded in research, Ranker scores them. Ideas scoring >= 5.0 stay `active`; below 5.0 become `filtered`. User sees only passing ideas.
2. **refine N "feedback"** -- Router sends idea #N + feedback + cached research to Scout in refinement mode. Scout returns 1 refined idea. Original is marked `superseded`. Refined idea is auto-ranked and filtered.
3. **rank** -- Router sends active ideas to Ranker. Ranker returns scores. Router merges `ranking` into each idea in `pipeline.json`.
4. **spec N** -- Router sends idea #N to PM. PM returns full spec. Router saves to `specs/spec-N.json`, sets status to `specced`.
5. **design N** -- Router sends the spec to Designer. Designer returns a design system. Router saves to `designs/design-N.json`, sets status to `designed`.
6. **approve N** -- Router validates idea is `designed`, then auto-chains three agents: Builder scaffolds the repo, Developer implements all stubs, QA validates the result. Status progresses: `building` → `built` → `developed` → `qa_pass` (or `qa_fail`).
7. **build N** -- Manual re-trigger of Builder (e.g., if auto-build failed).
8. **develop N** -- Manual re-trigger of Developer (e.g., if implementation had issues).
9. **qa N** -- Manual re-trigger of QA.
10. **deploy N** -- Router sends the QA-validated app to Deployer. Deployer creates a Vercel project, sets env vars, deploys, provisions Supabase, and runs a smoke test. Status becomes `deployed` with a `live_url`.
11. **auto [topic]** -- Runs the entire pipeline autonomously: ideas → pick top → spec → design → approve (build → develop → QA) → deploy. Reports progress at each step. Stops on any failure.
12. **kill N** -- Router sets status to `killed` in `pipeline.json`. No sub-agent needed.

## File Structure

```
appfactory/
├── SKILL.md                      # Router agent (loaded by OpenClaw)
├── agents/
│   ├── researcher/
│   │   └── SKILL.md              # Market research agent (web search)
│   ├── scout/
│   │   └── SKILL.md              # Idea generation agent (+ refinement mode)
│   ├── ranker/
│   │   └── SKILL.md              # Scoring and ranking agent
│   ├── pm/
│   │   └── SKILL.md              # Spec writing agent
│   ├── designer/
│   │   └── SKILL.md              # Design system agent
│   ├── builder/
│   │   └── SKILL.md              # Project scaffolding agent
│   ├── developer/
│   │   └── SKILL.md              # Code implementation agent
│   ├── qa/
│   │   └── SKILL.md              # Build validation agent
│   └── deployer/
│       └── SKILL.md              # Vercel deployment agent
├── schemas/
│   ├── idea.schema.json          # JSON schema for idea output
│   ├── research.schema.json      # JSON schema for research brief
│   ├── spec.schema.json          # JSON schema for spec output
│   ├── design.schema.json        # JSON schema for design spec
│   ├── build.schema.json         # JSON schema for builder output
│   ├── develop.schema.json       # JSON schema for developer output
│   ├── qa.schema.json            # JSON schema for QA output
│   └── deploy.schema.json        # JSON schema for deployer output
├── prompts/
│   ├── system.md                 # Shared principles (referenced by sub-agents)
│   ├── ideate.md                 # Supplementary ideation guidance
│   ├── rank.md                   # Ranking formula reference
│   ├── spec.md                   # Spec writing reference
│   └── build.md                  # Scaffold conventions reference
└── README.md                     # This file
```

## State

All pipeline state lives in `workspace/appfactory/pipeline.json`:

```json
{
  "next_id": 8,
  "ideas": [
    {
      "id": 1,
      "status": "deployed",
      "name": "SnapInvoice",
      "one_liner": "Photo-to-invoice in 10 seconds",
      "confidence": { "score": 7, "justification": "..." },
      "ranking": { "weighted_score": 7.15, "pain": 9, "..." : "..." },
      "research_grounding": ["HN complaints about slow invoicing"],
      "repo_url": "https://github.com/owner/snap-invoice",
      "developer_output": { "build_status": "pass", "files_implemented": ["..."] },
      "qa_output": { "verdict": "pass", "summary": "All checks passed." },
      "live_url": "https://snap-invoice.vercel.app"
    }
  ]
}
```

### Status Values

| Status | Meaning |
|--------|---------|
| `active` | Idea passed ranking filter, ready for spec |
| `filtered` | Scored below 5.0, hidden from user |
| `superseded` | Replaced by a refined version |
| `specced` | PM has written a build spec |
| `designed` | Designer has created a design system |
| `building` | Builder is scaffolding the repo |
| `built` | Scaffold pushed to GitHub |
| `developed` | Developer has implemented all code |
| `qa_pass` | QA validated, ready to deploy |
| `qa_fail` | QA found issues, needs fixing |
| `deployed` | Live on Vercel |
| `killed` | Manually removed by user |

### Additional State Files

- `workspace/appfactory/research.json` -- Most recent research brief (cached for `refine`)
- `workspace/appfactory/specs/spec-<N>.json` -- PM specs
- `workspace/appfactory/designs/design-<N>.json` -- Design specs

## Why Sub-Agents?

| Concern | Without sub-agents | With sub-agents |
|---------|--------------------|-----------------|
| Context window | Grows with every command | Router stays lean, sub-agents are ephemeral |
| Prompt quality | One giant prompt does everything poorly | Each agent has a focused, testable prompt |
| Modularity | Monolith | Swap or upgrade agents independently |
| Cost | Large context = expensive tokens | Small router context + short-lived sub-agent contexts |
| Future scaling | Hard to parallelize | Can run Scout + Ranker in parallel later |
