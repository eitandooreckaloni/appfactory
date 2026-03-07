# Build Prompt — Scaffold Conventions

## File Naming

- Page files: `app/<route>/page.tsx` (use the route path directly, strip leading `/`)
- API routes: `app/api/<path>/route.ts` (strip `/api/` prefix from endpoint path)
- Components: `components/<PascalCaseName>.tsx` (match spec component name exactly)
- Lib files: `lib/<name>.ts` (lowercase, kebab-case)

## Stub Content

### Page stubs
```tsx
export default function PageName() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Page Name</h1>
      {/* TODO: Implement <purpose from spec> */}
    </main>
  );
}
```

### API route stubs
```ts
import { NextResponse } from "next/server";

// TODO: Implement <description from spec>
export async function METHOD(request: Request) {
  // TODO: Verify auth (if auth_required)
  return NextResponse.json({ message: "Not implemented" }, { status: 501 });
}
```

### Component stubs
```tsx
interface ComponentNameProps {
  // Props from spec
}

export default function ComponentName({ ...props }: ComponentNameProps) {
  // TODO: Implement <behavior from spec>
  return <div>ComponentName</div>;
}
```

## SQL Generation

- Map spec types to PostgreSQL: `uuid`, `text`, `timestamp`, `integer`, `boolean`, `jsonb`
- Constraints: `PK` -> `PRIMARY KEY`, `NOT NULL` -> `NOT NULL`, `UNIQUE` -> `UNIQUE`
- Foreign keys: `FK:table.col` -> `REFERENCES table(col) ON DELETE CASCADE`
- Defaults: `now()` -> `DEFAULT now()`, `gen_random_uuid()` -> `DEFAULT gen_random_uuid()`
- Add `created_at TIMESTAMP DEFAULT now()` to every table if not already present
- Wrap in a transaction: `BEGIN; ... COMMIT;`

## package.json Defaults

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  }
}
```

Always pin to latest stable versions. Use `^` prefix for semver ranges.

## GitHub

- Repo should be public
- Single commit with all files
- Commit message: `feat: initial scaffold from AppFactory`
- Default branch: `main`
