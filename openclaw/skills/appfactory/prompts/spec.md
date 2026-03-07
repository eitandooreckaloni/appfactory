# Spec Prompt

Produce a complete build spec for the selected idea. This spec should be detailed enough that a developer can start coding immediately without further questions.

## Sections

### 1. Pages
List every route/screen in the app:
- Route path (e.g., `/dashboard`, `/api/webhooks`)
- Purpose (one sentence)
- Auth required? (yes/no)
- Key UI elements

### 2. Components
List reusable UI components:
- Component name (PascalCase)
- Props with types
- Behavior description
- Where it's used (which pages)

### 3. Backend
- API endpoints: method, path, request/response shape, auth
- Business logic: key algorithms or workflows
- External services: APIs, webhooks, cron jobs
- Auth flow: sign-up, sign-in, session management

### 4. DB Schema
For each table:
- Table name
- Columns: name, type, constraints (PK, FK, unique, nullable, default)
- Indexes
- Relationships (one-to-many, many-to-many)

Use Supabase/PostgreSQL types unless the idea requires something else.

### 5. Analytics Events
List 5-10 key events to track:
- Event name (snake_case)
- When it fires
- Properties included
- Why it matters (what decision it informs)

### 6. Deployment Checklist
Ordered steps from code-complete to live:
1. Environment setup (env vars, secrets)
2. Database provisioning and migrations
3. Build and deploy commands
4. DNS / domain configuration
5. Monitoring and error tracking setup
6. Smoke test checklist (manual checks before announcing)

## Guidelines
- Be specific. "Add auth" is not a spec -- "Supabase Auth with magic link, Google OAuth, and email/password" is.
- Include edge cases: what happens on empty state, error state, rate limiting.
- If the MVP scope from the idea has more than 3 features, push back and trim.
- Don't spec features that aren't in the MVP. Add a "Future considerations" section at the end for post-launch ideas.
