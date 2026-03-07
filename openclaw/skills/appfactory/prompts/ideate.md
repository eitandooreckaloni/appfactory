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
