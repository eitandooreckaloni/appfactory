# AppFactory Skill

An idea-to-spec pipeline for shipping small apps fast. Talk to it via Telegram through OpenClaw.

## Architecture

```
User (Telegram)
    |
    v
OpenClaw  -->  AppFactory Router (SKILL.md)
                   |
                   |-- ideas     -->  Scout Agent    --> JSON ideas
                   |-- rank      -->  Ranker Agent   --> JSON scores
                   |-- spec N    -->  PM Agent       --> JSON spec
                   |-- approve N -->  Builder Agent  --> GitHub repo scaffold
                   |-- build N   -->  Builder Agent  --> GitHub repo scaffold (manual retry)
                   |-- kill N    -->  (router handles directly)
                   |
                   v
              pipeline.json  (all state lives here)
```

**Key principle:** OpenClaw's context window stays lean. The router parses commands, dispatches to sub-agents, and relays short summaries. All heavy thinking happens in sub-agent contexts that are spun up and torn down per command.

## Commands

```
ideas              Scout generates 5 new app ideas
rank               Ranker scores and ranks all active ideas
spec <number>      PM writes a full build spec for idea #N
approve <number>   Approve idea #N, then Builder scaffolds & pushes to GitHub
build <number>     Manually (re-)trigger Builder for idea #N
kill <number>      Router removes idea #N
```

## Workflow

```
ideas  -->  rank  -->  spec  -->  approve  -->  Builder (auto)
                        |                          |
                        v                          v
                      kill                    [ready for /develop]
```

## Data Flow

1. **ideas** -- Router dispatches to Scout. Scout returns 5 idea objects (JSON). Router assigns IDs, sets `status: "active"`, appends to `pipeline.json`.
2. **rank** -- Router sends active ideas to Ranker. Ranker returns scores. Router merges `ranking` into each idea in `pipeline.json`.
3. **spec N** -- Router sends idea #N to PM. PM returns full spec. Router saves to `specs/spec-N.json`, sets status to `specced`.
4. **approve N** -- Router validates idea is `specced`, sets status to `building`, dispatches to Builder with idea + spec. Builder scaffolds a Next.js project and pushes to GitHub. Router stores `repo_url` and sets status to `built`.
5. **build N** -- Manual re-trigger of the Builder for ideas with status `approved` or `building` (e.g., if auto-build failed).
6. **kill N** -- Router sets status to `killed` in `pipeline.json`. No sub-agent needed.

## File Structure

```
appfactory/
├── SKILL.md                      # Router agent (loaded by OpenClaw)
├── agents/
│   ├── scout/
│   │   └── SKILL.md              # Idea generation agent
│   ├── ranker/
│   │   └── SKILL.md              # Scoring and ranking agent
│   ├── pm/
│   │   └── SKILL.md              # Spec writing agent
│   └── builder/
│       └── SKILL.md              # Project scaffolding agent
├── schemas/
│   ├── idea.schema.json          # JSON schema for idea output
│   ├── spec.schema.json          # JSON schema for spec output
│   └── build.schema.json         # JSON schema for builder output
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
  "next_id": 6,
  "ideas": [
    {
      "id": 1,
      "status": "active",
      "name": "SnapInvoice",
      "one_liner": "Photo-to-invoice in 10 seconds",
      "confidence": { "score": 7, "justification": "..." },
      "ranking": { "weighted_score": 7.15, "pain": 9, "..." : "..." }
    }
  ]
}
```

Approved specs are saved separately at `workspace/appfactory/specs/spec-<N>.json`.

## Why Sub-Agents?

| Concern | Without sub-agents | With sub-agents |
|---------|--------------------|-----------------|
| Context window | Grows with every command | Router stays lean, sub-agents are ephemeral |
| Prompt quality | One giant prompt does everything poorly | Each agent has a focused, testable prompt |
| Modularity | Monolith | Swap or upgrade agents independently |
| Cost | Large context = expensive tokens | Small router context + short-lived sub-agent contexts |
| Future scaling | Hard to parallelize | Can run Scout + Ranker in parallel later |
