/**
 * Supabase database types for Neon Visuals.
 *
 * GENERATED from the hosted schema (project xserhblhiwtmaiejbvgo) after
 * migration 018_tenancy_foundation. Regenerate with:
 *   supabase gen types typescript --linked > src/lib/types/database.ts
 * (or via the Supabase MCP `generate_typescript_types`).
 *
 * Compatible with createClient<Database>() / createServerClient<Database>().
 */
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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          actor_type: string
          actor_user_id: string | null
          after: Json | null
          before: Json | null
          company_id: string | null
          created_at: string
          entity: string | null
          entity_id: string | null
          id: number
          ip: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_type: string
          actor_user_id?: string | null
          after?: Json | null
          before?: Json | null
          company_id?: string | null
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: number
          ip?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_type?: string
          actor_user_id?: string | null
          after?: Json | null
          before?: Json | null
          company_id?: string | null
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: number
          ip?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          blackout_dates: string[] | null
          brand_accent: string | null
          brand_primary: string | null
          city: string | null
          created_at: string | null
          created_by: string | null
          dpa_accepted_at: string | null
          dpa_accepted_by: string | null
          dpa_ip: string | null
          dpa_version: string | null
          email_domain: string | null
          email_sender_name: string | null
          employee_count: string | null
          employee_limit: number
          gifting_budget: string | null
          gifting_occasions: string[] | null
          gstin: string | null
          id: string
          industry: string | null
          logo_url: string | null
          name: string
          _deprecated_observed_festivals: string[] | null
          onboarding_completed: boolean | null
          owner_id: string | null
          plan: string
          plan_override_by: string | null
          plan_override_reason: string | null
          plan_status: string
          primary_contact_email: string | null
          primary_contact_name: string | null
          primary_contact_phone: string | null
          slug: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          [key: string]: Json | undefined
        }
        Update: {
          [key: string]: Json | undefined
        }
        Relationships: []
      }
    }
    Views: {
      // employees_safe was DROPPED in Prompt 4a (SECURITY DEFINER leak view).
      // PII now lives in employee_pii behind §6A RLS.
      [_ in never]: never
    }
    Functions: {
      accept_invite: {
        Args: { raw_token: string }
        Returns: string
      }
      transfer_ownership: {
        Args: { target_user_id: string }
        Returns: string
      }
      get_pii_dek: {
        Args: { p_version: number }
        Returns: string
      }
      has_company_role: {
        Args: {
          allowed: Database["public"]["Enums"]["company_role"][]
          target_company: string
        }
        Returns: boolean
      }
      is_platform_staff: { Args: Record<string, never>; Returns: boolean }
      platform_role_of: {
        Args: Record<string, never>
        Returns: Database["public"]["Enums"]["platform_role"]
      }
      user_company_ids: { Args: Record<string, never>; Returns: string[] }
      user_department_id: {
        Args: { target_company: string }
        Returns: string
      }
    }
    Enums: {
      blog_status: "draft" | "published" | "archived"
      bucket_code: "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J" | "K"
      company_role:
        | "org_owner"
        | "org_admin"
        | "hr"
        | "finance"
        | "manager"
        | "viewer"
      employee_archetype:
        | "achiever"
        | "creator"
        | "explorer"
        | "builder"
        | "root"
        | "connector"
        | "scholar"
        | "minimalist"
      lead_source:
        | "website"
        | "linkedin"
        | "referral"
        | "event"
        | "cold_outreach"
        | "inbound_call"
        | "whatsapp"
        | "google"
        | "instagram"
        | "other"
      lead_status:
        | "new"
        | "contacted"
        | "qualified"
        | "proposal_sent"
        | "negotiating"
        | "won"
        | "lost"
        | "dormant"
      notification_type:
        | "occasion_reminder"
        | "order_update"
        | "quote_expiry"
        | "payment_reminder"
        | "delivery_confirmation"
        | "system"
      occasion_type:
        | "onboarding"
        | "birthday"
        | "work_anniversary_1"
        | "work_anniversary_3"
        | "work_anniversary_5"
        | "work_anniversary_7"
        | "work_anniversary_10"
        | "work_anniversary_15"
        | "work_anniversary_20"
        | "promotion"
        | "spot_award"
        | "quarterly_mvp"
        | "annual_award"
        | "farewell"
        | "retirement"
        | "new_parent"
        | "wedding"
        | "festival_diwali"
        | "festival_holi"
        | "festival_christmas"
        | "festival_eid"
        | "festival_pongal"
        | "festival_onam"
        | "new_year"
        | "company_anniversary"
        | "team_offsite"
        | "client_appreciation"
        | "deal_closure"
        | "custom"
      order_status:
        | "pending"
        | "confirmed"
        | "in_production"
        | "quality_check"
        | "packing"
        | "dispatched"
        | "delivered"
        | "completed"
      packaging_tier: "budget" | "standard" | "premium" | "flagship"
      payment_method: "razorpay" | "bank_transfer" | "cheque" | "credit_terms"
      payment_status: "pending" | "partial" | "paid" | "overdue" | "refunded"
      payment_terms:
        | "advance_100"
        | "advance_50"
        | "net_15"
        | "net_30"
        | "net_60"
      personalization_type:
        | "laser_engrave"
        | "print"
        | "emboss"
        | "deboss"
        | "sublimation"
        | "dtf"
        | "embroidery"
        | "uv_print"
      platform_role: "owner" | "admin" | "ops" | "finance" | "support"
      product_status: "active" | "draft" | "archived"
      quote_status:
        | "draft"
        | "sent"
        | "viewed"
        | "accepted"
        | "rejected"
        | "expired"
        | "converted"
        | "cancelled"
      reminder_frequency: "7_days" | "3_days" | "1_day" | "same_day"
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
