export type Json = string  | number  | boolean  | null  | { [key: string]: Json | undefined }  | Json[];

export type Database = {
  public: {
    Tables: {
      arquivos_pacientes: {
        Row: {
          criado_em: string | null
          id: string
          nome_arquivo_original: string
          path_storage: string
          resposta_paciente_id: string
          tamanho_arquivo_bytes: number | null
          tipo_documento: string
          tipo_mime: string
        }
        Insert: {
          criado_em?: string | null
          id?: string
          nome_arquivo_original: string
          path_storage: string
          resposta_paciente_id: string
          tamanho_arquivo_bytes?: number | null
          tipo_documento: string
          tipo_mime: string
        }
        Update: {
          criado_em?: string | null
          id?: string
          nome_arquivo_original?: string
          path_storage?: string
          resposta_paciente_id?: string
          tamanho_arquivo_bytes?: number | null
          tipo_documento?: string
          tipo_mime?: string
        }
        Relationships: [
          {
            foreignKeyName: "arquivos_pacientes_resposta_paciente_id_fkey"
            columns: ["resposta_paciente_id"]
            isOneToOne: false
            referencedRelation: "respostas_pacientes"
            referencedColumns: ["id"]
          },
        ]
      }
      links_formularios: {
        Row: {
          ativo: boolean | null
          codigo_unico: string
          criado_em: string | null
          data_expiracao: string | null
          id: string
          profissional_id: string
          usado_em: string | null
        }
        Insert: {
          ativo?: boolean | null
          codigo_unico: string
          criado_em?: string | null
          data_expiracao?: string | null
          id?: string
          profissional_id: string
          usado_em?: string | null
        }
        Update: {
          ativo?: boolean | null
          codigo_unico?: string
          criado_em?: string | null
          data_expiracao?: string | null
          id?: string
          profissional_id?: string
          usado_em?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "links_formularios_profissional_id_fkey"
            columns: ["profissional_id"]
            isOneToOne: false
            referencedRelation: "profissionais_saude"
            referencedColumns: ["id"]
          },
        ]
      }
      profissionais_saude: {
        Row: {
          ativo: boolean | null
          atualizado_em: string | null
          criado_em: string | null
          email: string
          especialidade: string | null
          id: string
          id_usuario_supabase: string | null
          nome_completo: string
          numero_conselho: string | null
        }
        Insert: {
          ativo?: boolean | null
          atualizado_em?: string | null
          criado_em?: string | null
          email: string
          especialidade?: string | null
          id?: string
          id_usuario_supabase?: string | null
          nome_completo: string
          numero_conselho?: string | null
        }
        Update: {
          ativo?: boolean | null
          atualizado_em?: string | null
          criado_em?: string | null
          email?: string
          especialidade?: string | null
          id?: string
          id_usuario_supabase?: string | null
          nome_completo?: string
          numero_conselho?: string | null
        }
        Relationships: []
      }
      respostas_pacientes: {
        Row: {
          alergias_conhecidas: string | null
          atualizado_em: string | null
          criado_em: string | null
          data_envio: string | null
          id: string
          link_formulario_id: string
          medicacoes_em_uso: string | null
          nome_paciente: string
          profissional_id: string
          queixa_principal: string
          revisado_pelo_profissional: boolean | null
        }
        Insert: {
          alergias_conhecidas?: string | null
          atualizado_em?: string | null
          criado_em?: string | null
          data_envio?: string | null
          id?: string
          link_formulario_id: string
          medicacoes_em_uso?: string | null
          nome_paciente: string
          profissional_id: string
          queixa_principal: string
          revisado_pelo_profissional?: boolean | null
        }
        Update: {
          alergias_conhecidas?: string | null
          atualizado_em?: string | null
          criado_em?: string | null
          data_envio?: string | null
          id?: string
          link_formulario_id?: string
          medicacoes_em_uso?: string | null
          nome_paciente?: string
          profissional_id?: string
          queixa_principal?: string
          revisado_pelo_profissional?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "respostas_pacientes_link_formulario_id_fkey"
            columns: ["link_formulario_id"]
            isOneToOne: false
            referencedRelation: "links_formularios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "respostas_pacientes_profissional_id_fkey"
            columns: ["profissional_id"]
            isOneToOne: false
            referencedRelation: "profissionais_saude"
            referencedColumns: ["id"]
          },
        ]
      }
      tokens_recuperacao_senha: {
        Row: {
          criado_em: string | null
          expira_em: string
          id: string
          profissional_id: string
          token: string
          usado: boolean | null
        }
        Insert: {
          criado_em?: string | null
          expira_em: string
          id?: string
          profissional_id: string
          token: string
          usado?: boolean | null
        }
        Update: {
          criado_em?: string | null
          expira_em?: string
          id?: string
          profissional_id?: string
          token?: string
          usado?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "tokens_recuperacao_senha_profissional_id_fkey"
            columns: ["profissional_id"]
            isOneToOne: false
            referencedRelation: "profissionais_saude"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
