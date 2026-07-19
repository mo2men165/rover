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
      churn_records: {
        Row: {
          churn_type: Database["public"]["Enums"]["churn_type"]
          client_id: string
          created_at: string
          deposit_status: Database["public"]["Enums"]["deposit_status"] | null
          flagged_at: string
          id: string
          reason: string | null
          resolved_at: string | null
          risk_score: number | null
          signals: Json
        }
        Insert: {
          churn_type: Database["public"]["Enums"]["churn_type"]
          client_id: string
          created_at?: string
          deposit_status?: Database["public"]["Enums"]["deposit_status"] | null
          flagged_at?: string
          id?: string
          reason?: string | null
          resolved_at?: string | null
          risk_score?: number | null
          signals?: Json
        }
        Update: {
          churn_type?: Database["public"]["Enums"]["churn_type"]
          client_id?: string
          created_at?: string
          deposit_status?: Database["public"]["Enums"]["deposit_status"] | null
          flagged_at?: string
          id?: string
          reason?: string | null
          resolved_at?: string | null
          risk_score?: number | null
          signals?: Json
        }
        Relationships: [
          {
            foreignKeyName: "churn_records_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          assigned_csr_id: string | null
          buy_box: Json | null
          company_id: string
          created_at: string
          data_source_tier:
            | Database["public"]["Enums"]["data_source_tier"]
            | null
          data_source_type: Database["public"]["Enums"]["provider_type"] | null
          email: string | null
          hs_object_id: string | null
          id: string
          is_poc: boolean
          name: string
          package_end_date: string | null
          package_price: number | null
          package_start_date: string | null
          package_tier: Database["public"]["Enums"]["package_tier"] | null
          phone: string | null
          pinned_notes: string | null
          preferred_contact_method:
            | Database["public"]["Enums"]["contact_method"]
            | null
          role: string | null
          script: Database["public"]["Enums"]["client_script"] | null
          skip_trace_rate: number | null
          skip_trace_rate_tier:
            | Database["public"]["Enums"]["skip_trace_rate_tier"]
            | null
          skip_tracing_type: Database["public"]["Enums"]["provider_type"] | null
          title_at_company: string | null
        }
        Insert: {
          assigned_csr_id?: string | null
          buy_box?: Json | null
          company_id: string
          created_at?: string
          data_source_tier?:
            | Database["public"]["Enums"]["data_source_tier"]
            | null
          data_source_type?: Database["public"]["Enums"]["provider_type"] | null
          email?: string | null
          hs_object_id?: string | null
          id?: string
          is_poc?: boolean
          name: string
          package_end_date?: string | null
          package_price?: number | null
          package_start_date?: string | null
          package_tier?: Database["public"]["Enums"]["package_tier"] | null
          phone?: string | null
          pinned_notes?: string | null
          preferred_contact_method?:
            | Database["public"]["Enums"]["contact_method"]
            | null
          role?: string | null
          script?: Database["public"]["Enums"]["client_script"] | null
          skip_trace_rate?: number | null
          skip_trace_rate_tier?:
            | Database["public"]["Enums"]["skip_trace_rate_tier"]
            | null
          skip_tracing_type?:
            | Database["public"]["Enums"]["provider_type"]
            | null
          title_at_company?: string | null
        }
        Update: {
          assigned_csr_id?: string | null
          buy_box?: Json | null
          company_id?: string
          created_at?: string
          data_source_tier?:
            | Database["public"]["Enums"]["data_source_tier"]
            | null
          data_source_type?: Database["public"]["Enums"]["provider_type"] | null
          email?: string | null
          hs_object_id?: string | null
          id?: string
          is_poc?: boolean
          name?: string
          package_end_date?: string | null
          package_price?: number | null
          package_start_date?: string | null
          package_tier?: Database["public"]["Enums"]["package_tier"] | null
          phone?: string | null
          pinned_notes?: string | null
          preferred_contact_method?:
            | Database["public"]["Enums"]["contact_method"]
            | null
          role?: string | null
          script?: Database["public"]["Enums"]["client_script"] | null
          skip_trace_rate?: number | null
          skip_trace_rate_tier?:
            | Database["public"]["Enums"]["skip_trace_rate_tier"]
            | null
          skip_tracing_type?:
            | Database["public"]["Enums"]["provider_type"]
            | null
          title_at_company?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_assigned_csr_id_fkey"
            columns: ["assigned_csr_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
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
      complaints: {
        Row: {
          category: string
          client_id: string
          created_at: string
          description: string
          id: string
          logged_by: string
          opened_at: string
          resolution_notes: string | null
          resolved_at: string | null
          status: Database["public"]["Enums"]["complaint_status"]
          validity: Database["public"]["Enums"]["complaint_validity"]
        }
        Insert: {
          category: string
          client_id: string
          created_at?: string
          description: string
          id?: string
          logged_by: string
          opened_at?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["complaint_status"]
          validity: Database["public"]["Enums"]["complaint_validity"]
        }
        Update: {
          category?: string
          client_id?: string
          created_at?: string
          description?: string
          id?: string
          logged_by?: string
          opened_at?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["complaint_status"]
          validity?: Database["public"]["Enums"]["complaint_validity"]
        }
        Relationships: [
          {
            foreignKeyName: "complaints_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaints_logged_by_fkey"
            columns: ["logged_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      csr_quotas: {
        Row: {
          created_at: string
          csr_id: string
          id: string
          quarter: string
          records_target: number
        }
        Insert: {
          created_at?: string
          csr_id: string
          id?: string
          quarter: string
          records_target: number
        }
        Update: {
          created_at?: string
          csr_id?: string
          id?: string
          quarter?: string
          records_target?: number
        }
        Relationships: [
          {
            foreignKeyName: "csr_quotas_csr_id_fkey"
            columns: ["csr_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      data_list_services: {
        Row: {
          campaign_service_id: string
          data_list_id: string
        }
        Insert: {
          campaign_service_id: string
          data_list_id: string
        }
        Update: {
          campaign_service_id?: string
          data_list_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_list_services_campaign_service_id_fkey"
            columns: ["campaign_service_id"]
            isOneToOne: false
            referencedRelation: "campaign_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_list_services_data_list_id_fkey"
            columns: ["data_list_id"]
            isOneToOne: false
            referencedRelation: "data_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      data_lists: {
        Row: {
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
            foreignKeyName: "data_lists_entered_by_fkey"
            columns: ["entered_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      email_accounts: {
        Row: {
          connected_at: string
          gmail_address: string
          history_id: string | null
          id: string
          refresh_token_enc: string | null
          user_id: string
          watch_expiry: string | null
        }
        Insert: {
          connected_at?: string
          gmail_address: string
          history_id?: string | null
          id?: string
          refresh_token_enc?: string | null
          user_id: string
          watch_expiry?: string | null
        }
        Update: {
          connected_at?: string
          gmail_address?: string
          history_id?: string | null
          id?: string
          refresh_token_enc?: string | null
          user_id?: string
          watch_expiry?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      email_messages: {
        Row: {
          body_text: string | null
          created_at: string
          direction: Database["public"]["Enums"]["interaction_direction"] | null
          from_address: string | null
          gmail_message_id: string
          id: string
          sent_at: string | null
          snippet: string | null
          subject: string | null
          thread_id: string
          to_addresses: string[] | null
        }
        Insert: {
          body_text?: string | null
          created_at?: string
          direction?:
            | Database["public"]["Enums"]["interaction_direction"]
            | null
          from_address?: string | null
          gmail_message_id: string
          id?: string
          sent_at?: string | null
          snippet?: string | null
          subject?: string | null
          thread_id: string
          to_addresses?: string[] | null
        }
        Update: {
          body_text?: string | null
          created_at?: string
          direction?:
            | Database["public"]["Enums"]["interaction_direction"]
            | null
          from_address?: string | null
          gmail_message_id?: string
          id?: string
          sent_at?: string | null
          snippet?: string | null
          subject?: string | null
          thread_id?: string
          to_addresses?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "email_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "email_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      email_threads: {
        Row: {
          client_id: string | null
          created_at: string
          email_account_id: string
          gmail_thread_id: string
          id: string
          interaction_id: string | null
          last_message_at: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["email_thread_status"]
          subject: string | null
          summary: string | null
          user_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          email_account_id: string
          gmail_thread_id: string
          id?: string
          interaction_id?: string | null
          last_message_at?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["email_thread_status"]
          subject?: string | null
          summary?: string | null
          user_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          email_account_id?: string
          gmail_thread_id?: string
          id?: string
          interaction_id?: string | null
          last_message_at?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["email_thread_status"]
          subject?: string | null
          summary?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_threads_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_threads_email_account_id_fkey"
            columns: ["email_account_id"]
            isOneToOne: false
            referencedRelation: "email_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_threads_interaction_id_fkey"
            columns: ["interaction_id"]
            isOneToOne: false
            referencedRelation: "interactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_threads_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_threads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_up_tasks: {
        Row: {
          assigned_to: string
          complaint_id: string | null
          completed: boolean
          completed_at: string | null
          created_at: string
          description: string
          due_date: string
          id: string
        }
        Insert: {
          assigned_to: string
          complaint_id?: string | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          description: string
          due_date: string
          id?: string
        }
        Update: {
          assigned_to?: string
          complaint_id?: string | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          description?: string
          due_date?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follow_up_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_up_tasks_complaint_id_fkey"
            columns: ["complaint_id"]
            isOneToOne: false
            referencedRelation: "complaints"
            referencedColumns: ["id"]
          },
        ]
      }
      interactions: {
        Row: {
          client_id: string
          created_at: string
          direction: Database["public"]["Enums"]["interaction_direction"]
          external_id: string | null
          hubspot_sync_note: string | null
          hubspot_synced: boolean
          id: string
          logged_by: string
          occurred_at: string
          source: Database["public"]["Enums"]["interaction_source"]
          summary: string
          type: Database["public"]["Enums"]["interaction_type"]
        }
        Insert: {
          client_id: string
          created_at?: string
          direction: Database["public"]["Enums"]["interaction_direction"]
          external_id?: string | null
          hubspot_sync_note?: string | null
          hubspot_synced?: boolean
          id?: string
          logged_by: string
          occurred_at?: string
          source?: Database["public"]["Enums"]["interaction_source"]
          summary: string
          type: Database["public"]["Enums"]["interaction_type"]
        }
        Update: {
          client_id?: string
          created_at?: string
          direction?: Database["public"]["Enums"]["interaction_direction"]
          external_id?: string | null
          hubspot_sync_note?: string | null
          hubspot_synced?: boolean
          id?: string
          logged_by?: string
          occurred_at?: string
          source?: Database["public"]["Enums"]["interaction_source"]
          summary?: string
          type?: Database["public"]["Enums"]["interaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "interactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactions_logged_by_fkey"
            columns: ["logged_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_payment_confirmations: {
        Row: {
          client_id: string
          confirmed_at: string
          confirmed_by: string
          created_at: string
          id: string
          month: string
        }
        Insert: {
          client_id: string
          confirmed_at?: string
          confirmed_by: string
          created_at?: string
          id?: string
          month: string
        }
        Update: {
          client_id?: string
          confirmed_at?: string
          confirmed_by?: string
          created_at?: string
          id?: string
          month?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_payment_confirmations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_payment_confirmations_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          dismissed_at: string | null
          id: string
          kind: Database["public"]["Enums"]["notification_kind"]
          payload: Json | null
          title: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          dismissed_at?: string | null
          id?: string
          kind: Database["public"]["Enums"]["notification_kind"]
          payload?: Json | null
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          dismissed_at?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["notification_kind"]
          payload?: Json | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payg_requests: {
        Row: {
          client_id: string
          created_at: string
          created_by: string
          id: string
          paid: boolean
          paid_at: string | null
          pull_rate: number
          records_to_pull: number
          records_to_skip_trace: number
          skip_trace_rate: number
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by: string
          id?: string
          paid?: boolean
          paid_at?: string | null
          pull_rate?: number
          records_to_pull: number
          records_to_skip_trace?: number
          skip_trace_rate?: number
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string
          id?: string
          paid?: boolean
          paid_at?: string | null
          pull_rate?: number
          records_to_pull?: number
          records_to_skip_trace?: number
          skip_trace_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "payg_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payg_requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          converted_at: string | null
          created_at: string
          csr_id: string
          id: string
          notes: string | null
          pitched_at: string
          referred_client_id: string | null
          referring_client_id: string | null
          status: Database["public"]["Enums"]["referral_status"]
        }
        Insert: {
          converted_at?: string | null
          created_at?: string
          csr_id: string
          id?: string
          notes?: string | null
          pitched_at?: string
          referred_client_id?: string | null
          referring_client_id?: string | null
          status?: Database["public"]["Enums"]["referral_status"]
        }
        Update: {
          converted_at?: string | null
          created_at?: string
          csr_id?: string
          id?: string
          notes?: string | null
          pitched_at?: string
          referred_client_id?: string | null
          referring_client_id?: string | null
          status?: Database["public"]["Enums"]["referral_status"]
        }
        Relationships: [
          {
            foreignKeyName: "referrals_csr_id_fkey"
            columns: ["csr_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referred_client_id_fkey"
            columns: ["referred_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referring_client_id_fkey"
            columns: ["referring_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      stoplight_week_reviews: {
        Row: {
          confirmed_at: string
          confirmed_by: string
          created_at: string
          csr_id: string
          id: string
          notes: string | null
          week_start: string
        }
        Insert: {
          confirmed_at?: string
          confirmed_by: string
          created_at?: string
          csr_id: string
          id?: string
          notes?: string | null
          week_start: string
        }
        Update: {
          confirmed_at?: string
          confirmed_by?: string
          created_at?: string
          csr_id?: string
          id?: string
          notes?: string | null
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "stoplight_week_reviews_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stoplight_week_reviews_csr_id_fkey"
            columns: ["csr_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      upsell_opportunities: {
        Row: {
          client_id: string
          created_at: string
          csr_id: string
          id: string
          lost_reason: string | null
          notes: string | null
          quantity: number
          snooze_until: string | null
          stage: Database["public"]["Enums"]["upsell_stage"]
          updated_at: string
          upsell_type: Database["public"]["Enums"]["upsell_type"]
        }
        Insert: {
          client_id: string
          created_at?: string
          csr_id: string
          id?: string
          lost_reason?: string | null
          notes?: string | null
          quantity?: number
          snooze_until?: string | null
          stage?: Database["public"]["Enums"]["upsell_stage"]
          updated_at?: string
          upsell_type: Database["public"]["Enums"]["upsell_type"]
        }
        Update: {
          client_id?: string
          created_at?: string
          csr_id?: string
          id?: string
          lost_reason?: string | null
          notes?: string | null
          quantity?: number
          snooze_until?: string | null
          stage?: Database["public"]["Enums"]["upsell_stage"]
          updated_at?: string
          upsell_type?: Database["public"]["Enums"]["upsell_type"]
        }
        Relationships: [
          {
            foreignKeyName: "upsell_opportunities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upsell_opportunities_csr_id_fkey"
            columns: ["csr_id"]
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
          upsell_opportunity_id: string | null
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
          upsell_opportunity_id?: string | null
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
          upsell_opportunity_id?: string | null
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
          {
            foreignKeyName: "upsells_upsell_opportunity_id_fkey"
            columns: ["upsell_opportunity_id"]
            isOneToOne: false
            referencedRelation: "upsell_opportunities"
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
      company_assigned_csr_id: {
        Args: { p_company_id: string }
        Returns: string
      }
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_commissions: {
        Args: { p_month: string }
        Returns: {
          csr_id: string
          csr_name: string
          package_commission: number
          payg_commission: number
          total_commission: number
          upsell_commission: number
        }[]
      }
    }
    Enums: {
      campaign_type: "cold_calling" | "texting"
      churn_type: "known" | "unknown"
      client_script: "four_pillars" | "motivation_only"
      complaint_status: "open" | "resolved"
      complaint_validity: "valid" | "invalid"
      contact_method: "email" | "phone" | "text"
      data_source_tier: "package" | "payg" | "legacy"
      deposit_status: "keep" | "use" | "refund"
      email_thread_status: "open" | "done" | "ignored"
      interaction_direction: "inbound" | "outbound" | "internal"
      interaction_source: "manual" | "gmail" | "fathom" | "hubspot_sync"
      interaction_type:
        | "email"
        | "call"
        | "sms"
        | "whatsapp"
        | "slack"
        | "meeting"
        | "note"
      notification_kind: "eod_no_interaction" | "open_email_threads"
      package_tier: "starter" | "pro" | "growth"
      provider_type: "res" | "self_provided"
      rate_type: "standard" | "promo"
      referral_status: "pitched" | "converted"
      skip_trace_rate_tier: "0.09" | "0.07" | "0.0525" | "custom"
      texting_tier: "50k" | "75k" | "100k"
      upsell_stage: "opportunity" | "pitched" | "pending" | "won" | "lost"
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
      churn_type: ["known", "unknown"],
      client_script: ["four_pillars", "motivation_only"],
      complaint_status: ["open", "resolved"],
      complaint_validity: ["valid", "invalid"],
      contact_method: ["email", "phone", "text"],
      data_source_tier: ["package", "payg", "legacy"],
      deposit_status: ["keep", "use", "refund"],
      email_thread_status: ["open", "done", "ignored"],
      interaction_direction: ["inbound", "outbound", "internal"],
      interaction_source: ["manual", "gmail", "fathom", "hubspot_sync"],
      interaction_type: [
        "email",
        "call",
        "sms",
        "whatsapp",
        "slack",
        "meeting",
        "note",
      ],
      notification_kind: ["eod_no_interaction", "open_email_threads"],
      package_tier: ["starter", "pro", "growth"],
      provider_type: ["res", "self_provided"],
      rate_type: ["standard", "promo"],
      referral_status: ["pitched", "converted"],
      skip_trace_rate_tier: ["0.09", "0.07", "0.0525", "custom"],
      texting_tier: ["50k", "75k", "100k"],
      upsell_stage: ["opportunity", "pitched", "pending", "won", "lost"],
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
