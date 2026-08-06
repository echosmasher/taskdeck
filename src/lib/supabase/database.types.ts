export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          calendar_edit_permission: Database["public"]["Enums"]["calendar_edit_permission"]
          id: boolean
          long_absence_min_days: number
          long_absence_statuses: string[]
          timezone: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          calendar_edit_permission?: Database["public"]["Enums"]["calendar_edit_permission"]
          id?: boolean
          long_absence_min_days?: number
          long_absence_statuses?: string[]
          timezone?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          calendar_edit_permission?: Database["public"]["Enums"]["calendar_edit_permission"]
          id?: boolean
          long_absence_min_days?: number
          long_absence_statuses?: string[]
          timezone?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_entries: {
        Row: {
          date: string
          id: string
          profile_id: string
          set_at: string | null
          set_by_profile_id: string | null
          status: Database["public"]["Enums"]["calendar_entry_status"]
        }
        Insert: {
          date: string
          id?: string
          profile_id: string
          set_at?: string | null
          set_by_profile_id?: string | null
          status: Database["public"]["Enums"]["calendar_entry_status"]
        }
        Update: {
          date?: string
          id?: string
          profile_id?: string
          set_at?: string | null
          set_by_profile_id?: string | null
          status?: Database["public"]["Enums"]["calendar_entry_status"]
        }
        Relationships: [
          {
            foreignKeyName: "calendar_entries_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_entries_set_by_profile_id_fkey"
            columns: ["set_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string
          id: string
          is_archived: boolean
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_archived?: boolean
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          is_archived?: boolean
          name?: string
        }
        Relationships: []
      }
      company_dimension_values: {
        Row: {
          company_id: string
          dimension_id: string
          dimension_value_id: string
        }
        Insert: {
          company_id: string
          dimension_id: string
          dimension_value_id: string
        }
        Update: {
          company_id?: string
          dimension_id?: string
          dimension_value_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_dimension_values_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_dimension_values_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_missing_dimension_values"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "company_dimension_values_dimension_id_fkey"
            columns: ["dimension_id"]
            isOneToOne: false
            referencedRelation: "companies_missing_dimension_values"
            referencedColumns: ["dimension_id"]
          },
          {
            foreignKeyName: "company_dimension_values_dimension_id_fkey"
            columns: ["dimension_id"]
            isOneToOne: false
            referencedRelation: "dimensions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_dimension_values_dimension_value_id_fkey"
            columns: ["dimension_value_id"]
            isOneToOne: false
            referencedRelation: "dimension_values"
            referencedColumns: ["id"]
          },
        ]
      }
      dimension_values: {
        Row: {
          created_at: string
          dimension_id: string
          id: string
          value: string
        }
        Insert: {
          created_at?: string
          dimension_id: string
          id?: string
          value: string
        }
        Update: {
          created_at?: string
          dimension_id?: string
          id?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "dimension_values_dimension_id_fkey"
            columns: ["dimension_id"]
            isOneToOne: false
            referencedRelation: "companies_missing_dimension_values"
            referencedColumns: ["dimension_id"]
          },
          {
            foreignKeyName: "dimension_values_dimension_id_fkey"
            columns: ["dimension_id"]
            isOneToOne: false
            referencedRelation: "dimensions"
            referencedColumns: ["id"]
          },
        ]
      }
      dimensions: {
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
      holidays: {
        Row: {
          country_code: string
          date: string
          id: string
          name: string
        }
        Insert: {
          country_code: string
          date: string
          id?: string
          name: string
        }
        Update: {
          country_code?: string
          date?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_archived: boolean
          position: string | null
          role: Database["public"]["Enums"]["user_role"]
          team_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          is_archived?: boolean
          position?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          team_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_archived?: boolean
          position?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      settings_events: {
        Row: {
          changed_by: string | null
          changes: Json
          id: string
          occurred_at: string
        }
        Insert: {
          changed_by?: string | null
          changes: Json
          id?: string
          occurred_at?: string
        }
        Update: {
          changed_by?: string | null
          changes?: Json
          id?: string
          occurred_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "settings_events_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_events: {
        Row: {
          actor_profile_id: string | null
          details: Json
          event: Database["public"]["Enums"]["task_event_type"]
          id: string
          occurred_at: string
          task_id: string
          task_instance_id: string | null
        }
        Insert: {
          actor_profile_id?: string | null
          details?: Json
          event: Database["public"]["Enums"]["task_event_type"]
          id?: string
          occurred_at?: string
          task_id: string
          task_instance_id?: string | null
        }
        Update: {
          actor_profile_id?: string | null
          details?: Json
          event?: Database["public"]["Enums"]["task_event_type"]
          id?: string
          occurred_at?: string
          task_id?: string
          task_instance_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_events_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_events_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_events_task_instance_id_fkey"
            columns: ["task_instance_id"]
            isOneToOne: false
            referencedRelation: "task_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      task_instances: {
        Row: {
          assignee_override_profile_id: string | null
          company_id: string
          due_date: string
          id: string
          na_reason: string | null
          override_reason: string | null
          override_set_at: string | null
          override_set_by: string | null
          status: Database["public"]["Enums"]["task_instance_status"]
          status_set_at: string | null
          status_set_by: string | null
          task_id: string
        }
        Insert: {
          assignee_override_profile_id?: string | null
          company_id: string
          due_date: string
          id?: string
          na_reason?: string | null
          override_reason?: string | null
          override_set_at?: string | null
          override_set_by?: string | null
          status?: Database["public"]["Enums"]["task_instance_status"]
          status_set_at?: string | null
          status_set_by?: string | null
          task_id: string
        }
        Update: {
          assignee_override_profile_id?: string | null
          company_id?: string
          due_date?: string
          id?: string
          na_reason?: string | null
          override_reason?: string | null
          override_set_at?: string | null
          override_set_by?: string | null
          status?: Database["public"]["Enums"]["task_instance_status"]
          status_set_at?: string | null
          status_set_by?: string | null
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_instances_assignee_override_profile_id_fkey"
            columns: ["assignee_override_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_instances_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_instances_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_missing_dimension_values"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "task_instances_override_set_by_fkey"
            columns: ["override_set_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_instances_status_set_by_fkey"
            columns: ["status_set_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_instances_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee_profile_id: string | null
          assignee_team_id: string | null
          assignee_type: Database["public"]["Enums"]["task_assignee_type"]
          created_at: string
          created_by: string | null
          deadline_rule: Json | null
          description: string | null
          id: string
          is_archived: boolean
          recurrence: Json
          scope: Json
          title: string
        }
        Insert: {
          assignee_profile_id?: string | null
          assignee_team_id?: string | null
          assignee_type: Database["public"]["Enums"]["task_assignee_type"]
          created_at?: string
          created_by?: string | null
          deadline_rule?: Json | null
          description?: string | null
          id?: string
          is_archived?: boolean
          recurrence: Json
          scope?: Json
          title: string
        }
        Update: {
          assignee_profile_id?: string | null
          assignee_team_id?: string | null
          assignee_type?: Database["public"]["Enums"]["task_assignee_type"]
          created_at?: string
          created_by?: string | null
          deadline_rule?: Json | null
          description?: string | null
          id?: string
          is_archived?: boolean
          recurrence?: Json
          scope?: Json
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assignee_profile_id_fkey"
            columns: ["assignee_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assignee_team_id_fkey"
            columns: ["assignee_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          id: string
          is_archived: boolean
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_archived?: boolean
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          is_archived?: boolean
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      companies_missing_dimension_values: {
        Row: {
          company_id: string | null
          company_name: string | null
          dimension_id: string | null
          dimension_name: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_edit_calendar_entry: {
        Args: { target_profile_id: string }
        Returns: boolean
      }
      can_manage_task_instance: {
        Args: { p_override_profile_id: string; p_task_id: string }
        Returns: boolean
      }
      current_profile_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
    }
    Enums: {
      calendar_edit_permission: "admins_only" | "members_own" | "members_all"
      calendar_entry_status:
        | "in_office"
        | "remote"
        | "out_of_office"
        | "sick"
        | "sick_leave"
        | "parental_leave"
        | "business_travel"
      task_assignee_type: "team" | "person"
      task_event_type:
        | "created"
        | "completed"
        | "marked_na"
        | "reopened"
        | "reassigned"
        | "edited"
        | "override_set"
        | "override_cleared"
      task_instance_status: "open" | "completed" | "na"
      user_role: "master_admin" | "admin" | "member"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      calendar_edit_permission: ["admins_only", "members_own", "members_all"],
      calendar_entry_status: [
        "in_office",
        "remote",
        "out_of_office",
        "sick",
        "sick_leave",
        "parental_leave",
        "business_travel",
      ],
      task_assignee_type: ["team", "person"],
      task_event_type: [
        "created",
        "completed",
        "marked_na",
        "reopened",
        "reassigned",
        "edited",
        "override_set",
        "override_cleared",
      ],
      task_instance_status: ["open", "completed", "na"],
      user_role: ["master_admin", "admin", "member"],
    },
  },
} as const

