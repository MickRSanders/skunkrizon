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
      calculations: {
        Row: {
          category: string | null
          created_at: string
          created_by: string
          description: string | null
          formula: string
          id: string
          name: string
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
          updated_at?: string
        }
        Relationships: []
      }
      policies: {
        Row: {
          benefit_components: Json | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          tax_approach: string | null
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
          tax_approach?: string | null
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
          tax_approach?: string | null
          tier?: string
          updated_at?: string
        }
        Relationships: []
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
          tax_approach: string | null
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
          tax_approach?: string | null
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
          tax_approach?: string | null
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
    }
    Enums: {
      app_role: "admin" | "analyst" | "viewer"
      simulation_status: "draft" | "running" | "completed" | "pending"
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
      app_role: ["admin", "analyst", "viewer"],
      simulation_status: ["draft", "running", "completed", "pending"],
    },
  },
} as const
