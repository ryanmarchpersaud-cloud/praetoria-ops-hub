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
      activities: {
        Row: {
          action_name: string
          approved_by: string | null
          created_at: string
          error_message: string | null
          id: string
          needs_approval: boolean | null
          payload_summary: Json | null
          record_id: string | null
          record_type: string | null
          status: string | null
          user_id: string | null
          workflow_name: string | null
        }
        Insert: {
          action_name: string
          approved_by?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          needs_approval?: boolean | null
          payload_summary?: Json | null
          record_id?: string | null
          record_type?: string | null
          status?: string | null
          user_id?: string | null
          workflow_name?: string | null
        }
        Update: {
          action_name?: string
          approved_by?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          needs_approval?: boolean | null
          payload_summary?: Json | null
          record_id?: string | null
          record_type?: string | null
          status?: string | null
          user_id?: string | null
          workflow_name?: string | null
        }
        Relationships: []
      }
      agreement_audit_log: {
        Row: {
          action: string
          agreement_id: string
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json | null
          performed_by: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          agreement_id: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          performed_by?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          agreement_id?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          performed_by?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agreement_audit_log_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "agreements"
            referencedColumns: ["id"]
          },
        ]
      }
      agreement_signatures: {
        Row: {
          agreement_id: string
          consent_text: string | null
          id: string
          ip_address: string | null
          signature_data: string | null
          signature_type: string
          signed_at: string
          signer_email: string | null
          signer_name: string
          user_agent: string | null
        }
        Insert: {
          agreement_id: string
          consent_text?: string | null
          id?: string
          ip_address?: string | null
          signature_data?: string | null
          signature_type?: string
          signed_at?: string
          signer_email?: string | null
          signer_name: string
          user_agent?: string | null
        }
        Update: {
          agreement_id?: string
          consent_text?: string | null
          id?: string
          ip_address?: string | null
          signature_data?: string | null
          signature_type?: string
          signed_at?: string
          signer_email?: string | null
          signer_name?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agreement_signatures_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "agreements"
            referencedColumns: ["id"]
          },
        ]
      }
      agreement_templates: {
        Row: {
          body_html: string
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          merge_fields: Json | null
          name: string
          updated_at: string
          version: number
        }
        Insert: {
          body_html?: string
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          merge_fields?: Json | null
          name: string
          updated_at?: string
          version?: number
        }
        Update: {
          body_html?: string
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          merge_fields?: Json | null
          name?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      agreements: {
        Row: {
          attachment_url: string | null
          body_html: string
          category: string
          created_at: string
          created_by: string | null
          customer_id: string | null
          declined_at: string | null
          employee_user_id: string | null
          expires_at: string | null
          id: string
          internal_reference: string | null
          job_id: string | null
          merge_data: Json | null
          notes: string | null
          property_id: string | null
          quote_id: string | null
          recipient_email: string | null
          recipient_name: string
          recipient_type: string
          recipient_user_id: string | null
          sent_at: string | null
          sent_by: string | null
          signed_at: string | null
          signing_token: string | null
          status: string
          subcontractor_user_id: string | null
          superseded_by: string | null
          template_id: string | null
          title: string
          updated_at: string
          version: number
          viewed_at: string | null
        }
        Insert: {
          attachment_url?: string | null
          body_html?: string
          category?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          declined_at?: string | null
          employee_user_id?: string | null
          expires_at?: string | null
          id?: string
          internal_reference?: string | null
          job_id?: string | null
          merge_data?: Json | null
          notes?: string | null
          property_id?: string | null
          quote_id?: string | null
          recipient_email?: string | null
          recipient_name: string
          recipient_type?: string
          recipient_user_id?: string | null
          sent_at?: string | null
          sent_by?: string | null
          signed_at?: string | null
          signing_token?: string | null
          status?: string
          subcontractor_user_id?: string | null
          superseded_by?: string | null
          template_id?: string | null
          title: string
          updated_at?: string
          version?: number
          viewed_at?: string | null
        }
        Update: {
          attachment_url?: string | null
          body_html?: string
          category?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          declined_at?: string | null
          employee_user_id?: string | null
          expires_at?: string | null
          id?: string
          internal_reference?: string | null
          job_id?: string | null
          merge_data?: Json | null
          notes?: string | null
          property_id?: string | null
          quote_id?: string | null
          recipient_email?: string | null
          recipient_name?: string
          recipient_type?: string
          recipient_user_id?: string | null
          sent_at?: string | null
          sent_by?: string | null
          signed_at?: string | null
          signing_token?: string | null
          status?: string
          subcontractor_user_id?: string | null
          superseded_by?: string | null
          template_id?: string | null
          title?: string
          updated_at?: string
          version?: number
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agreements_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agreements_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agreements_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agreements_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agreements_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "agreements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agreements_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "agreement_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_dismissals: {
        Row: {
          announcement_id: string
          dismissed_at: string
          id: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          dismissed_at?: string
          id?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          dismissed_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_dismissals_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "system_announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      app_versions: {
        Row: {
          created_at: string
          current_version: string
          force_update: boolean
          id: string
          minimum_version: string
          platform: string
          release_notes: string | null
          store_url: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_version?: string
          force_update?: boolean
          id?: string
          minimum_version?: string
          platform?: string
          release_notes?: string | null
          store_url?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_version?: string
          force_update?: boolean
          id?: string
          minimum_version?: string
          platform?: string
          release_notes?: string | null
          store_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      automation_logs: {
        Row: {
          created_at: string
          id: string
          message: string | null
          metadata: Json | null
          rule_id: string | null
          rule_name: string
          status: string
          trigger_event: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          metadata?: Json | null
          rule_id?: string | null
          rule_name: string
          status?: string
          trigger_event: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          metadata?: Json | null
          rule_id?: string | null
          rule_name?: string
          status?: string
          trigger_event?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_logs_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_rules: {
        Row: {
          actions: Json | null
          category: string | null
          conditions: Json | null
          created_at: string
          created_by: string | null
          description: string | null
          enabled: boolean
          id: string
          last_triggered_at: string | null
          name: string
          priority: number | null
          scope: string | null
          trigger_count: number | null
          trigger_event: string
          updated_at: string
        }
        Insert: {
          actions?: Json | null
          category?: string | null
          conditions?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          enabled?: boolean
          id?: string
          last_triggered_at?: string | null
          name: string
          priority?: number | null
          scope?: string | null
          trigger_count?: number | null
          trigger_event: string
          updated_at?: string
        }
        Update: {
          actions?: Json | null
          category?: string | null
          conditions?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          enabled?: boolean
          id?: string
          last_triggered_at?: string | null
          name?: string
          priority?: number | null
          scope?: string | null
          trigger_count?: number | null
          trigger_event?: string
          updated_at?: string
        }
        Relationships: []
      }
      client_hub_settings: {
        Row: {
          client_notes_editable_by: string | null
          comm_history_visible_to: string | null
          comm_prefs_editable_by: string | null
          created_at: string
          default_contact_method: string | null
          default_customer_types: Json | null
          default_tags: Json | null
          do_not_contact_enabled: boolean | null
          duplicate_detection_enabled: boolean | null
          id: string
          portal_invitation_auto: boolean | null
          require_address: boolean | null
          require_email: boolean | null
          require_phone: boolean | null
          require_postal_code: boolean | null
          separate_billing_address: boolean | null
          updated_at: string
          vip_flag_enabled: boolean | null
        }
        Insert: {
          client_notes_editable_by?: string | null
          comm_history_visible_to?: string | null
          comm_prefs_editable_by?: string | null
          created_at?: string
          default_contact_method?: string | null
          default_customer_types?: Json | null
          default_tags?: Json | null
          do_not_contact_enabled?: boolean | null
          duplicate_detection_enabled?: boolean | null
          id?: string
          portal_invitation_auto?: boolean | null
          require_address?: boolean | null
          require_email?: boolean | null
          require_phone?: boolean | null
          require_postal_code?: boolean | null
          separate_billing_address?: boolean | null
          updated_at?: string
          vip_flag_enabled?: boolean | null
        }
        Update: {
          client_notes_editable_by?: string | null
          comm_history_visible_to?: string | null
          comm_prefs_editable_by?: string | null
          created_at?: string
          default_contact_method?: string | null
          default_customer_types?: Json | null
          default_tags?: Json | null
          do_not_contact_enabled?: boolean | null
          duplicate_detection_enabled?: boolean | null
          id?: string
          portal_invitation_auto?: boolean | null
          require_address?: boolean | null
          require_email?: boolean | null
          require_phone?: boolean | null
          require_postal_code?: boolean | null
          separate_billing_address?: boolean | null
          updated_at?: string
          vip_flag_enabled?: boolean | null
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          accent_color: string | null
          after_hours_enabled: boolean | null
          billing_email: string | null
          brand_notes: string | null
          business_number: string | null
          created_at: string
          currency: string | null
          date_format: string | null
          default_due_days: number | null
          default_payment_terms: string | null
          default_service_area: string | null
          default_tax_enabled: boolean | null
          default_tax_rate: number | null
          default_timezone: string | null
          deposit_required: boolean | null
          description: string | null
          display_name: string | null
          email: string | null
          email_signature: string | null
          emergency_service_enabled: boolean | null
          gst_number: string | null
          id: string
          internal_notes_visible_default: boolean | null
          invoice_header_name: string | null
          invoice_prefix: string | null
          job_prefix: string | null
          language: string | null
          legal_name: string | null
          logo_url: string | null
          mailing_address: string | null
          operating_hours: string | null
          operating_name: string | null
          phone: string | null
          physical_address: string | null
          primary_color: string | null
          pst_number: string | null
          quote_footer_text: string | null
          quote_prefix: string | null
          request_prefix: string | null
          secondary_color: string | null
          support_email: string | null
          updated_at: string
          website: string | null
          weekend_service_enabled: boolean | null
        }
        Insert: {
          accent_color?: string | null
          after_hours_enabled?: boolean | null
          billing_email?: string | null
          brand_notes?: string | null
          business_number?: string | null
          created_at?: string
          currency?: string | null
          date_format?: string | null
          default_due_days?: number | null
          default_payment_terms?: string | null
          default_service_area?: string | null
          default_tax_enabled?: boolean | null
          default_tax_rate?: number | null
          default_timezone?: string | null
          deposit_required?: boolean | null
          description?: string | null
          display_name?: string | null
          email?: string | null
          email_signature?: string | null
          emergency_service_enabled?: boolean | null
          gst_number?: string | null
          id?: string
          internal_notes_visible_default?: boolean | null
          invoice_header_name?: string | null
          invoice_prefix?: string | null
          job_prefix?: string | null
          language?: string | null
          legal_name?: string | null
          logo_url?: string | null
          mailing_address?: string | null
          operating_hours?: string | null
          operating_name?: string | null
          phone?: string | null
          physical_address?: string | null
          primary_color?: string | null
          pst_number?: string | null
          quote_footer_text?: string | null
          quote_prefix?: string | null
          request_prefix?: string | null
          secondary_color?: string | null
          support_email?: string | null
          updated_at?: string
          website?: string | null
          weekend_service_enabled?: boolean | null
        }
        Update: {
          accent_color?: string | null
          after_hours_enabled?: boolean | null
          billing_email?: string | null
          brand_notes?: string | null
          business_number?: string | null
          created_at?: string
          currency?: string | null
          date_format?: string | null
          default_due_days?: number | null
          default_payment_terms?: string | null
          default_service_area?: string | null
          default_tax_enabled?: boolean | null
          default_tax_rate?: number | null
          default_timezone?: string | null
          deposit_required?: boolean | null
          description?: string | null
          display_name?: string | null
          email?: string | null
          email_signature?: string | null
          emergency_service_enabled?: boolean | null
          gst_number?: string | null
          id?: string
          internal_notes_visible_default?: boolean | null
          invoice_header_name?: string | null
          invoice_prefix?: string | null
          job_prefix?: string | null
          language?: string | null
          legal_name?: string | null
          logo_url?: string | null
          mailing_address?: string | null
          operating_hours?: string | null
          operating_name?: string | null
          phone?: string | null
          physical_address?: string | null
          primary_color?: string | null
          pst_number?: string | null
          quote_footer_text?: string | null
          quote_prefix?: string | null
          request_prefix?: string | null
          secondary_color?: string | null
          support_email?: string | null
          updated_at?: string
          website?: string | null
          weekend_service_enabled?: boolean | null
        }
        Relationships: []
      }
      conversation_members: {
        Row: {
          conversation_id: string
          id: string
          joined_at: string
          last_read_at: string | null
          muted: boolean
          role_snapshot: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          muted?: boolean
          role_snapshot?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          muted?: boolean
          role_snapshot?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          conversation_type: string
          created_at: string
          created_by: string
          equipment_item_id: string | null
          id: string
          incident_id: string | null
          is_announcement_only: boolean
          is_archived: boolean
          job_id: string | null
          last_message_at: string | null
          last_message_preview: string | null
          title: string | null
          updated_at: string
          visit_id: string | null
        }
        Insert: {
          conversation_type?: string
          created_at?: string
          created_by: string
          equipment_item_id?: string | null
          id?: string
          incident_id?: string | null
          is_announcement_only?: boolean
          is_archived?: boolean
          job_id?: string | null
          last_message_at?: string | null
          last_message_preview?: string | null
          title?: string | null
          updated_at?: string
          visit_id?: string | null
        }
        Update: {
          conversation_type?: string
          created_at?: string
          created_by?: string
          equipment_item_id?: string | null
          id?: string
          incident_id?: string | null
          is_announcement_only?: boolean
          is_archived?: boolean
          job_id?: string | null
          last_message_at?: string | null
          last_message_preview?: string | null
          title?: string | null
          updated_at?: string
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_equipment_item_id_fkey"
            columns: ["equipment_item_id"]
            isOneToOne: false
            referencedRelation: "worker_equipment_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incident_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_billing_profiles: {
        Row: {
          autopay_consent_at: string | null
          autopay_enabled: boolean
          billing_email: string | null
          billing_frequency: Database["public"]["Enums"]["billing_frequency"]
          card_brand: string | null
          card_last4: string | null
          created_at: string
          customer_id: string
          id: string
          notes: string | null
          payment_method_present: boolean
          payment_preference: Database["public"]["Enums"]["payment_method_type"]
          processor_customer_id: string | null
          updated_at: string
        }
        Insert: {
          autopay_consent_at?: string | null
          autopay_enabled?: boolean
          billing_email?: string | null
          billing_frequency?: Database["public"]["Enums"]["billing_frequency"]
          card_brand?: string | null
          card_last4?: string | null
          created_at?: string
          customer_id: string
          id?: string
          notes?: string | null
          payment_method_present?: boolean
          payment_preference?: Database["public"]["Enums"]["payment_method_type"]
          processor_customer_id?: string | null
          updated_at?: string
        }
        Update: {
          autopay_consent_at?: string | null
          autopay_enabled?: boolean
          billing_email?: string | null
          billing_frequency?: Database["public"]["Enums"]["billing_frequency"]
          card_brand?: string | null
          card_last4?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          notes?: string | null
          payment_method_present?: boolean
          payment_preference?: Database["public"]["Enums"]["payment_method_type"]
          processor_customer_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_billing_profiles_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_notification_preferences: {
        Row: {
          created_at: string
          customer_id: string
          email_enabled: boolean
          event: Database["public"]["Enums"]["notification_event"]
          id: string
          in_app_enabled: boolean
          sms_enabled: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          email_enabled?: boolean
          event: Database["public"]["Enums"]["notification_event"]
          id?: string
          in_app_enabled?: boolean
          sms_enabled?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          email_enabled?: boolean
          event?: Database["public"]["Enums"]["notification_event"]
          id?: string
          in_app_enabled?: boolean
          sms_enabled?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_notification_preferences_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_recurring_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          customer_id: string
          frequency: string
          id: string
          payment_preference: string | null
          preferred_service_window: string | null
          preferred_start_date: string | null
          property_id: string | null
          service_category: string
          special_instructions: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          customer_id: string
          frequency?: string
          id?: string
          payment_preference?: string | null
          preferred_service_window?: string | null
          preferred_start_date?: string | null
          property_id?: string | null
          service_category: string
          special_instructions?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          customer_id?: string
          frequency?: string
          id?: string
          payment_preference?: string | null
          preferred_service_window?: string | null
          preferred_start_date?: string | null
          property_id?: string | null
          service_category?: string
          special_instructions?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_recurring_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_recurring_requests_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_referrals: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          notes: string | null
          referral_address: string | null
          referral_email: string | null
          referral_name: string
          referral_phone: string | null
          reward_type: string | null
          reward_value: number | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          notes?: string | null
          referral_address?: string | null
          referral_email?: string | null
          referral_name: string
          referral_phone?: string | null
          reward_type?: string | null
          reward_value?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          notes?: string | null
          referral_address?: string | null
          referral_email?: string | null
          referral_name?: string
          referral_phone?: string | null
          reward_type?: string | null
          reward_value?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_referrals_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_service_preferences: {
        Row: {
          afternoon_preference: boolean | null
          back_alley_garbage_access_notes: string | null
          basement_window_notes: string | null
          before_6am_ok: boolean | null
          before_7am_ok: boolean | null
          created_at: string
          customer_id: string
          deck_patio_notes: string | null
          general_property_instructions: string | null
          generator_access_notes: string | null
          hand_shovel_only_areas: string | null
          id: string
          morning_preference: boolean | null
          preferred_service_window: string | null
          restricted_access_areas: string | null
          roof_access_request_notes: string | null
          salt_restriction_notes: string | null
          side_entrance_notes: string | null
          updated_at: string
        }
        Insert: {
          afternoon_preference?: boolean | null
          back_alley_garbage_access_notes?: string | null
          basement_window_notes?: string | null
          before_6am_ok?: boolean | null
          before_7am_ok?: boolean | null
          created_at?: string
          customer_id: string
          deck_patio_notes?: string | null
          general_property_instructions?: string | null
          generator_access_notes?: string | null
          hand_shovel_only_areas?: string | null
          id?: string
          morning_preference?: boolean | null
          preferred_service_window?: string | null
          restricted_access_areas?: string | null
          roof_access_request_notes?: string | null
          salt_restriction_notes?: string | null
          side_entrance_notes?: string | null
          updated_at?: string
        }
        Update: {
          afternoon_preference?: boolean | null
          back_alley_garbage_access_notes?: string | null
          basement_window_notes?: string | null
          before_6am_ok?: boolean | null
          before_7am_ok?: boolean | null
          created_at?: string
          customer_id?: string
          deck_patio_notes?: string | null
          general_property_instructions?: string | null
          generator_access_notes?: string | null
          hand_shovel_only_areas?: string | null
          id?: string
          morning_preference?: boolean | null
          preferred_service_window?: string | null
          restricted_access_areas?: string | null
          roof_access_request_notes?: string | null
          salt_restriction_notes?: string | null
          side_entrance_notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_service_preferences_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_warnings: {
        Row: {
          created_at: string | null
          customer_id: string
          description: string | null
          id: string
          is_active: boolean | null
          severity: string
          updated_at: string | null
          warning_type: string
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          severity?: string
          updated_at?: string | null
          warning_type?: string
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          severity?: string
          updated_at?: string | null
          warning_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_warnings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address_line_1: string | null
          city: string | null
          company_name: string | null
          created_at: string
          email: string | null
          first_name: string
          id: string
          last_name: string
          notes: string | null
          phone: string | null
          postal_code: string | null
          province: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address_line_1?: string | null
          city?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          first_name: string
          id?: string
          last_name: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address_line_1?: string | null
          city?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      employee_benefit_enrollments: {
        Row: {
          created_at: string
          eligibility_date: string | null
          employee_contribution_amount: number | null
          employee_contribution_percent: number | null
          employer_contribution_amount: number | null
          employer_contribution_percent: number | null
          id: string
          is_taxable_benefit: boolean | null
          notes: string | null
          plan_code: string | null
          plan_name: string
          plan_type: string
          provider_name: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          eligibility_date?: string | null
          employee_contribution_amount?: number | null
          employee_contribution_percent?: number | null
          employer_contribution_amount?: number | null
          employer_contribution_percent?: number | null
          id?: string
          is_taxable_benefit?: boolean | null
          notes?: string | null
          plan_code?: string | null
          plan_name: string
          plan_type?: string
          provider_name?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          eligibility_date?: string | null
          employee_contribution_amount?: number | null
          employee_contribution_percent?: number | null
          employer_contribution_amount?: number | null
          employer_contribution_percent?: number | null
          id?: string
          is_taxable_benefit?: boolean | null
          notes?: string | null
          plan_code?: string | null
          plan_name?: string
          plan_type?: string
          provider_name?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      employee_emergency_contacts: {
        Row: {
          address: string | null
          contact_name: string
          created_at: string
          email: string | null
          id: string
          is_primary: boolean
          phone_primary: string | null
          phone_secondary: string | null
          relationship: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          contact_name: string
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean
          phone_primary?: string | null
          phone_secondary?: string | null
          relationship?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          contact_name?: string
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean
          phone_primary?: string | null
          phone_secondary?: string | null
          relationship?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      employee_pay_stubs: {
        Row: {
          created_at: string
          deductions: number
          gross_pay: number
          id: string
          net_pay: number
          notes: string | null
          pay_date: string
          pay_period_end: string
          pay_period_start: string
          stub_pdf_url: string | null
          user_id: string
          ytd_gross: number
          ytd_net: number
        }
        Insert: {
          created_at?: string
          deductions?: number
          gross_pay?: number
          id?: string
          net_pay?: number
          notes?: string | null
          pay_date: string
          pay_period_end: string
          pay_period_start: string
          stub_pdf_url?: string | null
          user_id: string
          ytd_gross?: number
          ytd_net?: number
        }
        Update: {
          created_at?: string
          deductions?: number
          gross_pay?: number
          id?: string
          net_pay?: number
          notes?: string | null
          pay_date?: string
          pay_period_end?: string
          pay_period_start?: string
          stub_pdf_url?: string | null
          user_id?: string
          ytd_gross?: number
          ytd_net?: number
        }
        Relationships: []
      }
      employee_time_off_requests: {
        Row: {
          admin_notes: string | null
          approved_by: string | null
          created_at: string
          days_requested: number
          end_date: string
          id: string
          pay_status: string
          reason: string | null
          request_type: string
          reviewed_at: string | null
          start_date: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          approved_by?: string | null
          created_at?: string
          days_requested?: number
          end_date: string
          id?: string
          pay_status?: string
          reason?: string | null
          request_type?: string
          reviewed_at?: string | null
          start_date: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          approved_by?: string | null
          created_at?: string
          days_requested?: number
          end_date?: string
          id?: string
          pay_status?: string
          reason?: string | null
          request_type?: string
          reviewed_at?: string | null
          start_date?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          expense_date: string
          id: string
          job_id: string | null
          notes: string | null
          payment_method: string | null
          property_id: string | null
          receipt_url: string | null
          service_line: string | null
          tax_amount: number | null
          updated_at: string
          vendor_id: string | null
          vendor_name: string | null
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          job_id?: string | null
          notes?: string | null
          payment_method?: string | null
          property_id?: string | null
          receipt_url?: string | null
          service_line?: string | null
          tax_amount?: number | null
          updated_at?: string
          vendor_id?: string | null
          vendor_name?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          job_id?: string | null
          notes?: string | null
          payment_method?: string | null
          property_id?: string | null
          receipt_url?: string | null
          service_line?: string | null
          tax_amount?: number | null
          updated_at?: string
          vendor_id?: string | null
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          created_at: string
          file_name: string
          file_type: string | null
          file_url: string
          id: string
          record_id: string | null
          record_type: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_type?: string | null
          file_url: string
          id?: string
          record_id?: string | null
          record_type?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_type?: string | null
          file_url?: string
          id?: string
          record_id?: string | null
          record_type?: string | null
          uploaded_by?: string | null
        }
        Relationships: []
      }
      finance_accounts: {
        Row: {
          account_name: string
          account_type: string
          created_at: string
          current_balance_manual: number
          id: string
          institution_name: string | null
          is_active: boolean
          masked_account_number: string | null
          notes: string | null
          opening_balance: number
          updated_at: string
        }
        Insert: {
          account_name: string
          account_type?: string
          created_at?: string
          current_balance_manual?: number
          id?: string
          institution_name?: string | null
          is_active?: boolean
          masked_account_number?: string | null
          notes?: string | null
          opening_balance?: number
          updated_at?: string
        }
        Update: {
          account_name?: string
          account_type?: string
          created_at?: string
          current_balance_manual?: number
          id?: string
          institution_name?: string | null
          is_active?: boolean
          masked_account_number?: string | null
          notes?: string | null
          opening_balance?: number
          updated_at?: string
        }
        Relationships: []
      }
      finance_bill_attachments: {
        Row: {
          bill_id: string
          file_name: string
          file_type: string | null
          file_url: string
          id: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          bill_id: string
          file_name: string
          file_type?: string | null
          file_url: string
          id?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          bill_id?: string
          file_name?: string
          file_type?: string | null
          file_url?: string
          id?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_bill_attachments_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "finance_bills"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_bills: {
        Row: {
          amount_paid: number
          attachment_count: number | null
          balance_due: number
          bill_date: string
          bill_number: string | null
          created_at: string
          created_by: string | null
          due_date: string
          id: string
          internal_notes: string | null
          linked_customer_id: string | null
          linked_job_id: string | null
          linked_property_id: string | null
          memo: string | null
          status: string
          subtotal: number
          tax: number
          total: number
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          amount_paid?: number
          attachment_count?: number | null
          balance_due?: number
          bill_date?: string
          bill_number?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string
          id?: string
          internal_notes?: string | null
          linked_customer_id?: string | null
          linked_job_id?: string | null
          linked_property_id?: string | null
          memo?: string | null
          status?: string
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          amount_paid?: number
          attachment_count?: number | null
          balance_due?: number
          bill_date?: string
          bill_number?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string
          id?: string
          internal_notes?: string | null
          linked_customer_id?: string | null
          linked_job_id?: string | null
          linked_property_id?: string | null
          memo?: string | null
          status?: string
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_bills_linked_customer_id_fkey"
            columns: ["linked_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_bills_linked_job_id_fkey"
            columns: ["linked_job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_bills_linked_property_id_fkey"
            columns: ["linked_property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_bills_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "finance_vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_categories: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          parent_category: string | null
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          parent_category?: string | null
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          parent_category?: string | null
          sort_order?: number | null
        }
        Relationships: []
      }
      finance_expenses: {
        Row: {
          amount_subtotal: number
          amount_tax: number
          amount_total: number
          approved_by: string | null
          category: string | null
          created_at: string
          currency: string | null
          description: string | null
          entered_by: string | null
          expense_date: string
          expense_number: string | null
          id: string
          linked_customer_id: string | null
          linked_invoice_id: string | null
          linked_job_id: string | null
          linked_property_id: string | null
          linked_subcontractor_user_id: string | null
          linked_vehicle_id: string | null
          linked_visit_id: string | null
          linked_worker_user_id: string | null
          notes_external: string | null
          notes_internal: string | null
          payment_method: string | null
          receipt_count: number | null
          reimbursement_account_id: string | null
          reimbursement_date: string | null
          reimbursement_method: string | null
          reimbursement_reference: string | null
          service_category: string | null
          status: string
          subcategory: string | null
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          amount_subtotal?: number
          amount_tax?: number
          amount_total?: number
          approved_by?: string | null
          category?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          entered_by?: string | null
          expense_date?: string
          expense_number?: string | null
          id?: string
          linked_customer_id?: string | null
          linked_invoice_id?: string | null
          linked_job_id?: string | null
          linked_property_id?: string | null
          linked_subcontractor_user_id?: string | null
          linked_vehicle_id?: string | null
          linked_visit_id?: string | null
          linked_worker_user_id?: string | null
          notes_external?: string | null
          notes_internal?: string | null
          payment_method?: string | null
          receipt_count?: number | null
          reimbursement_account_id?: string | null
          reimbursement_date?: string | null
          reimbursement_method?: string | null
          reimbursement_reference?: string | null
          service_category?: string | null
          status?: string
          subcategory?: string | null
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          amount_subtotal?: number
          amount_tax?: number
          amount_total?: number
          approved_by?: string | null
          category?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          entered_by?: string | null
          expense_date?: string
          expense_number?: string | null
          id?: string
          linked_customer_id?: string | null
          linked_invoice_id?: string | null
          linked_job_id?: string | null
          linked_property_id?: string | null
          linked_subcontractor_user_id?: string | null
          linked_vehicle_id?: string | null
          linked_visit_id?: string | null
          linked_worker_user_id?: string | null
          notes_external?: string | null
          notes_internal?: string | null
          payment_method?: string | null
          receipt_count?: number | null
          reimbursement_account_id?: string | null
          reimbursement_date?: string | null
          reimbursement_method?: string | null
          reimbursement_reference?: string | null
          service_category?: string | null
          status?: string
          subcategory?: string | null
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_expenses_linked_customer_id_fkey"
            columns: ["linked_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_expenses_linked_invoice_id_fkey"
            columns: ["linked_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_expenses_linked_job_id_fkey"
            columns: ["linked_job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_expenses_linked_property_id_fkey"
            columns: ["linked_property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_expenses_linked_visit_id_fkey"
            columns: ["linked_visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_expenses_reimbursement_account_id_fkey"
            columns: ["reimbursement_account_id"]
            isOneToOne: false
            referencedRelation: "finance_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_expenses_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "finance_vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_job_cost_snapshots: {
        Row: {
          cost_total: number | null
          created_at: string
          customer_id: string | null
          equipment_total: number | null
          fuel_total: number | null
          gross_margin: number | null
          gross_margin_percent: number | null
          id: string
          job_id: string
          labor_total: number | null
          materials_total: number | null
          other_total: number | null
          property_id: string | null
          revenue_total: number | null
          service_category: string | null
          snapshot_date: string
          subcontractor_total: number | null
        }
        Insert: {
          cost_total?: number | null
          created_at?: string
          customer_id?: string | null
          equipment_total?: number | null
          fuel_total?: number | null
          gross_margin?: number | null
          gross_margin_percent?: number | null
          id?: string
          job_id: string
          labor_total?: number | null
          materials_total?: number | null
          other_total?: number | null
          property_id?: string | null
          revenue_total?: number | null
          service_category?: string | null
          snapshot_date?: string
          subcontractor_total?: number | null
        }
        Update: {
          cost_total?: number | null
          created_at?: string
          customer_id?: string | null
          equipment_total?: number | null
          fuel_total?: number | null
          gross_margin?: number | null
          gross_margin_percent?: number | null
          id?: string
          job_id?: string
          labor_total?: number | null
          materials_total?: number | null
          other_total?: number | null
          property_id?: string | null
          revenue_total?: number | null
          service_category?: string | null
          snapshot_date?: string
          subcontractor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_job_cost_snapshots_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_job_cost_snapshots_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_job_cost_snapshots_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_payments: {
        Row: {
          account_id: string | null
          amount: number
          bill_id: string | null
          created_at: string
          entered_by: string | null
          expense_id: string | null
          id: string
          internal_note: string | null
          invoice_id: string | null
          is_reversed: boolean
          payment_date: string
          payment_method: string | null
          payment_type: string
          reconciled: boolean
          reconciled_at: string | null
          reconciled_by: string | null
          reference_number: string | null
          reversed_at: string | null
          reversed_reason: string | null
        }
        Insert: {
          account_id?: string | null
          amount?: number
          bill_id?: string | null
          created_at?: string
          entered_by?: string | null
          expense_id?: string | null
          id?: string
          internal_note?: string | null
          invoice_id?: string | null
          is_reversed?: boolean
          payment_date?: string
          payment_method?: string | null
          payment_type?: string
          reconciled?: boolean
          reconciled_at?: string | null
          reconciled_by?: string | null
          reference_number?: string | null
          reversed_at?: string | null
          reversed_reason?: string | null
        }
        Update: {
          account_id?: string | null
          amount?: number
          bill_id?: string | null
          created_at?: string
          entered_by?: string | null
          expense_id?: string | null
          id?: string
          internal_note?: string | null
          invoice_id?: string | null
          is_reversed?: boolean
          payment_date?: string
          payment_method?: string | null
          payment_type?: string
          reconciled?: boolean
          reconciled_at?: string | null
          reconciled_by?: string | null
          reference_number?: string | null
          reversed_at?: string | null
          reversed_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_payments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "finance_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_payments_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "finance_bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_payments_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "finance_expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_receipts: {
        Row: {
          expense_id: string | null
          file_name: string
          file_type: string | null
          file_url: string
          id: string
          matched_at: string | null
          matched_by: string | null
          notes: string | null
          receipt_date: string | null
          review_status: string
          reviewed_at: string | null
          reviewed_by: string | null
          tax_raw: number | null
          total_raw: number | null
          uploaded_at: string
          uploaded_by: string | null
          vendor_name_raw: string | null
        }
        Insert: {
          expense_id?: string | null
          file_name: string
          file_type?: string | null
          file_url: string
          id?: string
          matched_at?: string | null
          matched_by?: string | null
          notes?: string | null
          receipt_date?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          tax_raw?: number | null
          total_raw?: number | null
          uploaded_at?: string
          uploaded_by?: string | null
          vendor_name_raw?: string | null
        }
        Update: {
          expense_id?: string | null
          file_name?: string
          file_type?: string | null
          file_url?: string
          id?: string
          matched_at?: string | null
          matched_by?: string | null
          notes?: string | null
          receipt_date?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          tax_raw?: number | null
          total_raw?: number | null
          uploaded_at?: string
          uploaded_by?: string | null
          vendor_name_raw?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_receipts_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "finance_expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_reconciliation_statements: {
        Row: {
          account_id: string
          calculated_balance: number
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string | null
          difference: number
          id: string
          period_end: string
          period_start: string
          statement_closing_balance: number
          statement_opening_balance: number
          status: string
          updated_at: string
        }
        Insert: {
          account_id: string
          calculated_balance?: number
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          difference?: number
          id?: string
          period_end: string
          period_start: string
          statement_closing_balance?: number
          statement_opening_balance?: number
          status?: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          calculated_balance?: number
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          difference?: number
          id?: string
          period_end?: string
          period_start?: string
          statement_closing_balance?: number
          statement_opening_balance?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_reconciliation_statements_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "finance_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_refunds: {
        Row: {
          amount: number
          created_at: string
          customer_id: string | null
          id: string
          internal_notes: string | null
          invoice_id: string | null
          processed_at: string | null
          processed_by: string | null
          reason: string | null
          refund_type: string
          status: string
          stripe_payment_intent_id: string | null
          stripe_refund_id: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          customer_id?: string | null
          id?: string
          internal_notes?: string | null
          invoice_id?: string | null
          processed_at?: string | null
          processed_by?: string | null
          reason?: string | null
          refund_type?: string
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_refund_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          customer_id?: string | null
          id?: string
          internal_notes?: string | null
          invoice_id?: string | null
          processed_at?: string | null
          processed_by?: string | null
          reason?: string | null
          refund_type?: string
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_refund_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_refunds_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_refunds_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_vendors: {
        Row: {
          address_line_1: string | null
          city: string | null
          contact_name: string | null
          country: string | null
          created_at: string
          default_expense_category: string | null
          email: string | null
          id: string
          is_active: boolean
          notes: string | null
          payment_terms: string | null
          phone: string | null
          postal_code: string | null
          province: string | null
          tax_number: string | null
          updated_at: string
          vendor_name: string
          website: string | null
        }
        Insert: {
          address_line_1?: string | null
          city?: string | null
          contact_name?: string | null
          country?: string | null
          created_at?: string
          default_expense_category?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          tax_number?: string | null
          updated_at?: string
          vendor_name: string
          website?: string | null
        }
        Update: {
          address_line_1?: string | null
          city?: string | null
          contact_name?: string | null
          country?: string | null
          created_at?: string
          default_expense_category?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          tax_number?: string | null
          updated_at?: string
          vendor_name?: string
          website?: string | null
        }
        Relationships: []
      }
      form_submissions: {
        Row: {
          created_at: string
          customer_id: string | null
          followup_required: boolean
          id: string
          invoice_reference: string | null
          job_id: string | null
          materials_used: string | null
          notes: string | null
          photos: string[]
          property_id: string | null
          quote_reference: string | null
          status: string
          submission_data: Json
          submitted_at: string
          submitted_by: string
          template_id: string
          updated_at: string
          visit_id: string | null
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          followup_required?: boolean
          id?: string
          invoice_reference?: string | null
          job_id?: string | null
          materials_used?: string | null
          notes?: string | null
          photos?: string[]
          property_id?: string | null
          quote_reference?: string | null
          status?: string
          submission_data?: Json
          submitted_at?: string
          submitted_by: string
          template_id: string
          updated_at?: string
          visit_id?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          followup_required?: boolean
          id?: string
          invoice_reference?: string | null
          job_id?: string | null
          materials_used?: string | null
          notes?: string | null
          photos?: string[]
          property_id?: string | null
          quote_reference?: string | null
          status?: string
          submission_data?: Json
          submitted_at?: string
          submitted_by?: string
          template_id?: string
          updated_at?: string
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_submissions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "form_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      form_template_fields: {
        Row: {
          created_at: string
          default_value: string | null
          field_label: string
          field_type: string
          id: string
          is_required: boolean | null
          options: Json | null
          placeholder: string | null
          sort_order: number | null
          template_id: string
        }
        Insert: {
          created_at?: string
          default_value?: string | null
          field_label: string
          field_type?: string
          id?: string
          is_required?: boolean | null
          options?: Json | null
          placeholder?: string | null
          sort_order?: number | null
          template_id: string
        }
        Update: {
          created_at?: string
          default_value?: string | null
          field_label?: string
          field_type?: string
          id?: string
          is_required?: boolean | null
          options?: Json | null
          placeholder?: string | null
          sort_order?: number | null
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_template_fields_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "form_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      form_templates: {
        Row: {
          admin_visible: boolean | null
          completion_timing: string | null
          created_at: string
          created_by: string | null
          customer_visible: boolean | null
          description: string | null
          form_type: string | null
          id: string
          is_active: boolean | null
          is_required: boolean | null
          name: string
          service_category: string | null
          sort_order: number | null
          updated_at: string
          version: number | null
          worker_visible: boolean | null
        }
        Insert: {
          admin_visible?: boolean | null
          completion_timing?: string | null
          created_at?: string
          created_by?: string | null
          customer_visible?: boolean | null
          description?: string | null
          form_type?: string | null
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          name: string
          service_category?: string | null
          sort_order?: number | null
          updated_at?: string
          version?: number | null
          worker_visible?: boolean | null
        }
        Update: {
          admin_visible?: boolean | null
          completion_timing?: string | null
          created_at?: string
          created_by?: string | null
          customer_visible?: boolean | null
          description?: string | null
          form_type?: string | null
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          name?: string
          service_category?: string | null
          sort_order?: number | null
          updated_at?: string
          version?: number | null
          worker_visible?: boolean | null
        }
        Relationships: []
      }
      hr_benefit_enrollments: {
        Row: {
          change_reason: string | null
          change_type: string
          created_at: string
          created_by: string | null
          dependent_count: number | null
          effective_date: string | null
          employee_user_id: string
          enrollment_status: string
          id: string
          notes: string | null
          plan_type: string | null
          provider_id: string | null
          termination_date: string | null
          updated_at: string
        }
        Insert: {
          change_reason?: string | null
          change_type?: string
          created_at?: string
          created_by?: string | null
          dependent_count?: number | null
          effective_date?: string | null
          employee_user_id: string
          enrollment_status?: string
          id?: string
          notes?: string | null
          plan_type?: string | null
          provider_id?: string | null
          termination_date?: string | null
          updated_at?: string
        }
        Update: {
          change_reason?: string | null
          change_type?: string
          created_at?: string
          created_by?: string | null
          dependent_count?: number | null
          effective_date?: string | null
          employee_user_id?: string
          enrollment_status?: string
          id?: string
          notes?: string | null
          plan_type?: string | null
          provider_id?: string | null
          termination_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_benefit_enrollments_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "hr_insurance_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_case_notes: {
        Row: {
          body: string | null
          created_at: string
          created_by: string
          employee_user_id: string
          id: string
          is_confidential: boolean
          note_type: string
          subject: string
          updated_at: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          created_by: string
          employee_user_id: string
          id?: string
          is_confidential?: boolean
          note_type?: string
          subject: string
          updated_at?: string
        }
        Update: {
          body?: string | null
          created_at?: string
          created_by?: string
          employee_user_id?: string
          id?: string
          is_confidential?: boolean
          note_type?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      hr_checklist_assignments: {
        Row: {
          assigned_by: string | null
          checklist_type: string
          completed_at: string | null
          completed_items: Json
          created_at: string
          id: string
          status: string
          template_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          checklist_type?: string
          completed_at?: string | null
          completed_items?: Json
          created_at?: string
          id?: string
          status?: string
          template_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          checklist_type?: string
          completed_at?: string | null
          completed_items?: Json
          created_at?: string
          id?: string
          status?: string
          template_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_checklist_assignments_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "hr_checklist_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_checklist_templates: {
        Row: {
          checklist_type: string
          created_at: string
          id: string
          is_active: boolean
          items: Json
          name: string
          updated_at: string
        }
        Insert: {
          checklist_type?: string
          created_at?: string
          id?: string
          is_active?: boolean
          items?: Json
          name: string
          updated_at?: string
        }
        Update: {
          checklist_type?: string
          created_at?: string
          id?: string
          is_active?: boolean
          items?: Json
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      hr_compensation_records: {
        Row: {
          created_at: string
          created_by: string | null
          effective_date: string
          employee_user_id: string
          id: string
          notes: string | null
          pay_rate: number | null
          pay_type: string | null
          record_type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          effective_date?: string
          employee_user_id: string
          id?: string
          notes?: string | null
          pay_rate?: number | null
          pay_type?: string | null
          record_type?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          effective_date?: string
          employee_user_id?: string
          id?: string
          notes?: string | null
          pay_rate?: number | null
          pay_type?: string | null
          record_type?: string
        }
        Relationships: []
      }
      hr_insurance_providers: {
        Row: {
          account_number: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          group_policy_number: string | null
          id: string
          is_active: boolean
          notes: string | null
          portal_url: string | null
          provider_name: string
          provider_type: string
          updated_at: string
          website_url: string | null
        }
        Insert: {
          account_number?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          group_policy_number?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          portal_url?: string | null
          provider_name: string
          provider_type?: string
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          account_number?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          group_policy_number?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          portal_url?: string | null
          provider_name?: string
          provider_type?: string
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      hr_review_schedules: {
        Row: {
          completed_at: string | null
          created_at: string
          employee_user_id: string
          id: string
          notes: string | null
          review_type: string
          reviewer_user_id: string | null
          scheduled_date: string
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          employee_user_id: string
          id?: string
          notes?: string | null
          review_type?: string
          reviewer_user_id?: string | null
          scheduled_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          employee_user_id?: string
          id?: string
          notes?: string | null
          review_type?: string
          reviewer_user_id?: string | null
          scheduled_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      hr_sgi_driver_records: {
        Row: {
          abstract_clear: boolean | null
          abstract_last_obtained: string | null
          abstract_status: string | null
          authorization_date: string | null
          authorization_signed: boolean | null
          created_at: string
          drivers_licence_number: string | null
          employee_user_id: string
          fleet_vehicle_assigned: string | null
          id: string
          last_reminder_date: string | null
          licence_class: string | null
          licence_expiry: string | null
          notes: string | null
          renewal_reminder_sent: boolean
          updated_at: string
          violations_on_record: string | null
        }
        Insert: {
          abstract_clear?: boolean | null
          abstract_last_obtained?: string | null
          abstract_status?: string | null
          authorization_date?: string | null
          authorization_signed?: boolean | null
          created_at?: string
          drivers_licence_number?: string | null
          employee_user_id: string
          fleet_vehicle_assigned?: string | null
          id?: string
          last_reminder_date?: string | null
          licence_class?: string | null
          licence_expiry?: string | null
          notes?: string | null
          renewal_reminder_sent?: boolean
          updated_at?: string
          violations_on_record?: string | null
        }
        Update: {
          abstract_clear?: boolean | null
          abstract_last_obtained?: string | null
          abstract_status?: string | null
          authorization_date?: string | null
          authorization_signed?: boolean | null
          created_at?: string
          drivers_licence_number?: string | null
          employee_user_id?: string
          fleet_vehicle_assigned?: string | null
          id?: string
          last_reminder_date?: string | null
          licence_class?: string | null
          licence_expiry?: string | null
          notes?: string | null
          renewal_reminder_sent?: boolean
          updated_at?: string
          violations_on_record?: string | null
        }
        Relationships: []
      }
      hr_wcb_claims: {
        Row: {
          body_part: string | null
          claim_number: string | null
          claim_status: string
          created_at: string
          created_by: string | null
          documents_reference: string | null
          employee_user_id: string
          employer_account_number: string | null
          follow_up_notes: string | null
          id: string
          incident_report_id: string | null
          injury_date: string
          injury_type: string
          modified_duties: boolean | null
          restrictions: string | null
          return_to_work_date: string | null
          updated_at: string
        }
        Insert: {
          body_part?: string | null
          claim_number?: string | null
          claim_status?: string
          created_at?: string
          created_by?: string | null
          documents_reference?: string | null
          employee_user_id: string
          employer_account_number?: string | null
          follow_up_notes?: string | null
          id?: string
          incident_report_id?: string | null
          injury_date: string
          injury_type?: string
          modified_duties?: boolean | null
          restrictions?: string | null
          return_to_work_date?: string | null
          updated_at?: string
        }
        Update: {
          body_part?: string | null
          claim_number?: string | null
          claim_status?: string
          created_at?: string
          created_by?: string | null
          documents_reference?: string | null
          employee_user_id?: string
          employer_account_number?: string | null
          follow_up_notes?: string | null
          id?: string
          incident_report_id?: string | null
          injury_date?: string
          injury_type?: string
          modified_duties?: boolean | null
          restrictions?: string | null
          return_to_work_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_wcb_claims_incident_report_id_fkey"
            columns: ["incident_report_id"]
            isOneToOne: false
            referencedRelation: "incident_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_reports: {
        Row: {
          admin_notes: string | null
          corrective_action_notes: string | null
          created_at: string
          date_time: string
          description: string | null
          first_responded_at: string | null
          follow_up_status: string
          id: string
          incident_type: string
          job_id: string | null
          location: string | null
          medical_attention: boolean
          people_involved: string | null
          photos: string[] | null
          report_number: string | null
          reported_to: string | null
          reporter_type: string
          resolved_at: string | null
          root_cause_category: string | null
          root_cause_description: string | null
          severity: string
          subcontractor_id: string | null
          updated_at: string
          user_id: string
          visit_id: string | null
          witnesses: string | null
        }
        Insert: {
          admin_notes?: string | null
          corrective_action_notes?: string | null
          created_at?: string
          date_time?: string
          description?: string | null
          first_responded_at?: string | null
          follow_up_status?: string
          id?: string
          incident_type?: string
          job_id?: string | null
          location?: string | null
          medical_attention?: boolean
          people_involved?: string | null
          photos?: string[] | null
          report_number?: string | null
          reported_to?: string | null
          reporter_type?: string
          resolved_at?: string | null
          root_cause_category?: string | null
          root_cause_description?: string | null
          severity?: string
          subcontractor_id?: string | null
          updated_at?: string
          user_id: string
          visit_id?: string | null
          witnesses?: string | null
        }
        Update: {
          admin_notes?: string | null
          corrective_action_notes?: string | null
          created_at?: string
          date_time?: string
          description?: string | null
          first_responded_at?: string | null
          follow_up_status?: string
          id?: string
          incident_type?: string
          job_id?: string | null
          location?: string | null
          medical_attention?: boolean
          people_involved?: string | null
          photos?: string[] | null
          report_number?: string | null
          reported_to?: string | null
          reporter_type?: string
          resolved_at?: string | null
          root_cause_category?: string | null
          root_cause_description?: string | null
          severity?: string
          subcontractor_id?: string | null
          updated_at?: string
          user_id?: string
          visit_id?: string | null
          witnesses?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incident_reports_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_reports_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "subcontractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_reports_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_shares: {
        Row: {
          attachment_name: string | null
          attachment_url: string | null
          cover_note: string | null
          id: string
          incident_id: string
          include_photos: boolean | null
          recipient_email: string
          recipient_name: string | null
          recipient_type: string
          shared_at: string | null
          shared_by: string | null
        }
        Insert: {
          attachment_name?: string | null
          attachment_url?: string | null
          cover_note?: string | null
          id?: string
          incident_id: string
          include_photos?: boolean | null
          recipient_email: string
          recipient_name?: string | null
          recipient_type: string
          shared_at?: string | null
          shared_by?: string | null
        }
        Update: {
          attachment_name?: string | null
          attachment_url?: string | null
          cover_note?: string | null
          id?: string
          incident_id?: string
          include_photos?: boolean | null
          recipient_email?: string
          recipient_name?: string | null
          recipient_type?: string
          shared_at?: string | null
          shared_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incident_shares_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incident_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_logs: {
        Row: {
          channel: string | null
          created_at: string
          environment: string | null
          error_message: string | null
          event_name: string
          id: string
          metadata: Json | null
          provider: string
          provider_response_id: string | null
          recipient: string | null
          record_id: string | null
          record_type: string | null
          status: string
        }
        Insert: {
          channel?: string | null
          created_at?: string
          environment?: string | null
          error_message?: string | null
          event_name: string
          id?: string
          metadata?: Json | null
          provider: string
          provider_response_id?: string | null
          recipient?: string | null
          record_id?: string | null
          record_type?: string | null
          status?: string
        }
        Update: {
          channel?: string | null
          created_at?: string
          environment?: string | null
          error_message?: string | null
          event_name?: string
          id?: string
          metadata?: Json | null
          provider?: string
          provider_response_id?: string | null
          recipient?: string | null
          record_id?: string | null
          record_type?: string | null
          status?: string
        }
        Relationships: []
      }
      invoice_line_items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          invoice_id: string
          item_name: string
          line_total: number
          quantity: number
          service_date: string | null
          service_time: string | null
          sort_order: number
          unit_price: number
          visit_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          invoice_id: string
          item_name: string
          line_total?: number
          quantity?: number
          service_date?: string | null
          service_time?: string | null
          sort_order?: number
          unit_price?: number
          visit_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          invoice_id?: string
          item_name?: string
          line_total?: number
          quantity?: number
          service_date?: string | null
          service_time?: string | null
          sort_order?: number
          unit_price?: number
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_line_items_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_views: {
        Row: {
          id: string
          invoice_id: string
          viewed_at: string
          viewer_ip: string | null
          viewer_user_agent: string | null
          viewer_user_id: string
        }
        Insert: {
          id?: string
          invoice_id: string
          viewed_at?: string
          viewer_ip?: string | null
          viewer_user_agent?: string | null
          viewer_user_id: string
        }
        Update: {
          id?: string
          invoice_id?: string
          viewed_at?: string
          viewer_ip?: string | null
          viewer_user_agent?: string | null
          viewer_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_views_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_paid: number
          balance_due: number
          billing_mode: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          customer_memo: string | null
          due_date: string
          id: string
          internal_notes: string | null
          invoice_number: string
          issue_date: string
          job_id: string | null
          paid_at: string | null
          payment_method: string | null
          processor_payment_id: string | null
          property_id: string | null
          quote_id: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          subtotal: number
          tax: number
          tax_rate: number
          total: number
          updated_at: string
          viewed_at: string | null
          visit_id: string | null
        }
        Insert: {
          amount_paid?: number
          balance_due?: number
          billing_mode?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          customer_memo?: string | null
          due_date?: string
          id?: string
          internal_notes?: string | null
          invoice_number: string
          issue_date?: string
          job_id?: string | null
          paid_at?: string | null
          payment_method?: string | null
          processor_payment_id?: string | null
          property_id?: string | null
          quote_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          tax?: number
          tax_rate?: number
          total?: number
          updated_at?: string
          viewed_at?: string | null
          visit_id?: string | null
        }
        Update: {
          amount_paid?: number
          balance_due?: number
          billing_mode?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          customer_memo?: string | null
          due_date?: string
          id?: string
          internal_notes?: string | null
          invoice_number?: string
          issue_date?: string
          job_id?: string | null
          paid_at?: string | null
          payment_method?: string | null
          processor_payment_id?: string | null
          property_id?: string | null
          quote_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          tax?: number
          tax_rate?: number
          total?: number
          updated_at?: string
          viewed_at?: string | null
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      job_line_items: {
        Row: {
          catalog_item_id: string | null
          created_at: string
          description: string | null
          id: string
          item_name: string
          job_id: string
          line_total: number
          quantity: number
          sort_order: number
          unit_price: number
        }
        Insert: {
          catalog_item_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          item_name: string
          job_id: string
          line_total?: number
          quantity?: number
          sort_order?: number
          unit_price?: number
        }
        Update: {
          catalog_item_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          item_name?: string
          job_id?: string
          line_total?: number
          quantity?: number
          sort_order?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "job_line_items_catalog_item_id_fkey"
            columns: ["catalog_item_id"]
            isOneToOne: false
            referencedRelation: "products_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_line_items_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          additional_visit_rate: number | null
          assigned_to: string | null
          billing_notes: string | null
          billing_status: string | null
          billing_type: string | null
          contract_end_date: string | null
          contract_start_date: string | null
          created_at: string
          customer_billing_notes: string | null
          customer_id: string
          estimated_total: number | null
          id: string
          internal_notes: string | null
          invoice_reminder: boolean | null
          job_number: string
          job_title: string
          minimum_included_visits: number | null
          priority: Database["public"]["Enums"]["job_priority"]
          property_id: string | null
          quote_id: string | null
          request_id: string | null
          scheduled_date: string | null
          scope_of_work: string | null
          season_name: string | null
          service_category: Database["public"]["Enums"]["service_category"]
          service_frequency:
            | Database["public"]["Enums"]["service_frequency"]
            | null
          service_instructions: string | null
          status: Database["public"]["Enums"]["job_status"]
          updated_at: string
        }
        Insert: {
          additional_visit_rate?: number | null
          assigned_to?: string | null
          billing_notes?: string | null
          billing_status?: string | null
          billing_type?: string | null
          contract_end_date?: string | null
          contract_start_date?: string | null
          created_at?: string
          customer_billing_notes?: string | null
          customer_id: string
          estimated_total?: number | null
          id?: string
          internal_notes?: string | null
          invoice_reminder?: boolean | null
          job_number: string
          job_title: string
          minimum_included_visits?: number | null
          priority?: Database["public"]["Enums"]["job_priority"]
          property_id?: string | null
          quote_id?: string | null
          request_id?: string | null
          scheduled_date?: string | null
          scope_of_work?: string | null
          season_name?: string | null
          service_category?: Database["public"]["Enums"]["service_category"]
          service_frequency?:
            | Database["public"]["Enums"]["service_frequency"]
            | null
          service_instructions?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          updated_at?: string
        }
        Update: {
          additional_visit_rate?: number | null
          assigned_to?: string | null
          billing_notes?: string | null
          billing_status?: string | null
          billing_type?: string | null
          contract_end_date?: string | null
          contract_start_date?: string | null
          created_at?: string
          customer_billing_notes?: string | null
          customer_id?: string
          estimated_total?: number | null
          id?: string
          internal_notes?: string | null
          invoice_reminder?: boolean | null
          job_number?: string
          job_title?: string
          minimum_included_visits?: number | null
          priority?: Database["public"]["Enums"]["job_priority"]
          property_id?: string | null
          quote_id?: string | null
          request_id?: string | null
          scheduled_date?: string | null
          scope_of_work?: string | null
          season_name?: string | null
          service_category?: Database["public"]["Enums"]["service_category"]
          service_frequency?:
            | Database["public"]["Enums"]["service_frequency"]
            | null
          service_instructions?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          address_line_1: string | null
          assigned_to: string | null
          city: string | null
          company_name: string | null
          created_at: string
          customer_id: string | null
          description: string | null
          email: string | null
          estimated_value_range: string | null
          first_name: string
          id: string
          internal_notes: string | null
          last_name: string
          lead_source: string | null
          phone: string | null
          postal_code: string | null
          preferred_contact_method: string | null
          province: string | null
          service_type: Database["public"]["Enums"]["service_category"]
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
          urgency: string | null
        }
        Insert: {
          address_line_1?: string | null
          assigned_to?: string | null
          city?: string | null
          company_name?: string | null
          created_at?: string
          customer_id?: string | null
          description?: string | null
          email?: string | null
          estimated_value_range?: string | null
          first_name: string
          id?: string
          internal_notes?: string | null
          last_name: string
          lead_source?: string | null
          phone?: string | null
          postal_code?: string | null
          preferred_contact_method?: string | null
          province?: string | null
          service_type?: Database["public"]["Enums"]["service_category"]
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
          urgency?: string | null
        }
        Update: {
          address_line_1?: string | null
          assigned_to?: string | null
          city?: string | null
          company_name?: string | null
          created_at?: string
          customer_id?: string | null
          description?: string | null
          email?: string | null
          estimated_value_range?: string | null
          first_name?: string
          id?: string
          internal_notes?: string | null
          last_name?: string
          lead_source?: string | null
          phone?: string | null
          postal_code?: string | null
          preferred_contact_method?: string | null
          province?: string | null
          service_type?: Database["public"]["Enums"]["service_category"]
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
          urgency?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_notes: {
        Row: {
          content: string
          conversation_id: string | null
          created_at: string
          created_by: string
          id: string
          note_type: string
          title: string | null
          updated_at: string
          video_call_id: string
        }
        Insert: {
          content: string
          conversation_id?: string | null
          created_at?: string
          created_by: string
          id?: string
          note_type?: string
          title?: string | null
          updated_at?: string
          video_call_id: string
        }
        Update: {
          content?: string
          conversation_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          note_type?: string
          title?: string | null
          updated_at?: string
          video_call_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_notes_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_notes_video_call_id_fkey"
            columns: ["video_call_id"]
            isOneToOne: false
            referencedRelation: "video_calls"
            referencedColumns: ["id"]
          },
        ]
      }
      message_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_type: string | null
          file_url: string
          id: string
          message_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_type?: string | null
          file_url: string
          id?: string
          message_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_type?: string | null
          file_url?: string
          id?: string
          message_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reads: {
        Row: {
          id: string
          message_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          id?: string
          message_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          id?: string
          message_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reads_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_count: number
          body: string | null
          conversation_id: string
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          id: string
          message_type: string
          sender_user_id: string
        }
        Insert: {
          attachment_count?: number
          body?: string | null
          conversation_id: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          message_type?: string
          sender_user_id: string
        }
        Update: {
          attachment_count?: number
          body?: string | null
          conversation_id?: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          message_type?: string
          sender_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      messaging_settings: {
        Row: {
          created_at: string
          default_sender_email: string | null
          default_sender_name: string | null
          default_signature: string | null
          email_enabled: boolean | null
          id: string
          internal_notifications: boolean | null
          invoice_notification: boolean | null
          job_reminder: boolean | null
          marketing_enabled: boolean | null
          overdue_reminder: boolean | null
          quote_notification: boolean | null
          reply_to_email: string | null
          sms_enabled: boolean | null
          sms_sender_label: string | null
          unsubscribe_footer: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_sender_email?: string | null
          default_sender_name?: string | null
          default_signature?: string | null
          email_enabled?: boolean | null
          id?: string
          internal_notifications?: boolean | null
          invoice_notification?: boolean | null
          job_reminder?: boolean | null
          marketing_enabled?: boolean | null
          overdue_reminder?: boolean | null
          quote_notification?: boolean | null
          reply_to_email?: string | null
          sms_enabled?: boolean | null
          sms_sender_label?: string | null
          unsubscribe_footer?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_sender_email?: string | null
          default_sender_name?: string | null
          default_signature?: string | null
          email_enabled?: boolean | null
          id?: string
          internal_notifications?: boolean | null
          invoice_notification?: boolean | null
          job_reminder?: boolean | null
          marketing_enabled?: boolean | null
          overdue_reminder?: boolean | null
          quote_notification?: boolean | null
          reply_to_email?: string | null
          sms_enabled?: boolean | null
          sms_sender_label?: string | null
          unsubscribe_footer?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      notification_templates: {
        Row: {
          audience: Database["public"]["Enums"]["notification_audience"]
          body_template: string
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          event: Database["public"]["Enums"]["notification_event"]
          id: string
          is_active: boolean
          subject_template: string
          updated_at: string
        }
        Insert: {
          audience?: Database["public"]["Enums"]["notification_audience"]
          body_template: string
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          event: Database["public"]["Enums"]["notification_event"]
          id?: string
          is_active?: boolean
          subject_template: string
          updated_at?: string
        }
        Update: {
          audience?: Database["public"]["Enums"]["notification_audience"]
          body_template?: string
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          event?: Database["public"]["Enums"]["notification_event"]
          id?: string
          is_active?: boolean
          subject_template?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          audience: Database["public"]["Enums"]["notification_audience"]
          body: string | null
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          customer_id: string | null
          event: Database["public"]["Enums"]["notification_event"]
          id: string
          metadata: Json | null
          read_at: string | null
          recipient_id: string | null
          record_id: string | null
          record_type: string | null
          sent_at: string | null
          status: string
          subject: string
        }
        Insert: {
          audience?: Database["public"]["Enums"]["notification_audience"]
          body?: string | null
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          customer_id?: string | null
          event: Database["public"]["Enums"]["notification_event"]
          id?: string
          metadata?: Json | null
          read_at?: string | null
          recipient_id?: string | null
          record_id?: string | null
          record_type?: string | null
          sent_at?: string | null
          status?: string
          subject: string
        }
        Update: {
          audience?: Database["public"]["Enums"]["notification_audience"]
          body?: string | null
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          customer_id?: string | null
          event?: Database["public"]["Enums"]["notification_event"]
          id?: string
          metadata?: Json | null
          read_at?: string | null
          recipient_id?: string | null
          record_id?: string | null
          record_type?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_settings: {
        Row: {
          auto_mark_sent: boolean | null
          cash_enabled: boolean | null
          cash_instructions: string | null
          cheque_enabled: boolean | null
          cheque_instructions: string | null
          created_at: string
          credit_card_enabled: boolean | null
          credit_card_instructions: string | null
          custom_terms_days: number | null
          default_deposit_percentage: number | null
          default_payment_terms: string | null
          default_tax_rate: number | null
          deposit_required: boolean | null
          etransfer_enabled: boolean | null
          etransfer_instructions: string | null
          id: string
          invoice_footer_text: string | null
          late_fee_enabled: boolean | null
          late_fee_type: string | null
          late_fee_value: number | null
          manual_reminders_only: boolean | null
          other_method_enabled: boolean | null
          other_method_instructions: string | null
          other_method_name: string | null
          overdue_reminder_days: string | null
          partial_payment_allowed: boolean | null
          stripe_mode: string | null
          tax_enabled: boolean | null
          tax_label_1: string | null
          tax_label_2: string | null
          tax_rate_1: number | null
          tax_rate_2: number | null
          updated_at: string
        }
        Insert: {
          auto_mark_sent?: boolean | null
          cash_enabled?: boolean | null
          cash_instructions?: string | null
          cheque_enabled?: boolean | null
          cheque_instructions?: string | null
          created_at?: string
          credit_card_enabled?: boolean | null
          credit_card_instructions?: string | null
          custom_terms_days?: number | null
          default_deposit_percentage?: number | null
          default_payment_terms?: string | null
          default_tax_rate?: number | null
          deposit_required?: boolean | null
          etransfer_enabled?: boolean | null
          etransfer_instructions?: string | null
          id?: string
          invoice_footer_text?: string | null
          late_fee_enabled?: boolean | null
          late_fee_type?: string | null
          late_fee_value?: number | null
          manual_reminders_only?: boolean | null
          other_method_enabled?: boolean | null
          other_method_instructions?: string | null
          other_method_name?: string | null
          overdue_reminder_days?: string | null
          partial_payment_allowed?: boolean | null
          stripe_mode?: string | null
          tax_enabled?: boolean | null
          tax_label_1?: string | null
          tax_label_2?: string | null
          tax_rate_1?: number | null
          tax_rate_2?: number | null
          updated_at?: string
        }
        Update: {
          auto_mark_sent?: boolean | null
          cash_enabled?: boolean | null
          cash_instructions?: string | null
          cheque_enabled?: boolean | null
          cheque_instructions?: string | null
          created_at?: string
          credit_card_enabled?: boolean | null
          credit_card_instructions?: string | null
          custom_terms_days?: number | null
          default_deposit_percentage?: number | null
          default_payment_terms?: string | null
          default_tax_rate?: number | null
          deposit_required?: boolean | null
          etransfer_enabled?: boolean | null
          etransfer_instructions?: string | null
          id?: string
          invoice_footer_text?: string | null
          late_fee_enabled?: boolean | null
          late_fee_type?: string | null
          late_fee_value?: number | null
          manual_reminders_only?: boolean | null
          other_method_enabled?: boolean | null
          other_method_instructions?: string | null
          other_method_name?: string | null
          overdue_reminder_days?: string | null
          partial_payment_allowed?: boolean | null
          stripe_mode?: string | null
          tax_enabled?: boolean | null
          tax_label_1?: string | null
          tax_label_2?: string | null
          tax_rate_1?: number | null
          tax_rate_2?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      payroll_deduction_rules: {
        Row: {
          calculation_mode: string | null
          created_at: string
          fixed_amount: number | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          percent_rate: number | null
          type: string
          updated_at: string
        }
        Insert: {
          calculation_mode?: string | null
          created_at?: string
          fixed_amount?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          percent_rate?: number | null
          type?: string
          updated_at?: string
        }
        Update: {
          calculation_mode?: string | null
          created_at?: string
          fixed_amount?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          percent_rate?: number | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      payroll_remittances: {
        Row: {
          account_id: string | null
          amount: number
          created_at: string
          created_by: string | null
          due_date: string
          filed_at: string | null
          filed_by: string | null
          id: string
          locked_at: string | null
          notes: string | null
          override_reason: string | null
          paid_at: string | null
          paid_by: string | null
          payment_date: string | null
          period_end: string
          period_start: string
          reference_number: string | null
          remittance_number: string | null
          remittance_type: string
          status: string
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          amount?: number
          created_at?: string
          created_by?: string | null
          due_date: string
          filed_at?: string | null
          filed_by?: string | null
          id?: string
          locked_at?: string | null
          notes?: string | null
          override_reason?: string | null
          paid_at?: string | null
          paid_by?: string | null
          payment_date?: string | null
          period_end: string
          period_start: string
          reference_number?: string | null
          remittance_number?: string | null
          remittance_type: string
          status?: string
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          created_at?: string
          created_by?: string | null
          due_date?: string
          filed_at?: string | null
          filed_by?: string | null
          id?: string
          locked_at?: string | null
          notes?: string | null
          override_reason?: string | null
          paid_at?: string | null
          paid_by?: string | null
          payment_date?: string | null
          period_end?: string
          period_start?: string
          reference_number?: string | null
          remittance_number?: string | null
          remittance_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_remittances_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "finance_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_run_items: {
        Row: {
          allowance_amount: number | null
          bonus_amount: number | null
          cpp_amount: number | null
          created_at: string
          eap_premium: number | null
          ei_amount: number | null
          employee_dental_premium: number | null
          employee_health_premium: number | null
          employee_name: string | null
          employee_vision_premium: number | null
          employer_benefit_contribution: number | null
          employer_cpp: number | null
          employer_dental_premium: number | null
          employer_ei: number | null
          employer_group_life: number | null
          employer_health_premium: number | null
          employer_ltd: number | null
          employer_pension_match: number | null
          employer_retirement_match: number | null
          garnishments: number | null
          gross_pay: number | null
          group_life_premium: number | null
          holiday_hours: number | null
          hourly_rate: number | null
          id: string
          income_tax_amount: number | null
          ltd_premium: number | null
          memo: string | null
          net_pay: number | null
          other_deductions_amount: number | null
          overpayment_recovery: number | null
          overtime_hours: number | null
          pay_method: string | null
          payout_account_id: string | null
          payroll_run_id: string
          pension_rpp: number | null
          regular_hours: number | null
          reimbursement_amount: number | null
          rrsp_prpp: number | null
          salary_override: number | null
          sick_hours: number | null
          status: string | null
          total_deductions: number | null
          union_dues: number | null
          user_id: string | null
          vacation_hours: number | null
          vacation_pay_amount: number | null
          voluntary_deductions: number | null
        }
        Insert: {
          allowance_amount?: number | null
          bonus_amount?: number | null
          cpp_amount?: number | null
          created_at?: string
          eap_premium?: number | null
          ei_amount?: number | null
          employee_dental_premium?: number | null
          employee_health_premium?: number | null
          employee_name?: string | null
          employee_vision_premium?: number | null
          employer_benefit_contribution?: number | null
          employer_cpp?: number | null
          employer_dental_premium?: number | null
          employer_ei?: number | null
          employer_group_life?: number | null
          employer_health_premium?: number | null
          employer_ltd?: number | null
          employer_pension_match?: number | null
          employer_retirement_match?: number | null
          garnishments?: number | null
          gross_pay?: number | null
          group_life_premium?: number | null
          holiday_hours?: number | null
          hourly_rate?: number | null
          id?: string
          income_tax_amount?: number | null
          ltd_premium?: number | null
          memo?: string | null
          net_pay?: number | null
          other_deductions_amount?: number | null
          overpayment_recovery?: number | null
          overtime_hours?: number | null
          pay_method?: string | null
          payout_account_id?: string | null
          payroll_run_id: string
          pension_rpp?: number | null
          regular_hours?: number | null
          reimbursement_amount?: number | null
          rrsp_prpp?: number | null
          salary_override?: number | null
          sick_hours?: number | null
          status?: string | null
          total_deductions?: number | null
          union_dues?: number | null
          user_id?: string | null
          vacation_hours?: number | null
          vacation_pay_amount?: number | null
          voluntary_deductions?: number | null
        }
        Update: {
          allowance_amount?: number | null
          bonus_amount?: number | null
          cpp_amount?: number | null
          created_at?: string
          eap_premium?: number | null
          ei_amount?: number | null
          employee_dental_premium?: number | null
          employee_health_premium?: number | null
          employee_name?: string | null
          employee_vision_premium?: number | null
          employer_benefit_contribution?: number | null
          employer_cpp?: number | null
          employer_dental_premium?: number | null
          employer_ei?: number | null
          employer_group_life?: number | null
          employer_health_premium?: number | null
          employer_ltd?: number | null
          employer_pension_match?: number | null
          employer_retirement_match?: number | null
          garnishments?: number | null
          gross_pay?: number | null
          group_life_premium?: number | null
          holiday_hours?: number | null
          hourly_rate?: number | null
          id?: string
          income_tax_amount?: number | null
          ltd_premium?: number | null
          memo?: string | null
          net_pay?: number | null
          other_deductions_amount?: number | null
          overpayment_recovery?: number | null
          overtime_hours?: number | null
          pay_method?: string | null
          payout_account_id?: string | null
          payroll_run_id?: string
          pension_rpp?: number | null
          regular_hours?: number | null
          reimbursement_amount?: number | null
          rrsp_prpp?: number | null
          salary_override?: number | null
          sick_hours?: number | null
          status?: string | null
          total_deductions?: number | null
          union_dues?: number | null
          user_id?: string | null
          vacation_hours?: number | null
          vacation_pay_amount?: number | null
          voluntary_deductions?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_run_items_payout_account_id_fkey"
            columns: ["payout_account_id"]
            isOneToOne: false
            referencedRelation: "finance_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_run_items_payroll_run_id_fkey"
            columns: ["payroll_run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_runs: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          id: string
          locked_at: string | null
          notes: string | null
          override_reason: string | null
          pay_date: string
          pay_period_end: string
          pay_period_start: string
          processed_at: string | null
          processed_by: string | null
          run_number: string | null
          status: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          locked_at?: string | null
          notes?: string | null
          override_reason?: string | null
          pay_date: string
          pay_period_end: string
          pay_period_start: string
          processed_at?: string | null
          processed_by?: string | null
          run_number?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          locked_at?: string | null
          notes?: string | null
          override_reason?: string | null
          pay_date?: string
          pay_period_end?: string
          pay_period_start?: string
          processed_at?: string | null
          processed_by?: string | null
          run_number?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      portal_settings: {
        Row: {
          allow_approve_quotes: boolean | null
          allow_cancel_requests: boolean | null
          allow_decline_quotes: boolean | null
          allow_manage_addresses: boolean | null
          allow_pay_invoices: boolean | null
          allow_reschedule: boolean | null
          allow_submit_requests: boolean | null
          allow_update_contact: boolean | null
          created_at: string
          footer_note: string | null
          id: string
          inactive_client_blocked: boolean | null
          invitation_required: boolean | null
          login_instructions: string | null
          multi_property_enabled: boolean | null
          self_signup_allowed: boolean | null
          show_comm_history: boolean | null
          show_documents: boolean | null
          show_invoices: boolean | null
          show_jobs: boolean | null
          show_properties: boolean | null
          show_quotes: boolean | null
          show_requests: boolean | null
          show_visits: boolean | null
          support_text: string | null
          updated_at: string
          welcome_message: string | null
        }
        Insert: {
          allow_approve_quotes?: boolean | null
          allow_cancel_requests?: boolean | null
          allow_decline_quotes?: boolean | null
          allow_manage_addresses?: boolean | null
          allow_pay_invoices?: boolean | null
          allow_reschedule?: boolean | null
          allow_submit_requests?: boolean | null
          allow_update_contact?: boolean | null
          created_at?: string
          footer_note?: string | null
          id?: string
          inactive_client_blocked?: boolean | null
          invitation_required?: boolean | null
          login_instructions?: string | null
          multi_property_enabled?: boolean | null
          self_signup_allowed?: boolean | null
          show_comm_history?: boolean | null
          show_documents?: boolean | null
          show_invoices?: boolean | null
          show_jobs?: boolean | null
          show_properties?: boolean | null
          show_quotes?: boolean | null
          show_requests?: boolean | null
          show_visits?: boolean | null
          support_text?: string | null
          updated_at?: string
          welcome_message?: string | null
        }
        Update: {
          allow_approve_quotes?: boolean | null
          allow_cancel_requests?: boolean | null
          allow_decline_quotes?: boolean | null
          allow_manage_addresses?: boolean | null
          allow_pay_invoices?: boolean | null
          allow_reschedule?: boolean | null
          allow_submit_requests?: boolean | null
          allow_update_contact?: boolean | null
          created_at?: string
          footer_note?: string | null
          id?: string
          inactive_client_blocked?: boolean | null
          invitation_required?: boolean | null
          login_instructions?: string | null
          multi_property_enabled?: boolean | null
          self_signup_allowed?: boolean | null
          show_comm_history?: boolean | null
          show_documents?: boolean | null
          show_invoices?: boolean | null
          show_jobs?: boolean | null
          show_properties?: boolean | null
          show_quotes?: boolean | null
          show_requests?: boolean | null
          show_visits?: boolean | null
          support_text?: string | null
          updated_at?: string
          welcome_message?: string | null
        }
        Relationships: []
      }
      products_services: {
        Row: {
          allow_customer_quantity: boolean
          available_on_quotes: boolean
          book_service_as: string
          created_at: string
          customer_visible: boolean
          description: string | null
          id: string
          internal_item_code: string | null
          internal_notes: string | null
          max_quantity: number
          min_quantity: number
          minimum_charge: number | null
          name: string
          online_booking_enabled: boolean
          portal_display_description: string | null
          price_type: string
          product_type: string
          recurring_eligible: boolean
          seasonal_label: string | null
          service_category: string
          service_duration_minutes: number | null
          sort_order: number | null
          status: string
          taxable: boolean
          unit_label: string | null
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          allow_customer_quantity?: boolean
          available_on_quotes?: boolean
          book_service_as?: string
          created_at?: string
          customer_visible?: boolean
          description?: string | null
          id?: string
          internal_item_code?: string | null
          internal_notes?: string | null
          max_quantity?: number
          min_quantity?: number
          minimum_charge?: number | null
          name: string
          online_booking_enabled?: boolean
          portal_display_description?: string | null
          price_type?: string
          product_type?: string
          recurring_eligible?: boolean
          seasonal_label?: string | null
          service_category?: string
          service_duration_minutes?: number | null
          sort_order?: number | null
          status?: string
          taxable?: boolean
          unit_label?: string | null
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          allow_customer_quantity?: boolean
          available_on_quotes?: boolean
          book_service_as?: string
          created_at?: string
          customer_visible?: boolean
          description?: string | null
          id?: string
          internal_item_code?: string | null
          internal_notes?: string | null
          max_quantity?: number
          min_quantity?: number
          minimum_charge?: number | null
          name?: string
          online_booking_enabled?: boolean
          portal_display_description?: string | null
          price_type?: string
          product_type?: string
          recurring_eligible?: boolean
          seasonal_label?: string | null
          service_category?: string
          service_duration_minutes?: number | null
          sort_order?: number | null
          status?: string
          taxable?: boolean
          unit_label?: string | null
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          role: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          role?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          role?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          access_notes: string | null
          access_type: string | null
          address_line_1: string | null
          caution_notes: string | null
          city: string | null
          created_at: string
          customer_id: string
          emergency_exit_notes: string | null
          fire_extinguisher_location: string | null
          first_aid_kit_location: string | null
          gate_code: string | null
          high_risk_flag: boolean
          house_number_location: string | null
          id: string
          landmark_notes: string | null
          latitude: number | null
          longitude: number | null
          muster_point_description: string | null
          muster_point_map_notes: string | null
          muster_point_name: string | null
          muster_point_photo_url: string | null
          photo_front_url: string | null
          photo_night_url: string | null
          photo_winter_url: string | null
          postal_code: string | null
          property_name: string
          property_type: Database["public"]["Enums"]["property_type"]
          province: string | null
          seasonal_notes: string | null
          site_emergency_notes: string | null
          status: Database["public"]["Enums"]["property_status"]
          updated_at: string
          verification_notes: string | null
        }
        Insert: {
          access_notes?: string | null
          access_type?: string | null
          address_line_1?: string | null
          caution_notes?: string | null
          city?: string | null
          created_at?: string
          customer_id: string
          emergency_exit_notes?: string | null
          fire_extinguisher_location?: string | null
          first_aid_kit_location?: string | null
          gate_code?: string | null
          high_risk_flag?: boolean
          house_number_location?: string | null
          id?: string
          landmark_notes?: string | null
          latitude?: number | null
          longitude?: number | null
          muster_point_description?: string | null
          muster_point_map_notes?: string | null
          muster_point_name?: string | null
          muster_point_photo_url?: string | null
          photo_front_url?: string | null
          photo_night_url?: string | null
          photo_winter_url?: string | null
          postal_code?: string | null
          property_name: string
          property_type?: Database["public"]["Enums"]["property_type"]
          province?: string | null
          seasonal_notes?: string | null
          site_emergency_notes?: string | null
          status?: Database["public"]["Enums"]["property_status"]
          updated_at?: string
          verification_notes?: string | null
        }
        Update: {
          access_notes?: string | null
          access_type?: string | null
          address_line_1?: string | null
          caution_notes?: string | null
          city?: string | null
          created_at?: string
          customer_id?: string
          emergency_exit_notes?: string | null
          fire_extinguisher_location?: string | null
          first_aid_kit_location?: string | null
          gate_code?: string | null
          high_risk_flag?: boolean
          house_number_location?: string | null
          id?: string
          landmark_notes?: string | null
          latitude?: number | null
          longitude?: number | null
          muster_point_description?: string | null
          muster_point_map_notes?: string | null
          muster_point_name?: string | null
          muster_point_photo_url?: string | null
          photo_front_url?: string | null
          photo_night_url?: string | null
          photo_winter_url?: string | null
          postal_code?: string | null
          property_name?: string
          property_type?: Database["public"]["Enums"]["property_type"]
          province?: string | null
          seasonal_notes?: string | null
          site_emergency_notes?: string | null
          status?: Database["public"]["Enums"]["property_status"]
          updated_at?: string
          verification_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      property_site_alerts: {
        Row: {
          accessibility_notes: string | null
          created_at: string | null
          dog_notes: string | null
          equipment_notes: string | null
          gate_access_notes: string | null
          hand_shovel_only: boolean | null
          has_dog: boolean | null
          has_elderly_resident: boolean | null
          has_icy_spots: boolean | null
          has_locked_gate: boolean | null
          has_low_wires: boolean | null
          has_mobility_impaired: boolean | null
          has_steep_grade: boolean | null
          has_wheelchair_ramp: boolean | null
          hazard_notes: string | null
          id: string
          medical_alert: boolean | null
          medical_alert_text: string | null
          priority_tier: string | null
          property_id: string
          required_equipment: string[] | null
          updated_at: string | null
        }
        Insert: {
          accessibility_notes?: string | null
          created_at?: string | null
          dog_notes?: string | null
          equipment_notes?: string | null
          gate_access_notes?: string | null
          hand_shovel_only?: boolean | null
          has_dog?: boolean | null
          has_elderly_resident?: boolean | null
          has_icy_spots?: boolean | null
          has_locked_gate?: boolean | null
          has_low_wires?: boolean | null
          has_mobility_impaired?: boolean | null
          has_steep_grade?: boolean | null
          has_wheelchair_ramp?: boolean | null
          hazard_notes?: string | null
          id?: string
          medical_alert?: boolean | null
          medical_alert_text?: string | null
          priority_tier?: string | null
          property_id: string
          required_equipment?: string[] | null
          updated_at?: string | null
        }
        Update: {
          accessibility_notes?: string | null
          created_at?: string | null
          dog_notes?: string | null
          equipment_notes?: string | null
          gate_access_notes?: string | null
          hand_shovel_only?: boolean | null
          has_dog?: boolean | null
          has_elderly_resident?: boolean | null
          has_icy_spots?: boolean | null
          has_locked_gate?: boolean | null
          has_low_wires?: boolean | null
          has_mobility_impaired?: boolean | null
          has_steep_grade?: boolean | null
          has_wheelchair_ramp?: boolean | null
          hazard_notes?: string | null
          id?: string
          medical_alert?: boolean | null
          medical_alert_text?: string | null
          priority_tier?: string | null
          property_id?: string
          required_equipment?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_site_alerts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: true
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_line_items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          item_name: string
          line_total: number | null
          quantity: number | null
          quote_id: string
          sort_order: number | null
          unit_price: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          item_name: string
          line_total?: number | null
          quantity?: number | null
          quote_id: string
          sort_order?: number | null
          unit_price?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          item_name?: string
          line_total?: number | null
          quantity?: number | null
          quote_id?: string
          sort_order?: number | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_line_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          agent_summary: string | null
          approval_status: Database["public"]["Enums"]["quote_approval_status"]
          approved_by: string | null
          converted_at: string | null
          converted_by: string | null
          converted_job_id: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          email_delivery_status: string | null
          email_ready: boolean
          email_sent_at: string | null
          follow_up_due_at: string | null
          follow_up_email_due_at: string | null
          id: string
          internal_notes: string | null
          lead_id: string | null
          quote_number: string
          request_id: string | null
          scope_of_work: string | null
          sent_at: string | null
          sent_status: string | null
          service_category: Database["public"]["Enums"]["service_category"]
          subtotal: number | null
          tax: number | null
          tax_rate: number
          total: number | null
          updated_at: string
        }
        Insert: {
          agent_summary?: string | null
          approval_status?: Database["public"]["Enums"]["quote_approval_status"]
          approved_by?: string | null
          converted_at?: string | null
          converted_by?: string | null
          converted_job_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          email_delivery_status?: string | null
          email_ready?: boolean
          email_sent_at?: string | null
          follow_up_due_at?: string | null
          follow_up_email_due_at?: string | null
          id?: string
          internal_notes?: string | null
          lead_id?: string | null
          quote_number: string
          request_id?: string | null
          scope_of_work?: string | null
          sent_at?: string | null
          sent_status?: string | null
          service_category?: Database["public"]["Enums"]["service_category"]
          subtotal?: number | null
          tax?: number | null
          tax_rate?: number
          total?: number | null
          updated_at?: string
        }
        Update: {
          agent_summary?: string | null
          approval_status?: Database["public"]["Enums"]["quote_approval_status"]
          approved_by?: string | null
          converted_at?: string | null
          converted_by?: string | null
          converted_job_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          email_delivery_status?: string | null
          email_ready?: boolean
          email_sent_at?: string | null
          follow_up_due_at?: string | null
          follow_up_email_due_at?: string | null
          id?: string
          internal_notes?: string | null
          lead_id?: string | null
          quote_number?: string
          request_id?: string | null
          scope_of_work?: string | null
          sent_at?: string | null
          sent_status?: string | null
          service_category?: Database["public"]["Enums"]["service_category"]
          subtotal?: number | null
          tax?: number | null
          tax_rate?: number
          total?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotes_converted_job_id_fkey"
            columns: ["converted_job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      request_booking_settings: {
        Row: {
          auto_convert_to_quote: boolean | null
          booking_approval_required: boolean | null
          booking_confirmation_text: string | null
          cancellation_hours: number | null
          created_at: string
          customers_can_cancel: boolean | null
          customers_can_create: boolean | null
          default_request_owner: string | null
          emergency_requests: boolean | null
          id: string
          lead_time_hours: number | null
          max_bookings_per_day: number | null
          online_booking_enabled: boolean | null
          portal_help_text: string | null
          recurring_booking_enabled: boolean | null
          request_approval_required: boolean | null
          request_form_instructions: string | null
          request_intake_enabled: boolean | null
          request_received_text: string | null
          require_description: boolean | null
          require_photos: boolean | null
          require_service_type: boolean | null
          review_before_convert: boolean | null
          same_day_requests: boolean | null
          staff_can_create: boolean | null
          subcontractors_can_view: boolean | null
          triage_required: boolean | null
          updated_at: string
        }
        Insert: {
          auto_convert_to_quote?: boolean | null
          booking_approval_required?: boolean | null
          booking_confirmation_text?: string | null
          cancellation_hours?: number | null
          created_at?: string
          customers_can_cancel?: boolean | null
          customers_can_create?: boolean | null
          default_request_owner?: string | null
          emergency_requests?: boolean | null
          id?: string
          lead_time_hours?: number | null
          max_bookings_per_day?: number | null
          online_booking_enabled?: boolean | null
          portal_help_text?: string | null
          recurring_booking_enabled?: boolean | null
          request_approval_required?: boolean | null
          request_form_instructions?: string | null
          request_intake_enabled?: boolean | null
          request_received_text?: string | null
          require_description?: boolean | null
          require_photos?: boolean | null
          require_service_type?: boolean | null
          review_before_convert?: boolean | null
          same_day_requests?: boolean | null
          staff_can_create?: boolean | null
          subcontractors_can_view?: boolean | null
          triage_required?: boolean | null
          updated_at?: string
        }
        Update: {
          auto_convert_to_quote?: boolean | null
          booking_approval_required?: boolean | null
          booking_confirmation_text?: string | null
          cancellation_hours?: number | null
          created_at?: string
          customers_can_cancel?: boolean | null
          customers_can_create?: boolean | null
          default_request_owner?: string | null
          emergency_requests?: boolean | null
          id?: string
          lead_time_hours?: number | null
          max_bookings_per_day?: number | null
          online_booking_enabled?: boolean | null
          portal_help_text?: string | null
          recurring_booking_enabled?: boolean | null
          request_approval_required?: boolean | null
          request_form_instructions?: string | null
          request_intake_enabled?: boolean | null
          request_received_text?: string | null
          require_description?: boolean | null
          require_photos?: boolean | null
          require_service_type?: boolean | null
          review_before_convert?: boolean | null
          same_day_requests?: boolean | null
          staff_can_create?: boolean | null
          subcontractors_can_view?: boolean | null
          triage_required?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          created_at: string
          id: string
          permission_key: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          id?: string
          permission_key: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          id?: string
          permission_key?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      route_settings: {
        Row: {
          avg_travel_speed_kmh: number | null
          created_at: string
          default_travel_buffer: number | null
          id: string
          optimization_priority: string | null
          planning_mode: string | null
          return_to_base: boolean | null
          service_time_weight: number | null
          start_location: string | null
          updated_at: string
        }
        Insert: {
          avg_travel_speed_kmh?: number | null
          created_at?: string
          default_travel_buffer?: number | null
          id?: string
          optimization_priority?: string | null
          planning_mode?: string | null
          return_to_base?: boolean | null
          service_time_weight?: number | null
          start_location?: string | null
          updated_at?: string
        }
        Update: {
          avg_travel_speed_kmh?: number | null
          created_at?: string
          default_travel_buffer?: number | null
          id?: string
          optimization_priority?: string | null
          planning_mode?: string | null
          return_to_base?: boolean | null
          service_time_weight?: number | null
          start_location?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      schedule_settings: {
        Row: {
          admin_approval_for_changes: boolean | null
          after_hours_available: boolean | null
          allow_overlapping: boolean | null
          auto_create_visits: boolean | null
          blackout_dates: Json | null
          business_hours: Json | null
          cancellation_window_hours: number | null
          created_at: string
          default_duration_minutes: number | null
          default_view: string | null
          emergency_scheduling: boolean | null
          enforce_worker_availability: boolean | null
          first_day_of_week: number | null
          holidays: Json | null
          id: string
          lead_time_hours: number | null
          prevent_double_booking: boolean | null
          same_day_booking: boolean | null
          setup_buffer_minutes: number | null
          subcontractor_scheduling: boolean | null
          time_slot_increment: number | null
          travel_buffer_minutes: number | null
          updated_at: string
          weekend_scheduling: boolean | null
          workday_end: string | null
          workday_start: string | null
        }
        Insert: {
          admin_approval_for_changes?: boolean | null
          after_hours_available?: boolean | null
          allow_overlapping?: boolean | null
          auto_create_visits?: boolean | null
          blackout_dates?: Json | null
          business_hours?: Json | null
          cancellation_window_hours?: number | null
          created_at?: string
          default_duration_minutes?: number | null
          default_view?: string | null
          emergency_scheduling?: boolean | null
          enforce_worker_availability?: boolean | null
          first_day_of_week?: number | null
          holidays?: Json | null
          id?: string
          lead_time_hours?: number | null
          prevent_double_booking?: boolean | null
          same_day_booking?: boolean | null
          setup_buffer_minutes?: number | null
          subcontractor_scheduling?: boolean | null
          time_slot_increment?: number | null
          travel_buffer_minutes?: number | null
          updated_at?: string
          weekend_scheduling?: boolean | null
          workday_end?: string | null
          workday_start?: string | null
        }
        Update: {
          admin_approval_for_changes?: boolean | null
          after_hours_available?: boolean | null
          allow_overlapping?: boolean | null
          auto_create_visits?: boolean | null
          blackout_dates?: Json | null
          business_hours?: Json | null
          cancellation_window_hours?: number | null
          created_at?: string
          default_duration_minutes?: number | null
          default_view?: string | null
          emergency_scheduling?: boolean | null
          enforce_worker_availability?: boolean | null
          first_day_of_week?: number | null
          holidays?: Json | null
          id?: string
          lead_time_hours?: number | null
          prevent_double_booking?: boolean | null
          same_day_booking?: boolean | null
          setup_buffer_minutes?: number | null
          subcontractor_scheduling?: boolean | null
          time_slot_increment?: number | null
          travel_buffer_minutes?: number | null
          updated_at?: string
          weekend_scheduling?: boolean | null
          workday_end?: string | null
          workday_start?: string | null
        }
        Relationships: []
      }
      service_requests: {
        Row: {
          access_notes: string | null
          area_of_property: string | null
          attachments: string[] | null
          created_at: string
          customer_id: string
          description: string | null
          id: string
          internal_notes: string | null
          preferred_contact_method: string | null
          property_id: string | null
          requested_timing: string | null
          service_type: string
          specific_request_type: string | null
          status: string
          subject: string
          updated_at: string
          urgency: string
          user_id: string
        }
        Insert: {
          access_notes?: string | null
          area_of_property?: string | null
          attachments?: string[] | null
          created_at?: string
          customer_id: string
          description?: string | null
          id?: string
          internal_notes?: string | null
          preferred_contact_method?: string | null
          property_id?: string | null
          requested_timing?: string | null
          service_type?: string
          specific_request_type?: string | null
          status?: string
          subject: string
          updated_at?: string
          urgency?: string
          user_id: string
        }
        Update: {
          access_notes?: string | null
          area_of_property?: string | null
          attachments?: string[] | null
          created_at?: string
          customer_id?: string
          description?: string | null
          id?: string
          internal_notes?: string | null
          preferred_contact_method?: string | null
          property_id?: string | null
          requested_timing?: string | null
          service_type?: string
          specific_request_type?: string | null
          status?: string
          subject?: string
          updated_at?: string
          urgency?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      service_territories: {
        Row: {
          cities: string[] | null
          color: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          postal_codes: string[] | null
          preferred_worker_ids: string[] | null
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          cities?: string[] | null
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          postal_codes?: string[] | null
          preferred_worker_ids?: string[] | null
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          cities?: string[] | null
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          postal_codes?: string[] | null
          preferred_worker_ids?: string[] | null
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      subcontractor_assignments: {
        Row: {
          assigned_at: string
          assignment_status: string
          created_at: string
          id: string
          job_id: string | null
          notes: string | null
          property_id: string | null
          subcontractor_id: string
          visit_id: string | null
        }
        Insert: {
          assigned_at?: string
          assignment_status?: string
          created_at?: string
          id?: string
          job_id?: string | null
          notes?: string | null
          property_id?: string | null
          subcontractor_id: string
          visit_id?: string | null
        }
        Update: {
          assigned_at?: string
          assignment_status?: string
          created_at?: string
          id?: string
          job_id?: string | null
          notes?: string | null
          property_id?: string | null
          subcontractor_id?: string
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subcontractor_assignments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontractor_assignments_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontractor_assignments_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "subcontractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontractor_assignments_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      subcontractor_billing_profiles: {
        Row: {
          autopay_consent_at: string | null
          autopay_enabled: boolean
          billing_email: string | null
          card_brand: string | null
          card_last4: string | null
          created_at: string
          id: string
          notes: string | null
          payment_method_present: boolean
          payment_preference: string
          processor_customer_id: string | null
          subcontractor_id: string
          updated_at: string
        }
        Insert: {
          autopay_consent_at?: string | null
          autopay_enabled?: boolean
          billing_email?: string | null
          card_brand?: string | null
          card_last4?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          payment_method_present?: boolean
          payment_preference?: string
          processor_customer_id?: string | null
          subcontractor_id: string
          updated_at?: string
        }
        Update: {
          autopay_consent_at?: string | null
          autopay_enabled?: boolean
          billing_email?: string | null
          card_brand?: string | null
          card_last4?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          payment_method_present?: boolean
          payment_preference?: string
          processor_customer_id?: string | null
          subcontractor_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subcontractor_billing_profiles_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: true
            referencedRelation: "subcontractors"
            referencedColumns: ["id"]
          },
        ]
      }
      subcontractor_documents: {
        Row: {
          created_at: string
          document_name: string
          document_type: string
          expiry_date: string | null
          file_name: string
          file_url: string
          id: string
          notes: string | null
          status: string
          subcontractor_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          document_name: string
          document_type?: string
          expiry_date?: string | null
          file_name: string
          file_url: string
          id?: string
          notes?: string | null
          status?: string
          subcontractor_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          document_name?: string
          document_type?: string
          expiry_date?: string | null
          file_name?: string
          file_url?: string
          id?: string
          notes?: string | null
          status?: string
          subcontractor_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subcontractor_documents_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "subcontractors"
            referencedColumns: ["id"]
          },
        ]
      }
      subcontractor_invoices: {
        Row: {
          admin_review_notes: string | null
          amount: number
          approved_at: string | null
          attachment_url: string | null
          created_at: string
          currency: string
          id: string
          invoice_date: string
          invoice_number: string
          notes: string | null
          paid_at: string | null
          service_period_end: string | null
          service_period_start: string | null
          status: string
          subcontractor_id: string
          submitted_at: string
          updated_at: string
        }
        Insert: {
          admin_review_notes?: string | null
          amount?: number
          approved_at?: string | null
          attachment_url?: string | null
          created_at?: string
          currency?: string
          id?: string
          invoice_date?: string
          invoice_number: string
          notes?: string | null
          paid_at?: string | null
          service_period_end?: string | null
          service_period_start?: string | null
          status?: string
          subcontractor_id: string
          submitted_at?: string
          updated_at?: string
        }
        Update: {
          admin_review_notes?: string | null
          amount?: number
          approved_at?: string | null
          attachment_url?: string | null
          created_at?: string
          currency?: string
          id?: string
          invoice_date?: string
          invoice_number?: string
          notes?: string | null
          paid_at?: string | null
          service_period_end?: string | null
          service_period_start?: string | null
          status?: string
          subcontractor_id?: string
          submitted_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subcontractor_invoices_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "subcontractors"
            referencedColumns: ["id"]
          },
        ]
      }
      subcontractor_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_id: string | null
          notes: string | null
          payment_date: string | null
          payment_method: string | null
          reference_number: string | null
          subcontractor_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string | null
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          reference_number?: string | null
          subcontractor_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string | null
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          reference_number?: string | null
          subcontractor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subcontractor_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "subcontractor_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontractor_payments_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "subcontractors"
            referencedColumns: ["id"]
          },
        ]
      }
      subcontractor_payout_items: {
        Row: {
          account_id: string | null
          adjustment_amount: number | null
          amount_due: number | null
          company_name: string | null
          created_at: string
          holdback_amount: number | null
          id: string
          linked_invoice_id: string | null
          linked_job_id: string | null
          linked_visit_id: string | null
          notes: string | null
          payout_run_id: string
          reference_number: string | null
          service_date: string | null
          service_description: string | null
          status: string | null
          subcontractor_id: string | null
          subcontractor_name: string | null
          total_payable: number | null
        }
        Insert: {
          account_id?: string | null
          adjustment_amount?: number | null
          amount_due?: number | null
          company_name?: string | null
          created_at?: string
          holdback_amount?: number | null
          id?: string
          linked_invoice_id?: string | null
          linked_job_id?: string | null
          linked_visit_id?: string | null
          notes?: string | null
          payout_run_id: string
          reference_number?: string | null
          service_date?: string | null
          service_description?: string | null
          status?: string | null
          subcontractor_id?: string | null
          subcontractor_name?: string | null
          total_payable?: number | null
        }
        Update: {
          account_id?: string | null
          adjustment_amount?: number | null
          amount_due?: number | null
          company_name?: string | null
          created_at?: string
          holdback_amount?: number | null
          id?: string
          linked_invoice_id?: string | null
          linked_job_id?: string | null
          linked_visit_id?: string | null
          notes?: string | null
          payout_run_id?: string
          reference_number?: string | null
          service_date?: string | null
          service_description?: string | null
          status?: string | null
          subcontractor_id?: string | null
          subcontractor_name?: string | null
          total_payable?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "subcontractor_payout_items_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "finance_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontractor_payout_items_payout_run_id_fkey"
            columns: ["payout_run_id"]
            isOneToOne: false
            referencedRelation: "subcontractor_payout_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      subcontractor_payout_runs: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          id: string
          locked_at: string | null
          notes: string | null
          override_reason: string | null
          payout_date: string
          payout_run_number: string | null
          period_end: string
          period_start: string
          processed_at: string | null
          processed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          locked_at?: string | null
          notes?: string | null
          override_reason?: string | null
          payout_date: string
          payout_run_number?: string | null
          period_end: string
          period_start: string
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          locked_at?: string | null
          notes?: string | null
          override_reason?: string | null
          payout_date?: string
          payout_run_number?: string | null
          period_end?: string
          period_start?: string
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      subcontractor_service_categories: {
        Row: {
          created_at: string
          id: string
          service_category: string
          subcontractor_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          service_category: string
          subcontractor_id: string
        }
        Update: {
          created_at?: string
          id?: string
          service_category?: string
          subcontractor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subcontractor_service_categories_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "subcontractors"
            referencedColumns: ["id"]
          },
        ]
      }
      subcontractor_tax_documents: {
        Row: {
          created_at: string
          document_name: string
          document_type: string
          file_name: string | null
          file_url: string | null
          id: string
          notes: string | null
          subcontractor_id: string
          tax_year: number
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          document_name: string
          document_type?: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          notes?: string | null
          subcontractor_id: string
          tax_year: number
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          document_name?: string
          document_type?: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          notes?: string | null
          subcontractor_id?: string
          tax_year?: number
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subcontractor_tax_documents_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "subcontractors"
            referencedColumns: ["id"]
          },
        ]
      }
      subcontractors: {
        Row: {
          active_flag: boolean
          agreement_signed_status: string
          allergies: string | null
          bank_account_number: string | null
          bank_institution_number: string | null
          bank_name: string | null
          bank_transit_number: string | null
          blocked_at: string | null
          blocked_reason: string | null
          blood_pressure_alert: boolean | null
          business_license_expiry: string | null
          business_license_status: string
          business_number: string | null
          carries_epipen: boolean | null
          carries_inhaler: boolean | null
          company_name: string
          contact_name: string
          created_at: string
          date_of_birth: string | null
          diabetes_alert: boolean | null
          driver_license_class: string | null
          driver_license_expiry: string | null
          driver_license_number: string | null
          e_transfer_email: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          emergency_medical_notes: string | null
          ethnicity: string | null
          gender: string | null
          hourly_rate: number | null
          id: string
          insurance_expiry: string | null
          insurance_status: string
          is_blocked: boolean | null
          mailing_address: string | null
          medical_info_consent: boolean | null
          medical_info_last_updated_at: string | null
          notes_admin_only: string | null
          onboarding_status: string
          operating_name: string | null
          pay_schedule: string | null
          pay_type: string | null
          phone: string | null
          preferred_payment_method: string | null
          profile_photo_url: string | null
          referral_source: string | null
          religion: string | null
          safety_doc_status: string
          secondary_emergency_contact_name: string | null
          secondary_emergency_contact_phone: string | null
          secondary_emergency_contact_relationship: string | null
          seizure_or_fainting_alert: boolean | null
          service_area_summary: string | null
          sin_encrypted: string | null
          status: string
          updated_at: string
          user_id: string
          wcb_expiry: string | null
          wcb_status: string
        }
        Insert: {
          active_flag?: boolean
          agreement_signed_status?: string
          allergies?: string | null
          bank_account_number?: string | null
          bank_institution_number?: string | null
          bank_name?: string | null
          bank_transit_number?: string | null
          blocked_at?: string | null
          blocked_reason?: string | null
          blood_pressure_alert?: boolean | null
          business_license_expiry?: string | null
          business_license_status?: string
          business_number?: string | null
          carries_epipen?: boolean | null
          carries_inhaler?: boolean | null
          company_name: string
          contact_name: string
          created_at?: string
          date_of_birth?: string | null
          diabetes_alert?: boolean | null
          driver_license_class?: string | null
          driver_license_expiry?: string | null
          driver_license_number?: string | null
          e_transfer_email?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          emergency_medical_notes?: string | null
          ethnicity?: string | null
          gender?: string | null
          hourly_rate?: number | null
          id?: string
          insurance_expiry?: string | null
          insurance_status?: string
          is_blocked?: boolean | null
          mailing_address?: string | null
          medical_info_consent?: boolean | null
          medical_info_last_updated_at?: string | null
          notes_admin_only?: string | null
          onboarding_status?: string
          operating_name?: string | null
          pay_schedule?: string | null
          pay_type?: string | null
          phone?: string | null
          preferred_payment_method?: string | null
          profile_photo_url?: string | null
          referral_source?: string | null
          religion?: string | null
          safety_doc_status?: string
          secondary_emergency_contact_name?: string | null
          secondary_emergency_contact_phone?: string | null
          secondary_emergency_contact_relationship?: string | null
          seizure_or_fainting_alert?: boolean | null
          service_area_summary?: string | null
          sin_encrypted?: string | null
          status?: string
          updated_at?: string
          user_id: string
          wcb_expiry?: string | null
          wcb_status?: string
        }
        Update: {
          active_flag?: boolean
          agreement_signed_status?: string
          allergies?: string | null
          bank_account_number?: string | null
          bank_institution_number?: string | null
          bank_name?: string | null
          bank_transit_number?: string | null
          blocked_at?: string | null
          blocked_reason?: string | null
          blood_pressure_alert?: boolean | null
          business_license_expiry?: string | null
          business_license_status?: string
          business_number?: string | null
          carries_epipen?: boolean | null
          carries_inhaler?: boolean | null
          company_name?: string
          contact_name?: string
          created_at?: string
          date_of_birth?: string | null
          diabetes_alert?: boolean | null
          driver_license_class?: string | null
          driver_license_expiry?: string | null
          driver_license_number?: string | null
          e_transfer_email?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          emergency_medical_notes?: string | null
          ethnicity?: string | null
          gender?: string | null
          hourly_rate?: number | null
          id?: string
          insurance_expiry?: string | null
          insurance_status?: string
          is_blocked?: boolean | null
          mailing_address?: string | null
          medical_info_consent?: boolean | null
          medical_info_last_updated_at?: string | null
          notes_admin_only?: string | null
          onboarding_status?: string
          operating_name?: string | null
          pay_schedule?: string | null
          pay_type?: string | null
          phone?: string | null
          preferred_payment_method?: string | null
          profile_photo_url?: string | null
          referral_source?: string | null
          religion?: string | null
          safety_doc_status?: string
          secondary_emergency_contact_name?: string | null
          secondary_emergency_contact_phone?: string | null
          secondary_emergency_contact_relationship?: string | null
          seizure_or_fainting_alert?: boolean | null
          service_area_summary?: string | null
          sin_encrypted?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          wcb_expiry?: string | null
          wcb_status?: string
        }
        Relationships: []
      }
      system_announcements: {
        Row: {
          body: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          priority: string
          publish_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          priority?: string
          publish_at?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          priority?: string
          publish_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          created_at: string
          display_name: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean
          notes: string | null
          phone: string | null
          portal_admin: boolean
          portal_subcontractor: boolean
          portal_worker: boolean
          service_categories: string[]
          status: string
          team_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email: string
          full_name: string
          id?: string
          is_active?: boolean
          notes?: string | null
          phone?: string | null
          portal_admin?: boolean
          portal_subcontractor?: boolean
          portal_worker?: boolean
          service_categories?: string[]
          status?: string
          team_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          phone?: string | null
          portal_admin?: boolean
          portal_subcontractor?: boolean
          portal_worker?: boolean
          service_categories?: string[]
          status?: string
          team_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      timesheets: {
        Row: {
          clock_in: string
          clock_out: string | null
          created_at: string
          id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          clock_in?: string
          clock_out?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          user_id: string
        }
        Update: {
          clock_in?: string
          clock_out?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      training_assignments: {
        Row: {
          acknowledged_at: string | null
          assigned_by: string | null
          attempts: number
          certificate_url: string | null
          completed_at: string | null
          course_id: string
          created_at: string
          due_date: string | null
          expiry_date: string | null
          id: string
          notes: string | null
          score: number | null
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          assigned_by?: string | null
          attempts?: number
          certificate_url?: string | null
          completed_at?: string | null
          course_id: string
          created_at?: string
          due_date?: string | null
          expiry_date?: string | null
          id?: string
          notes?: string | null
          score?: number | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          acknowledged_at?: string | null
          assigned_by?: string | null
          attempts?: number
          certificate_url?: string | null
          completed_at?: string | null
          course_id?: string
          created_at?: string
          due_date?: string | null
          expiry_date?: string | null
          id?: string
          notes?: string | null
          score?: number | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_assignments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "training_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      training_courses: {
        Row: {
          category: string
          content_type: string
          created_at: string
          created_by: string | null
          description: string | null
          document_urls: string[] | null
          estimated_duration_minutes: number | null
          id: string
          is_active: boolean
          is_mandatory: boolean
          mandatory_for_roles: string[] | null
          mandatory_for_service_lines: string[] | null
          max_retakes: number | null
          pass_mark: number | null
          renewal_period_days: number | null
          sort_order: number | null
          target_audience: string
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          category?: string
          content_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          document_urls?: string[] | null
          estimated_duration_minutes?: number | null
          id?: string
          is_active?: boolean
          is_mandatory?: boolean
          mandatory_for_roles?: string[] | null
          mandatory_for_service_lines?: string[] | null
          max_retakes?: number | null
          pass_mark?: number | null
          renewal_period_days?: number | null
          sort_order?: number | null
          target_audience?: string
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          category?: string
          content_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          document_urls?: string[] | null
          estimated_duration_minutes?: number | null
          id?: string
          is_active?: boolean
          is_mandatory?: boolean
          mandatory_for_roles?: string[] | null
          mandatory_for_service_lines?: string[] | null
          max_retakes?: number | null
          pass_mark?: number | null
          renewal_period_days?: number | null
          sort_order?: number | null
          target_audience?: string
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      training_policy_signoffs: {
        Row: {
          course_id: string
          id: string
          ip_address: string | null
          signed_at: string
          user_id: string
        }
        Insert: {
          course_id: string
          id?: string
          ip_address?: string | null
          signed_at?: string
          user_id: string
        }
        Update: {
          course_id?: string
          id?: string
          ip_address?: string | null
          signed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_policy_signoffs_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "training_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      training_quiz_attempts: {
        Row: {
          answers: Json
          assignment_id: string
          attempted_at: string
          id: string
          passed: boolean
          score: number
          user_id: string
        }
        Insert: {
          answers?: Json
          assignment_id: string
          attempted_at?: string
          id?: string
          passed?: boolean
          score?: number
          user_id: string
        }
        Update: {
          answers?: Json
          assignment_id?: string
          attempted_at?: string
          id?: string
          passed?: boolean
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_quiz_attempts_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "training_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      training_quiz_questions: {
        Row: {
          correct_answer: string
          course_id: string
          created_at: string
          id: string
          options: Json
          question_text: string
          question_type: string
          sort_order: number | null
        }
        Insert: {
          correct_answer: string
          course_id: string
          created_at?: string
          id?: string
          options?: Json
          question_text: string
          question_type?: string
          sort_order?: number | null
        }
        Update: {
          correct_answer?: string
          course_id?: string
          created_at?: string
          id?: string
          options?: Json
          question_text?: string
          question_type?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "training_quiz_questions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "training_courses"
            referencedColumns: ["id"]
          },
        ]
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
      vendors: {
        Row: {
          address: string | null
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      video_calls: {
        Row: {
          conversation_id: string | null
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          id: string
          recording_url: string | null
          room_name: string
          room_sid: string | null
          started_at: string
          started_by: string
          status: string
          updated_at: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          recording_url?: string | null
          room_name: string
          room_sid?: string | null
          started_at?: string
          started_by: string
          status?: string
          updated_at?: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          recording_url?: string | null
          room_name?: string
          room_sid?: string | null
          started_at?: string
          started_by?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_calls_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      visit_photos: {
        Row: {
          caption: string | null
          created_at: string
          customer_id: string | null
          file_name: string
          file_url: string
          id: string
          photo_tag: Database["public"]["Enums"]["photo_tag"]
          property_id: string | null
          uploaded_by: string | null
          visit_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          customer_id?: string | null
          file_name: string
          file_url: string
          id?: string
          photo_tag?: Database["public"]["Enums"]["photo_tag"]
          property_id?: string | null
          uploaded_by?: string | null
          visit_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          customer_id?: string | null
          file_name?: string
          file_url?: string
          id?: string
          photo_tag?: Database["public"]["Enums"]["photo_tag"]
          property_id?: string | null
          uploaded_by?: string | null
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visit_photos_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_photos_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_photos_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      visits: {
        Row: {
          access_notes: string | null
          arrival_time: string | null
          assigned_worker_id: string | null
          billing_status: string | null
          completion_time: string | null
          created_at: string
          crew_notes: string | null
          customer_id: string | null
          customer_visible_notes: string | null
          estimated_duration_minutes: number | null
          id: string
          is_recurring: boolean | null
          job_id: string | null
          priority: string | null
          property_id: string | null
          quote_id: string | null
          recurrence_end_date: string | null
          recurrence_frequency: string | null
          recurrence_parent_id: string | null
          request_id: string | null
          requires_completion_notes: boolean | null
          requires_photo_proof: boolean | null
          safety_notes: string | null
          scheduled_end_time: string | null
          scheduled_start_time: string | null
          service_category: string | null
          service_date: string
          service_summary: string | null
          site_instructions: string | null
          snow_depth: string | null
          updated_at: string
          visit_number: string
          visit_status: Database["public"]["Enums"]["visit_status"]
          visit_type: Database["public"]["Enums"]["visit_type"]
          weather_notes: string | null
        }
        Insert: {
          access_notes?: string | null
          arrival_time?: string | null
          assigned_worker_id?: string | null
          billing_status?: string | null
          completion_time?: string | null
          created_at?: string
          crew_notes?: string | null
          customer_id?: string | null
          customer_visible_notes?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          is_recurring?: boolean | null
          job_id?: string | null
          priority?: string | null
          property_id?: string | null
          quote_id?: string | null
          recurrence_end_date?: string | null
          recurrence_frequency?: string | null
          recurrence_parent_id?: string | null
          request_id?: string | null
          requires_completion_notes?: boolean | null
          requires_photo_proof?: boolean | null
          safety_notes?: string | null
          scheduled_end_time?: string | null
          scheduled_start_time?: string | null
          service_category?: string | null
          service_date?: string
          service_summary?: string | null
          site_instructions?: string | null
          snow_depth?: string | null
          updated_at?: string
          visit_number: string
          visit_status?: Database["public"]["Enums"]["visit_status"]
          visit_type?: Database["public"]["Enums"]["visit_type"]
          weather_notes?: string | null
        }
        Update: {
          access_notes?: string | null
          arrival_time?: string | null
          assigned_worker_id?: string | null
          billing_status?: string | null
          completion_time?: string | null
          created_at?: string
          crew_notes?: string | null
          customer_id?: string | null
          customer_visible_notes?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          is_recurring?: boolean | null
          job_id?: string | null
          priority?: string | null
          property_id?: string | null
          quote_id?: string | null
          recurrence_end_date?: string | null
          recurrence_frequency?: string | null
          recurrence_parent_id?: string | null
          request_id?: string | null
          requires_completion_notes?: boolean | null
          requires_photo_proof?: boolean | null
          safety_notes?: string | null
          scheduled_end_time?: string | null
          scheduled_start_time?: string | null
          service_category?: string | null
          service_date?: string
          service_summary?: string | null
          site_instructions?: string | null
          snow_depth?: string | null
          updated_at?: string
          visit_number?: string
          visit_status?: Database["public"]["Enums"]["visit_status"]
          visit_type?: Database["public"]["Enums"]["visit_type"]
          weather_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visits_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_recurrence_parent_id_fkey"
            columns: ["recurrence_parent_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      work_settings: {
        Row: {
          after_hours_work_allowed: boolean | null
          break_duration_minutes: number | null
          created_at: string
          damage_reporting_required: boolean | null
          default_estimated_duration: number | null
          default_labor_unit: string | null
          dispatch_notes_default: string | null
          id: string
          internal_approval_required: boolean | null
          max_workers_per_job: number | null
          notes_required: boolean | null
          oncall_enabled: boolean | null
          overtime_threshold_hours: number | null
          photo_after_required: boolean | null
          photo_before_required: boolean | null
          signature_required: boolean | null
          subcontractor_assignment_allowed: boolean | null
          team_lead_required: boolean | null
          updated_at: string
          weather_sensitive_toggle: boolean | null
          weekend_work_allowed: boolean | null
          worker_checkin_required: boolean | null
          worker_checkout_required: boolean | null
          worker_instruction_visibility: string | null
        }
        Insert: {
          after_hours_work_allowed?: boolean | null
          break_duration_minutes?: number | null
          created_at?: string
          damage_reporting_required?: boolean | null
          default_estimated_duration?: number | null
          default_labor_unit?: string | null
          dispatch_notes_default?: string | null
          id?: string
          internal_approval_required?: boolean | null
          max_workers_per_job?: number | null
          notes_required?: boolean | null
          oncall_enabled?: boolean | null
          overtime_threshold_hours?: number | null
          photo_after_required?: boolean | null
          photo_before_required?: boolean | null
          signature_required?: boolean | null
          subcontractor_assignment_allowed?: boolean | null
          team_lead_required?: boolean | null
          updated_at?: string
          weather_sensitive_toggle?: boolean | null
          weekend_work_allowed?: boolean | null
          worker_checkin_required?: boolean | null
          worker_checkout_required?: boolean | null
          worker_instruction_visibility?: string | null
        }
        Update: {
          after_hours_work_allowed?: boolean | null
          break_duration_minutes?: number | null
          created_at?: string
          damage_reporting_required?: boolean | null
          default_estimated_duration?: number | null
          default_labor_unit?: string | null
          dispatch_notes_default?: string | null
          id?: string
          internal_approval_required?: boolean | null
          max_workers_per_job?: number | null
          notes_required?: boolean | null
          oncall_enabled?: boolean | null
          overtime_threshold_hours?: number | null
          photo_after_required?: boolean | null
          photo_before_required?: boolean | null
          signature_required?: boolean | null
          subcontractor_assignment_allowed?: boolean | null
          team_lead_required?: boolean | null
          updated_at?: string
          weather_sensitive_toggle?: boolean | null
          weekend_work_allowed?: boolean | null
          worker_checkin_required?: boolean | null
          worker_checkout_required?: boolean | null
          worker_instruction_visibility?: string | null
        }
        Relationships: []
      }
      worker_certifications: {
        Row: {
          cert_name: string
          created_at: string
          expiry_date: string | null
          file_url: string | null
          id: string
          issue_date: string | null
          issuer: string | null
          notes: string | null
          status: string
          user_id: string
        }
        Insert: {
          cert_name: string
          created_at?: string
          expiry_date?: string | null
          file_url?: string | null
          id?: string
          issue_date?: string | null
          issuer?: string | null
          notes?: string | null
          status?: string
          user_id: string
        }
        Update: {
          cert_name?: string
          created_at?: string
          expiry_date?: string | null
          file_url?: string | null
          id?: string
          issue_date?: string | null
          issuer?: string | null
          notes?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      worker_documents: {
        Row: {
          created_at: string
          document_name: string
          document_type: string
          file_name: string
          file_url: string
          id: string
          notes: string | null
          uploaded_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          document_name: string
          document_type?: string
          file_name: string
          file_url: string
          id?: string
          notes?: string | null
          uploaded_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          document_name?: string
          document_type?: string
          file_name?: string
          file_url?: string
          id?: string
          notes?: string | null
          uploaded_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      worker_equipment_items: {
        Row: {
          condition: string
          created_at: string
          id: string
          issued_date: string | null
          item_name: string
          item_type: string
          notes: string | null
          replacement_requested: boolean
          return_date: string | null
          serial_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          condition?: string
          created_at?: string
          id?: string
          issued_date?: string | null
          item_name: string
          item_type?: string
          notes?: string | null
          replacement_requested?: boolean
          return_date?: string | null
          serial_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          condition?: string
          created_at?: string
          id?: string
          issued_date?: string | null
          item_name?: string
          item_type?: string
          notes?: string | null
          replacement_requested?: boolean
          return_date?: string | null
          serial_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      worker_expense_claims: {
        Row: {
          admin_notes: string | null
          amount: number
          category: string
          created_at: string
          description: string | null
          expense_date: string
          id: string
          receipt_file_name: string | null
          receipt_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount?: number
          category?: string
          created_at?: string
          description?: string | null
          expense_date?: string
          id?: string
          receipt_file_name?: string | null
          receipt_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          category?: string
          created_at?: string
          description?: string | null
          expense_date?: string
          id?: string
          receipt_file_name?: string | null
          receipt_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      worker_profiles: {
        Row: {
          address_city: string | null
          address_line_1: string | null
          address_postal_code: string | null
          address_province: string | null
          allergies: string | null
          bank_account_number: string | null
          bank_institution_number: string | null
          bank_name: string | null
          bank_transit_number: string | null
          benefits_effective_date: string | null
          benefits_plan_summary: string | null
          benefits_provider: string | null
          benefits_status: string | null
          blocked_at: string | null
          blocked_reason: string | null
          blood_pressure_alert: boolean | null
          branch_location: string | null
          carries_epipen: boolean | null
          carries_inhaler: boolean | null
          created_at: string
          date_of_birth: string | null
          diabetes_alert: boolean | null
          driver_license_class: string | null
          driver_license_expiry: string | null
          driver_license_number: string | null
          e_transfer_email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          emergency_medical_notes: string | null
          employee_id: string | null
          employment_status: string
          employment_type: string | null
          equipment_permissions: string[] | null
          ethnicity: string | null
          full_name: string | null
          gender: string | null
          hire_date: string | null
          hourly_rate: number | null
          id: string
          is_blocked: boolean | null
          license_verified: boolean | null
          manager_name: string | null
          medical_info_consent: boolean | null
          medical_info_last_updated_at: string | null
          pay_schedule: string | null
          pay_type: string | null
          personal_days_balance: number | null
          phone: string | null
          preferred_payment_method: string | null
          primary_service_category: string | null
          profile_photo_url: string | null
          referral_source: string | null
          religion: string | null
          role_title: string | null
          secondary_service_category: string | null
          seizure_or_fainting_alert: boolean | null
          sick_balance: number | null
          sin_encrypted: string | null
          supervisor_name: string | null
          team: string | null
          updated_at: string
          user_id: string
          vacation_balance: number | null
          work_email: string | null
        }
        Insert: {
          address_city?: string | null
          address_line_1?: string | null
          address_postal_code?: string | null
          address_province?: string | null
          allergies?: string | null
          bank_account_number?: string | null
          bank_institution_number?: string | null
          bank_name?: string | null
          bank_transit_number?: string | null
          benefits_effective_date?: string | null
          benefits_plan_summary?: string | null
          benefits_provider?: string | null
          benefits_status?: string | null
          blocked_at?: string | null
          blocked_reason?: string | null
          blood_pressure_alert?: boolean | null
          branch_location?: string | null
          carries_epipen?: boolean | null
          carries_inhaler?: boolean | null
          created_at?: string
          date_of_birth?: string | null
          diabetes_alert?: boolean | null
          driver_license_class?: string | null
          driver_license_expiry?: string | null
          driver_license_number?: string | null
          e_transfer_email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          emergency_medical_notes?: string | null
          employee_id?: string | null
          employment_status?: string
          employment_type?: string | null
          equipment_permissions?: string[] | null
          ethnicity?: string | null
          full_name?: string | null
          gender?: string | null
          hire_date?: string | null
          hourly_rate?: number | null
          id?: string
          is_blocked?: boolean | null
          license_verified?: boolean | null
          manager_name?: string | null
          medical_info_consent?: boolean | null
          medical_info_last_updated_at?: string | null
          pay_schedule?: string | null
          pay_type?: string | null
          personal_days_balance?: number | null
          phone?: string | null
          preferred_payment_method?: string | null
          primary_service_category?: string | null
          profile_photo_url?: string | null
          referral_source?: string | null
          religion?: string | null
          role_title?: string | null
          secondary_service_category?: string | null
          seizure_or_fainting_alert?: boolean | null
          sick_balance?: number | null
          sin_encrypted?: string | null
          supervisor_name?: string | null
          team?: string | null
          updated_at?: string
          user_id: string
          vacation_balance?: number | null
          work_email?: string | null
        }
        Update: {
          address_city?: string | null
          address_line_1?: string | null
          address_postal_code?: string | null
          address_province?: string | null
          allergies?: string | null
          bank_account_number?: string | null
          bank_institution_number?: string | null
          bank_name?: string | null
          bank_transit_number?: string | null
          benefits_effective_date?: string | null
          benefits_plan_summary?: string | null
          benefits_provider?: string | null
          benefits_status?: string | null
          blocked_at?: string | null
          blocked_reason?: string | null
          blood_pressure_alert?: boolean | null
          branch_location?: string | null
          carries_epipen?: boolean | null
          carries_inhaler?: boolean | null
          created_at?: string
          date_of_birth?: string | null
          diabetes_alert?: boolean | null
          driver_license_class?: string | null
          driver_license_expiry?: string | null
          driver_license_number?: string | null
          e_transfer_email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          emergency_medical_notes?: string | null
          employee_id?: string | null
          employment_status?: string
          employment_type?: string | null
          equipment_permissions?: string[] | null
          ethnicity?: string | null
          full_name?: string | null
          gender?: string | null
          hire_date?: string | null
          hourly_rate?: number | null
          id?: string
          is_blocked?: boolean | null
          license_verified?: boolean | null
          manager_name?: string | null
          medical_info_consent?: boolean | null
          medical_info_last_updated_at?: string | null
          pay_schedule?: string | null
          pay_type?: string | null
          personal_days_balance?: number | null
          phone?: string | null
          preferred_payment_method?: string | null
          primary_service_category?: string | null
          profile_photo_url?: string | null
          referral_source?: string | null
          religion?: string | null
          role_title?: string | null
          secondary_service_category?: string | null
          seizure_or_fainting_alert?: boolean | null
          sick_balance?: number | null
          sin_encrypted?: string | null
          supervisor_name?: string | null
          team?: string | null
          updated_at?: string
          user_id?: string
          vacation_balance?: number | null
          work_email?: string | null
        }
        Relationships: []
      }
      worker_tax_documents: {
        Row: {
          created_at: string
          document_name: string
          document_type: string
          file_name: string | null
          file_url: string | null
          id: string
          notes: string | null
          tax_year: number
          uploaded_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          document_name: string
          document_type?: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          notes?: string | null
          tax_year: number
          uploaded_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          document_name?: string
          document_type?: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          notes?: string | null
          tax_year?: number
          uploaded_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      worker_training_records: {
        Row: {
          acknowledged_at: string | null
          completed_date: string | null
          created_at: string
          expiry_date: string | null
          file_url: string | null
          id: string
          notes: string | null
          status: string
          training_name: string
          training_type: string
          user_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          completed_date?: string | null
          created_at?: string
          expiry_date?: string | null
          file_url?: string | null
          id?: string
          notes?: string | null
          status?: string
          training_name: string
          training_type?: string
          user_id: string
        }
        Update: {
          acknowledged_at?: string | null
          completed_date?: string | null
          created_at?: string
          expiry_date?: string | null
          file_url?: string | null
          id?: string
          notes?: string | null
          status?: string
          training_name?: string
          training_type?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_conversation_unread_counts: {
        Args: { _user_id: string }
        Returns: {
          conversation_id: string
          unread_count: number
        }[]
      }
      get_customer_id_for_user: { Args: { _user_id: string }; Returns: string }
      get_subcontractor_id_for_user: {
        Args: { _user_id: string }
        Returns: string
      }
      get_unread_message_count: { Args: { _user_id: string }; Returns: number }
      has_permission: {
        Args: { _permission: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_owner: { Args: { _user_id: string }; Returns: boolean }
      is_ops_staff: { Args: { _user_id: string }; Returns: boolean }
      is_staff_or_admin: { Args: { _user_id: string }; Returns: boolean }
      is_sub_assigned_to_job: {
        Args: { _job_id: string; _user_id: string }
        Returns: boolean
      }
      is_sub_assigned_to_visit: {
        Args: { _user_id: string; _visit_id: string }
        Returns: boolean
      }
      is_worker_assigned_to_job: {
        Args: { _job_id: string; _user_id: string }
        Returns: boolean
      }
      is_worker_assigned_to_visit: {
        Args: { _user_id: string; _visit_id: string }
        Returns: boolean
      }
      is_worker_role: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "admin"
        | "staff"
        | "customer"
        | "subcontractor"
        | "lead_worker"
        | "supervisor"
        | "dispatcher"
        | "manager"
        | "owner"
        | "accountant"
        | "hr_admin"
        | "ops_manager"
      billing_frequency:
        | "per-visit"
        | "weekly"
        | "biweekly"
        | "monthly"
        | "quarterly"
        | "annually"
      invoice_status:
        | "Draft"
        | "Sent"
        | "Viewed"
        | "Paid"
        | "Partially Paid"
        | "Overdue"
        | "Failed"
        | "Voided"
      job_priority: "Low" | "Normal" | "High" | "Urgent"
      job_status:
        | "Draft"
        | "Scheduled"
        | "In Progress"
        | "Completed"
        | "Cancelled"
        | "On Hold"
        | "Closed"
      lead_status:
        | "New"
        | "Reviewing"
        | "Awaiting info"
        | "Quote drafting"
        | "Quote ready"
        | "Quote sent"
        | "Won"
        | "Lost"
        | "Archived"
      notification_audience: "customer" | "worker" | "admin"
      notification_channel: "email" | "sms" | "in_app"
      notification_event:
        | "quote_sent"
        | "visit_scheduled"
        | "worker_assigned"
        | "worker_en_route"
        | "visit_completed"
        | "invoice_sent"
        | "invoice_overdue"
        | "payment_received"
        | "payment_failed"
        | "agreement_sent"
        | "new_service_request"
        | "emergency_sos"
        | "incident_report"
      payment_method_type: "manual" | "card-on-file" | "auto-pay"
      photo_tag: "Before" | "After" | "Progress" | "Issue"
      property_status: "Active" | "Inactive" | "Seasonal" | "Pending"
      property_type:
        | "Residential"
        | "Commercial"
        | "Industrial"
        | "Municipal"
        | "Strata"
        | "Other"
      quote_approval_status:
        | "Draft"
        | "Needs review"
        | "Approved"
        | "Sent"
        | "Declined"
      service_category:
        | "Snow & Ice"
        | "Landscaping & Grounds"
        | "Junk Removal"
        | "Property Care & Maintenance"
        | "Power Washing"
        | "Other"
        | "Property Management"
        | "Cleaning Services"
      service_frequency:
        | "one-time"
        | "weekly"
        | "biweekly"
        | "monthly"
        | "on-snowfall"
        | "custom-seasonal"
      visit_status:
        | "Planned"
        | "Scheduled"
        | "En Route"
        | "In Progress"
        | "Completed"
        | "Skipped"
        | "Rescheduled"
        | "Missed"
        | "Cancelled"
      visit_type:
        | "Routine"
        | "One-time"
        | "Emergency"
        | "Inspection"
        | "Follow-up"
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
      app_role: [
        "admin",
        "staff",
        "customer",
        "subcontractor",
        "lead_worker",
        "supervisor",
        "dispatcher",
        "manager",
        "owner",
        "accountant",
        "hr_admin",
        "ops_manager",
      ],
      billing_frequency: [
        "per-visit",
        "weekly",
        "biweekly",
        "monthly",
        "quarterly",
        "annually",
      ],
      invoice_status: [
        "Draft",
        "Sent",
        "Viewed",
        "Paid",
        "Partially Paid",
        "Overdue",
        "Failed",
        "Voided",
      ],
      job_priority: ["Low", "Normal", "High", "Urgent"],
      job_status: [
        "Draft",
        "Scheduled",
        "In Progress",
        "Completed",
        "Cancelled",
        "On Hold",
        "Closed",
      ],
      lead_status: [
        "New",
        "Reviewing",
        "Awaiting info",
        "Quote drafting",
        "Quote ready",
        "Quote sent",
        "Won",
        "Lost",
        "Archived",
      ],
      notification_audience: ["customer", "worker", "admin"],
      notification_channel: ["email", "sms", "in_app"],
      notification_event: [
        "quote_sent",
        "visit_scheduled",
        "worker_assigned",
        "worker_en_route",
        "visit_completed",
        "invoice_sent",
        "invoice_overdue",
        "payment_received",
        "payment_failed",
        "agreement_sent",
        "new_service_request",
        "emergency_sos",
        "incident_report",
      ],
      payment_method_type: ["manual", "card-on-file", "auto-pay"],
      photo_tag: ["Before", "After", "Progress", "Issue"],
      property_status: ["Active", "Inactive", "Seasonal", "Pending"],
      property_type: [
        "Residential",
        "Commercial",
        "Industrial",
        "Municipal",
        "Strata",
        "Other",
      ],
      quote_approval_status: [
        "Draft",
        "Needs review",
        "Approved",
        "Sent",
        "Declined",
      ],
      service_category: [
        "Snow & Ice",
        "Landscaping & Grounds",
        "Junk Removal",
        "Property Care & Maintenance",
        "Power Washing",
        "Other",
        "Property Management",
        "Cleaning Services",
      ],
      service_frequency: [
        "one-time",
        "weekly",
        "biweekly",
        "monthly",
        "on-snowfall",
        "custom-seasonal",
      ],
      visit_status: [
        "Planned",
        "Scheduled",
        "En Route",
        "In Progress",
        "Completed",
        "Skipped",
        "Rescheduled",
        "Missed",
        "Cancelled",
      ],
      visit_type: [
        "Routine",
        "One-time",
        "Emergency",
        "Inspection",
        "Follow-up",
      ],
    },
  },
} as const
