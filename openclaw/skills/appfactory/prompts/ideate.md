# Ideate Prompt

Generate 5 app ideas. For each idea, follow this process:

1. **Identify a pain point** -- Think about what annoys people, what takes too long, what people complain about on Twitter/Reddit/HN.
2. **Validate timing** -- Is there a new API, platform change, cultural moment, or technology shift that makes this idea viable NOW in a way it wasn't 6 months ago?
3. **Scope the MVP** -- What's the absolute minimum version that delivers value? No more than 3 features.
4. **Design the viral loop** -- How does using the product lead to other people discovering it? (Shared output, embeds, referrals, public profiles, etc.)
5. **Estimate build time** -- Be honest. Include auth, deployment, and basic polish. If it's more than 5 days for an experienced full-stack dev, the scope is too big.

## Output

For each idea, produce ALL of these fields:

- **name**: Short, memorable product name
- **one_liner**: What it does in one sentence (max 15 words)
- **user_problem**: Who uses it and what pain it solves
- **why_now**: The trend or catalyst making this timely
- **mvp_scope**: Array of 1-3 features for v1
- **viral_loop**: How users bring in more users
- **stack**: Object with frontend, backend, database, hosting
- **build_time**: Estimated time (e.g., "3 days", "1 week")
- **confidence**: Integer 1-10 with justification

If the user has mentioned interests, preferences, or constraints, incorporate them. Otherwise, draw from the trends listed in system.md.

## Using Research Context

When a research brief is provided:

1. **Prioritize evidenced pain points** -- Ideas grounded in real complaints/frustrations from the research should come first.
2. **Reference specific signals** -- In `why_now`, cite the trend or pain point from the research that makes this timely.
3. **Fill `research_grounding`** -- For each idea, include 1-3 short strings describing which research signals informed it (e.g., "HN complaints about slow invoicing", "Reddit freelancers wanting auto-contracts").
4. **Avoid duplicating recent launches** -- If the research shows a recent launch doing something similar, differentiate or skip.

## Refinement Mode

When refining an existing idea with user feedback:

1. **Read the original idea carefully** -- Understand its strengths and weaknesses.
2. **Apply the feedback precisely** -- Change what the user asked to change, keep what works.
3. **Produce exactly 1 idea** -- Not 5. The refined idea replaces the original.
4. **Maintain schema compliance** -- All required fields must be present and valid.
5. **Populate `research_grounding`** -- If research context is available, ground the refinement in it.
