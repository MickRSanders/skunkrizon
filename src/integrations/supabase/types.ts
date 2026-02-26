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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      calculation_fields: {
        Row: {
          calculation_id: string
          created_at: string
          default_value: string | null
          field_type: string
          id: string
          label: string
          name: string
          position: number
          updated_at: string
        }
        Insert: {
          calculation_id: string
          created_at?: string
          default_value?: string | null
          field_type?: string
          id?: string
          label: string
          name: string
          position?: number
          updated_at?: string
        }
        Update: {
          calculation_id?: string
          created_at?: string
          default_value?: string | null
          field_type?: string
          id?: string
          label?: string
          name?: string
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calculation_fields_calculation_id_fkey"
            columns: ["calculation_id"]
            isOneToOne: false
            referencedRelation: "calculations"
            referencedColumns: ["id"]
          },
        ]
      }
      calculations: {
        Row: {
          category: string | null
          created_at: string
          created_by: string
          description: string | null
          formula: string
          id: string
          name: string
          sub_tenant_id: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          formula: string
          id?: string
          name: string
          sub_tenant_id?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          formula?: string
          id?: string
          name?: string
          sub_tenant_id?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calculations_sub_tenant_id_fkey"
            columns: ["sub_tenant_id"]
            isOneToOne: false
            referencedRelation: "sub_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calculations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      field_data_sources: {
        Row: {
          connector_config: Json | null
          connector_name: string | null
          created_at: string
          field_id: string
          id: string
          lookup_key_column: string | null
          lookup_table_id: string | null
          lookup_value_column: string | null
          rate_file_name: string | null
          rate_file_path: string | null
          source_type: Database["public"]["Enums"]["data_source_type"]
          updated_at: string
        }
        Insert: {
          connector_config?: Json | null
          connector_name?: string | null
          created_at?: string
          field_id: string
          id?: string
          lookup_key_column?: string | null
          lookup_table_id?: string | null
          lookup_value_column?: string | null
          rate_file_name?: string | null
          rate_file_path?: string | null
          source_type?: Database["public"]["Enums"]["data_source_type"]
          updated_at?: string
        }
        Update: {
          connector_config?: Json | null
          connector_name?: string | null
          created_at?: string
          field_id?: string
          id?: string
          lookup_key_column?: string | null
          lookup_table_id?: string | null
          lookup_value_column?: string | null
          rate_file_name?: string | null
          rate_file_path?: string | null
          source_type?: Database["public"]["Enums"]["data_source_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "field_data_sources_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: true
            referencedRelation: "calculation_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_data_sources_lookup_table_id_fkey"
            columns: ["lookup_table_id"]
            isOneToOne: false
            referencedRelation: "lookup_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      lookup_table_rows: {
        Row: {
          created_at: string
          id: string
          lookup_table_id: string
          row_data: Json
          row_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          lookup_table_id: string
          row_data?: Json
          row_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          lookup_table_id?: string
          row_data?: Json
          row_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "lookup_table_rows_lookup_table_id_fkey"
            columns: ["lookup_table_id"]
            isOneToOne: false
            referencedRelation: "lookup_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      lookup_tables: {
        Row: {
          columns: Json
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          sub_tenant_id: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          columns?: Json
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          sub_tenant_id?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          columns?: Json
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          sub_tenant_id?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lookup_tables_sub_tenant_id_fkey"
            columns: ["sub_tenant_id"]
            isOneToOne: false
            referencedRelation: "sub_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lookup_tables_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      policies: {
        Row: {
          benefit_components: Json | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          status: string
          sub_tenant_id: string | null
          tax_approach: string | null
          tenant_id: string | null
          tier: string
          updated_at: string
        }
        Insert: {
          benefit_components?: Json | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          status?: string
          sub_tenant_id?: string | null
          tax_approach?: string | null
          tenant_id?: string | null
          tier?: string
          updated_at?: string
        }
        Update: {
          benefit_components?: Json | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          status?: string
          sub_tenant_id?: string | null
          tax_approach?: string | null
          tenant_id?: string | null
          tier?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "policies_sub_tenant_id_fkey"
            columns: ["sub_tenant_id"]
            isOneToOne: false
            referencedRelation: "sub_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company: string | null
          created_at: string
          department: string | null
          display_name: string | null
          id: string
          job_title: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          department?: string | null
          display_name?: string | null
          id: string
          job_title?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          department?: string | null
          display_name?: string | null
          id?: string
          job_title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      simulations: {
        Row: {
          assignment_type: string
          base_salary: number
          cola_percent: number | null
          cost_breakdown: Json | null
          created_at: string
          currency: string
          department: string | null
          destination_city: string | null
          destination_country: string
          duration_months: number
          employee_id: string | null
          employee_name: string
          exchange_rate_buffer: number | null
          grade: string | null
          housing_cap: number | null
          id: string
          include_relocation_lump_sum: boolean | null
          include_schooling: boolean | null
          include_spouse_support: boolean | null
          job_title: string | null
          notes: string | null
          origin_city: string | null
          origin_country: string
          owner_id: string
          policy_id: string | null
          relocation_lump_sum: number | null
          sim_code: string
          start_date: string | null
          status: Database["public"]["Enums"]["simulation_status"]
          sub_tenant_id: string | null
          tax_approach: string | null
          tenant_id: string | null
          total_cost: number | null
          updated_at: string
        }
        Insert: {
          assignment_type: string
          base_salary?: number
          cola_percent?: number | null
          cost_breakdown?: Json | null
          created_at?: string
          currency?: string
          department?: string | null
          destination_city?: string | null
          destination_country: string
          duration_months?: number
          employee_id?: string | null
          employee_name: string
          exchange_rate_buffer?: number | null
          grade?: string | null
          housing_cap?: number | null
          id?: string
          include_relocation_lump_sum?: boolean | null
          include_schooling?: boolean | null
          include_spouse_support?: boolean | null
          job_title?: string | null
          notes?: string | null
          origin_city?: string | null
          origin_country: string
          owner_id: string
          policy_id?: string | null
          relocation_lump_sum?: number | null
          sim_code?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["simulation_status"]
          sub_tenant_id?: string | null
          tax_approach?: string | null
          tenant_id?: string | null
          total_cost?: number | null
          updated_at?: string
        }
        Update: {
          assignment_type?: string
          base_salary?: number
          cola_percent?: number | null
          cost_breakdown?: Json | null
          created_at?: string
          currency?: string
          department?: string | null
          destination_city?: string | null
          destination_country?: string
          duration_months?: number
          employee_id?: string | null
          employee_name?: string
          exchange_rate_buffer?: number | null
          grade?: string | null
          housing_cap?: number | null
          id?: string
          include_relocation_lump_sum?: boolean | null
          include_schooling?: boolean | null
          include_spouse_support?: boolean | null
          job_title?: string | null
          notes?: string | null
          origin_city?: string | null
          origin_country?: string
          owner_id?: string
          policy_id?: string | null
          relocation_lump_sum?: number | null
          sim_code?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["simulation_status"]
          sub_tenant_id?: string | null
          tax_approach?: string | null
          tenant_id?: string | null
          total_cost?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "simulations_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "simulations_sub_tenant_id_fkey"
            columns: ["sub_tenant_id"]
            isOneToOne: false
            referencedRelation: "sub_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "simulations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sub_tenants: {
        Row: {
          contact_email: string | null
          contact_name: string | null
          created_at: string
          domain: string | null
          id: string
          is_active: boolean | null
          name: string
          slug: string
          sso_config: Json | null
          sso_enabled: boolean | null
          sso_provider: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          domain?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
          sso_config?: Json | null
          sso_enabled?: boolean | null
          sso_provider?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          domain?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          sso_config?: Json | null
          sso_enabled?: boolean | null
          sso_provider?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sub_tenants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_users: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["tenant_role"]
          sub_tenant_id: string | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["tenant_role"]
          sub_tenant_id?: string | null
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["tenant_role"]
          sub_tenant_id?: string | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_users_sub_tenant_id_fkey"
            columns: ["sub_tenant_id"]
            isOneToOne: false
            referencedRelation: "sub_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          contact_email: string | null
          contact_name: string | null
          created_at: string
          domain: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          slug: string
          sso_config: Json | null
          sso_enabled: boolean | null
          sso_provider: string | null
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          domain?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          slug: string
          sso_config?: Json | null
          sso_enabled?: boolean | null
          sso_provider?: string | null
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          domain?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          slug?: string
          sso_config?: Json | null
          sso_enabled?: boolean | null
          sso_provider?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
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
      is_sub_tenant_member: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      is_tenant_admin: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      is_tenant_member: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "analyst" | "viewer" | "superadmin"
      data_source_type:
        | "manual"
        | "api_connector"
        | "rate_file"
        | "lookup_table"
      simulation_status: "draft" | "running" | "completed" | "pending"
      tenant_role: "tenant_admin" | "tenant_user"
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
      app_role: ["admin", "analyst", "viewer", "superadmin"],
      data_source_type: [
        "manual",
        "api_connector",
        "rate_file",
        "lookup_table",
      ],
      simulation_status: ["draft", "running", "completed", "pending"],
      tenant_role: ["tenant_admin", "tenant_user"],
    },
  },
} as const
