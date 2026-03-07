# AppFactory Skill

An idea-to-spec pipeline for shipping small apps fast. Talk to it via Telegram through OpenClaw.

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
                   |-- approve N -----> Builder Agent  --> GitHub repo scaffold
                   |-- build N -------> Builder Agent  --> GitHub repo scaffold (retry)
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
approve <number>   Approve idea #N, then Builder scaffolds & pushes to GitHub
build <number>     Manually (re-)trigger Builder for idea #N
kill <number>      Router removes idea #N
```

## Workflow

```
ideas  -->  [auto: research -> generate -> rank -> filter]  -->  spec  -->  approve  -->  Builder
                                                      |           |                        |
                                                      v           v                        v
                                               refine/kill      kill                [ready for /develop]
```

## Data Flow

1. **ideas** -- Router runs a 3-step pipeline: Researcher gathers market signals (saved to `research.json`), Scout generates 5 ideas grounded in research, Ranker scores them. Ideas scoring >= 5.0 stay `active`; below 5.0 become `filtered`. User sees only passing ideas.
2. **refine N "feedback"** -- Router sends idea #N + feedback + cached research to Scout in refinement mode. Scout returns 1 refined idea. Original is marked `superseded`. Refined idea is auto-ranked and filtered.
3. **rank** -- Router sends active ideas to Ranker. Ranker returns scores. Router merges `ranking` into each idea in `pipeline.json`.
4. **spec N** -- Router sends idea #N to PM. PM returns full spec. Router saves to `specs/spec-N.json`, sets status to `specced`.
5. **approve N** -- Router validates idea is `specced`, sets status to `building`, dispatches to Builder with idea + spec. Builder scaffolds a Next.js project and pushes to GitHub. Router stores `repo_url` and sets status to `built`.
6. **build N** -- Manual re-trigger of the Builder for ideas with status `approved` or `building` (e.g., if auto-build failed).
7. **kill N** -- Router sets status to `killed` in `pipeline.json`. No sub-agent needed.

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
│   └── builder/
│       └── SKILL.md              # Project scaffolding agent
├── schemas/
│   ├── idea.schema.json          # JSON schema for idea output
│   ├── spec.schema.json          # JSON schema for spec output
│   ├── build.schema.json         # JSON schema for builder output
│   └── research.schema.json      # JSON schema for research brief
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
      "status": "active",
      "name": "SnapInvoice",
      "one_liner": "Photo-to-invoice in 10 seconds",
      "confidence": { "score": 7, "justification": "..." },
      "ranking": { "weighted_score": 7.15, "pain": 9, "..." : "..." },
      "research_grounding": ["HN complaints about slow invoicing", "freelancer pain points on Reddit"]
    },
    {
      "id": 5,
      "status": "filtered",
      "name": "LowScoreApp",
      "ranking": { "weighted_score": 3.8, "..." : "..." }
    },
    {
      "id": 7,
      "status": "active",
      "name": "SnapInvoice Pro",
      "refined_from": 1,
      "refinement_feedback": "focus on contractors not freelancers",
      "ranking": { "weighted_score": 7.9, "..." : "..." }
    }
  ]
}
```

Additional state files:
- `workspace/appfactory/specs/spec-<N>.json` -- Approved specs
- `workspace/appfactory/research.json` -- Most recent research brief (cached for `refine`)

## Why Sub-Agents?

| Concern | Without sub-agents | With sub-agents |
|---------|--------------------|-----------------|
| Context window | Grows with every command | Router stays lean, sub-agents are ephemeral |
| Prompt quality | One giant prompt does everything poorly | Each agent has a focused, testable prompt |
| Modularity | Monolith | Swap or upgrade agents independently |
| Cost | Large context = expensive tokens | Small router context + short-lived sub-agent contexts |
| Future scaling | Hard to parallelize | Can run Scout + Ranker in parallel later |
