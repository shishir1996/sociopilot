export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      admin_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          details: Json | null
          id: string
          target_user_id: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          details?: Json | null
          id?: string
          target_user_id?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_user_id?: string | null
        }
        Relationships: []
      }
      ai_brand_presets: {
        Row: {
          audience_profile: string | null
          brand_voice: string | null
          color_theme: string | null
          created_at: string
          cta_style: string | null
          default_hashtags: string[] | null
          id: string
          image_style: string | null
          is_default: boolean | null
          name: string
          offer_style: string | null
          post_structure: string | null
          prompt_notes: string | null
          tone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          audience_profile?: string | null
          brand_voice?: string | null
          color_theme?: string | null
          created_at?: string
          cta_style?: string | null
          default_hashtags?: string[] | null
          id?: string
          image_style?: string | null
          is_default?: boolean | null
          name: string
          offer_style?: string | null
          post_structure?: string | null
          prompt_notes?: string | null
          tone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          audience_profile?: string | null
          brand_voice?: string | null
          color_theme?: string | null
          created_at?: string
          cta_style?: string | null
          default_hashtags?: string[] | null
          id?: string
          image_style?: string | null
          is_default?: boolean | null
          name?: string
          offer_style?: string | null
          post_structure?: string | null
          prompt_notes?: string | null
          tone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_feature_flags: {
        Row: {
          enabled: boolean | null
          feature_key: string
          id: string
          plan_restriction: Json | null
          updated_at: string
        }
        Insert: {
          enabled?: boolean | null
          feature_key: string
          id?: string
          plan_restriction?: Json | null
          updated_at?: string
        }
        Update: {
          enabled?: boolean | null
          feature_key?: string
          id?: string
          plan_restriction?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      ai_image_generations: {
        Row: {
          business_id: string | null
          created_at: string
          id: string
          image_prompt_used: string | null
          image_style: string | null
          input_params: Json | null
          model: string | null
          output_urls: string[] | null
          platform: string | null
          provider: string | null
          status: string
          user_id: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          id?: string
          image_prompt_used?: string | null
          image_style?: string | null
          input_params?: Json | null
          model?: string | null
          output_urls?: string[] | null
          platform?: string | null
          provider?: string | null
          status?: string
          user_id: string
        }
        Update: {
          business_id?: string | null
          created_at?: string
          id?: string
          image_prompt_used?: string | null
          image_style?: string | null
          input_params?: Json | null
          model?: string | null
          output_urls?: string[] | null
          platform?: string | null
          provider?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_image_generations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_plan_limits: {
        Row: {
          brand_preset_limit: number | null
          can_edit_prompts: boolean | null
          can_select_model: boolean | null
          created_at: string
          gmb_enabled: boolean
          id: string
          image_generations_limit: number | null
          plan_name: string
          platform_limit: number | null
          premium_image_styles: boolean | null
          premium_model_access: boolean | null
          product_limit: number | null
          regeneration_limit: number | null
          text_generations_limit: number | null
          updated_at: string
        }
        Insert: {
          brand_preset_limit?: number | null
          can_edit_prompts?: boolean | null
          can_select_model?: boolean | null
          created_at?: string
          gmb_enabled?: boolean
          id?: string
          image_generations_limit?: number | null
          plan_name: string
          platform_limit?: number | null
          premium_image_styles?: boolean | null
          premium_model_access?: boolean | null
          product_limit?: number | null
          regeneration_limit?: number | null
          text_generations_limit?: number | null
          updated_at?: string
        }
        Update: {
          brand_preset_limit?: number | null
          can_edit_prompts?: boolean | null
          can_select_model?: boolean | null
          created_at?: string
          gmb_enabled?: boolean
          id?: string
          image_generations_limit?: number | null
          plan_name?: string
          platform_limit?: number | null
          premium_image_styles?: boolean | null
          premium_model_access?: boolean | null
          product_limit?: number | null
          regeneration_limit?: number | null
          text_generations_limit?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      ai_prompt_templates: {
        Row: {
          created_at: string
          hidden_instructions: string | null
          id: string
          is_active: boolean | null
          name: string
          platform_formatting: Json | null
          system_prompt: string
          template_type: string
          updated_at: string
          variable_placeholders: Json | null
        }
        Insert: {
          created_at?: string
          hidden_instructions?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          platform_formatting?: Json | null
          system_prompt?: string
          template_type: string
          updated_at?: string
          variable_placeholders?: Json | null
        }
        Update: {
          created_at?: string
          hidden_instructions?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          platform_formatting?: Json | null
          system_prompt?: string
          template_type?: string
          updated_at?: string
          variable_placeholders?: Json | null
        }
        Relationships: []
      }
      ai_provider_settings: {
        Row: {
          api_key_secret_name: string | null
          available_models: Json
          config_json: Json | null
          created_at: string
          frequency_penalty: number | null
          id: string
          is_active: boolean | null
          is_fallback: boolean | null
          max_tokens: number | null
          model_name: string
          models_synced_at: string | null
          presence_penalty: number | null
          provider_name: string
          provider_type: string
          selected_image_models: string[]
          selected_text_models: string[]
          selected_video_models: string[]
          temperature: number | null
          top_p: number | null
          updated_at: string
        }
        Insert: {
          api_key_secret_name?: string | null
          available_models?: Json
          config_json?: Json | null
          created_at?: string
          frequency_penalty?: number | null
          id?: string
          is_active?: boolean | null
          is_fallback?: boolean | null
          max_tokens?: number | null
          model_name: string
          models_synced_at?: string | null
          presence_penalty?: number | null
          provider_name: string
          provider_type: string
          selected_image_models?: string[]
          selected_text_models?: string[]
          selected_video_models?: string[]
          temperature?: number | null
          top_p?: number | null
          updated_at?: string
        }
        Update: {
          api_key_secret_name?: string | null
          available_models?: Json
          config_json?: Json | null
          created_at?: string
          frequency_penalty?: number | null
          id?: string
          is_active?: boolean | null
          is_fallback?: boolean | null
          max_tokens?: number | null
          model_name?: string
          models_synced_at?: string | null
          presence_penalty?: number | null
          provider_name?: string
          provider_type?: string
          selected_image_models?: string[]
          selected_text_models?: string[]
          selected_video_models?: string[]
          temperature?: number | null
          top_p?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      ai_text_generations: {
        Row: {
          brand_preset_id: string | null
          business_id: string | null
          content_type: string | null
          created_at: string
          id: string
          input_params: Json | null
          model: string | null
          output_variations: Json | null
          platform: string | null
          prompt_template_id: string | null
          provider: string | null
          status: string
          user_id: string
        }
        Insert: {
          brand_preset_id?: string | null
          business_id?: string | null
          content_type?: string | null
          created_at?: string
          id?: string
          input_params?: Json | null
          model?: string | null
          output_variations?: Json | null
          platform?: string | null
          prompt_template_id?: string | null
          provider?: string | null
          status?: string
          user_id: string
        }
        Update: {
          brand_preset_id?: string | null
          business_id?: string | null
          content_type?: string | null
          created_at?: string
          id?: string
          input_params?: Json | null
          model?: string | null
          output_variations?: Json | null
          platform?: string | null
          prompt_template_id?: string | null
          provider?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_text_generations_brand_preset_id_fkey"
            columns: ["brand_preset_id"]
            isOneToOne: false
            referencedRelation: "ai_brand_presets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_text_generations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_text_generations_prompt_template_id_fkey"
            columns: ["prompt_template_id"]
            isOneToOne: false
            referencedRelation: "ai_prompt_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_logs: {
        Row: {
          created_at: string
          credits_used: number | null
          error_message: string | null
          estimated_cost: number | null
          generation_type: string
          id: string
          model: string | null
          output_result: string | null
          prompt_input: string | null
          provider: string | null
          response_time_ms: number | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credits_used?: number | null
          error_message?: string | null
          estimated_cost?: number | null
          generation_type: string
          id?: string
          model?: string | null
          output_result?: string | null
          prompt_input?: string | null
          provider?: string | null
          response_time_ms?: number | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credits_used?: number | null
          error_message?: string | null
          estimated_cost?: number | null
          generation_type?: string
          id?: string
          model?: string | null
          output_result?: string | null
          prompt_input?: string | null
          provider?: string | null
          response_time_ms?: number | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      brand_assets: {
        Row: {
          asset_type: string
          business_id: string
          created_at: string
          file_url: string
          id: string
          label: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          asset_type?: string
          business_id: string
          created_at?: string
          file_url: string
          id?: string
          label?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          asset_type?: string
          business_id?: string
          created_at?: string
          file_url?: string
          id?: string
          label?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_assets_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          auto_generate_enabled: boolean
          brand_colors: string[] | null
          brand_tone: string | null
          competitors: string | null
          content_style: string | null
          content_types: string[] | null
          created_at: string
          creative_direction: string | null
          goals: string[] | null
          id: string
          industry: string | null
          location: string | null
          main_offers: string | null
          name: string
          platforms: string[] | null
          posting_goals: string[] | null
          products_services: string | null
          slogan: string | null
          target_audience: string | null
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_generate_enabled?: boolean
          brand_colors?: string[] | null
          brand_tone?: string | null
          competitors?: string | null
          content_style?: string | null
          content_types?: string[] | null
          created_at?: string
          creative_direction?: string | null
          goals?: string[] | null
          id?: string
          industry?: string | null
          location?: string | null
          main_offers?: string | null
          name: string
          platforms?: string[] | null
          posting_goals?: string[] | null
          products_services?: string | null
          slogan?: string | null
          target_audience?: string | null
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_generate_enabled?: boolean
          brand_colors?: string[] | null
          brand_tone?: string | null
          competitors?: string | null
          content_style?: string | null
          content_types?: string[] | null
          created_at?: string
          creative_direction?: string | null
          goals?: string[] | null
          id?: string
          industry?: string | null
          location?: string | null
          main_offers?: string | null
          name?: string
          platforms?: string[] | null
          posting_goals?: string[] | null
          products_services?: string | null
          slogan?: string | null
          target_audience?: string | null
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      content_items: {
        Row: {
          caption: string | null
          carousel_slides: Json | null
          content_goal: string | null
          content_theme: string
          content_type: string
          core_message: string | null
          created_at: string
          cta: string | null
          day_number: number
          hashtags: string[] | null
          hook: string | null
          id: string
          image_prompt: string | null
          image_url: string | null
          pain_point: string | null
          plan_id: string
          post_error: string | null
          posted_at: string | null
          posting_time: string | null
          primary_platform: string | null
          repurposing_suggestion: string | null
          scheduled_at: string | null
          secondary_platforms: string[] | null
          status: string
          topic: string
          updated_at: string
          user_id: string
          video_script: Json | null
          visual_style: string | null
          why_it_matters: string | null
        }
        Insert: {
          caption?: string | null
          carousel_slides?: Json | null
          content_goal?: string | null
          content_theme: string
          content_type: string
          core_message?: string | null
          created_at?: string
          cta?: string | null
          day_number: number
          hashtags?: string[] | null
          hook?: string | null
          id?: string
          image_prompt?: string | null
          image_url?: string | null
          pain_point?: string | null
          plan_id: string
          post_error?: string | null
          posted_at?: string | null
          posting_time?: string | null
          primary_platform?: string | null
          repurposing_suggestion?: string | null
          scheduled_at?: string | null
          secondary_platforms?: string[] | null
          status?: string
          topic: string
          updated_at?: string
          user_id: string
          video_script?: Json | null
          visual_style?: string | null
          why_it_matters?: string | null
        }
        Update: {
          caption?: string | null
          carousel_slides?: Json | null
          content_goal?: string | null
          content_theme?: string
          content_type?: string
          core_message?: string | null
          created_at?: string
          cta?: string | null
          day_number?: number
          hashtags?: string[] | null
          hook?: string | null
          id?: string
          image_prompt?: string | null
          image_url?: string | null
          pain_point?: string | null
          plan_id?: string
          post_error?: string | null
          posted_at?: string | null
          posting_time?: string | null
          primary_platform?: string | null
          repurposing_suggestion?: string | null
          scheduled_at?: string | null
          secondary_platforms?: string[] | null
          status?: string
          topic?: string
          updated_at?: string
          user_id?: string
          video_script?: Json | null
          visual_style?: string | null
          why_it_matters?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_items_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "content_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      content_plans: {
        Row: {
          business_id: string
          created_at: string
          id: string
          status: string
          strategy_summary: string | null
          updated_at: string
          user_id: string
          week_number: number
          week_start: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          status?: string
          strategy_summary?: string | null
          updated_at?: string
          user_id: string
          week_number?: number
          week_start: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          status?: string
          strategy_summary?: string | null
          updated_at?: string
          user_id?: string
          week_number?: number
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_plans_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      geo_pricing: {
        Row: {
          created_at: string
          currency: string
          currency_symbol: string
          id: string
          monthly_price: number
          plan_name: string
          region: string
          updated_at: string
          yearly_price: number | null
        }
        Insert: {
          created_at?: string
          currency?: string
          currency_symbol?: string
          id?: string
          monthly_price?: number
          plan_name: string
          region: string
          updated_at?: string
          yearly_price?: number | null
        }
        Update: {
          created_at?: string
          currency?: string
          currency_symbol?: string
          id?: string
          monthly_price?: number
          plan_name?: string
          region?: string
          updated_at?: string
          yearly_price?: number | null
        }
        Relationships: []
      }
      gmb_optimizations: {
        Row: {
          after_score: number | null
          ai_description: string | null
          before_score: number | null
          changes_applied: Json | null
          created_at: string
          gmb_profile_id: string
          id: string
          keywords: string[] | null
          user_id: string
        }
        Insert: {
          after_score?: number | null
          ai_description?: string | null
          before_score?: number | null
          changes_applied?: Json | null
          created_at?: string
          gmb_profile_id: string
          id?: string
          keywords?: string[] | null
          user_id: string
        }
        Update: {
          after_score?: number | null
          ai_description?: string | null
          before_score?: number | null
          changes_applied?: Json | null
          created_at?: string
          gmb_profile_id?: string
          id?: string
          keywords?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      gmb_profiles: {
        Row: {
          address: string | null
          ai_description: string | null
          business_id: string
          category: string | null
          completeness_score: number | null
          created_at: string
          gmb_location_id: string | null
          id: string
          keywords: string[] | null
          last_optimized_at: string | null
          last_synced_at: string | null
          name: string | null
          phone: string | null
          photo_count: number | null
          published: boolean | null
          rating: number | null
          review_count: number | null
          social_account_id: string | null
          updated_at: string
          user_id: string
          verified: boolean | null
          website: string | null
        }
        Insert: {
          address?: string | null
          ai_description?: string | null
          business_id: string
          category?: string | null
          completeness_score?: number | null
          created_at?: string
          gmb_location_id?: string | null
          id?: string
          keywords?: string[] | null
          last_optimized_at?: string | null
          last_synced_at?: string | null
          name?: string | null
          phone?: string | null
          photo_count?: number | null
          published?: boolean | null
          rating?: number | null
          review_count?: number | null
          social_account_id?: string | null
          updated_at?: string
          user_id: string
          verified?: boolean | null
          website?: string | null
        }
        Update: {
          address?: string | null
          ai_description?: string | null
          business_id?: string
          category?: string | null
          completeness_score?: number | null
          created_at?: string
          gmb_location_id?: string | null
          id?: string
          keywords?: string[] | null
          last_optimized_at?: string | null
          last_synced_at?: string | null
          name?: string | null
          phone?: string | null
          photo_count?: number | null
          published?: boolean | null
          rating?: number | null
          review_count?: number | null
          social_account_id?: string | null
          updated_at?: string
          user_id?: string
          verified?: boolean | null
          website?: string | null
        }
        Relationships: []
      }
      gmb_reviews: {
        Row: {
          comment: string | null
          created_at: string
          gmb_profile_id: string
          id: string
          rating: number | null
          reply: string | null
          review_id: string | null
          review_time: string | null
          reviewer_name: string | null
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          gmb_profile_id: string
          id?: string
          rating?: number | null
          reply?: string | null
          review_id?: string | null
          review_time?: string | null
          reviewer_name?: string | null
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          gmb_profile_id?: string
          id?: string
          rating?: number | null
          reply?: string | null
          review_id?: string | null
          review_time?: string | null
          reviewer_name?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string
          id: string
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string
          id?: string
          message: string
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          payment_provider: string | null
          plan_name: string
          provider_payment_id: string | null
          region: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          payment_provider?: string | null
          plan_name: string
          provider_payment_id?: string | null
          region?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          payment_provider?: string | null
          plan_name?: string
          provider_payment_id?: string | null
          region?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      posting_schedules: {
        Row: {
          business_id: string
          created_at: string
          day_of_week: number
          enabled: boolean
          id: string
          platforms: string[]
          posting_time: string
          updated_at: string
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          day_of_week: number
          enabled?: boolean
          id?: string
          platforms?: string[]
          posting_time?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          day_of_week?: number
          enabled?: boolean
          id?: string
          platforms?: string[]
          posting_time?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posting_schedules_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      regeneration_logs: {
        Row: {
          content_item_id: string
          created_at: string
          id: string
          plan_type: string
          user_id: string
        }
        Insert: {
          content_item_id: string
          created_at?: string
          id?: string
          plan_type?: string
          user_id: string
        }
        Update: {
          content_item_id?: string
          created_at?: string
          id?: string
          plan_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "regeneration_logs_content_item_id_fkey"
            columns: ["content_item_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
        ]
      }
      social_accounts: {
        Row: {
          access_token: string | null
          account_id: string | null
          account_name: string | null
          business_id: string
          created_at: string
          expires_at: string | null
          id: string
          platform: string
          refresh_token: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          account_id?: string | null
          account_name?: string | null
          business_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          platform: string
          refresh_token?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          account_id?: string | null
          account_name?: string | null
          business_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          platform?: string
          refresh_token?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_accounts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          ends_at: string | null
          id: string
          is_trial: boolean
          plan_name: string | null
          razorpay_payment_id: string | null
          starts_at: string | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string | null
          trial_started_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ends_at?: string | null
          id?: string
          is_trial?: boolean
          plan_name?: string | null
          razorpay_payment_id?: string | null
          starts_at?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          ends_at?: string | null
          id?: string
          is_trial?: boolean
          plan_name?: string | null
          razorpay_payment_id?: string | null
          starts_at?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      upgrade_events: {
        Row: {
          action_taken: string | null
          created_at: string
          id: string
          trigger_type: string
          user_id: string
        }
        Insert: {
          action_taken?: string | null
          created_at?: string
          id?: string
          trigger_type: string
          user_id: string
        }
        Update: {
          action_taken?: string | null
          created_at?: string
          id?: string
          trigger_type?: string
          user_id?: string
        }
        Relationships: []
      }
      usage_tracking: {
        Row: {
          created_at: string
          id: string
          last_active_at: string | null
          month_year: string
          monthly_posts: number
          regeneration_count: number
          total_posts_generated: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_active_at?: string | null
          month_year?: string
          monthly_posts?: number
          regeneration_count?: number
          total_posts_generated?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_active_at?: string | null
          month_year?: string
          monthly_posts?: number
          regeneration_count?: number
          total_posts_generated?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      weekly_generation_requests: {
        Row: {
          business_id: string
          content_plan_id: string | null
          created_at: string
          id: string
          plan_type: string
          selected_days: Json
          selected_platforms: Json
          status: string
          user_id: string
        }
        Insert: {
          business_id: string
          content_plan_id?: string | null
          created_at?: string
          id?: string
          plan_type?: string
          selected_days?: Json
          selected_platforms?: Json
          status?: string
          user_id: string
        }
        Update: {
          business_id?: string
          content_plan_id?: string | null
          created_at?: string
          id?: string
          plan_type?: string
          selected_days?: Json
          selected_platforms?: Json
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_generation_requests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_generation_requests_content_plan_id_fkey"
            columns: ["content_plan_id"]
            isOneToOne: false
            referencedRelation: "content_plans"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
