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
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
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
      activities: {
        Row: {
          action: string
          actor_id: string | null
          actor_type: string
          client_id: string | null
          created_at: string
          diff: Json | null
          entity_id: string
          entity_type: string
          id: string
          project_id: string | null
          summary: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_type?: string
          client_id?: string | null
          created_at?: string
          diff?: Json | null
          entity_id: string
          entity_type: string
          id?: string
          project_id?: string | null
          summary?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_type?: string
          client_id?: string | null
          created_at?: string
          diff?: Json | null
          entity_id?: string
          entity_type?: string
          id?: string
          project_id?: string | null
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_links: {
        Row: {
          accepted_at: string | null
          accepted_by_name: string | null
          accepted_document: string | null
          accepted_ip: string | null
          accepted_user_agent: string | null
          client_email: string | null
          client_id: string | null
          client_name: string | null
          client_phone: string | null
          content_snapshot: Json | null
          created_at: string
          expires_at: string | null
          id: string
          lead_id: string | null
          notes: string | null
          parent_id: string | null
          project_id: string | null
          rejected_at: string | null
          rejection_reason: string | null
          selection: Json | null
          sent_at: string | null
          snapshot_hash: string | null
          status: string
          superseded_by: string | null
          template_id: string | null
          token: string
          total_value: number | null
          version: number
          viewed_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          accepted_by_name?: string | null
          accepted_document?: string | null
          accepted_ip?: string | null
          accepted_user_agent?: string | null
          client_email?: string | null
          client_id?: string | null
          client_name?: string | null
          client_phone?: string | null
          content_snapshot?: Json | null
          created_at?: string
          expires_at?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          parent_id?: string | null
          project_id?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          selection?: Json | null
          sent_at?: string | null
          snapshot_hash?: string | null
          status?: string
          superseded_by?: string | null
          template_id?: string | null
          token: string
          total_value?: number | null
          version?: number
          viewed_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          accepted_by_name?: string | null
          accepted_document?: string | null
          accepted_ip?: string | null
          accepted_user_agent?: string | null
          client_email?: string | null
          client_id?: string | null
          client_name?: string | null
          client_phone?: string | null
          content_snapshot?: Json | null
          created_at?: string
          expires_at?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          parent_id?: string | null
          project_id?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          selection?: Json | null
          sent_at?: string | null
          snapshot_hash?: string | null
          status?: string
          superseded_by?: string | null
          template_id?: string | null
          token?: string
          total_value?: number | null
          version?: number
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_links_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_links_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_links_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "budget_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_links_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_links_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "budget_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_links_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "budget_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_templates: {
        Row: {
          content: Json
          created_at: string
          hero_badge: string | null
          id: string
          intro_text: string | null
          is_active: boolean
          name: string
          niche: string
          portfolio_url: string | null
          slug: string
          subtitle: string | null
          title: string
          updated_at: string
          whatsapp_message: string | null
        }
        Insert: {
          content?: Json
          created_at?: string
          hero_badge?: string | null
          id?: string
          intro_text?: string | null
          is_active?: boolean
          name: string
          niche: string
          portfolio_url?: string | null
          slug: string
          subtitle?: string | null
          title: string
          updated_at?: string
          whatsapp_message?: string | null
        }
        Update: {
          content?: Json
          created_at?: string
          hero_badge?: string | null
          id?: string
          intro_text?: string | null
          is_active?: boolean
          name?: string
          niche?: string
          portfolio_url?: string | null
          slug?: string
          subtitle?: string | null
          title?: string
          updated_at?: string
          whatsapp_message?: string | null
        }
        Relationships: []
      }
      clients: {
        Row: {
          address: string | null
          category: string | null
          city: string | null
          converted_at: string | null
          created_at: string
          display_order: number
          document: string | null
          email: string | null
          id: string
          is_active: boolean
          is_featured: boolean
          logo_url: string | null
          name: string
          niche_id: string | null
          notes: string | null
          origin_lead_id: string | null
          phone: string | null
          show_on_site: boolean
          state: string | null
          status: string
          trade_name: string | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          address?: string | null
          category?: string | null
          city?: string | null
          converted_at?: string | null
          created_at?: string
          display_order?: number
          document?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          logo_url?: string | null
          name: string
          niche_id?: string | null
          notes?: string | null
          origin_lead_id?: string | null
          phone?: string | null
          show_on_site?: boolean
          state?: string | null
          status?: string
          trade_name?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          address?: string | null
          category?: string | null
          city?: string | null
          converted_at?: string | null
          created_at?: string
          display_order?: number
          document?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          logo_url?: string | null
          name?: string
          niche_id?: string | null
          notes?: string | null
          origin_lead_id?: string | null
          phone?: string | null
          show_on_site?: boolean
          state?: string | null
          status?: string
          trade_name?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_niche_id_fkey"
            columns: ["niche_id"]
            isOneToOne: false
            referencedRelation: "niches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_origin_lead_id_fkey"
            columns: ["origin_lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          client_id: string | null
          content: Json
          created_at: string
          id: string
          number: string
          project_id: string | null
          proposal_id: string | null
          signed_at: string | null
          status: string
          token: string
        }
        Insert: {
          client_id?: string | null
          content?: Json
          created_at?: string
          id?: string
          number: string
          project_id?: string | null
          proposal_id?: string | null
          signed_at?: string | null
          status?: string
          token?: string
        }
        Update: {
          client_id?: string | null
          content?: Json
          created_at?: string
          id?: string
          number?: string
          project_id?: string | null
          proposal_id?: string | null
          signed_at?: string | null
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "budget_links"
            referencedColumns: ["id"]
          },
        ]
      }
      keep_alive: {
        Row: {
          id: string
          last_ping: string | null
        }
        Insert: {
          id?: string
          last_ping?: string | null
        }
        Update: {
          id?: string
          last_ping?: string | null
        }
        Relationships: []
      }
      leads: {
        Row: {
          city: string | null
          consent: boolean | null
          created_at: string
          email: string
          id: string
          message: string
          name: string
          niche: string
          notes: string | null
          phone: string
          phone_e164: string | null
          source: string | null
          source_page: string | null
          status: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          city?: string | null
          consent?: boolean | null
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          niche: string
          notes?: string | null
          phone: string
          phone_e164?: string | null
          source?: string | null
          source_page?: string | null
          status?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          city?: string | null
          consent?: boolean | null
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          niche?: string
          notes?: string | null
          phone?: string
          phone_e164?: string | null
          source?: string | null
          source_page?: string | null
          status?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: []
      }
      niches: {
        Row: {
          cover_image: string | null
          created_at: string
          description: string
          display_order: number
          id: string
          is_active: boolean
          is_featured: boolean
          name: string
          slug: string
          updated_at: string
          whatsapp_template: string | null
        }
        Insert: {
          cover_image?: string | null
          created_at?: string
          description: string
          display_order?: number
          id?: string
          is_active?: boolean
          is_featured?: boolean
          name: string
          slug: string
          updated_at?: string
          whatsapp_template?: string | null
        }
        Update: {
          cover_image?: string | null
          created_at?: string
          description?: string
          display_order?: number
          id?: string
          is_active?: boolean
          is_featured?: boolean
          name?: string
          slug?: string
          updated_at?: string
          whatsapp_template?: string | null
        }
        Relationships: []
      }
      partners: {
        Row: {
          category: string | null
          commission_notes: string | null
          contact_name: string | null
          created_at: string
          display_order: number
          email: string | null
          id: string
          logo_url: string | null
          name: string
          notes: string | null
          partnership_type: string
          phone: string | null
          status: string
          trade_name: string | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          category?: string | null
          commission_notes?: string | null
          contact_name?: string | null
          created_at?: string
          display_order?: number
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          notes?: string | null
          partnership_type?: string
          phone?: string | null
          status?: string
          trade_name?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          category?: string | null
          commission_notes?: string | null
          contact_name?: string | null
          created_at?: string
          display_order?: number
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          notes?: string | null
          partnership_type?: string
          phone?: string | null
          status?: string
          trade_name?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      portfolio_items: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number
          id: string
          is_featured: boolean
          is_published: boolean
          niche: string
          niches: string[]
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_type: string
          video_url: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          id?: string
          is_featured?: boolean
          is_published?: boolean
          niche: string
          niches?: string[]
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          video_type?: string
          video_url: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          id?: string
          is_featured?: boolean
          is_published?: boolean
          niche?: string
          niches?: string[]
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_type?: string
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          client_id: string
          closed_value: number | null
          created_at: string
          created_by: string | null
          description: string | null
          event_date: string | null
          id: string
          lead_id: string | null
          location: string | null
          niche_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          client_id: string
          closed_value?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date?: string | null
          id?: string
          lead_id?: string | null
          location?: string | null
          niche_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          closed_value?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date?: string | null
          id?: string
          lead_id?: string | null
          location?: string | null
          niche_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_niche_id_fkey"
            columns: ["niche_id"]
            isOneToOne: false
            referencedRelation: "niches"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "site_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
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
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      contract_get: {
        Args: {
          _token: string
        }
        Returns: Json
      }
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      proposal_accept: {
        Args: {
          _token: string
          _package_id: string
          _addon_indexes: number[]
          _name: string
          _document: string
          _email?: string
          _phone?: string
          _consent?: boolean
        }
        Returns: Json
      }
      proposal_get: {
        Args: {
          _token: string
        }
        Returns: Json
      }
      proposal_track_view: {
        Args: {
          _token: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "editor"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

