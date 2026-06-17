/**
 * Supabase database types for Neon Visuals.
 *
 * Hand-authored to match supabase/migrations/001_initial_schema.sql. After
 * running migrations you can regenerate with:
 *   npx supabase gen types typescript --project-id <id> > src/lib/types/database.ts
 *
 * Compatible with createClient<Database>() / createServerClient<Database>().
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ---------- Enums ------------------------------------------------------------
export type UserRole = "super_admin" | "org_admin" | "org_manager" | "org_viewer";
export type OrgPlan = "starter" | "growth" | "enterprise";
export type BucketCodeEnum = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J" | "K";
export type ProductStatus = "active" | "draft" | "archived";
export type PackagingTierEnum = "budget" | "standard" | "premium" | "flagship";
export type PersonalizationType =
  | "laser_engrave"
  | "print"
  | "emboss"
  | "deboss"
  | "sublimation"
  | "dtf"
  | "embroidery"
  | "uv_print";
export type QuoteStatusEnum =
  | "draft"
  | "sent"
  | "viewed"
  | "accepted"
  | "rejected"
  | "expired"
  | "converted";
export type OrderStatusEnum =
  | "pending"
  | "confirmed"
  | "in_production"
  | "quality_check"
  | "packing"
  | "dispatched"
  | "delivered"
  | "completed";
export type PaymentStatusEnum =
  | "pending"
  | "partial"
  | "paid"
  | "overdue"
  | "refunded";
export type PaymentMethodEnum =
  | "razorpay"
  | "bank_transfer"
  | "cheque"
  | "credit_terms";
export type PaymentTermsEnum =
  | "advance_100"
  | "advance_50"
  | "net_15"
  | "net_30"
  | "net_60";
export type LeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "proposal_sent"
  | "negotiating"
  | "won"
  | "lost"
  | "dormant";
export type LeadSource =
  | "website"
  | "linkedin"
  | "referral"
  | "event"
  | "cold_outreach"
  | "inbound_call"
  | "whatsapp"
  | "google"
  | "instagram"
  | "other";
export type OccasionTypeEnum =
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
  | "custom";
export type EmployeeArchetypeEnum =
  | "achiever"
  | "creator"
  | "explorer"
  | "builder"
  | "root"
  | "connector"
  | "scholar"
  | "minimalist";
export type BlogStatus = "draft" | "published" | "archived";
export type NotificationTypeEnum =
  | "occasion_reminder"
  | "order_update"
  | "quote_expiry"
  | "payment_reminder"
  | "delivery_confirmation"
  | "system";
export type ReminderFrequency = "7_days" | "3_days" | "1_day" | "same_day";

// ---------- Helper -----------------------------------------------------------
/** Builds a table definition with defaults applied to Insert/Update. */
type Timestamps = { created_at: string; updated_at: string };

// ---------- Database ---------------------------------------------------------
export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          domain: string | null;
          industry: string | null;
          company_size: string | null;
          logo_url: string | null;
          plan: OrgPlan;
          billing_email: string | null;
          billing_address: Json | null;
          payment_terms: PaymentTermsEnum | null;
          settings: Json;
          onboarded_at: string | null;
        } & Timestamps;
        Insert: {
          id?: string;
          name: string;
          slug: string;
          domain?: string | null;
          industry?: string | null;
          company_size?: string | null;
          logo_url?: string | null;
          plan?: OrgPlan;
          billing_email?: string | null;
          billing_address?: Json | null;
          payment_terms?: PaymentTermsEnum | null;
          settings?: Json;
          onboarded_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["organizations"]["Insert"]>;
      };
      users: {
        Row: {
          id: string;
          auth_id: string | null;
          org_id: string | null;
          email: string;
          full_name: string | null;
          phone: string | null;
          avatar_url: string | null;
          role: UserRole;
          designation: string | null;
          is_active: boolean;
          last_login_at: string | null;
        } & Timestamps;
        Insert: {
          id?: string;
          auth_id?: string | null;
          org_id?: string | null;
          email: string;
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
          designation?: string | null;
          is_active?: boolean;
          last_login_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
      };
      employees: {
        Row: {
          id: string;
          org_id: string;
          employee_code: string | null;
          full_name: string;
          email: string | null;
          phone: string | null;
          department: string | null;
          designation: string | null;
          reporting_manager: string | null;
          joining_date: string | null;
          birthday: string | null;
          hometown: string | null;
          interests: string[] | null;
          archetype: EmployeeArchetypeEnum | null;
          archetype_signals: Json | null;
          linkedin_url: string | null;
          profile_notes: string | null;
          dietary_restrictions: string | null;
          gift_preferences: string | null;
          tier: string | null;
          is_active: boolean;
          metadata: Json;
        } & Timestamps;
        Insert: {
          id?: string;
          org_id: string;
          employee_code?: string | null;
          full_name: string;
          email?: string | null;
          phone?: string | null;
          department?: string | null;
          designation?: string | null;
          reporting_manager?: string | null;
          joining_date?: string | null;
          birthday?: string | null;
          hometown?: string | null;
          interests?: string[] | null;
          archetype?: EmployeeArchetypeEnum | null;
          archetype_signals?: Json | null;
          linkedin_url?: string | null;
          profile_notes?: string | null;
          dietary_restrictions?: string | null;
          gift_preferences?: string | null;
          tier?: string | null;
          is_active?: boolean;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["employees"]["Insert"]>;
      };
      buckets: {
        Row: {
          id: string;
          code: BucketCodeEnum;
          name: string;
          slug: string;
          description: string | null;
          purpose: string | null;
          primary_buyer: string | null;
          asp_range_min: number | null;
          asp_range_max: number | null;
          icon: string | null;
          image_url: string | null;
          sort_order: number | null;
          seo_title: string | null;
          seo_description: string | null;
          seo_keywords: string[] | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: BucketCodeEnum;
          name: string;
          slug: string;
          description?: string | null;
          purpose?: string | null;
          primary_buyer?: string | null;
          asp_range_min?: number | null;
          asp_range_max?: number | null;
          icon?: string | null;
          image_url?: string | null;
          sort_order?: number | null;
          seo_title?: string | null;
          seo_description?: string | null;
          seo_keywords?: string[] | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["buckets"]["Insert"]>;
      };
      products: {
        Row: {
          id: string;
          sku: string;
          bucket_id: string | null;
          name: string;
          slug: string;
          tagline: string | null;
          description: string | null;
          long_description: string | null;
          who_is_it_for: string | null;
          insight: string | null;
          wow_score: number | null;
          cogs: number | null;
          price_single: number | null;
          price_bulk_25: number | null;
          price_bulk_100: number | null;
          margin_percent: number | null;
          lead_time_days: number | null;
          rush_lead_time_days: number | null;
          moq: number | null;
          materials: string[] | null;
          personalization_options: Json | null;
          personalization_types: PersonalizationType[] | null;
          images: string[] | null;
          thumbnail_url: string | null;
          video_url: string | null;
          dimensions: Json | null;
          recommended_packaging: PackagingTierEnum | null;
          seo_title: string | null;
          seo_description: string | null;
          seo_keywords: string[] | null;
          tags: string[] | null;
          occasions: OccasionTypeEnum[] | null;
          archetypes: EmployeeArchetypeEnum[] | null;
          status: ProductStatus;
          is_featured: boolean;
          is_bestseller: boolean;
          is_new: boolean;
          sort_order: number | null;
        } & Timestamps;
        Insert: {
          id?: string;
          sku: string;
          bucket_id?: string | null;
          name: string;
          slug: string;
          tagline?: string | null;
          description?: string | null;
          long_description?: string | null;
          who_is_it_for?: string | null;
          insight?: string | null;
          wow_score?: number | null;
          cogs?: number | null;
          price_single?: number | null;
          price_bulk_25?: number | null;
          price_bulk_100?: number | null;
          margin_percent?: number | null;
          lead_time_days?: number | null;
          rush_lead_time_days?: number | null;
          moq?: number | null;
          materials?: string[] | null;
          personalization_options?: Json | null;
          personalization_types?: PersonalizationType[] | null;
          images?: string[] | null;
          thumbnail_url?: string | null;
          video_url?: string | null;
          dimensions?: Json | null;
          recommended_packaging?: PackagingTierEnum | null;
          seo_title?: string | null;
          seo_description?: string | null;
          seo_keywords?: string[] | null;
          tags?: string[] | null;
          occasions?: OccasionTypeEnum[] | null;
          archetypes?: EmployeeArchetypeEnum[] | null;
          status?: ProductStatus;
          is_featured?: boolean;
          is_bestseller?: boolean;
          is_new?: boolean;
          sort_order?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["products"]["Insert"]>;
      };
    } & MoreTables;
    Enums: {
      user_role: UserRole;
      org_plan: OrgPlan;
      bucket_code: BucketCodeEnum;
      product_status: ProductStatus;
      packaging_tier: PackagingTierEnum;
      personalization_type: PersonalizationType;
      quote_status: QuoteStatusEnum;
      order_status: OrderStatusEnum;
      payment_status: PaymentStatusEnum;
      payment_method: PaymentMethodEnum;
      payment_terms: PaymentTermsEnum;
      lead_status: LeadStatus;
      lead_source: LeadSource;
      occasion_type: OccasionTypeEnum;
      employee_archetype: EmployeeArchetypeEnum;
      blog_status: BlogStatus;
      notification_type: NotificationTypeEnum;
      reminder_frequency: ReminderFrequency;
    };
  };
}

// ---------- Remaining tables -------------------------------------------------
interface MoreTables {
  kits: {
    Row: {
      id: string;
      org_id: string | null;
      created_by: string | null;
      name: string;
      description: string | null;
      occasion: OccasionTypeEnum | null;
      packaging_tier: PackagingTierEnum | null;
      is_template: boolean;
      is_public: boolean;
      total_cogs: number | null;
      total_price: number | null;
      image_url: string | null;
      metadata: Json;
    } & Timestamps;
    Insert: {
      id?: string;
      org_id?: string | null;
      created_by?: string | null;
      name: string;
      description?: string | null;
      occasion?: OccasionTypeEnum | null;
      packaging_tier?: PackagingTierEnum | null;
      is_template?: boolean;
      is_public?: boolean;
      total_cogs?: number | null;
      total_price?: number | null;
      image_url?: string | null;
      metadata?: Json;
      created_at?: string;
      updated_at?: string;
    };
    Update: Partial<MoreTables["kits"]["Insert"]>;
  };
  kit_items: {
    Row: {
      id: string;
      kit_id: string;
      product_id: string | null;
      quantity: number;
      sort_order: number | null;
      personalization_preview: Json | null;
      created_at: string;
    };
    Insert: {
      id?: string;
      kit_id: string;
      product_id?: string | null;
      quantity?: number;
      sort_order?: number | null;
      personalization_preview?: Json | null;
      created_at?: string;
    };
    Update: Partial<MoreTables["kit_items"]["Insert"]>;
  };
  quotes: {
    Row: {
      id: string;
      quote_number: string | null;
      org_id: string | null;
      created_by: string | null;
      kit_id: string | null;
      client_name: string | null;
      client_email: string | null;
      client_phone: string | null;
      client_company: string | null;
      subtotal: number | null;
      gst_percent: number | null;
      gst_amount: number | null;
      discount_percent: number | null;
      discount_amount: number | null;
      rush_surcharge: number | null;
      custom_design_fee: number | null;
      packaging_cost: number | null;
      shipping_cost: number | null;
      total_amount: number | null;
      quantity: number | null;
      payment_terms: PaymentTermsEnum | null;
      valid_until: string | null;
      notes: string | null;
      internal_notes: string | null;
      status: QuoteStatusEnum;
      sent_at: string | null;
      viewed_at: string | null;
      accepted_at: string | null;
      rejected_reason: string | null;
      pdf_url: string | null;
    } & Timestamps;
    Insert: {
      id?: string;
      quote_number?: string | null;
      org_id?: string | null;
      created_by?: string | null;
      kit_id?: string | null;
      client_name?: string | null;
      client_email?: string | null;
      client_phone?: string | null;
      client_company?: string | null;
      subtotal?: number | null;
      gst_percent?: number | null;
      gst_amount?: number | null;
      discount_percent?: number | null;
      discount_amount?: number | null;
      rush_surcharge?: number | null;
      custom_design_fee?: number | null;
      packaging_cost?: number | null;
      shipping_cost?: number | null;
      total_amount?: number | null;
      quantity?: number | null;
      payment_terms?: PaymentTermsEnum | null;
      valid_until?: string | null;
      notes?: string | null;
      internal_notes?: string | null;
      status?: QuoteStatusEnum;
      sent_at?: string | null;
      viewed_at?: string | null;
      accepted_at?: string | null;
      rejected_reason?: string | null;
      pdf_url?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: Partial<MoreTables["quotes"]["Insert"]>;
  };
  quote_items: {
    Row: {
      id: string;
      quote_id: string;
      product_id: string | null;
      description: string | null;
      quantity: number;
      unit_price: number | null;
      total_price: number | null;
      personalization_details: Json | null;
      sort_order: number | null;
    };
    Insert: {
      id?: string;
      quote_id: string;
      product_id?: string | null;
      description?: string | null;
      quantity?: number;
      unit_price?: number | null;
      total_price?: number | null;
      personalization_details?: Json | null;
      sort_order?: number | null;
    };
    Update: Partial<MoreTables["quote_items"]["Insert"]>;
  };
  orders: {
    Row: {
      id: string;
      order_number: string | null;
      org_id: string | null;
      quote_id: string | null;
      placed_by: string | null;
      subtotal: number | null;
      gst_amount: number | null;
      discount_amount: number | null;
      rush_surcharge: number | null;
      custom_design_fee: number | null;
      packaging_cost: number | null;
      shipping_cost: number | null;
      total_amount: number | null;
      status: OrderStatusEnum;
      payment_status: PaymentStatusEnum;
      payment_method: PaymentMethodEnum | null;
      expected_delivery: string | null;
      actual_delivery: string | null;
      production_start: string | null;
      dispatched_at: string | null;
      delivered_at: string | null;
      shipping_address: Json | null;
      tracking_number: string | null;
      courier_partner: string | null;
      photo_proof_urls: string[] | null;
      delivery_proof_url: string | null;
      notes: string | null;
      internal_notes: string | null;
      special_instructions: string | null;
      client_rating: number | null;
      client_feedback: string | null;
      desk_test_score: number | null;
    } & Timestamps;
    Insert: {
      id?: string;
      order_number?: string | null;
      org_id?: string | null;
      quote_id?: string | null;
      placed_by?: string | null;
      subtotal?: number | null;
      gst_amount?: number | null;
      discount_amount?: number | null;
      rush_surcharge?: number | null;
      custom_design_fee?: number | null;
      packaging_cost?: number | null;
      shipping_cost?: number | null;
      total_amount?: number | null;
      status?: OrderStatusEnum;
      payment_status?: PaymentStatusEnum;
      payment_method?: PaymentMethodEnum | null;
      expected_delivery?: string | null;
      actual_delivery?: string | null;
      production_start?: string | null;
      dispatched_at?: string | null;
      delivered_at?: string | null;
      shipping_address?: Json | null;
      tracking_number?: string | null;
      courier_partner?: string | null;
      photo_proof_urls?: string[] | null;
      delivery_proof_url?: string | null;
      notes?: string | null;
      internal_notes?: string | null;
      special_instructions?: string | null;
      client_rating?: number | null;
      client_feedback?: string | null;
      desk_test_score?: number | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: Partial<MoreTables["orders"]["Insert"]>;
  };
  order_items: {
    Row: {
      id: string;
      order_id: string;
      product_id: string | null;
      employee_id: string | null;
      quantity: number;
      unit_price: number | null;
      total_price: number | null;
      personalization_data: Json | null;
      narrative_card_text: string | null;
      archetype_at_time: EmployeeArchetypeEnum | null;
      production_status: string | null;
      qc_passed: boolean | null;
      qc_notes: string | null;
      photo_proof_url: string | null;
      created_at: string;
    };
    Insert: {
      id?: string;
      order_id: string;
      product_id?: string | null;
      employee_id?: string | null;
      quantity?: number;
      unit_price?: number | null;
      total_price?: number | null;
      personalization_data?: Json | null;
      narrative_card_text?: string | null;
      archetype_at_time?: EmployeeArchetypeEnum | null;
      production_status?: string | null;
      qc_passed?: boolean | null;
      qc_notes?: string | null;
      photo_proof_url?: string | null;
      created_at?: string;
    };
    Update: Partial<MoreTables["order_items"]["Insert"]>;
  };
  occasions: {
    Row: {
      id: string;
      org_id: string;
      employee_id: string | null;
      occasion_type: OccasionTypeEnum;
      title: string | null;
      date: string;
      is_recurring: boolean;
      recurrence_rule: string | null;
      suggested_products: string[] | null;
      assigned_kit_id: string | null;
      budget_min: number | null;
      budget_max: number | null;
      is_acknowledged: boolean;
      acknowledged_by: string | null;
      is_gift_ordered: boolean;
      order_id: string | null;
      reminder_30_sent: boolean;
      reminder_7_sent: boolean;
      reminder_3_sent: boolean;
      reminder_1_sent: boolean;
      notes: string | null;
    } & Timestamps;
    Insert: {
      id?: string;
      org_id: string;
      employee_id?: string | null;
      occasion_type: OccasionTypeEnum;
      title?: string | null;
      date: string;
      is_recurring?: boolean;
      recurrence_rule?: string | null;
      suggested_products?: string[] | null;
      assigned_kit_id?: string | null;
      budget_min?: number | null;
      budget_max?: number | null;
      is_acknowledged?: boolean;
      acknowledged_by?: string | null;
      is_gift_ordered?: boolean;
      order_id?: string | null;
      reminder_30_sent?: boolean;
      reminder_7_sent?: boolean;
      reminder_3_sent?: boolean;
      reminder_1_sent?: boolean;
      notes?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: Partial<MoreTables["occasions"]["Insert"]>;
  };
  festival_calendar: {
    Row: {
      id: string;
      name: string;
      occasion_type: OccasionTypeEnum | null;
      date: string;
      year: number | null;
      description: string | null;
      recommended_buckets: BucketCodeEnum[] | null;
      is_active: boolean;
    };
    Insert: {
      id?: string;
      name: string;
      occasion_type?: OccasionTypeEnum | null;
      date: string;
      year?: number | null;
      description?: string | null;
      recommended_buckets?: BucketCodeEnum[] | null;
      is_active?: boolean;
    };
    Update: Partial<MoreTables["festival_calendar"]["Insert"]>;
  };
  gift_history: {
    Row: {
      id: string;
      org_id: string | null;
      employee_id: string | null;
      order_id: string | null;
      order_item_id: string | null;
      product_id: string | null;
      occasion: OccasionTypeEnum | null;
      occasion_date: string | null;
      gift_year: number | null;
      product_name: string | null;
      product_sku: string | null;
      kit_name: string | null;
      archetype_at_time: EmployeeArchetypeEnum | null;
      narrative_card_text: string | null;
      personalization_summary: string | null;
      recipient_reaction: string | null;
      desk_test_status: string | null;
      photo_url: string | null;
      linkedin_posted: boolean;
      instagram_posted: boolean;
      intelligence_notes: string | null;
      do_not_repeat: boolean;
      created_at: string;
    };
    Insert: {
      id?: string;
      org_id?: string | null;
      employee_id?: string | null;
      order_id?: string | null;
      order_item_id?: string | null;
      product_id?: string | null;
      occasion?: OccasionTypeEnum | null;
      occasion_date?: string | null;
      gift_year?: number | null;
      product_name?: string | null;
      product_sku?: string | null;
      kit_name?: string | null;
      archetype_at_time?: EmployeeArchetypeEnum | null;
      narrative_card_text?: string | null;
      personalization_summary?: string | null;
      recipient_reaction?: string | null;
      desk_test_status?: string | null;
      photo_url?: string | null;
      linkedin_posted?: boolean;
      instagram_posted?: boolean;
      intelligence_notes?: string | null;
      do_not_repeat?: boolean;
      created_at?: string;
    };
    Update: Partial<MoreTables["gift_history"]["Insert"]>;
  };
  leads: {
    Row: {
      id: string;
      full_name: string;
      email: string | null;
      phone: string | null;
      company_name: string | null;
      company_size: string | null;
      designation: string | null;
      source: LeadSource | null;
      source_detail: string | null;
      status: LeadStatus;
      budget_range: string | null;
      occasion_interest: OccasionTypeEnum[] | null;
      employee_count: number | null;
      timeline: string | null;
      assigned_to: string | null;
      priority: number;
      last_contacted_at: string | null;
      next_follow_up: string | null;
      follow_up_notes: string | null;
      converted_org_id: string | null;
      converted_at: string | null;
      lost_reason: string | null;
      notes: string | null;
      tags: string[] | null;
    } & Timestamps;
    Insert: {
      id?: string;
      full_name: string;
      email?: string | null;
      phone?: string | null;
      company_name?: string | null;
      company_size?: string | null;
      designation?: string | null;
      source?: LeadSource | null;
      source_detail?: string | null;
      status?: LeadStatus;
      budget_range?: string | null;
      occasion_interest?: OccasionTypeEnum[] | null;
      employee_count?: number | null;
      timeline?: string | null;
      assigned_to?: string | null;
      priority?: number;
      last_contacted_at?: string | null;
      next_follow_up?: string | null;
      follow_up_notes?: string | null;
      converted_org_id?: string | null;
      converted_at?: string | null;
      lost_reason?: string | null;
      notes?: string | null;
      tags?: string[] | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: Partial<MoreTables["leads"]["Insert"]>;
  };
  lead_activities: {
    Row: {
      id: string;
      lead_id: string;
      activity_type: string | null;
      description: string | null;
      performed_by: string | null;
      created_at: string;
    };
    Insert: {
      id?: string;
      lead_id: string;
      activity_type?: string | null;
      description?: string | null;
      performed_by?: string | null;
      created_at?: string;
    };
    Update: Partial<MoreTables["lead_activities"]["Insert"]>;
  };
  invoices: {
    Row: {
      id: string;
      invoice_number: string | null;
      org_id: string | null;
      order_id: string | null;
      quote_id: string | null;
      subtotal: number | null;
      gst_percent: number | null;
      gst_amount: number | null;
      discount_amount: number | null;
      total_amount: number | null;
      amount_paid: number | null;
      amount_due: number | null;
      billing_address: Json | null;
      line_items: Json | null;
      payment_terms: PaymentTermsEnum | null;
      due_date: string | null;
      notes: string | null;
      status: PaymentStatusEnum;
      paid_at: string | null;
      razorpay_invoice_id: string | null;
      razorpay_payment_id: string | null;
      razorpay_order_id: string | null;
      pdf_url: string | null;
    } & Timestamps;
    Insert: {
      id?: string;
      invoice_number?: string | null;
      org_id?: string | null;
      order_id?: string | null;
      quote_id?: string | null;
      subtotal?: number | null;
      gst_percent?: number | null;
      gst_amount?: number | null;
      discount_amount?: number | null;
      total_amount?: number | null;
      amount_paid?: number | null;
      amount_due?: number | null;
      billing_address?: Json | null;
      line_items?: Json | null;
      payment_terms?: PaymentTermsEnum | null;
      due_date?: string | null;
      notes?: string | null;
      status?: PaymentStatusEnum;
      paid_at?: string | null;
      razorpay_invoice_id?: string | null;
      razorpay_payment_id?: string | null;
      razorpay_order_id?: string | null;
      pdf_url?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: Partial<MoreTables["invoices"]["Insert"]>;
  };
  payments: {
    Row: {
      id: string;
      invoice_id: string | null;
      org_id: string | null;
      amount: number;
      payment_method: PaymentMethodEnum | null;
      payment_date: string;
      reference_number: string | null;
      razorpay_payment_id: string | null;
      razorpay_signature: string | null;
      notes: string | null;
      created_at: string;
    };
    Insert: {
      id?: string;
      invoice_id?: string | null;
      org_id?: string | null;
      amount: number;
      payment_method?: PaymentMethodEnum | null;
      payment_date?: string;
      reference_number?: string | null;
      razorpay_payment_id?: string | null;
      razorpay_signature?: string | null;
      notes?: string | null;
      created_at?: string;
    };
    Update: Partial<MoreTables["payments"]["Insert"]>;
  };
  blog_posts: {
    Row: {
      id: string;
      title: string;
      slug: string;
      excerpt: string | null;
      content: string | null;
      featured_image: string | null;
      author_name: string | null;
      author_avatar: string | null;
      seo_title: string | null;
      seo_description: string | null;
      seo_keywords: string[] | null;
      canonical_url: string | null;
      category: string | null;
      tags: string[] | null;
      related_products: string[] | null;
      related_occasions: OccasionTypeEnum[] | null;
      status: BlogStatus;
      published_at: string | null;
      reading_time_minutes: number | null;
      view_count: number;
    } & Timestamps;
    Insert: {
      id?: string;
      title: string;
      slug: string;
      excerpt?: string | null;
      content?: string | null;
      featured_image?: string | null;
      author_name?: string | null;
      author_avatar?: string | null;
      seo_title?: string | null;
      seo_description?: string | null;
      seo_keywords?: string[] | null;
      canonical_url?: string | null;
      category?: string | null;
      tags?: string[] | null;
      related_products?: string[] | null;
      related_occasions?: OccasionTypeEnum[] | null;
      status?: BlogStatus;
      published_at?: string | null;
      reading_time_minutes?: number | null;
      view_count?: number;
      created_at?: string;
      updated_at?: string;
    };
    Update: Partial<MoreTables["blog_posts"]["Insert"]>;
  };
  notifications: {
    Row: {
      id: string;
      org_id: string | null;
      user_id: string | null;
      type: NotificationTypeEnum;
      title: string;
      message: string | null;
      action_url: string | null;
      metadata: Json;
      is_read: boolean;
      read_at: string | null;
      email_sent: boolean;
      created_at: string;
    };
    Insert: {
      id?: string;
      org_id?: string | null;
      user_id?: string | null;
      type?: NotificationTypeEnum;
      title: string;
      message?: string | null;
      action_url?: string | null;
      metadata?: Json;
      is_read?: boolean;
      read_at?: string | null;
      email_sent?: boolean;
      created_at?: string;
    };
    Update: Partial<MoreTables["notifications"]["Insert"]>;
  };
  page_views: {
    Row: {
      id: string;
      page_path: string | null;
      referrer: string | null;
      user_agent: string | null;
      ip_hash: string | null;
      session_id: string | null;
      org_id: string | null;
      created_at: string;
    };
    Insert: {
      id?: string;
      page_path?: string | null;
      referrer?: string | null;
      user_agent?: string | null;
      ip_hash?: string | null;
      session_id?: string | null;
      org_id?: string | null;
      created_at?: string;
    };
    Update: Partial<MoreTables["page_views"]["Insert"]>;
  };
  recommendation_logs: {
    Row: {
      id: string;
      org_id: string | null;
      employee_id: string | null;
      occasion: OccasionTypeEnum | null;
      archetype: EmployeeArchetypeEnum | null;
      budget_range: string | null;
      recommended_products: string[] | null;
      selected_product: string | null;
      was_helpful: boolean | null;
      created_at: string;
    };
    Insert: {
      id?: string;
      org_id?: string | null;
      employee_id?: string | null;
      occasion?: OccasionTypeEnum | null;
      archetype?: EmployeeArchetypeEnum | null;
      budget_range?: string | null;
      recommended_products?: string[] | null;
      selected_product?: string | null;
      was_helpful?: boolean | null;
      created_at?: string;
    };
    Update: Partial<MoreTables["recommendation_logs"]["Insert"]>;
  };
}
