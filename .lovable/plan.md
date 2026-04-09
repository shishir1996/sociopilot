

# AI Studio Integration Plan for Socio Pilot

This is a large-scale feature that will be implemented in **4 phases** across multiple iterations. Each phase builds on the previous one and delivers working functionality.

---

## Phase 1: Database + Admin AI Control Center + AI Text Generator

### Database Tables (7 new tables via migration)

1. **ai_provider_settings** — Admin-configured AI providers (text & image)
   - `id`, `provider_type` (text/image), `provider_name`, `model_name`, `api_key_secret_name`, `temperature`, `max_tokens`, `top_p`, `is_active`, `is_fallback`, `config_json`, `created_at`, `updated_at`

2. **ai_prompt_templates** — Admin-managed prompt templates
   - `id`, `template_type` (caption/ad_copy/hook/cta/carousel/linkedin/image_prompt/etc.), `name`, `system_prompt`, `hidden_instructions`, `variable_placeholders`, `platform_formatting`, `is_active`, `created_at`, `updated_at`

3. **ai_plan_limits** — Per-subscription-plan usage limits
   - `id`, `plan_name`, `text_generations_limit`, `image_generations_limit`, `regeneration_limit`, `brand_preset_limit`, `can_edit_prompts`, `can_select_model`, `premium_model_access`, `premium_image_styles`

4. **ai_usage_logs** — Every generation tracked
   - `id`, `user_id`, `generation_type` (text/image), `provider`, `model`, `prompt_input`, `output_result`, `status`, `credits_used`, `estimated_cost`, `response_time_ms`, `error_message`, `created_at`

5. **ai_brand_presets** — User-saved brand voice presets
   - `id`, `user_id`, `name`, `brand_voice`, `tone`, `cta_style`, `post_structure`, `audience_profile`, `default_hashtags`, `offer_style`, `image_style`, `color_theme`, `prompt_notes`, `is_default`, `created_at`, `updated_at`

6. **ai_text_generations** — Saved text generation outputs
   - `id`, `user_id`, `business_id`, `platform`, `content_type`, `input_params` (jsonb), `output_variations` (jsonb array), `brand_preset_id`, `prompt_template_id`, `provider`, `model`, `status`, `created_at`

7. **ai_image_generations** — Saved image generation outputs
   - `id`, `user_id`, `business_id`, `platform`, `image_style`, `input_params` (jsonb), `output_urls` (text array), `image_prompt_used`, `provider`, `model`, `status`, `created_at`

8. **ai_feature_flags** — Admin toggles for AI features
   - `id`, `feature_key` (e.g. `ai_studio_enabled`, `text_gen_enabled`, `image_gen_enabled`, `user_prompt_editing`), `enabled`, `plan_restriction` (jsonb), `updated_at`

All tables get RLS policies — admin tables restricted to admin role, user tables scoped to `auth.uid() = user_id`.

### Edge Functions

1. **ai-generate-text** — New edge function for on-demand text generation
   - Reads active provider/model from `ai_provider_settings`
   - Reads prompt template from `ai_prompt_templates` based on content_type
   - Injects brand preset if selected
   - Checks usage limits against `ai_plan_limits` + `ai_usage_logs`
   - Logs everything to `ai_usage_logs`
   - Returns 1/3/5 variations

2. **ai-generate-image** — New edge function for on-demand image generation
   - Same pattern: reads config from admin tables, checks limits, logs usage
   - Currently uses Lovable AI gateway; admin can switch model name

3. **ai-admin-settings** — Edge function for admin CRUD on settings
   - Validates admin role server-side
   - Manages provider settings, prompt templates, plan limits, feature flags

### Frontend Pages & Components

1. **AI Studio page** (`/ai-studio`) — Added to sidebar navigation
   - 3 tabs: Text Generator, Image Generator, Brand Presets
   - Matches existing dashboard design (dark sidebar, card-based content)

2. **AI Text Generator tab**
   - Form with all specified input fields (platform, content type, tone, audience, etc.)
   - Brand preset selector auto-fills fields
   - Output shown in styled cards with copy/save/schedule buttons
   - Character count per platform, loading states, variation selector

3. **AI Image Generator tab**
   - Form with style, platform, aspect ratio, prompt fields
   - Logo upload option (uses existing brand_assets)
   - Image preview grid, download, save to media library
   - "Generate matching caption" button

4. **Brand Presets tab**
   - CRUD interface for brand presets
   - Multiple presets per user

5. **Admin AI Control Center** (`/admin/ai`) — Accessible from admin dashboard
   - Sub-tabs: Text Models, Image Models, Prompt Templates, Plan Limits, Feature Flags, Usage Logs
   - Provider/model configuration with masked API key fields
   - Prompt template editor with variable placeholders
   - Usage analytics dashboard with charts

### Routing Updates
- Add `/ai-studio` route
- Add `/admin/ai` route
- Add "AI Studio" to Dashboard sidebar with Sparkles icon

---

## Phase 2: Workflow Integration

- "Generate with AI" button on existing content cards
- Save generated text to content drafts / content_items
- Push to post scheduler
- Connect image generation output to existing content_items image_url

## Phase 3: Usage Dashboard + Monitoring

- Admin usage analytics with daily trends, per-user breakdown
- API health monitoring, error tracking
- Cost estimation display

## Phase 4: Advanced Features

- Multiple AI provider support (admin adds custom API endpoints)
- Content safety settings
- Per-user feature flag overrides

---

## Technical Approach

- **Provider abstraction**: The edge functions read provider config from the database at runtime. Switching models = updating a database row, zero code changes.
- **Lovable AI Gateway**: Used as default provider. Admin can configure model name (e.g., switch from `gemini-2.5-flash` to `gemini-2.5-pro`). For external providers (OpenAI direct, etc.), admin stores API keys as secrets and the edge function routes accordingly.
- **No breaking changes**: All new routes/components; existing Dashboard and generate-content function untouched.
- **Security**: Admin endpoints validate role server-side. Usage logs use RLS. API keys stored as encrypted secrets, never exposed to frontend.

---

## What Gets Built Now (Phase 1)

Upon approval, I will implement:
1. All 8 database tables with RLS
2. The 3 new edge functions
3. AI Studio page with Text Generator, Image Generator, Brand Presets tabs
4. Admin AI Control Center with model config, prompt management, plan limits, and feature flags
5. Sidebar navigation update
6. Full integration with existing auth and admin role system

This is a large implementation spanning ~15 files. Shall I proceed?

