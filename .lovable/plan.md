This is a very large request spanning OAuth for 8+ providers, AI infrastructure, dynamic model fetching, and a full Google My Business product. Implementing it all "completely and correctly" in one shot is not realistic — each platform requires its own OAuth app credentials (Client ID/Secret) from you, and GMB alone is a multi-week feature. I'll deliver it in clearly-scoped phases, asking only for credentials when blocked.

## Phase 1 — Ship now (no new credentials needed)

**Fix 1: Instagram connect**
- Update `SocialConnectWidget` and `SocialSettings` so the Connect Instagram button passes `platform: 'instagram'` (not `'facebook'`) into `social-oauth`.
- Update `social-oauth` edge function: when state.platform === 'instagram', use Facebook OAuth flow under the hood but persist the row with `platform = 'instagram'` and IG-specific fields (ig_account_id, ig_username) in `social_accounts`. Facebook stays `platform = 'facebook'` with FB page fields.
- Result: each card shows its own Connected/Disconnect state.

**Fix 2: AI 401 hardening**
- Audit `ai-generate-text`, `ai-generate-image`, `generate-content` to confirm: keys come only from Deno.env / `ai_provider_settings.api_key_secret_name`; Authorization header is `Bearer ${key}`; never read from client.
- Add structured 200-OK error responses with friendly `error` + `diagnostics` (matches our existing pattern) instead of bubbling raw 401.
- Add a "Test Key" button in `AdminAIControlCenter` that calls a new `ai-validate-key` edge function which pings the provider's models endpoint and returns ok/fail + reason.

**Fix 4 (partial): Add platform cards to UI**
- Add cards for Twitter/X, Pinterest, TikTok, Threads, Reddit, Tumblr, Snapchat Business, Google Business Profile, plus a disabled "YouTube — Coming Soon" card.
- For platforms we don't yet have OAuth secrets for, the card shows "Not configured — admin setup required" (same pattern used today for unconfigured platforms). The composer/scheduler already filters by connected platforms, so this just works.

**Fix 5 (partial): Plan-gating + GMB tab shell**
- Add a Google My Business tab to the dashboard that is locked behind Basic/Pro using existing `usePlanLimits`. Free users see the upgrade overlay.
- Inside the tab, show "Connect Google My Business" wired through the same `social-oauth` flow with scope `business.manage` (Google OAuth credentials are already managed by Lovable Cloud).
- Admin portal: add a "Google My Business" panel under admin showing connected user count and a sortable user table (data we have today). Per-plan toggle added to plan limits.

## Phase 2 — Needs your input (one message after Phase 1 lands)

For each of these I need OAuth Client ID + Client Secret from the platform's developer portal. I'll request them via the secure secret prompt in batches:

```text
Twitter/X        TWITTER_CLIENT_ID, TWITTER_CLIENT_SECRET
Pinterest        PINTEREST_CLIENT_ID, PINTEREST_CLIENT_SECRET
TikTok           TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET
Threads          THREADS_CLIENT_ID, THREADS_CLIENT_SECRET
Reddit           REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET
Tumblr           TUMBLR_CONSUMER_KEY, TUMBLR_CONSUMER_SECRET
Snapchat Biz     SNAPCHAT_CLIENT_ID, SNAPCHAT_CLIENT_SECRET
```

Once a secret pair is provided, I'll wire up the matching branch in `social-oauth` (auth URL, token exchange, profile fetch) and persist to `social_accounts`.

**Fix 3: Dynamic model selection per provider**
- Schema change: extend `ai_provider_settings` (or add `ai_provider_models`) with `available_models jsonb`, `selected_text_models text[]`, `selected_image_models text[]`, `selected_video_models text[]`.
- New edge function `ai-list-models` that, given a provider + stored key, calls the provider's list-models endpoint:
  - OpenRouter: `GET https://openrouter.ai/api/v1/models` (returns id, context_length, pricing.prompt/completion).
  - OpenAI: `GET https://api.openai.com/v1/models`.
  - Anthropic: hardcoded curated list (no public list endpoint).
  - Gemini: `GET https://generativelanguage.googleapis.com/v1beta/models`.
- Admin UI: provider dropdown → spinner → three multi-select panels (Text / Image / Video) with name, context window, pricing. Save persists selected arrays.
- User-facing model pickers in AI Studio read from `selected_*_models` instead of a hardcoded list.

## Phase 3 — Full Google My Business product

This is the largest piece. After Phase 1 ships the connect + tab + lock:
- Schema: `gmb_profiles` (business_id, gmb_location_id, name, address, phone, website, category, rating, review_count, photo_count, completeness_score, verified, published, last_synced_at), `gmb_reviews`, `gmb_qa`, `gmb_optimizations`.
- Edge functions:
  - `gmb-sync` — pulls location, reviews, Q&A, photos via Business Profile APIs.
  - `gmb-optimize` — runs AI to draft description + 10 local SEO keywords.
  - `gmb-push` — PATCHes location fields back to Google.
- UI: dashboard tab with the full data list you described, "Optimize Profile" full-screen panel with completeness bar, checklist of missing fields with inline editors, AI-generated description, keyword suggestions, local SEO tips, "Push Updates" button, before/after score comparison.
- Admin: connected count, avg completeness, optimizations this month, sortable user table, per-plan GMB toggle.

Note: Google's Business Profile APIs are gated — your Google Cloud project must be approved by Google for `business.manage` scope before live data flows. I'll wire the integration so it works the moment approval lands; until then it will show "Awaiting Google API approval".

## What I need from you to start

Just reply "go" and I'll ship Phase 1 immediately. After Phase 1 is in preview I'll come back with the secret prompts for Phase 2 and the migration for Phase 3.