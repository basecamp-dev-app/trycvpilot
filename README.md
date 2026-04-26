# TryCVPilot

Production-oriented skeleton for a paid AI web app that generates bespoke job application materials from user-supplied evidence.

## Stack

- Next.js App Router with TypeScript
- Tailwind CSS
- Supabase Auth and Postgres
- Stripe planned for subscriptions
- Upstash planned for route rate limiting
- OpenAI or Anthropic planned for generation

## Current Deliverable

- Landing, pricing, privacy, and terms pages
- Supabase magic-link and Google sign-in UI
- Protected dashboard, generation, and billing pages
- Paste-per-generation form with character counts and privacy notice
- Placeholder `/api/generate` route with auth, validation, usage checks, and no sensitive persistence
- Supabase migration for `profiles`, `subscriptions`, and `usage_events`
- Security headers and environment example

## Privacy Model

Evidence banks, job descriptions, application questions, generated CVs, cover letters, and answers are not saved to the database. The generation route processes request content transiently and returns generated content to the browser for editing.

Supabase stores only non-sensitive account, subscription, and usage metadata.

## Setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and fill the Supabase values.
3. Run the Supabase migration in `supabase/migrations/0001_initial_schema.sql`.
4. Enable Supabase Email magic links and Google OAuth.
5. Add auth callback URLs in Supabase:
   - `http://localhost:3000/auth/callback`
   - `https://your-domain.com/auth/callback`
6. Run `npm run dev`.

## Required Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PRICE_PRO=
STRIPE_PRICE_PRO=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
OPENAI_API_KEY=
APP_URL=
```

## Next Phases

- Add Upstash IP rate limiting on `/api/generate`
- Add strict evidence-only AI provider call and JSON parsing
- Add editable export flows for PDF and DOCX
- Add Stripe Checkout, Customer Portal, and webhook subscription sync
- Add tests for usage limits, subscription checks, auth gating, and no sensitive persistence
