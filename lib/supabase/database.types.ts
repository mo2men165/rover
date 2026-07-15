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
          assigned_csr_id: string
          company_id: string
          created_at: string
          id: string
          name: string | null
          rate_type: Database["public"]["Enums"]["rate_type"] | null
          seat_count: number
          service_type: Database["public"]["Enums"]["service_tier"] | null
          source_type: Database["public"]["Enums"]["source_type"]
          type: Database["public"]["Enums"]["campaign_type"]
        }
        Insert: {
          assigned_csr_id: string
          company_id: string
          created_at?: string
          id?: string
          name?: string | null
          rate_type?: Database["public"]["Enums"]["rate_type"] | null
          seat_count: number
          service_type?: Database["public"]["Enums"]["service_tier"] | null
          source_type: Database["public"]["Enums"]["source_type"]
          type: Database["public"]["Enums"]["campaign_type"]
        }
        Update: {
          assigned_csr_id?: string
          company_id?: string
          created_at?: string
          id?: string
          name?: string | null
          rate_type?: Database["public"]["Enums"]["rate_type"] | null
          seat_count?: number
          service_type?: Database["public"]["Enums"]["service_tier"] | null
          source_type?: Database["public"]["Enums"]["source_type"]
          type?: Database["public"]["Enums"]["campaign_type"]
        }
        Relationships: [
          {
            foreignKeyName: "campaign_services_assigned_csr_id_fkey"
            columns: ["assigned_csr_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
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
      commissions: {
        Row: {
          amount: number
          created_at: string
          created_by: string
          csr_id: string
          id: string
          month: string
          source_note: string
          type: Database["public"]["Enums"]["commission_type"]
        }
        Insert: {
          amount: number
          created_at?: string
          created_by: string
          csr_id: string
          id?: string
          month: string
          source_note: string
          type: Database["public"]["Enums"]["commission_type"]
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string
          csr_id?: string
          id?: string
          month?: string
          source_note?: string
          type?: Database["public"]["Enums"]["commission_type"]
        }
        Relationships: [
          {
            foreignKeyName: "commissions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_csr_id_fkey"
            columns: ["csr_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
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
    }
    Enums: {
      campaign_type: "cold_calling" | "texting"
      commission_type: "data" | "upsell"
      rate_type: "standard" | "promo"
      service_tier: "starter" | "pro" | "growth" | "legacy" | "payg"
      source_type: "res" | "self_provided"
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
      commission_type: ["data", "upsell"],
      rate_type: ["standard", "promo"],
      service_tier: ["starter", "pro", "growth", "legacy", "payg"],
      source_type: ["res", "self_provided"],
      user_role: ["csr", "tl", "hod", "admin", "sysadmin"],
      user_status: ["invited", "active"],
    },
  },
} as const
