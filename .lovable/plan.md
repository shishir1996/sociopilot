# Growvix Workflow Overhaul Plan

This is a multi-system overhaul touching onboarding, scheduling, content generation, and the content UI. I'll break it into phases so each can be verified before the next.

## Phase 1 — Plan-Based Publishing Platform Restriction

**Onboarding: new final step "Publishing Platform Selection"**
- After connecting platforms, add a step asking: *"Which platform do you want to use for automated publishing?"*
- Free Trial / Basic → single-select (radio) limited to ONE platform
- Pro → multi-select allowed
- Persist selection into `posting_schedules` (apply chosen platform to all 7 days for trial/basic users automatically)

**Schedule Settings page enforcement**
- In `ScheduleSettings.tsx`, read `usePlanLimits` plan name
- If `free_trial` or `basic`: lock platform choice across all days to the single selected platform. Clicking a different platform on any day shows the `UpgradeModal` ("Upgrade to Pro to publish across multiple platforms")
- Pro: keep current multi-platform per-day behavior
- Add platforms: Threads, YouTube to the `PLATFORMS` list

## Phase 2 — Date-Aware Generation (Today-First, Timezone-Aware)

**Edge function `generate-content`**
- Replace Monday-based day mapping with a dynamic algorithm:
  1. Compute "now" in the business `timezone`
  2. For each enabled `posting_schedule` row (sorted by next occurrence):
     - For today: include only if `now <= scheduled_time - 30 min`; otherwise skip to next week
     - For other days: take the next occurrence within the next 7 days
  3. Map generated items to those concrete dates in order (Day 1 = earliest)
- Save `scheduled_at` (UTC), `primary_platform`, `secondary_platforms`, `status='scheduled'` on every item that has a matching schedule slot
- Items without a slot remain `draft`

**Mirror the same algorithm in `auto-generate-weekly`** (drop the hardcoded "next Monday" logic)

## Phase 3 — Platform-Specific AI Prompting

In `generate-content`, build the per-item prompt using the assigned platform:
- LinkedIn → professional, long-form, thought leadership
- X/Twitter → concise, viral hook, ≤280 chars
- Instagram → emotional caption, hashtag-rich, visual CTA
- Facebook → conversational, shareable
- Threads → casual, conversational thread style
- YouTube → video script / community post tone
- GMB → local SEO, offer-driven

Each day's content is generated against the platform assigned to that day (not generic).

## Phase 4 — Content Card UI Update

In `ContentPage.tsx` / `ContentCard.tsx`:
- Show platform icon + name, scheduled date (e.g., "Saturday, 18 May 2026"), scheduled time (e.g., "7:00 PM"), status badge, and auto-publish indicator
- Status badges: Draft, Scheduled, Published, Failed, Awaiting Approval

## Phase 5 — Auto-Publish / Approval Toggle

- Add `auto_publish_enabled` and `approval_required` booleans on `businesses` (or a settings row)
- If `auto_publish_enabled = true` → newly generated items go straight to `scheduled`
- If `approval_required = true` → status `awaiting_approval` instead; user must approve to move to `scheduled`
- Surface the toggle on the Schedule page

## Technical Details

**DB migration**
- `businesses`: add `auto_publish_enabled boolean default true`, `approval_required boolean default false`
- `content_items`: extend `status` allowed values to include `awaiting_approval` (text column, no enum change needed)

**Files to edit**
- `src/pages/BusinessSetup.tsx` (or onboarding wizard) — add Publishing Platform Selection step
- `src/pages/ScheduleSettings.tsx` — plan-based platform locking, add Threads/YouTube, auto-publish/approval toggles
- `src/hooks/usePlanLimits.ts` — expose `canMultiPlatform` helper
- `src/pages/ContentPage.tsx` + `src/components/ContentCard.tsx` — new card layout with platform/date/time/status
- `supabase/functions/generate-content/index.ts` — today-first scheduling + per-platform prompts + auto-publish/approval routing
- `supabase/functions/auto-generate-weekly/index.ts` — same today-first scheduling

**Out of scope (call out, do not build)**
- Redis / BullMQ queue: the project already uses `pg_cron` + Supabase Edge Functions for `auto-post`. Introducing Redis/BullMQ requires external infra. I'll keep using `auto-post` + `pg_cron` (functionally equivalent, retries can be added in `auto-post`). If you specifically want Redis/BullMQ, that needs a separate hosting decision.
- `generation_batch_id`: can add later if you need batch grouping; current `plan_id` already groups a week.

## Verification

After each phase: deploy edge functions, run a test generation as a trial user, confirm:
1. Only one platform selectable in schedule (Phase 1)
2. Generation starts from today when within window, else next day (Phase 2)
3. LinkedIn-day content reads like LinkedIn, X-day like X (Phase 3)
4. Content cards show platform/date/time/status (Phase 4)
5. Auto-publish vs approval routing works (Phase 5)

Approve and I'll implement Phase 1 → 5 in order.