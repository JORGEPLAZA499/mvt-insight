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
      accounts: {
        Row: {
          created_at: string
          credits: number
          id: string
          last_login_at: string
          legal_accepted_version: string | null
          user_code: string
        }
        Insert: {
          created_at?: string
          credits?: number
          id: string
          last_login_at?: string
          legal_accepted_version?: string | null
          user_code: string
        }
        Update: {
          created_at?: string
          credits?: number
          id?: string
          last_login_at?: string
          legal_accepted_version?: string | null
          user_code?: string
        }
        Relationships: []
      }
      analyses: {
        Row: {
          created_at: string
          device: string
          file_name: string
          file_size: number
          id: string
          result: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          device: string
          file_name: string
          file_size?: number
          id?: string
          result: Json
          user_id: string
        }
        Update: {
          created_at?: string
          device?: string
          file_name?: string
          file_size?: number
          id?: string
          result?: Json
          user_id?: string
        }
        Relationships: []
      }
      credit_recharges: {
        Row: {
          account_id: string
          amount: number
          created_at: string
          id: string
          source: string
          stripe_session_id: string | null
          token_id: string | null
        }
        Insert: {
          account_id: string
          amount: number
          created_at?: string
          id?: string
          source?: string
          stripe_session_id?: string | null
          token_id?: string | null
        }
        Update: {
          account_id?: string
          amount?: number
          created_at?: string
          id?: string
          source?: string
          stripe_session_id?: string | null
          token_id?: string | null
        }
        Relationships: []
      }
      credit_tokens: {
        Row: {
          code: string
          created_at: string
          created_by: string
          credits: number
          id: string
          redeemed_at: string | null
          redeemed_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          credits: number
          id?: string
          redeemed_at?: string | null
          redeemed_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          credits?: number
          id?: string
          redeemed_at?: string | null
          redeemed_by?: string | null
        }
        Relationships: []
      }
      desktop_pairing_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          expires_at: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      desktop_tokens: {
        Row: {
          created_at: string
          label: string
          last_used_at: string | null
          revoked_at: string | null
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          label?: string
          last_used_at?: string | null
          revoked_at?: string | null
          token: string
          user_id: string
        }
        Update: {
          created_at?: string
          label?: string
          last_used_at?: string | null
          revoked_at?: string | null
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      legal_acceptances: {
        Row: {
          acceptance_method: string
          accepted_at: string
          document_hash: string
          document_text: string
          document_version: string
          id: string
          ip_address: string | null
          locale: string
          signature: string
          user_agent: string | null
          user_code: string
          user_id: string
        }
        Insert: {
          acceptance_method?: string
          accepted_at?: string
          document_hash: string
          document_text: string
          document_version: string
          id?: string
          ip_address?: string | null
          locale: string
          signature: string
          user_agent?: string | null
          user_code: string
          user_id: string
        }
        Update: {
          acceptance_method?: string
          accepted_at?: string
          document_hash?: string
          document_text?: string
          document_version?: string
          id?: string
          ip_address?: string | null
          locale?: string
          signature?: string
          user_agent?: string | null
          user_code?: string
          user_id?: string
        }
        Relationships: []
      }
      plisio_invoices: {
        Row: {
          account_id: string
          amount_eur: number
          created_at: string
          credits: number
          id: string
          invoice_id: string | null
          order_number: string
          processed_at: string | null
          status: string
        }
        Insert: {
          account_id: string
          amount_eur: number
          created_at?: string
          credits: number
          id?: string
          invoice_id?: string | null
          order_number: string
          processed_at?: string | null
          status?: string
        }
        Update: {
          account_id?: string
          amount_eur?: number
          created_at?: string
          credits?: number
          id?: string
          invoice_id?: string | null
          order_number?: string
          processed_at?: string | null
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      consume_credit_and_insert_analysis: {
        Args: {
          p_device: string
          p_file_name: string
          p_file_size: number
          p_result: Json
          p_user_id: string
        }
        Returns: {
          analysis_id: string
          remaining_credits: number
        }[]
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      record_legal_acceptance: {
        Args: {
          p_document_hash: string
          p_document_text: string
          p_document_version: string
          p_ip: string
          p_locale: string
          p_signature: string
          p_user_agent: string
          p_user_id: string
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
