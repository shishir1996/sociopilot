# Growvix Master Upgrade — Phased Plan

This is a very large upgrade. Existing platform already has: auth, AI provider routing + failover (Phase 1/2 done), content generation, schedule, AI Studio, dashboard, content menu, brand assets, Cashfree payments. This plan focuses on what is missing or needs restructuring, broken into shippable phases so each one can be verified.

## Out-of-scope clarifications

- **Tech stack stays as-is**: Vite + React + Tailwind + Shadcn + Supabase Edge Functions + Postgres. We will NOT migrate to Next.js / FastAPI / LiteLLM / Cloudflare R2 / Redis+BullMQ — these would mean rebuilding the project from scratch. We will achieve equivalent behavior on the existing stack (pg_cron + queue table for BullMQ, Supabase Storage for R2, our existing ai-router for LiteLLM).
- **Payments**: project currently uses Cashfree. The request asks for Razorpay Subscriptions. We will **add Razorpay Subscriptions alongside Cashfree** (admin can choose), not rip Cashfree out. India → Razorpay default, Global → Cashfree/Stripe.
- **Free plan**: will be removed from the public pricing flow (Basic + Pro only, both with 2-day trial). Existing `free_trial` data stays for legacy users.
- **Video generation via Remotion + FFmpeg + Pexels**: requires an external render host (Lambda/Fly/Shotstack) — Supabase Edge Functions cannot run FFmpeg/Chromium. Phase 5 will scaffold the edge function + DB schema + template definitions, and document the render host requirement (user will need to choose one).

## Phase A — Onboarding gating + pending-tasks dashboard (ship first)

**Goal**: enforce the linear flow Signup → Phone → Connect Social → Plan → Subscription → Dashboard, and show a setup progress bar.

1. New `onboarding_progress` table per user with booleans: `phone_verified`, `social_connected`, `plan_selected`, `subscription_active`, `brand_complete`, `ai_studio_configured`, `first_content_generated`, `automation_active`.
2. New route guard component `<OnboardingGate>` wrapping protected pages. Redirects to the first incomplete step.
3. New pages / refactors:
   - `/onboarding/phone` (OTP) — already partially exists in Auth flow, extract.
   - `/onboarding/connect` — at least 1 platform required.
   - `/onboarding/plan` — Basic / Pro (no Free).
   - `/onboarding/subscribe` — Razorpay/Cashfree checkout.
4. Dashboard: add `<SetupProgress>` card at top with the 5 tasks + progress bar; hides itself once all done.

## Phase B — Razorpay Subscriptions integration

1. Admin secrets: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` (requested via secrets tool when phase starts).
2. New tables: `razorpay_plans` (map plan_name+region → Razorpay plan_id), extend `subscriptions` with `razorpay_subscription_id`, `mandate_status`, `next_charge_at`.
3. New edge functions:
   - `razorpay-create-subscription` — creates subscription, returns checkout URL/short_url.
   - `razorpay-webhook` — handles `subscription.activated`, `subscription.charged`, `subscription.halted`, `payment.failed`, `subscription.cancelled`. Updates `subscriptions.status`. On failure → pause automation (see Phase D).
4. Frontend `/onboarding/subscribe` opens Razorpay checkout for India, falls back to Cashfree for global users (geo from existing geo_pricing).

## Phase C — Credit system + post quotas

1. New table `user_credits` (user_id, month_year, credits_total, credits_used, posts_used, expires_at).
2. Monthly reset cron (pg_cron 1st of month).
3. New `extra_pack_purchases` table; checkout flow for ₹2000 / $50 → +28 posts +1000 credits (one-time payment).
4. `generate-content` and regeneration paths: pre-flight `assertCredits()` → 402 friendly error → upgrade prompt.
5. Hard cap at 56 posts/month/user.
6. Update `UsageIndicators` to show credits + post quota + extra-pack CTA.

## Phase D — Subscription enforcement guards

1. Shared helper `requireActiveSubscription(userId)` used by `generate-content`, `auto-generate-weekly`, `auto-post`, `post-to-social`.
2. On `status ∈ {past_due, halted, cancelled, payment_failed}`: skip generation, skip auto-post, mark queued jobs `paused`, write notification "Subscription inactive — billing issue".
3. Data preserved; resume on next successful webhook.

## Phase E — Content date logic + Basic-plan single-platform lock

1. **Date fix**: in `generate-content` and `auto-generate-weekly`, compute Day 1 = today if `now() + 30min < todaysScheduledTime`; else next enabled schedule day. (Builds on the fix already done in earlier turn — verify it covers both manual + weekly cron.)
2. **Basic plan**: if `plan_name = 'basic'`, force `publishing_platforms = [firstSelected]` for all days; show "Upgrade to Pro for multi-platform" toast on attempts to add a 2nd.
3. **Pro plan**: per-day platform mapping (already supported via `posting_schedules.platforms[]`); if a scheduled platform isn't in `social_accounts`, redirect to `/settings` with banner.

## Phase F — Pro Brand Template system

1. New table `brand_templates` (user_id, name, colors jsonb, typography jsonb, shapes jsonb, logo_url, watermark_url, cta_style, background_style). Limit 2–5 per Pro user via trigger.
2. New page `/brand-templates` (Pro only).
3. Image/video generation pipeline reads active template → passes style hints into image prompt + future video render.

## Phase G — Template-based video engine (scaffold)

1. New edge function `generate-video` that:
   - Calls AI router for script (hook/scenes/CTA).
   - Fetches stock clips from Pexels + Pixabay (needs `PEXELS_API_KEY`, `PIXABAY_API_KEY`).
   - Generates voiceover via Edge TTS.
   - Sends render job to external Remotion host (config: `REMOTION_RENDER_URL`).
   - Stores MP4 in Supabase Storage bucket `content-videos`, sets `content_items.video_url`.
2. 6 template definitions in DB: `video_templates` table.
3. **Blocked on**: user choosing a render host (AWS Lambda + Remotion Lambda, self-hosted on Fly.io, or Shotstack API). Will request decision when starting Phase G.

## Phase H — Admin Payment Configuration panel

1. New page `/admin/payments` listing: Razorpay keys (managed via Secrets), Cashfree keys, webhook URLs (read-only copy buttons), subscription plan mappings (`razorpay_plans` CRUD), currency + tax % settings (`payment_settings` table).
2. Tax % applied at checkout creation in both Razorpay + Cashfree edge functions.

## Phase I — Queue system on Postgres (BullMQ-equivalent)

1. New table `job_queue` (id, type, payload jsonb, status, attempts, run_at, locked_until). Types: `publish_post`, `generate_image`, `generate_video`, `regen_content`.
2. Worker edge function `queue-worker` invoked every minute by pg_cron, claims up to N due jobs with `FOR UPDATE SKIP LOCKED`, retries with exponential backoff (max 3).
3. Migrate `auto-post` to enqueue instead of direct call.

## Technical notes

- Provider routing + failover already exists (`_shared/ai-router.ts`). Phases C/E/F just call existing router — no model selection ever surfaced to end users (AI Studio model dropdowns were already removed in Phase 1).
- All new edge functions follow the established pattern: return 200 OK with `{ ok, error, diagnostics }`, generic user-facing messages, full detail in logs.
- All new tables include RLS: `auth.uid() = user_id` for user-owned rows; admin via `has_role(auth.uid(),'admin')`.

## Recommended shipping order

A (onboarding) → B (Razorpay) → D (enforcement) → C (credits) → E (date/basic-plan) → H (admin payments) → F (templates) → I (queue) → G (video).

Each phase is its own turn so we can verify before moving on. Phase A is the smallest user-visible win and unblocks everything else.

## Pending decisions before starting

1. **Razorpay account** — do you have one, or should we proceed assuming you'll create one and add the keys when prompted?
2. **Video render host** for Phase G (defer until we reach G).
3. **Confirm**: keep Cashfree for non-India users alongside Razorpay? (yes = recommended)

Reply "go" to start Phase A, or specify a different phase to start with.
