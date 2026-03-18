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
      incident_reports: {
        Row: {
          admin_notes: string | null
          corrective_action_notes: string | null
          created_at: string
          date_time: string
          description: string | null
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
      invoice_line_items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          invoice_id: string
          item_name: string
          line_total: number
          quantity: number
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
      invoices: {
        Row: {
          amount_paid: number
          balance_due: number
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
          sent_at: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          subtotal: number
          tax: number
          tax_rate: number
          total: number
          updated_at: string
          viewed_at: string | null
        }
        Insert: {
          amount_paid?: number
          balance_due?: number
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
          sent_at?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          tax?: number
          tax_rate?: number
          total?: number
          updated_at?: string
          viewed_at?: string | null
        }
        Update: {
          amount_paid?: number
          balance_due?: number
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
          sent_at?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          tax?: number
          tax_rate?: number
          total?: number
          updated_at?: string
          viewed_at?: string | null
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
        ]
      }
      jobs: {
        Row: {
          additional_visit_rate: number | null
          assigned_to: string | null
          contract_end_date: string | null
          contract_start_date: string | null
          created_at: string
          customer_id: string
          id: string
          internal_notes: string | null
          job_number: string
          job_title: string
          minimum_included_visits: number | null
          priority: Database["public"]["Enums"]["job_priority"]
          property_id: string | null
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
          contract_end_date?: string | null
          contract_start_date?: string | null
          created_at?: string
          customer_id: string
          id?: string
          internal_notes?: string | null
          job_number: string
          job_title: string
          minimum_included_visits?: number | null
          priority?: Database["public"]["Enums"]["job_priority"]
          property_id?: string | null
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
          contract_end_date?: string | null
          contract_start_date?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          internal_notes?: string | null
          job_number?: string
          job_title?: string
          minimum_included_visits?: number | null
          priority?: Database["public"]["Enums"]["job_priority"]
          property_id?: string | null
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
          address_line_1: string | null
          city: string | null
          created_at: string
          customer_id: string
          gate_code: string | null
          id: string
          postal_code: string | null
          property_name: string
          property_type: Database["public"]["Enums"]["property_type"]
          province: string | null
          seasonal_notes: string | null
          status: Database["public"]["Enums"]["property_status"]
          updated_at: string
        }
        Insert: {
          access_notes?: string | null
          address_line_1?: string | null
          city?: string | null
          created_at?: string
          customer_id: string
          gate_code?: string | null
          id?: string
          postal_code?: string | null
          property_name: string
          property_type?: Database["public"]["Enums"]["property_type"]
          province?: string | null
          seasonal_notes?: string | null
          status?: Database["public"]["Enums"]["property_status"]
          updated_at?: string
        }
        Update: {
          access_notes?: string | null
          address_line_1?: string | null
          city?: string | null
          created_at?: string
          customer_id?: string
          gate_code?: string | null
          id?: string
          postal_code?: string | null
          property_name?: string
          property_type?: Database["public"]["Enums"]["property_type"]
          province?: string | null
          seasonal_notes?: string | null
          status?: Database["public"]["Enums"]["property_status"]
          updated_at?: string
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
          created_at: string
          created_by: string | null
          customer_id: string | null
          email_delivery_status: string | null
          email_ready: boolean
          email_sent_at: string | null
          follow_up_due_at: string | null
          follow_up_email_due_at: string | null
          id: string
          internal_notes: string | null
          lead_id: string
          quote_number: string
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
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          email_delivery_status?: string | null
          email_ready?: boolean
          email_sent_at?: string | null
          follow_up_due_at?: string | null
          follow_up_email_due_at?: string | null
          id?: string
          internal_notes?: string | null
          lead_id: string
          quote_number: string
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
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          email_delivery_status?: string | null
          email_ready?: boolean
          email_sent_at?: string | null
          follow_up_due_at?: string | null
          follow_up_email_due_at?: string | null
          id?: string
          internal_notes?: string | null
          lead_id?: string
          quote_number?: string
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
        ]
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
          business_license_expiry: string | null
          business_license_status: string
          business_number: string | null
          company_name: string
          contact_name: string
          created_at: string
          email: string | null
          id: string
          insurance_expiry: string | null
          insurance_status: string
          mailing_address: string | null
          notes_admin_only: string | null
          onboarding_status: string
          operating_name: string | null
          phone: string | null
          safety_doc_status: string
          service_area_summary: string | null
          status: string
          updated_at: string
          user_id: string
          wcb_expiry: string | null
          wcb_status: string
        }
        Insert: {
          active_flag?: boolean
          agreement_signed_status?: string
          business_license_expiry?: string | null
          business_license_status?: string
          business_number?: string | null
          company_name: string
          contact_name: string
          created_at?: string
          email?: string | null
          id?: string
          insurance_expiry?: string | null
          insurance_status?: string
          mailing_address?: string | null
          notes_admin_only?: string | null
          onboarding_status?: string
          operating_name?: string | null
          phone?: string | null
          safety_doc_status?: string
          service_area_summary?: string | null
          status?: string
          updated_at?: string
          user_id: string
          wcb_expiry?: string | null
          wcb_status?: string
        }
        Update: {
          active_flag?: boolean
          agreement_signed_status?: string
          business_license_expiry?: string | null
          business_license_status?: string
          business_number?: string | null
          company_name?: string
          contact_name?: string
          created_at?: string
          email?: string | null
          id?: string
          insurance_expiry?: string | null
          insurance_status?: string
          mailing_address?: string | null
          notes_admin_only?: string | null
          onboarding_status?: string
          operating_name?: string | null
          phone?: string | null
          safety_doc_status?: string
          service_area_summary?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          wcb_expiry?: string | null
          wcb_status?: string
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
          arrival_time: string | null
          completion_time: string | null
          created_at: string
          crew_notes: string | null
          customer_id: string | null
          customer_visible_notes: string | null
          id: string
          job_id: string
          property_id: string | null
          service_date: string
          service_summary: string | null
          snow_depth: string | null
          updated_at: string
          visit_number: string
          visit_status: Database["public"]["Enums"]["visit_status"]
          visit_type: Database["public"]["Enums"]["visit_type"]
          weather_notes: string | null
        }
        Insert: {
          arrival_time?: string | null
          completion_time?: string | null
          created_at?: string
          crew_notes?: string | null
          customer_id?: string | null
          customer_visible_notes?: string | null
          id?: string
          job_id: string
          property_id?: string | null
          service_date?: string
          service_summary?: string | null
          snow_depth?: string | null
          updated_at?: string
          visit_number: string
          visit_status?: Database["public"]["Enums"]["visit_status"]
          visit_type?: Database["public"]["Enums"]["visit_type"]
          weather_notes?: string | null
        }
        Update: {
          arrival_time?: string | null
          completion_time?: string | null
          created_at?: string
          crew_notes?: string | null
          customer_id?: string | null
          customer_visible_notes?: string | null
          id?: string
          job_id?: string
          property_id?: string | null
          service_date?: string
          service_summary?: string | null
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
        ]
      }
      worker_certifications: {
        Row: {
          cert_name: string
          created_at: string
          expiry_date: string | null
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
      worker_profiles: {
        Row: {
          benefits_effective_date: string | null
          benefits_plan_summary: string | null
          benefits_provider: string | null
          benefits_status: string | null
          branch_location: string | null
          created_at: string
          driver_license_class: string | null
          driver_license_expiry: string | null
          employee_id: string | null
          employment_status: string
          employment_type: string | null
          equipment_permissions: string[] | null
          full_name: string | null
          hire_date: string | null
          hourly_rate: number | null
          id: string
          license_verified: boolean | null
          manager_name: string | null
          pay_type: string | null
          personal_days_balance: number | null
          phone: string | null
          primary_service_category: string | null
          profile_photo_url: string | null
          role_title: string | null
          secondary_service_category: string | null
          sick_balance: number | null
          supervisor_name: string | null
          team: string | null
          updated_at: string
          user_id: string
          vacation_balance: number | null
          work_email: string | null
        }
        Insert: {
          benefits_effective_date?: string | null
          benefits_plan_summary?: string | null
          benefits_provider?: string | null
          benefits_status?: string | null
          branch_location?: string | null
          created_at?: string
          driver_license_class?: string | null
          driver_license_expiry?: string | null
          employee_id?: string | null
          employment_status?: string
          employment_type?: string | null
          equipment_permissions?: string[] | null
          full_name?: string | null
          hire_date?: string | null
          hourly_rate?: number | null
          id?: string
          license_verified?: boolean | null
          manager_name?: string | null
          pay_type?: string | null
          personal_days_balance?: number | null
          phone?: string | null
          primary_service_category?: string | null
          profile_photo_url?: string | null
          role_title?: string | null
          secondary_service_category?: string | null
          sick_balance?: number | null
          supervisor_name?: string | null
          team?: string | null
          updated_at?: string
          user_id: string
          vacation_balance?: number | null
          work_email?: string | null
        }
        Update: {
          benefits_effective_date?: string | null
          benefits_plan_summary?: string | null
          benefits_provider?: string | null
          benefits_status?: string | null
          branch_location?: string | null
          created_at?: string
          driver_license_class?: string | null
          driver_license_expiry?: string | null
          employee_id?: string | null
          employment_status?: string
          employment_type?: string | null
          equipment_permissions?: string[] | null
          full_name?: string | null
          hire_date?: string | null
          hourly_rate?: number | null
          id?: string
          license_verified?: boolean | null
          manager_name?: string | null
          pay_type?: string | null
          personal_days_balance?: number | null
          phone?: string | null
          primary_service_category?: string | null
          profile_photo_url?: string | null
          role_title?: string | null
          secondary_service_category?: string | null
          sick_balance?: number | null
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
      get_customer_id_for_user: { Args: { _user_id: string }; Returns: string }
      get_subcontractor_id_for_user: {
        Args: { _user_id: string }
        Returns: string
      }
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
