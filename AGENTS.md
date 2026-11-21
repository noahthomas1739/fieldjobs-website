# AGENTS.md

## Cursor Cloud specific instructions

FieldJobs is a single Next.js 15 app (not a monorepo). See `package.json` for scripts and `env.example` for required environment variables.

### Services

| Service | Required? | Notes |
|---------|-----------|-------|
| Next.js dev server (`npm run dev`) | Yes | Serves UI and `app/api/*` routes on port 3000 |
| Supabase (hosted) | Yes for core flows | Auth, Postgres (`jobs`, `profiles`, etc.), resume storage. No local DB container. |
| Stripe / Resend | Optional locally | Placeholder Stripe keys work for UI; real keys needed for checkout/email. |

### Environment setup

1. `cp env.example .env.local` and fill in values.
2. Minimum for job browse/auth: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
3. `npm run build` fails unless `Resend_API_KEY` is set (module-level `new Resend()` in `app/api/send-contact-email/route.js`). Use a placeholder like `re_placeholder_for_local_build` for local builds when email is not being tested.
4. Set `NEXT_PUBLIC_BASE_URL=http://localhost:3000` for local Stripe redirects and email links.
5. Code uses `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (not `STRIPE_PUBLIC_KEY` from `env.example`).

### Running the dev server

```bash
npm run dev
```

Runs on `http://localhost:3000`. Health check: `GET /api/health` (requires working Supabase). Env debug page: `/test-env`.

### Lint / test / build

```bash
npm run lint    # ESLint via next lint — no test suite in package.json
npm run build
npm start       # production server after build
```

### Automation scripts (optional)

Separate from the web app; require full Supabase + external API keys:

```bash
npm run jobs:aggregate
npm run leads:generate
npm run emails:send
```

Run `scripts/database-setup.sql` in the Supabase SQL Editor for automation tables (`scripts/README.md`).

### Gotchas

- Without valid Supabase credentials, the homepage UI loads but `/api/jobs` returns 500 and listings show "No jobs found".
- Stripe webhook testing locally needs Stripe CLI forwarding to `/api/stripe/webhook`.
- Email code reads `Resend_API_KEY` (capital R); some scripts use `RESEND_API_KEY`.
