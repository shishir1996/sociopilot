# Growvix Master Update — Phased Plan

This is a very large scope. I'll break it into 6 phases so each can be verified before moving on. **I recommend starting with Phase 1 + 2 immediately** since those address the "Generation Failed" error you're seeing right now and the user-side model exposure.

---

## Phase 1 — Fix "Generation Failed" + Hide AI from Users (IMMEDIATE)

**Diagnose the current edge function failure**
- Pull recent `generate-content` edge function logs to see the actual error (likely AI provider/key issue based on the toast message)
- Verify `ai_settings` row has a valid active provider + key, fix the failure mode

**Make generation resilient**
- Wrap AI call in retry loop (1 retry on same provider)
- On second failure, automatically switch to next healthy provider from `ai_providers` table (priority order)
- Add 30s timeout per request
- Validate response (non-empty, parseable JSON) before saving
- Always return `200 OK` with `{ ok, error, diagnostics }` (already the pattern)
- User-facing toast: only generic "Generating your content…" / "Content ready" / "Something went wrong, please try again" — never expose provider names or API errors

**Hide model selection from users**
- Remove provider/model dropdowns from AI Studio and any user-facing settings
- Keep them ONLY inside `AdminAIControlCenter`

**Files**: `supabase/functions/generate-content/index.ts`, `src/pages/AIStudio.tsx`, possibly `src/pages/ContentPage.tsx`

---

## Phase 2 — Admin AI Router & Provider Abstraction

- DB: extend `ai_providers` (priority, enabled, health_status, last_failure_at), add `provider_health_logs`, `ai_usage_logs`
- Build a `routeAIRequest()` helper in a shared edge function module: takes task type → picks healthiest enabled provider by priority → returns client + model
- Admin UI in `AdminAIControlCenter`: provider list with priority drag, enable toggle, health badge, recent failure log, usage/token counts per provider
- Add adapters for: OpenRouter, Gemini, Groq, Together, Anthropic, OpenAI, DeepSeek, MiniMax (uniform `chat()` interface)
- All existing edge functions (`generate-content`, `ai-generate-text`, `ai-generate-image`) refactored to call the router instead of hardcoded provider

---

## Phase 3 — Low-Cost Image Generation

- Add image providers to `ai_providers` (Together AI, OpenRouter, Stability)
- Models: FLUX Schnell (default), FLUX Dev, SDXL
- Wire into `generate-content`: after text generation, generate image prompt → call image router → store URL on content_item
- Admin can set default image model + fallback chain
- Storage: upload to Supabase Storage bucket `content-images`

---

## Phase 4 — Template-Based Video Generation

- New edge function `generate-video` that calls Remotion render service (will need external render host — Lambda or self-hosted; **flag to user: this requires infra decision**)
- Stock media: Pexels + Pixabay API integrations (need API keys via add_secret)
- Edge TTS for narration (free tier)
- 6 reusable templates: Educational, Motivational, Business Tips, Product Promo, Real Estate, Luxury Brand
- AI generates: hook, script, CTA, scene breakdown → Template engine assembles → render to 1080x1920 MP4 → store in `content-videos` bucket
- `video_templates` table in DB

**⚠️ Infra note**: Remotion rendering can't run inside Supabase Edge Functions (no FFmpeg, no Chromium). Options: (a) Remotion Lambda, (b) self-host on Cloudflare/Fly.io, (c) use Shotstack API. **Need your decision.**

---

## Phase 5 — Queue System

**⚠️ Reality check**: Redis + BullMQ require always-on Node infra (not available on Supabase). The project already uses `pg_cron` + Edge Functions for `auto-post`, which is functionally equivalent for our scale.

**My recommendation**: stick with `pg_cron` + a `queue_jobs` table (postgres-based queue) with status `pending/running/done/failed`, retry counter, and a worker edge function triggered every minute. Same result, no extra infra.

If you specifically want Redis/BullMQ, you'd need to host a Node worker separately (Railway/Fly.io). Let me know which path.

---

## Phase 6 — Payment Failure Automation

- Webhook handler (Razorpay/Stripe) updates `subscriptions.status`
- DB trigger or guard in `generate-content` / `auto-post`: if status ∈ {past_due, canceled, payment_failed} → block AI calls + pause queue jobs, but preserve user data
- Admin override toggle

---

## Out-of-scope clarifications

- **"Next.js / FastAPI / Cloudflare R2"** — your existing stack is Vite + React + Supabase. Switching frameworks is a full rewrite and not in scope of this update. I'll keep the existing stack and use Supabase Storage instead of R2 (equivalent for this use case).
- **LiteLLM** — runs as a separate Python service. The provider abstraction layer in Phase 2 gives you the same benefit inside edge functions without extra infra.

---

## Recommended order of execution

1. **Phase 1 now** (fixes your current error + removes user-side model exposure) — ~1 turn
2. **Phase 2 next** (admin router + abstraction) — foundation for everything else
3. Then 3 → 6 in order, each as a separate turn so we can verify

**Approve to start Phase 1 immediately**, or tell me which phases to skip/reorder. Also need decisions on:
- Video render infra (Lambda / self-host / Shotstack)?
- Queue system (postgres-based vs external Redis)?
- Pexels / Pixabay / Stability AI API keys (I'll request via secrets tool when we reach those phases)
