# Socio Pilot — Weekly Content Engine Upgrade Plan

## Overview
Transform the existing platform into a structured "Generate → Review → Schedule" weekly content engine with plan-based restrictions, upgrade prompts, and notification system.

---

## Phase 1: Database & Plan Infrastructure

### New/Modified Tables (via migration)

1. **New: `weekly_generation_requests`** — Tracks each weekly generation request
   - `user_id`, `business_id`, `plan_type`, `selected_days` (jsonb), `selected_platforms` (jsonb), `status`, `content_plan_id`, `created_at`
2. **New: `regeneration_logs`** — Tracks each regeneration event
   - `user_id`, `content_item_id`, `plan_type`, `created_at`
3. **New: `upgrade_events`** — Tracks upgrade prompts shown & actions taken
   - `user_id`, `trigger_type`, `action_taken`, `created_at`
4. **New: `notifications`** — In-app notification system
   - `user_id`, `type`, `title`, `message`, `read`, `action_url`, `created_at`
5. **Modify `subscriptions`** — Add trial tracking fields

### Seed Data
- Insert plan limits into `ai_plan_limits` for `free_trial`, `basic`, `pro`

---

## Phase 2: AI Studio — Weekly Content Generation UI

### AI Studio Page (`/ai-studio`) — Restored with new structure
- **Step 1: Calendar Selection** — Mon-Sun grid
  - Basic: 1 platform per day (radio select)
  - Pro: Multi-platform per day (checkbox select)
- **Step 2: Business Context** — Auto-filled from business profile, editable
- **Step 3: Generate** — "Generate Weekly Content" button
- **Step 4: Results** — Content cards per day with platform badge, caption, image preview, hashtags, CTA
  - Edit, Regenerate, Save, Schedule buttons

### Plan Enforcement
- Check plan type before generation
- Block multi-platform for Basic users with upgrade prompt
- Track usage counts and enforce limits
- Cooldown between regenerations

---

## Phase 3: Upgrade & Trial System

### Trial Logic
- 7-day trial = Basic features + 1 weekly generation + 2 regenerations
- After limits hit → lock with upgrade prompt
- Day 5+: Show countdown banner
- Day 7+: Full-screen block

### Upgrade Prompts (integrated into dashboard)
1. Post-generation: "Your free week is ready 🚀 Next week locked 🔒"
2. Trial countdown banner (Day 5+)
3. Trial expired full-screen overlay
4. Basic user tries Pro feature → popup
5. Limit reached → inline message

---

## Phase 4: Notification System

### In-App Notifications
- Bell icon in header with unread count
- Notification dropdown with mark-as-read

### Triggers
- Trial countdown (Day 5, 6, 7)
- Limit reached
- Generation complete
- Upgrade suggestion

---

## Phase 5: Edge Functions & Backend

- Update `generate-content` with plan validation & usage tracking
- New `check-plan-limits` edge function
- Update `auto-generate-weekly` to respect plan limits

---

## Phase 6: Admin AI Control Center Updates

- Trial settings management
- Plan limit management
- Upgrade event analytics
- Notification management

---

## Implementation Order
Phase 1 → 2 → 3 → 4 → 5 → 6 (incremental, each phase delivers working functionality)
