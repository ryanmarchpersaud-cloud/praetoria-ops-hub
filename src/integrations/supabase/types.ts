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
      service_requests: {
        Row: {
          created_at: string
          customer_id: string
          description: string | null
          id: string
          internal_notes: string | null
          property_id: string | null
          service_type: string
          status: string
          subject: string
          updated_at: string
          urgency: string
          user_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          description?: string | null
          id?: string
          internal_notes?: string | null
          property_id?: string | null
          service_type?: string
          status?: string
          subject: string
          updated_at?: string
          urgency?: string
          user_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          description?: string | null
          id?: string
          internal_notes?: string | null
          property_id?: string | null
          service_type?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_customer_id_for_user: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "staff" | "customer"
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
      app_role: ["admin", "staff", "customer"],
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
