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
      balance_sheets: {
        Row: {
          created_at: string
          display_mode: string
          employee_name: string
          exchange_rate: number | null
          exchange_rate_date: string | null
          format_type: string
          generated_by: string
          home_currency: string
          host_currency: string
          id: string
          line_items: Json
          policy_explanations: Json
          simulation_id: string
          source_snapshot: Json
          tenant_id: string
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          display_mode?: string
          employee_name: string
          exchange_rate?: number | null
          exchange_rate_date?: string | null
          format_type?: string
          generated_by: string
          home_currency?: string
          host_currency?: string
          id?: string
          line_items?: Json
          policy_explanations?: Json
          simulation_id: string
          source_snapshot?: Json
          tenant_id: string
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          display_mode?: string
          employee_name?: string
          exchange_rate?: number | null
          exchange_rate_date?: string | null
          format_type?: string
          generated_by?: string
          home_currency?: string
          host_currency?: string
          id?: string
          line_items?: Json
          policy_explanations?: Json
          simulation_id?: string
          source_snapshot?: Json
          tenant_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "balance_sheets_simulation_id_fkey"
            columns: ["simulation_id"]
            isOneToOne: false
            referencedRelation: "simulations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "balance_sheets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
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
          proration_enabled: boolean
          proration_method: string
          step_down_enabled: boolean
          step_down_schedule: Json
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
          proration_enabled?: boolean
          proration_method?: string
          step_down_enabled?: boolean
          step_down_schedule?: Json
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
          proration_enabled?: boolean
          proration_method?: string
          step_down_enabled?: boolean
          step_down_schedule?: Json
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
      cost_estimate_compensation_items: {
        Row: {
          calculation_formula: string | null
          created_at: string
          default_value: number | null
          display_category: string
          display_label: string
          home_country: string | null
          host_country: string | null
          id: string
          is_taxable: boolean
          paycode: string
          sort_order: number
          version_id: string
        }
        Insert: {
          calculation_formula?: string | null
          created_at?: string
          default_value?: number | null
          display_category?: string
          display_label: string
          home_country?: string | null
          host_country?: string | null
          id?: string
          is_taxable?: boolean
          paycode: string
          sort_order?: number
          version_id: string
        }
        Update: {
          calculation_formula?: string | null
          created_at?: string
          default_value?: number | null
          display_category?: string
          display_label?: string
          home_country?: string | null
          host_country?: string | null
          id?: string
          is_taxable?: boolean
          paycode?: string
          sort_order?: number
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_estimate_compensation_items_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "cost_estimate_template_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_estimate_detail_fields: {
        Row: {
          created_at: string
          display_label: string
          field_key: string
          id: string
          sort_order: number
          template_id: string
        }
        Insert: {
          created_at?: string
          display_label: string
          field_key: string
          id?: string
          sort_order?: number
          template_id: string
        }
        Update: {
          created_at?: string
          display_label?: string
          field_key?: string
          id?: string
          sort_order?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_estimate_detail_fields_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "cost_estimate_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_estimate_policy_mappings: {
        Row: {
          created_at: string
          effective_from: string | null
          effective_to: string | null
          id: string
          mapping_type: string
          policy_id: string | null
          policy_type: string | null
          template_id: string
        }
        Insert: {
          created_at?: string
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          mapping_type?: string
          policy_id?: string | null
          policy_type?: string | null
          template_id: string
        }
        Update: {
          created_at?: string
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          mapping_type?: string
          policy_id?: string | null
          policy_type?: string | null
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_estimate_policy_mappings_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_estimate_policy_mappings_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "cost_estimate_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_estimate_tax_settings: {
        Row: {
          country: string | null
          country_type: string | null
          created_at: string
          id: string
          setting_value: string
          tax_setting_code: string
          version_id: string
        }
        Insert: {
          country?: string | null
          country_type?: string | null
          created_at?: string
          id?: string
          setting_value: string
          tax_setting_code: string
          version_id: string
        }
        Update: {
          country?: string | null
          country_type?: string | null
          created_at?: string
          id?: string
          setting_value?: string
          tax_setting_code?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_estimate_tax_settings_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "cost_estimate_template_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_estimate_template_versions: {
        Row: {
          created_at: string
          created_by: string
          display_currency: string
          effective_from: string | null
          effective_to: string | null
          hypo_social_tax_city: string | null
          hypo_social_tax_country: string | null
          hypo_tax_city: string | null
          hypo_tax_country: string | null
          hypo_tax_region: string | null
          id: string
          include_tax_calculation: boolean
          inflation_rate: number | null
          status: string
          tax_calculation_method: string | null
          template_id: string
          updated_at: string
          version_notes: string | null
          version_number: number
        }
        Insert: {
          created_at?: string
          created_by: string
          display_currency?: string
          effective_from?: string | null
          effective_to?: string | null
          hypo_social_tax_city?: string | null
          hypo_social_tax_country?: string | null
          hypo_tax_city?: string | null
          hypo_tax_country?: string | null
          hypo_tax_region?: string | null
          id?: string
          include_tax_calculation?: boolean
          inflation_rate?: number | null
          status?: string
          tax_calculation_method?: string | null
          template_id: string
          updated_at?: string
          version_notes?: string | null
          version_number?: number
        }
        Update: {
          created_at?: string
          created_by?: string
          display_currency?: string
          effective_from?: string | null
          effective_to?: string | null
          hypo_social_tax_city?: string | null
          hypo_social_tax_country?: string | null
          hypo_tax_city?: string | null
          hypo_tax_country?: string | null
          hypo_tax_region?: string | null
          id?: string
          include_tax_calculation?: boolean
          inflation_rate?: number | null
          status?: string
          tax_calculation_method?: string | null
          template_id?: string
          updated_at?: string
          version_notes?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "cost_estimate_template_versions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "cost_estimate_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_estimate_templates: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          notes: string | null
          status: string
          template_type: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
          notes?: string | null
          status?: string
          template_type?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          notes?: string | null
          status?: string
          template_type?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_estimate_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_estimates: {
        Row: {
          created_at: string
          details_snapshot: Json
          display_currency: string
          employee_id: string | null
          employee_name: string
          generated_by: string
          id: string
          line_items: Json
          simulation_id: string
          source_snapshot: Json
          status: string
          tax_snapshot: Json
          template_id: string
          template_version_id: string
          tenant_id: string
          total_cost: number | null
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          details_snapshot?: Json
          display_currency?: string
          employee_id?: string | null
          employee_name: string
          generated_by: string
          id?: string
          line_items?: Json
          simulation_id: string
          source_snapshot?: Json
          status?: string
          tax_snapshot?: Json
          template_id: string
          template_version_id: string
          tenant_id: string
          total_cost?: number | null
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          details_snapshot?: Json
          display_currency?: string
          employee_id?: string | null
          employee_name?: string
          generated_by?: string
          id?: string
          line_items?: Json
          simulation_id?: string
          source_snapshot?: Json
          status?: string
          tax_snapshot?: Json
          template_id?: string
          template_version_id?: string
          tenant_id?: string
          total_cost?: number | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "cost_estimates_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_estimates_simulation_id_fkey"
            columns: ["simulation_id"]
            isOneToOne: false
            referencedRelation: "simulations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_estimates_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "cost_estimate_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_estimates_template_version_id_fkey"
            columns: ["template_version_id"]
            isOneToOne: false
            referencedRelation: "cost_estimate_template_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_estimates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_dependents: {
        Row: {
          created_at: string
          date_of_birth: string | null
          employee_id: string
          first_name: string
          id: string
          last_name: string
          relationship: string
        }
        Insert: {
          created_at?: string
          date_of_birth?: string | null
          employee_id: string
          first_name: string
          id?: string
          last_name: string
          relationship: string
        }
        Update: {
          created_at?: string
          date_of_birth?: string | null
          employee_id?: string
          first_name?: string
          id?: string
          last_name?: string
          relationship?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_dependents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          base_salary: number
          bonus_amount: number | null
          bonus_percent: number | null
          city: string | null
          country: string | null
          created_at: string
          created_by: string
          currency: string
          date_of_birth: string | null
          division: string | null
          email: string
          employee_code: string
          first_name: string
          hire_date: string | null
          id: string
          job_grade: string | null
          job_title: string | null
          last_name: string
          phone: string | null
          postal_code: string | null
          state_province: string | null
          status: string
          sub_tenant_id: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          base_salary?: number
          bonus_amount?: number | null
          bonus_percent?: number | null
          city?: string | null
          country?: string | null
          created_at?: string
          created_by: string
          currency?: string
          date_of_birth?: string | null
          division?: string | null
          email: string
          employee_code?: string
          first_name: string
          hire_date?: string | null
          id?: string
          job_grade?: string | null
          job_title?: string | null
          last_name: string
          phone?: string | null
          postal_code?: string | null
          state_province?: string | null
          status?: string
          sub_tenant_id?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          base_salary?: number
          bonus_amount?: number | null
          bonus_percent?: number | null
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string
          currency?: string
          date_of_birth?: string | null
          division?: string | null
          email?: string
          employee_code?: string
          first_name?: string
          hire_date?: string | null
          id?: string
          job_grade?: string | null
          job_title?: string | null
          last_name?: string
          phone?: string | null
          postal_code?: string | null
          state_province?: string | null
          status?: string
          sub_tenant_id?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_sub_tenant_id_fkey"
            columns: ["sub_tenant_id"]
            isOneToOne: false
            referencedRelation: "sub_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_tenant_id_fkey"
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
      field_library: {
        Row: {
          created_at: string
          created_by: string
          db_column: string | null
          db_table: string | null
          description: string | null
          field_type: string
          id: string
          label: string
          lookup_key_column: string | null
          lookup_table_id: string | null
          lookup_value_column: string | null
          name: string
          source_type: string
          sub_tenant_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          db_column?: string | null
          db_table?: string | null
          description?: string | null
          field_type?: string
          id?: string
          label: string
          lookup_key_column?: string | null
          lookup_table_id?: string | null
          lookup_value_column?: string | null
          name: string
          source_type?: string
          sub_tenant_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          db_column?: string | null
          db_table?: string | null
          description?: string | null
          field_type?: string
          id?: string
          label?: string
          lookup_key_column?: string | null
          lookup_table_id?: string | null
          lookup_value_column?: string | null
          name?: string
          source_type?: string
          sub_tenant_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "field_library_lookup_table_id_fkey"
            columns: ["lookup_table_id"]
            isOneToOne: false
            referencedRelation: "lookup_tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_library_sub_tenant_id_fkey"
            columns: ["sub_tenant_id"]
            isOneToOne: false
            referencedRelation: "sub_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_library_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      field_mappings: {
        Row: {
          created_at: string
          created_by: string
          fallback_value: string | null
          id: string
          is_required: boolean
          source_field: string
          source_system: string
          target_field: string
          tenant_id: string
          transform_rule: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          fallback_value?: string | null
          id?: string
          is_required?: boolean
          source_field: string
          source_system?: string
          target_field: string
          tenant_id: string
          transform_rule?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          fallback_value?: string | null
          id?: string
          is_required?: boolean
          source_field?: string
          source_system?: string
          target_field?: string
          tenant_id?: string
          transform_rule?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "field_mappings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      loa_documents: {
        Row: {
          content: Json
          created_at: string
          employee_name: string
          generated_by: string
          id: string
          signature_status: string | null
          simulation_id: string
          source_snapshot: Json
          status: string
          template_id: string | null
          template_version: number | null
          tenant_id: string
          updated_at: string
          version: number
        }
        Insert: {
          content?: Json
          created_at?: string
          employee_name: string
          generated_by: string
          id?: string
          signature_status?: string | null
          simulation_id: string
          source_snapshot?: Json
          status?: string
          template_id?: string | null
          template_version?: number | null
          tenant_id: string
          updated_at?: string
          version?: number
        }
        Update: {
          content?: Json
          created_at?: string
          employee_name?: string
          generated_by?: string
          id?: string
          signature_status?: string | null
          simulation_id?: string
          source_snapshot?: Json
          status?: string
          template_id?: string | null
          template_version?: number | null
          tenant_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "loa_documents_simulation_id_fkey"
            columns: ["simulation_id"]
            isOneToOne: false
            referencedRelation: "simulations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loa_documents_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "loa_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loa_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      loa_templates: {
        Row: {
          conditional_rules: Json
          content: Json
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          placeholders: Json
          status: string
          tenant_id: string
          updated_at: string
          version: number
        }
        Insert: {
          conditional_rules?: Json
          content?: Json
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          placeholders?: Json
          status?: string
          tenant_id: string
          updated_at?: string
          version?: number
        }
        Update: {
          conditional_rules?: Json
          content?: Json
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          placeholders?: Json
          status?: string
          tenant_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "loa_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
      notifications: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message: string
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      pay_instructions: {
        Row: {
          cost_center: string | null
          created_at: string
          employee_name: string
          generated_by: string
          gl_code: string | null
          id: string
          line_items: Json
          payment_currency: string
          simulation_id: string
          source_snapshot: Json
          status: string
          tenant_id: string
          updated_at: string
          version: number
        }
        Insert: {
          cost_center?: string | null
          created_at?: string
          employee_name: string
          generated_by: string
          gl_code?: string | null
          id?: string
          line_items?: Json
          payment_currency?: string
          simulation_id: string
          source_snapshot?: Json
          status?: string
          tenant_id: string
          updated_at?: string
          version?: number
        }
        Update: {
          cost_center?: string | null
          created_at?: string
          employee_name?: string
          generated_by?: string
          gl_code?: string | null
          id?: string
          line_items?: Json
          payment_currency?: string
          simulation_id?: string
          source_snapshot?: Json
          status?: string
          tenant_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "pay_instructions_simulation_id_fkey"
            columns: ["simulation_id"]
            isOneToOne: false
            referencedRelation: "simulations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pay_instructions_tenant_id_fkey"
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
      pta_module_config: {
        Row: {
          activity_aliases: Json | null
          bookings_api_enabled: boolean
          confidence_threshold: number
          created_at: string
          hidden_fields: Json | null
          id: string
          immigration_enabled: boolean
          monaeo_enabled: boolean
          outcome_wording_overrides: Json | null
          pe_enabled: boolean
          pwd_enabled: boolean
          risk_mapping_rules: Json | null
          routing_rules: Json | null
          schengen_enabled: boolean
          shadow_mode_enabled: boolean
          social_security_enabled: boolean
          suppressed_activities: Json | null
          tenant_id: string
          tone: string
          updated_at: string
          withholding_enabled: boolean
        }
        Insert: {
          activity_aliases?: Json | null
          bookings_api_enabled?: boolean
          confidence_threshold?: number
          created_at?: string
          hidden_fields?: Json | null
          id?: string
          immigration_enabled?: boolean
          monaeo_enabled?: boolean
          outcome_wording_overrides?: Json | null
          pe_enabled?: boolean
          pwd_enabled?: boolean
          risk_mapping_rules?: Json | null
          routing_rules?: Json | null
          schengen_enabled?: boolean
          shadow_mode_enabled?: boolean
          social_security_enabled?: boolean
          suppressed_activities?: Json | null
          tenant_id: string
          tone?: string
          updated_at?: string
          withholding_enabled?: boolean
        }
        Update: {
          activity_aliases?: Json | null
          bookings_api_enabled?: boolean
          confidence_threshold?: number
          created_at?: string
          hidden_fields?: Json | null
          id?: string
          immigration_enabled?: boolean
          monaeo_enabled?: boolean
          outcome_wording_overrides?: Json | null
          pe_enabled?: boolean
          pwd_enabled?: boolean
          risk_mapping_rules?: Json | null
          routing_rules?: Json | null
          schengen_enabled?: boolean
          shadow_mode_enabled?: boolean
          social_security_enabled?: boolean
          suppressed_activities?: Json | null
          tenant_id?: string
          tone?: string
          updated_at?: string
          withholding_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "pta_module_config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      remote_work_approvals: {
        Row: {
          approval_type: string
          approver_id: string | null
          approver_name: string | null
          created_at: string
          decided_at: string | null
          decision_reason: string | null
          id: string
          request_id: string
          status: string
          step_order: number
        }
        Insert: {
          approval_type: string
          approver_id?: string | null
          approver_name?: string | null
          created_at?: string
          decided_at?: string | null
          decision_reason?: string | null
          id?: string
          request_id: string
          status?: string
          step_order?: number
        }
        Update: {
          approval_type?: string
          approver_id?: string | null
          approver_name?: string | null
          created_at?: string
          decided_at?: string | null
          decision_reason?: string | null
          id?: string
          request_id?: string
          status?: string
          step_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "remote_work_approvals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "remote_work_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      remote_work_requests: {
        Row: {
          business_justification: string | null
          business_sponsor: string | null
          created_at: string
          created_by: string
          deliverables: string | null
          department: string | null
          duration_type: string
          employee_email: string | null
          employee_id: string | null
          employee_name: string
          end_date: string | null
          home_city: string | null
          home_country: string
          host_city: string | null
          host_country: string
          id: string
          is_precursor_to_relocation: boolean | null
          job_title: string | null
          notes: string | null
          overall_risk_level: string | null
          purpose: string | null
          request_code: string
          request_type: string
          start_date: string
          status: string
          sub_tenant_id: string | null
          tenant_id: string
          updated_at: string
          work_pattern: string | null
        }
        Insert: {
          business_justification?: string | null
          business_sponsor?: string | null
          created_at?: string
          created_by: string
          deliverables?: string | null
          department?: string | null
          duration_type?: string
          employee_email?: string | null
          employee_id?: string | null
          employee_name: string
          end_date?: string | null
          home_city?: string | null
          home_country: string
          host_city?: string | null
          host_country: string
          id?: string
          is_precursor_to_relocation?: boolean | null
          job_title?: string | null
          notes?: string | null
          overall_risk_level?: string | null
          purpose?: string | null
          request_code?: string
          request_type?: string
          start_date: string
          status?: string
          sub_tenant_id?: string | null
          tenant_id: string
          updated_at?: string
          work_pattern?: string | null
        }
        Update: {
          business_justification?: string | null
          business_sponsor?: string | null
          created_at?: string
          created_by?: string
          deliverables?: string | null
          department?: string | null
          duration_type?: string
          employee_email?: string | null
          employee_id?: string | null
          employee_name?: string
          end_date?: string | null
          home_city?: string | null
          home_country?: string
          host_city?: string | null
          host_country?: string
          id?: string
          is_precursor_to_relocation?: boolean | null
          job_title?: string | null
          notes?: string | null
          overall_risk_level?: string | null
          purpose?: string | null
          request_code?: string
          request_type?: string
          start_date?: string
          status?: string
          sub_tenant_id?: string | null
          tenant_id?: string
          updated_at?: string
          work_pattern?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "remote_work_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remote_work_requests_sub_tenant_id_fkey"
            columns: ["sub_tenant_id"]
            isOneToOne: false
            referencedRelation: "sub_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remote_work_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      remote_work_risk_assessments: {
        Row: {
          assessed_at: string | null
          assessed_by: string | null
          category: string
          created_at: string
          id: string
          recommendations: string | null
          request_id: string
          risk_level: string
          rule_references: Json | null
          summary: string | null
          updated_at: string
        }
        Insert: {
          assessed_at?: string | null
          assessed_by?: string | null
          category: string
          created_at?: string
          id?: string
          recommendations?: string | null
          request_id: string
          risk_level?: string
          rule_references?: Json | null
          summary?: string | null
          updated_at?: string
        }
        Update: {
          assessed_at?: string | null
          assessed_by?: string | null
          category?: string
          created_at?: string
          id?: string
          recommendations?: string | null
          request_id?: string
          risk_level?: string
          rule_references?: Json | null
          summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "remote_work_risk_assessments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "remote_work_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          can_create: boolean
          can_delete: boolean
          can_update: boolean
          can_view: boolean
          created_at: string
          id: string
          module: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          can_create?: boolean
          can_delete?: boolean
          can_update?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          module: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          can_create?: boolean
          can_delete?: boolean
          can_update?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          module?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      simulation_audit_log: {
        Row: {
          action: string
          changed_by: string
          created_at: string
          field_id: string
          field_label: string
          id: string
          new_value: number | null
          old_value: number | null
          scenario_id: string
          scenario_name: string
          simulation_id: string
        }
        Insert: {
          action?: string
          changed_by: string
          created_at?: string
          field_id: string
          field_label: string
          id?: string
          new_value?: number | null
          old_value?: number | null
          scenario_id: string
          scenario_name: string
          simulation_id: string
        }
        Update: {
          action?: string
          changed_by?: string
          created_at?: string
          field_id?: string
          field_label?: string
          id?: string
          new_value?: number | null
          old_value?: number | null
          scenario_id?: string
          scenario_name?: string
          simulation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "simulation_audit_log_simulation_id_fkey"
            columns: ["simulation_id"]
            isOneToOne: false
            referencedRelation: "simulations"
            referencedColumns: ["id"]
          },
        ]
      }
      simulation_groups: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          destination_city: string | null
          destination_country: string | null
          id: string
          name: string
          origin_city: string | null
          origin_country: string | null
          status: string
          sub_tenant_id: string | null
          tenant_id: string | null
          total_cost: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          destination_city?: string | null
          destination_country?: string | null
          id?: string
          name: string
          origin_city?: string | null
          origin_country?: string | null
          status?: string
          sub_tenant_id?: string | null
          tenant_id?: string | null
          total_cost?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          destination_city?: string | null
          destination_country?: string | null
          id?: string
          name?: string
          origin_city?: string | null
          origin_country?: string | null
          status?: string
          sub_tenant_id?: string | null
          tenant_id?: string | null
          total_cost?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "simulation_groups_sub_tenant_id_fkey"
            columns: ["sub_tenant_id"]
            isOneToOne: false
            referencedRelation: "sub_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "simulation_groups_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
          group_id: string | null
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
          group_id?: string | null
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
          group_id?: string | null
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
            foreignKeyName: "simulations_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "simulation_groups"
            referencedColumns: ["id"]
          },
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
      superadmin_audit_log: {
        Row: {
          action: string
          created_at: string
          details: Json
          id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      tenant_modules: {
        Row: {
          created_at: string
          id: string
          is_enabled: boolean
          module_key: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          module_key: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          module_key?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_modules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_tax_settings: {
        Row: {
          created_at: string
          equalization_settlement: string
          gross_up_mode: string
          hypo_tax_method: string
          id: string
          include_cola_in_gross_up: boolean
          include_education_in_gross_up: boolean
          include_housing_in_gross_up: boolean
          include_social_security: boolean
          tax_treatment: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          equalization_settlement?: string
          gross_up_mode?: string
          hypo_tax_method?: string
          id?: string
          include_cola_in_gross_up?: boolean
          include_education_in_gross_up?: boolean
          include_housing_in_gross_up?: boolean
          include_social_security?: boolean
          tax_treatment?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          equalization_settlement?: string
          gross_up_mode?: string
          hypo_tax_method?: string
          id?: string
          include_cola_in_gross_up?: boolean
          include_education_in_gross_up?: boolean
          include_housing_in_gross_up?: boolean
          include_social_security?: boolean
          tax_treatment?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_tax_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
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
          {
            foreignKeyName: "tenant_users_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      trip_assessments: {
        Row: {
          assessed_at: string | null
          assessed_by: string | null
          created_at: string
          id: string
          module: string
          next_steps: string | null
          outcome: Database["public"]["Enums"]["assessment_outcome"]
          override_outcome:
            | Database["public"]["Enums"]["assessment_outcome"]
            | null
          override_reason: string | null
          override_wording: string | null
          raw_api_response: Json | null
          reasoning: string | null
          risk_flags: Json | null
          risk_level: string | null
          rule_references: Json | null
          segment_id: string | null
          statutory_outcome: string | null
          trip_id: string
          updated_at: string
          version: number
        }
        Insert: {
          assessed_at?: string | null
          assessed_by?: string | null
          created_at?: string
          id?: string
          module: string
          next_steps?: string | null
          outcome?: Database["public"]["Enums"]["assessment_outcome"]
          override_outcome?:
            | Database["public"]["Enums"]["assessment_outcome"]
            | null
          override_reason?: string | null
          override_wording?: string | null
          raw_api_response?: Json | null
          reasoning?: string | null
          risk_flags?: Json | null
          risk_level?: string | null
          rule_references?: Json | null
          segment_id?: string | null
          statutory_outcome?: string | null
          trip_id: string
          updated_at?: string
          version?: number
        }
        Update: {
          assessed_at?: string | null
          assessed_by?: string | null
          created_at?: string
          id?: string
          module?: string
          next_steps?: string | null
          outcome?: Database["public"]["Enums"]["assessment_outcome"]
          override_outcome?:
            | Database["public"]["Enums"]["assessment_outcome"]
            | null
          override_reason?: string | null
          override_wording?: string | null
          raw_api_response?: Json | null
          reasoning?: string | null
          risk_flags?: Json | null
          risk_level?: string | null
          rule_references?: Json | null
          segment_id?: string | null
          statutory_outcome?: string | null
          trip_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "trip_assessments_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "trip_segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_assessments_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_segments: {
        Row: {
          activity_description: string | null
          activity_type: string
          created_at: string
          destination_city: string | null
          destination_country: string
          duration_days: number | null
          end_date: string
          id: string
          immigration_documents: Json | null
          origin_city: string | null
          origin_country: string
          provenance: Database["public"]["Enums"]["input_provenance"]
          segment_order: number
          start_date: string
          trip_id: string
          updated_at: string
        }
        Insert: {
          activity_description?: string | null
          activity_type?: string
          created_at?: string
          destination_city?: string | null
          destination_country: string
          duration_days?: number | null
          end_date: string
          id?: string
          immigration_documents?: Json | null
          origin_city?: string | null
          origin_country: string
          provenance?: Database["public"]["Enums"]["input_provenance"]
          segment_order?: number
          start_date: string
          trip_id: string
          updated_at?: string
        }
        Update: {
          activity_description?: string | null
          activity_type?: string
          created_at?: string
          destination_city?: string | null
          destination_country?: string
          duration_days?: number | null
          end_date?: string
          id?: string
          immigration_documents?: Json | null
          origin_city?: string | null
          origin_country?: string
          provenance?: Database["public"]["Enums"]["input_provenance"]
          segment_order?: number
          start_date?: string
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_segments_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_versions: {
        Row: {
          change_summary: string | null
          changed_by: string
          created_at: string
          id: string
          snapshot: Json
          trip_id: string
          version: number
        }
        Insert: {
          change_summary?: string | null
          changed_by: string
          created_at?: string
          id?: string
          snapshot: Json
          trip_id: string
          version: number
        }
        Update: {
          change_summary?: string | null
          changed_by?: string
          created_at?: string
          id?: string
          snapshot?: Json
          trip_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "trip_versions_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          citizenship: string | null
          created_at: string
          created_by: string
          employee_id: string | null
          id: string
          is_shadow: boolean
          notes: string | null
          passport_country: string | null
          provenance: Json | null
          purpose: string | null
          residency_country: string | null
          status: Database["public"]["Enums"]["trip_status"]
          sub_tenant_id: string | null
          tenant_id: string
          traveler_email: string | null
          traveler_name: string
          trip_code: string
          updated_at: string
          version: number
        }
        Insert: {
          citizenship?: string | null
          created_at?: string
          created_by: string
          employee_id?: string | null
          id?: string
          is_shadow?: boolean
          notes?: string | null
          passport_country?: string | null
          provenance?: Json | null
          purpose?: string | null
          residency_country?: string | null
          status?: Database["public"]["Enums"]["trip_status"]
          sub_tenant_id?: string | null
          tenant_id: string
          traveler_email?: string | null
          traveler_name: string
          trip_code?: string
          updated_at?: string
          version?: number
        }
        Update: {
          citizenship?: string | null
          created_at?: string
          created_by?: string
          employee_id?: string | null
          id?: string
          is_shadow?: boolean
          notes?: string | null
          passport_country?: string | null
          provenance?: Json | null
          purpose?: string | null
          residency_country?: string | null
          status?: Database["public"]["Enums"]["trip_status"]
          sub_tenant_id?: string | null
          tenant_id?: string
          traveler_email?: string | null
          traveler_name?: string
          trip_code?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "trips_sub_tenant_id_fkey"
            columns: ["sub_tenant_id"]
            isOneToOne: false
            referencedRelation: "sub_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
      assessment_outcome: "green" | "amber" | "red" | "pending"
      data_source_type:
        | "manual"
        | "api_connector"
        | "rate_file"
        | "lookup_table"
      input_provenance:
        | "ai_derived"
        | "user_provided"
        | "api_ingested"
        | "system_generated"
      simulation_status:
        | "draft"
        | "running"
        | "completed"
        | "pending"
        | "approved"
      tenant_role: "tenant_admin" | "tenant_user"
      trip_status:
        | "draft"
        | "confirmed"
        | "assessed"
        | "monitoring"
        | "needs_info"
        | "attention"
        | "escalate"
        | "closed"
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
      assessment_outcome: ["green", "amber", "red", "pending"],
      data_source_type: [
        "manual",
        "api_connector",
        "rate_file",
        "lookup_table",
      ],
      input_provenance: [
        "ai_derived",
        "user_provided",
        "api_ingested",
        "system_generated",
      ],
      simulation_status: [
        "draft",
        "running",
        "completed",
        "pending",
        "approved",
      ],
      tenant_role: ["tenant_admin", "tenant_user"],
      trip_status: [
        "draft",
        "confirmed",
        "assessed",
        "monitoring",
        "needs_info",
        "attention",
        "escalate",
        "closed",
      ],
    },
  },
} as const
