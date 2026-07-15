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
      campaign_services: {
        Row: {
          company_id: string
          created_at: string
          id: string
          name: string | null
          rate_type: Database["public"]["Enums"]["rate_type"] | null
          seat_count: number
          texting_tier: Database["public"]["Enums"]["texting_tier"] | null
          type: Database["public"]["Enums"]["campaign_type"]
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          name?: string | null
          rate_type?: Database["public"]["Enums"]["rate_type"] | null
          seat_count: number
          texting_tier?: Database["public"]["Enums"]["texting_tier"] | null
          type: Database["public"]["Enums"]["campaign_type"]
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          name?: string | null
          rate_type?: Database["public"]["Enums"]["rate_type"] | null
          seat_count?: number
          texting_tier?: Database["public"]["Enums"]["texting_tier"] | null
          type?: Database["public"]["Enums"]["campaign_type"]
        }
        Relationships: [
          {
            foreignKeyName: "campaign_services_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          company_id: string
          created_at: string
          email: string | null
          id: string
          is_poc: boolean
          name: string
          phone: string | null
          title_at_company: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          email?: string | null
          id?: string
          is_poc?: boolean
          name: string
          phone?: string | null
          title_at_company?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          email?: string | null
          id?: string
          is_poc?: boolean
          name?: string
          phone?: string | null
          title_at_company?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          assigned_csr_id: string | null
          created_at: string
          data_source_tier:
            | Database["public"]["Enums"]["data_source_tier"]
            | null
          data_source_type: Database["public"]["Enums"]["provider_type"]
          id: string
          name: string
          package_price: number | null
          skip_trace_rate: number | null
          skip_trace_rate_tier:
            | Database["public"]["Enums"]["skip_trace_rate_tier"]
            | null
          skip_tracing_type: Database["public"]["Enums"]["provider_type"]
        }
        Insert: {
          assigned_csr_id?: string | null
          created_at?: string
          data_source_tier?:
            | Database["public"]["Enums"]["data_source_tier"]
            | null
          data_source_type: Database["public"]["Enums"]["provider_type"]
          id?: string
          name: string
          package_price?: number | null
          skip_trace_rate?: number | null
          skip_trace_rate_tier?:
            | Database["public"]["Enums"]["skip_trace_rate_tier"]
            | null
          skip_tracing_type: Database["public"]["Enums"]["provider_type"]
        }
        Update: {
          assigned_csr_id?: string | null
          created_at?: string
          data_source_tier?:
            | Database["public"]["Enums"]["data_source_tier"]
            | null
          data_source_type?: Database["public"]["Enums"]["provider_type"]
          id?: string
          name?: string
          package_price?: number | null
          skip_trace_rate?: number | null
          skip_trace_rate_tier?:
            | Database["public"]["Enums"]["skip_trace_rate_tier"]
            | null
          skip_tracing_type?: Database["public"]["Enums"]["provider_type"]
        }
        Relationships: [
          {
            foreignKeyName: "companies_assigned_csr_id_fkey"
            columns: ["assigned_csr_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      data_lists: {
        Row: {
          campaign_service_id: string
          created_at: string
          duplicates: number
          entered_by: string
          id: string
          list_date: string
          records_accepted: number
          records_count: number
          records_skip_traced: number | null
          skip_trace_rate: number
        }
        Insert: {
          campaign_service_id: string
          created_at?: string
          duplicates: number
          entered_by: string
          id?: string
          list_date: string
          records_accepted: number
          records_count: number
          records_skip_traced?: number | null
          skip_trace_rate?: number
        }
        Update: {
          campaign_service_id?: string
          created_at?: string
          duplicates?: number
          entered_by?: string
          id?: string
          list_date?: string
          records_accepted?: number
          records_count?: number
          records_skip_traced?: number | null
          skip_trace_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "data_lists_campaign_service_id_fkey"
            columns: ["campaign_service_id"]
            isOneToOne: false
            referencedRelation: "campaign_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_lists_entered_by_fkey"
            columns: ["entered_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      upsells: {
        Row: {
          campaign_service_id: string | null
          company_id: string
          created_at: string
          created_by: string
          csr_id: string
          from_tier: string | null
          id: string
          notes: string | null
          quantity: number
          to_tier: string | null
          total_amount: number | null
          unit_amount: number
          upsell_type: Database["public"]["Enums"]["upsell_type"]
        }
        Insert: {
          campaign_service_id?: string | null
          company_id: string
          created_at?: string
          created_by: string
          csr_id: string
          from_tier?: string | null
          id?: string
          notes?: string | null
          quantity?: number
          to_tier?: string | null
          total_amount?: number | null
          unit_amount: number
          upsell_type: Database["public"]["Enums"]["upsell_type"]
        }
        Update: {
          campaign_service_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string
          csr_id?: string
          from_tier?: string | null
          id?: string
          notes?: string | null
          quantity?: number
          to_tier?: string | null
          total_amount?: number | null
          unit_amount?: number
          upsell_type?: Database["public"]["Enums"]["upsell_type"]
        }
        Relationships: [
          {
            foreignKeyName: "upsells_campaign_service_id_fkey"
            columns: ["campaign_service_id"]
            isOneToOne: false
            referencedRelation: "campaign_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upsells_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upsells_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upsells_csr_id_fkey"
            columns: ["csr_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          start_date: string | null
          status: Database["public"]["Enums"]["user_status"]
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          name: string
          phone?: string | null
          role: Database["public"]["Enums"]["user_role"]
          start_date?: string | null
          status?: Database["public"]["Enums"]["user_status"]
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          start_date?: string | null
          status?: Database["public"]["Enums"]["user_status"]
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_commissions: {
        Args: { p_month: string }
        Returns: {
          csr_id: string
          csr_name: string
          data_commission: number
          total_commission: number
          upsell_commission: number
        }[]
      }
    }
    Enums: {
      campaign_type: "cold_calling" | "texting"
      data_source_tier: "package" | "payg" | "legacy"
      provider_type: "res" | "self_provided"
      rate_type: "standard" | "promo"
      skip_trace_rate_tier: "0.09" | "0.07" | "0.0525" | "custom"
      texting_tier: "50k" | "75k" | "100k"
      upsell_type:
        | "add_cc_seat"
        | "add_texting_service"
        | "dwy_lm"
        | "dfy_lm"
        | "texting_package_upgrade"
      user_role: "csr" | "tl" | "hod" | "admin" | "sysadmin"
      user_status: "invited" | "active"
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
      campaign_type: ["cold_calling", "texting"],
      data_source_tier: ["package", "payg", "legacy"],
      provider_type: ["res", "self_provided"],
      rate_type: ["standard", "promo"],
      skip_trace_rate_tier: ["0.09", "0.07", "0.0525", "custom"],
      texting_tier: ["50k", "75k", "100k"],
      upsell_type: [
        "add_cc_seat",
        "add_texting_service",
        "dwy_lm",
        "dfy_lm",
        "texting_package_upgrade",
      ],
      user_role: ["csr", "tl", "hod", "admin", "sysadmin"],
      user_status: ["invited", "active"],
    },
  },
} as const
