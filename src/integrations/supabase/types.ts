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
      businesses: {
        Row: {
          brand_tone: string | null
          competitors: string | null
          content_style: string | null
          content_types: string[] | null
          created_at: string
          goals: string[] | null
          id: string
          industry: string | null
          location: string | null
          main_offers: string | null
          name: string
          platforms: string[] | null
          posting_goals: string[] | null
          products_services: string | null
          target_audience: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          brand_tone?: string | null
          competitors?: string | null
          content_style?: string | null
          content_types?: string[] | null
          created_at?: string
          goals?: string[] | null
          id?: string
          industry?: string | null
          location?: string | null
          main_offers?: string | null
          name: string
          platforms?: string[] | null
          posting_goals?: string[] | null
          products_services?: string | null
          target_audience?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          brand_tone?: string | null
          competitors?: string | null
          content_style?: string | null
          content_types?: string[] | null
          created_at?: string
          goals?: string[] | null
          id?: string
          industry?: string | null
          location?: string | null
          main_offers?: string | null
          name?: string
          platforms?: string[] | null
          posting_goals?: string[] | null
          products_services?: string | null
          target_audience?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
