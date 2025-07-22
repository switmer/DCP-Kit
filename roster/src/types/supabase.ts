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
      bulk_upload: {
        Row: {
          company: string | null
          created_at: string
          id: number
        }
        Insert: {
          company?: string | null
          created_at?: string
          id?: number
        }
        Update: {
          company?: string | null
          created_at?: string
          id?: number
        }
        Relationships: [
          {
            foreignKeyName: "public_bulk_uploads_company_fkey"
            columns: ["company"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      call_sheet: {
        Row: {
          bulk_upload: number | null
          company: string | null
          created_at: string
          date: string | null
          historical: boolean | null
          id: string
          job: string | null
          project: string | null
          raw_json: Json | null
          short_id: string | null
          src: string | null
          status: Database["public"]["Enums"]["CallSheetStatus"] | null
          updated_at: string | null
        }
        Insert: {
          bulk_upload?: number | null
          company?: string | null
          created_at?: string
          date?: string | null
          historical?: boolean | null
          id?: string
          job?: string | null
          project?: string | null
          raw_json?: Json | null
          short_id?: string | null
          src?: string | null
          status?: Database["public"]["Enums"]["CallSheetStatus"] | null
          updated_at?: string | null
        }
        Update: {
          bulk_upload?: number | null
          company?: string | null
          created_at?: string
          date?: string | null
          historical?: boolean | null
          id?: string
          job?: string | null
          project?: string | null
          raw_json?: Json | null
          short_id?: string | null
          src?: string | null
          status?: Database["public"]["Enums"]["CallSheetStatus"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_sheet_company_fkey"
            columns: ["company"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_sheet_project_fkey"
            columns: ["project"]
            isOneToOne: false
            referencedRelation: "project"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_call_sheet_bulk_upload_fkey"
            columns: ["bulk_upload"]
            isOneToOne: false
            referencedRelation: "bulk_upload"
            referencedColumns: ["id"]
          },
        ]
      }
      call_sheet_entity: {
        Row: {
          address: string | null
          call_sheet: string | null
          created_at: string
          email: string | null
          id: string
          logo: string | null
          name: string | null
          phone: string | null
          subtype: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          call_sheet?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo?: string | null
          name?: string | null
          phone?: string | null
          subtype?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          call_sheet?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo?: string | null
          name?: string | null
          phone?: string | null
          subtype?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_sheet_entity_call_sheet_fkey"
            columns: ["call_sheet"]
            isOneToOne: false
            referencedRelation: "call_sheet"
            referencedColumns: ["id"]
          },
        ]
      }
      call_sheet_location: {
        Row: {
          call_sheet: string | null
          created_at: string
          description: string | null
          id: number
          instructions: string | null
          location: number
          name: string | null
          order: number | null
          project: string
          type: string | null
        }
        Insert: {
          call_sheet?: string | null
          created_at?: string
          description?: string | null
          id?: number
          instructions?: string | null
          location: number
          name?: string | null
          order?: number | null
          project: string
          type?: string | null
        }
        Update: {
          call_sheet?: string | null
          created_at?: string
          description?: string | null
          id?: number
          instructions?: string | null
          location?: number
          name?: string | null
          order?: number | null
          project?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_sheet_location_location_fkey"
            columns: ["location"]
            isOneToOne: false
            referencedRelation: "location"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_location_call_sheet_fkey"
            columns: ["call_sheet"]
            isOneToOne: false
            referencedRelation: "call_sheet"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_location_project_fkey"
            columns: ["project"]
            isOneToOne: false
            referencedRelation: "project"
            referencedColumns: ["id"]
          },
        ]
      }
      call_sheet_member: {
        Row: {
          call_sheet: string | null
          call_time: string | null
          city: string | null
          company: string | null
          confirmed_at: string | null
          contact_info_visible: boolean | null
          created_at: string
          crew_member: number | null
          department: string | null
          email: string | null
          id: string
          isKey: boolean | null
          name: string | null
          order: number | null
          owner: string | null
          phone: string | null
          project: string | null
          project_position: number | null
          sent_at: string | null
          short_id: string | null
          state: string | null
          status: Database["public"]["Enums"]["CallSheetMemberStatus"] | null
          title: string | null
          updated_at: string | null
          wrap_time: string | null
        }
        Insert: {
          call_sheet?: string | null
          call_time?: string | null
          city?: string | null
          company?: string | null
          confirmed_at?: string | null
          contact_info_visible?: boolean | null
          created_at?: string
          crew_member?: number | null
          department?: string | null
          email?: string | null
          id?: string
          isKey?: boolean | null
          name?: string | null
          order?: number | null
          owner?: string | null
          phone?: string | null
          project?: string | null
          project_position?: number | null
          sent_at?: string | null
          short_id?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["CallSheetMemberStatus"] | null
          title?: string | null
          updated_at?: string | null
          wrap_time?: string | null
        }
        Update: {
          call_sheet?: string | null
          call_time?: string | null
          city?: string | null
          company?: string | null
          confirmed_at?: string | null
          contact_info_visible?: boolean | null
          created_at?: string
          crew_member?: number | null
          department?: string | null
          email?: string | null
          id?: string
          isKey?: boolean | null
          name?: string | null
          order?: number | null
          owner?: string | null
          phone?: string | null
          project?: string | null
          project_position?: number | null
          sent_at?: string | null
          short_id?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["CallSheetMemberStatus"] | null
          title?: string | null
          updated_at?: string | null
          wrap_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_sheet_member_owner_fkey"
            columns: ["owner"]
            isOneToOne: false
            referencedRelation: "member"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_sheet_member_project_position_fkey"
            columns: ["project_position"]
            isOneToOne: false
            referencedRelation: "project_position"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_call_sheet_member_call_sheet_fkey"
            columns: ["call_sheet"]
            isOneToOne: false
            referencedRelation: "call_sheet"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_call_sheet_member_company_fkey"
            columns: ["company"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_call_sheet_member_crew_member_fkey"
            columns: ["crew_member"]
            isOneToOne: false
            referencedRelation: "company_crew_member"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_call_sheet_member_project_fkey"
            columns: ["project"]
            isOneToOne: false
            referencedRelation: "project"
            referencedColumns: ["id"]
          },
        ]
      }
      call_sheet_push_call: {
        Row: {
          call_sheet: string | null
          created_at: string
          hours: number | null
          id: number
          minutes: number | null
          notify: boolean | null
          src: string | null
        }
        Insert: {
          call_sheet?: string | null
          created_at?: string
          hours?: number | null
          id?: number
          minutes?: number | null
          notify?: boolean | null
          src?: string | null
        }
        Update: {
          call_sheet?: string | null
          created_at?: string
          hours?: number | null
          id?: number
          minutes?: number | null
          notify?: boolean | null
          src?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_sheet_push_call_call_sheet_fkey"
            columns: ["call_sheet"]
            isOneToOne: false
            referencedRelation: "call_sheet"
            referencedColumns: ["id"]
          },
        ]
      }
      company: {
        Row: {
          avatar: string | null
          created_at: string
          id: string
          name: string | null
          phone_number: string | null
          subdomain: string | null
        }
        Insert: {
          avatar?: string | null
          created_at?: string
          id?: string
          name?: string | null
          phone_number?: string | null
          subdomain?: string | null
        }
        Update: {
          avatar?: string | null
          created_at?: string
          id?: string
          name?: string | null
          phone_number?: string | null
          subdomain?: string | null
        }
        Relationships: []
      }
      company_crew_member: {
        Row: {
          aliases: string[] | null
          city: string | null
          company: string | null
          created_at: string
          email: string | null
          first_name: string | null
          id: number
          last_name: string | null
          name: string | null
          note: string | null
          owner: string | null
          phone: string | null
          state: string | null
          tfs: string | null
          updated_at: string | null
        }
        Insert: {
          aliases?: string[] | null
          city?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: number
          last_name?: string | null
          name?: string | null
          note?: string | null
          owner?: string | null
          phone?: string | null
          state?: string | null
          tfs?: string | null
          updated_at?: string | null
        }
        Update: {
          aliases?: string[] | null
          city?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: number
          last_name?: string | null
          name?: string | null
          note?: string | null
          owner?: string | null
          phone?: string | null
          state?: string | null
          tfs?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_crew_member_company_fkey"
            columns: ["company"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_crew_member_owner_fkey"
            columns: ["owner"]
            isOneToOne: false
            referencedRelation: "member"
            referencedColumns: ["id"]
          },
        ]
      }
      company_entity: {
        Row: {
          address: string | null
          call_sheet: string | null
          company: string | null
          created_at: string
          email: string | null
          id: string
          logo: string | null
          name: string | null
          order: number | null
          phone: string | null
          project: string | null
          subtype: string | null
          type: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          call_sheet?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo?: string | null
          name?: string | null
          order?: number | null
          phone?: string | null
          project?: string | null
          subtype?: string | null
          type?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          call_sheet?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo?: string | null
          name?: string | null
          order?: number | null
          phone?: string | null
          project?: string | null
          subtype?: string | null
          type?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_entity_call_sheet_fkey"
            columns: ["call_sheet"]
            isOneToOne: false
            referencedRelation: "call_sheet"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_entity_company_fkey"
            columns: ["company"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_entity_project_fkey"
            columns: ["project"]
            isOneToOne: false
            referencedRelation: "project"
            referencedColumns: ["id"]
          },
        ]
      }
      company_policy: {
        Row: {
          acknowledgeable: boolean | null
          company: string | null
          created_at: string
          id: number
          note: string | null
          priority: number | null
          title: string | null
          type: Database["public"]["Enums"]["note_type"] | null
        }
        Insert: {
          acknowledgeable?: boolean | null
          company?: string | null
          created_at?: string
          id?: number
          note?: string | null
          priority?: number | null
          title?: string | null
          type?: Database["public"]["Enums"]["note_type"] | null
        }
        Update: {
          acknowledgeable?: boolean | null
          company?: string | null
          created_at?: string
          id?: number
          note?: string | null
          priority?: number | null
          title?: string | null
          type?: Database["public"]["Enums"]["note_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "company_policy_company_fkey"
            columns: ["company"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      company_setting: {
        Row: {
          company: string | null
          company_notice_priority:
            | Database["public"]["Enums"]["company_notice_priority"]
            | null
          created_at: string
          id: number
        }
        Insert: {
          company?: string | null
          company_notice_priority?:
            | Database["public"]["Enums"]["company_notice_priority"]
            | null
          created_at?: string
          id?: number
        }
        Update: {
          company?: string | null
          company_notice_priority?:
            | Database["public"]["Enums"]["company_notice_priority"]
            | null
          created_at?: string
          id?: number
        }
        Relationships: [
          {
            foreignKeyName: "company_setting_company_fkey"
            columns: ["company"]
            isOneToOne: true
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      company_user: {
        Row: {
          company: string | null
          created_at: string
          id: number
          role: Database["public"]["Enums"]["role"] | null
          user: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string
          id?: number
          role?: Database["public"]["Enums"]["role"] | null
          user?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string
          id?: number
          role?: Database["public"]["Enums"]["role"] | null
          user?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_user_company_fkey"
            columns: ["company"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_user_user_fkey1"
            columns: ["user"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      company_user_invite: {
        Row: {
          company: string | null
          created_at: string | null
          email: string
          expires_at: string
          id: string
          project: string | null
          role: Database["public"]["Enums"]["role"] | null
          token: string
          used: boolean | null
        }
        Insert: {
          company?: string | null
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          project?: string | null
          role?: Database["public"]["Enums"]["role"] | null
          token: string
          used?: boolean | null
        }
        Update: {
          company?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          project?: string | null
          role?: Database["public"]["Enums"]["role"] | null
          token?: string
          used?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "company_user_invite_company_fkey"
            columns: ["company"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_user_invite_project_fkey"
            columns: ["project"]
            isOneToOne: false
            referencedRelation: "project"
            referencedColumns: ["id"]
          },
        ]
      }
      company_user_project: {
        Row: {
          company_user_id: number
          id: number
          project: string | null
          role: Database["public"]["Enums"]["role"] | null
        }
        Insert: {
          company_user_id: number
          id?: number
          project?: string | null
          role?: Database["public"]["Enums"]["role"] | null
        }
        Update: {
          company_user_id?: number
          id?: number
          project?: string | null
          role?: Database["public"]["Enums"]["role"] | null
        }
        Relationships: [
          {
            foreignKeyName: "company_user_project_company_user_id_fkey"
            columns: ["company_user_id"]
            isOneToOne: false
            referencedRelation: "company_user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_user_project_project_fkey"
            columns: ["project"]
            isOneToOne: false
            referencedRelation: "project"
            referencedColumns: ["id"]
          },
        ]
      }
      crew_rule_set: {
        Row: {
          company: string | null
          created_at: string
          id: number
          rule_set: Json | null
        }
        Insert: {
          company?: string | null
          created_at?: string
          id?: number
          rule_set?: Json | null
        }
        Update: {
          company?: string | null
          created_at?: string
          id?: number
          rule_set?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "crew_rule_set_company_fkey"
            columns: ["company"]
            isOneToOne: true
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      crewing_contact_attempt: {
        Row: {
          contacted_at: string | null
          created_at: string | null
          crew: number
          crew_member_id: number | null
          id: number
          position: number
          response_deadline: string | null
          short_id: string | null
          status: Database["public"]["Enums"]["crewing_contact_attempt_status"]
          updated_at: string | null
        }
        Insert: {
          contacted_at?: string | null
          created_at?: string | null
          crew: number
          crew_member_id?: number | null
          id?: number
          position: number
          response_deadline?: string | null
          short_id?: string | null
          status?: Database["public"]["Enums"]["crewing_contact_attempt_status"]
          updated_at?: string | null
        }
        Update: {
          contacted_at?: string | null
          created_at?: string | null
          crew?: number
          crew_member_id?: number | null
          id?: number
          position?: number
          response_deadline?: string | null
          short_id?: string | null
          status?: Database["public"]["Enums"]["crewing_contact_attempt_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crewing_contact_attempt_crew_fkey"
            columns: ["crew"]
            isOneToOne: false
            referencedRelation: "crewing_position_crew"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crewing_contact_attempt_crew_member_id_fkey"
            columns: ["crew_member_id"]
            isOneToOne: false
            referencedRelation: "company_crew_member"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crewing_contact_attempt_position_fkey"
            columns: ["position"]
            isOneToOne: false
            referencedRelation: "crewing_position"
            referencedColumns: ["id"]
          },
        ]
      }
      crewing_contact_attempt_message: {
        Row: {
          attempt: number | null
          created_at: string
          external_id: string | null
          id: number
          source: Database["public"]["Enums"]["message_source"] | null
          to: string | null
          type: Database["public"]["Enums"]["message_type"] | null
        }
        Insert: {
          attempt?: number | null
          created_at?: string
          external_id?: string | null
          id?: number
          source?: Database["public"]["Enums"]["message_source"] | null
          to?: string | null
          type?: Database["public"]["Enums"]["message_type"] | null
        }
        Update: {
          attempt?: number | null
          created_at?: string
          external_id?: string | null
          id?: number
          source?: Database["public"]["Enums"]["message_source"] | null
          to?: string | null
          type?: Database["public"]["Enums"]["message_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "crewing_contact_attempt_message_attempt_fkey"
            columns: ["attempt"]
            isOneToOne: false
            referencedRelation: "crewing_contact_attempt"
            referencedColumns: ["id"]
          },
        ]
      }
      crewing_position: {
        Row: {
          created_at: string
          hiring_status: Database["public"]["Enums"]["hiring_status"] | null
          id: number
          position: string | null
          project: string | null
          quantity: number | null
        }
        Insert: {
          created_at?: string
          hiring_status?: Database["public"]["Enums"]["hiring_status"] | null
          id?: number
          position?: string | null
          project?: string | null
          quantity?: number | null
        }
        Update: {
          created_at?: string
          hiring_status?: Database["public"]["Enums"]["hiring_status"] | null
          id?: number
          position?: string | null
          project?: string | null
          quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "crewing_position_project_fkey"
            columns: ["project"]
            isOneToOne: false
            referencedRelation: "project"
            referencedColumns: ["id"]
          },
        ]
      }
      crewing_position_crew: {
        Row: {
          created_at: string
          crew: number | null
          crewing_position: number | null
          id: number
          priority: number | null
        }
        Insert: {
          created_at?: string
          crew?: number | null
          crewing_position?: number | null
          id?: number
          priority?: number | null
        }
        Update: {
          created_at?: string
          crew?: number | null
          crewing_position?: number | null
          id?: number
          priority?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "crewing_position_crew_crew_fkey"
            columns: ["crew"]
            isOneToOne: false
            referencedRelation: "company_crew_member"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crewing_position_crew_crewing_position_fkey"
            columns: ["crewing_position"]
            isOneToOne: false
            referencedRelation: "crewing_position"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_point_of_contact: {
        Row: {
          avatar: string | null
          call: string | null
          company_entity: string | null
          created_at: string
          email: string | null
          id: string
          isMain: boolean | null
          name: string | null
          phone: string | null
          project: string | null
          project_entity: string | null
          role: string | null
          title: string | null
          updated_at: string | null
          wrap: string | null
        }
        Insert: {
          avatar?: string | null
          call?: string | null
          company_entity?: string | null
          created_at?: string
          email?: string | null
          id?: string
          isMain?: boolean | null
          name?: string | null
          phone?: string | null
          project?: string | null
          project_entity?: string | null
          role?: string | null
          title?: string | null
          updated_at?: string | null
          wrap?: string | null
        }
        Update: {
          avatar?: string | null
          call?: string | null
          company_entity?: string | null
          created_at?: string
          email?: string | null
          id?: string
          isMain?: boolean | null
          name?: string | null
          phone?: string | null
          project?: string | null
          project_entity?: string | null
          role?: string | null
          title?: string | null
          updated_at?: string | null
          wrap?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entity_point_of_contact_company_entity_fkey"
            columns: ["company_entity"]
            isOneToOne: false
            referencedRelation: "company_entity"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_point_of_contact_project_entity_fkey"
            columns: ["project_entity"]
            isOneToOne: false
            referencedRelation: "project_entity"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_point_of_contact_project_fkey"
            columns: ["project"]
            isOneToOne: false
            referencedRelation: "project"
            referencedColumns: ["id"]
          },
        ]
      }
      file: {
        Row: {
          call_sheet: string | null
          company: string | null
          created_at: string
          id: number
          kind: string | null
          priority: number | null
          project: string | null
          src: string | null
          title: string | null
          type: Database["public"]["Enums"]["file_type"] | null
        }
        Insert: {
          call_sheet?: string | null
          company?: string | null
          created_at?: string
          id?: number
          kind?: string | null
          priority?: number | null
          project?: string | null
          src?: string | null
          title?: string | null
          type?: Database["public"]["Enums"]["file_type"] | null
        }
        Update: {
          call_sheet?: string | null
          company?: string | null
          created_at?: string
          id?: number
          kind?: string | null
          priority?: number | null
          project?: string | null
          src?: string | null
          title?: string | null
          type?: Database["public"]["Enums"]["file_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "file_call_sheet_fkey"
            columns: ["call_sheet"]
            isOneToOne: false
            referencedRelation: "call_sheet"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_company_fkey"
            columns: ["company"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_project_fkey"
            columns: ["project"]
            isOneToOne: false
            referencedRelation: "project"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_call_sheet_pdfs: {
        Row: {
          call_sheet_id: string | null
          call_sheet_updated_at: string | null
          created_at: string
          id: string
          src: string | null
        }
        Insert: {
          call_sheet_id?: string | null
          call_sheet_updated_at?: string | null
          created_at?: string
          id?: string
          src?: string | null
        }
        Update: {
          call_sheet_id?: string | null
          call_sheet_updated_at?: string | null
          created_at?: string
          id?: string
          src?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_call_sheet_pdfs_call_sheet_id_fkey"
            columns: ["call_sheet_id"]
            isOneToOne: false
            referencedRelation: "call_sheet"
            referencedColumns: ["id"]
          },
        ]
      }
      location: {
        Row: {
          address: string | null
          city: string | null
          company: string | null
          created_at: string
          description: string | null
          id: number
          instructions: string | null
          name: string | null
          places_json: Json | null
          priority: number | null
          state: string | null
          type: string | null
          updated_at: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company?: string | null
          created_at?: string
          description?: string | null
          id?: number
          instructions?: string | null
          name?: string | null
          places_json?: Json | null
          priority?: number | null
          state?: string | null
          type?: string | null
          updated_at?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company?: string | null
          created_at?: string
          description?: string | null
          id?: number
          instructions?: string | null
          name?: string | null
          places_json?: Json | null
          priority?: number | null
          state?: string | null
          type?: string | null
          updated_at?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "location_company_fkey"
            columns: ["company"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      member: {
        Row: {
          avatar: string | null
          city: string | null
          created_at: string
          department: string | null
          email: string | null
          id: string
          imdb: string | null
          instagram: string | null
          name: string | null
          phone: string | null
          state: string | null
          title: string | null
          vimeo: string | null
          youtube: string | null
        }
        Insert: {
          avatar?: string | null
          city?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          id?: string
          imdb?: string | null
          instagram?: string | null
          name?: string | null
          phone?: string | null
          state?: string | null
          title?: string | null
          vimeo?: string | null
          youtube?: string | null
        }
        Update: {
          avatar?: string | null
          city?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          id?: string
          imdb?: string | null
          instagram?: string | null
          name?: string | null
          phone?: string | null
          state?: string | null
          title?: string | null
          vimeo?: string | null
          youtube?: string | null
        }
        Relationships: []
      }
      note: {
        Row: {
          acknowledgeable: boolean | null
          call_sheet: string | null
          created_at: string
          id: number
          isAbove: boolean | null
          isHighlighted: boolean | null
          note: string | null
          priority: number | null
          project: string | null
          title: string | null
          type: Database["public"]["Enums"]["note_type"]
          updated_at: string
        }
        Insert: {
          acknowledgeable?: boolean | null
          call_sheet?: string | null
          created_at?: string
          id?: number
          isAbove?: boolean | null
          isHighlighted?: boolean | null
          note?: string | null
          priority?: number | null
          project?: string | null
          title?: string | null
          type?: Database["public"]["Enums"]["note_type"]
          updated_at?: string
        }
        Update: {
          acknowledgeable?: boolean | null
          call_sheet?: string | null
          created_at?: string
          id?: number
          isAbove?: boolean | null
          isHighlighted?: boolean | null
          note?: string | null
          priority?: number | null
          project?: string | null
          title?: string | null
          type?: Database["public"]["Enums"]["note_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_call_sheet_fkey"
            columns: ["call_sheet"]
            isOneToOne: false
            referencedRelation: "call_sheet"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "note_project_fkey"
            columns: ["project"]
            isOneToOne: false
            referencedRelation: "project"
            referencedColumns: ["id"]
          },
        ]
      }
      note_acknowledge: {
        Row: {
          created_at: string
          id: number
          member: string | null
          note: number | null
          notice: number | null
        }
        Insert: {
          created_at?: string
          id?: number
          member?: string | null
          note?: number | null
          notice?: number | null
        }
        Update: {
          created_at?: string
          id?: number
          member?: string | null
          note?: number | null
          notice?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "note_acknowledge_member_fkey"
            columns: ["member"]
            isOneToOne: false
            referencedRelation: "member"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "note_acknowledge_note_fkey"
            columns: ["note"]
            isOneToOne: false
            referencedRelation: "note"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "note_acknowledge_notice_fkey"
            columns: ["notice"]
            isOneToOne: false
            referencedRelation: "company_policy"
            referencedColumns: ["id"]
          },
        ]
      }
      note_file: {
        Row: {
          created_at: string
          file: number | null
          id: number
          note: number | null
        }
        Insert: {
          created_at?: string
          file?: number | null
          id?: number
          note?: number | null
        }
        Update: {
          created_at?: string
          file?: number | null
          id?: number
          note?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "note_file_file_fkey"
            columns: ["file"]
            isOneToOne: false
            referencedRelation: "file"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "note_file_note_fkey"
            columns: ["note"]
            isOneToOne: false
            referencedRelation: "note"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_log: {
        Row: {
          call_sheet: string | null
          call_sheet_member: string | null
          company: string | null
          content: string | null
          created_date: string | null
          id: number
          is_read: boolean | null
          type: Database["public"]["Enums"]["notification_type"]
        }
        Insert: {
          call_sheet?: string | null
          call_sheet_member?: string | null
          company?: string | null
          content?: string | null
          created_date?: string | null
          id?: number
          is_read?: boolean | null
          type: Database["public"]["Enums"]["notification_type"]
        }
        Update: {
          call_sheet?: string | null
          call_sheet_member?: string | null
          company?: string | null
          content?: string | null
          created_date?: string | null
          id?: number
          is_read?: boolean | null
          type?: Database["public"]["Enums"]["notification_type"]
        }
        Relationships: [
          {
            foreignKeyName: "public_notification_log_call_sheet_fkey"
            columns: ["call_sheet"]
            isOneToOne: false
            referencedRelation: "call_sheet"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_notification_log_call_sheet_member_fkey"
            columns: ["call_sheet_member"]
            isOneToOne: false
            referencedRelation: "call_sheet_member"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_notification_log_company_fkey"
            columns: ["company"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      position: {
        Row: {
          company: string | null
          created_at: string
          crew: number | null
          department: string[] | null
          id: number
          known: boolean | null
          name: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string
          crew?: number | null
          department?: string[] | null
          id?: number
          known?: boolean | null
          name?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string
          crew?: number | null
          department?: string[] | null
          id?: number
          known?: boolean | null
          name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "position_company_fkey"
            columns: ["company"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_position_crew_fkey"
            columns: ["crew"]
            isOneToOne: false
            referencedRelation: "company_crew_member"
            referencedColumns: ["id"]
          },
        ]
      }
      profile: {
        Row: {
          email: string | null
          id: string
          name: string | null
          phone: string | null
          picture: string | null
        }
        Insert: {
          email?: string | null
          id: string
          name?: string | null
          phone?: string | null
          picture?: string | null
        }
        Update: {
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          picture?: string | null
        }
        Relationships: []
      }
      project: {
        Row: {
          budget: string | null
          client_or_agency: string | null
          company: string | null
          contact_info_visible: boolean | null
          created_at: string
          dates: string[] | null
          delivery_date: string | null
          id: string
          job_number: string | null
          name: string | null
          post_dates: string[] | null
          prep_dates: string[] | null
          short_id: string | null
          slug: string | null
          status: string | null
          type: string | null
        }
        Insert: {
          budget?: string | null
          client_or_agency?: string | null
          company?: string | null
          contact_info_visible?: boolean | null
          created_at?: string
          dates?: string[] | null
          delivery_date?: string | null
          id?: string
          job_number?: string | null
          name?: string | null
          post_dates?: string[] | null
          prep_dates?: string[] | null
          short_id?: string | null
          slug?: string | null
          status?: string | null
          type?: string | null
        }
        Update: {
          budget?: string | null
          client_or_agency?: string | null
          company?: string | null
          contact_info_visible?: boolean | null
          created_at?: string
          dates?: string[] | null
          delivery_date?: string | null
          id?: string
          job_number?: string | null
          name?: string | null
          post_dates?: string[] | null
          prep_dates?: string[] | null
          short_id?: string | null
          slug?: string | null
          status?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "public_project_company_fkey"
            columns: ["company"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      project_contact_list: {
        Row: {
          created_at: string
          id: number
          md: string | null
          project: string | null
          src: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          md?: string | null
          project?: string | null
          src?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          md?: string | null
          project?: string | null
          src?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_contact_list_project_fkey"
            columns: ["project"]
            isOneToOne: false
            referencedRelation: "project"
            referencedColumns: ["id"]
          },
        ]
      }
      project_entity: {
        Row: {
          address: string | null
          call_sheet: string | null
          company: string | null
          created_at: string
          email: string | null
          id: string
          logo: string | null
          name: string | null
          order: number | null
          phone: string | null
          project: string | null
          subtype: string | null
          type: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          call_sheet?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo?: string | null
          name?: string | null
          order?: number | null
          phone?: string | null
          project?: string | null
          subtype?: string | null
          type?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          call_sheet?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo?: string | null
          name?: string | null
          order?: number | null
          phone?: string | null
          project?: string | null
          subtype?: string | null
          type?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_entity_call_sheet_fkey"
            columns: ["call_sheet"]
            isOneToOne: false
            referencedRelation: "call_sheet"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_entity_company_fkey"
            columns: ["company"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_entity_project_fkey"
            columns: ["project"]
            isOneToOne: false
            referencedRelation: "project"
            referencedColumns: ["id"]
          },
        ]
      }
      project_location: {
        Row: {
          created_at: string
          description: string | null
          id: number
          instructions: string | null
          location: number
          name: string | null
          order: number | null
          project: string
          type: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: number
          instructions?: string | null
          location: number
          name?: string | null
          order?: number | null
          project: string
          type?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: number
          instructions?: string | null
          location?: number
          name?: string | null
          order?: number | null
          project?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_location_location_fkey"
            columns: ["location"]
            isOneToOne: false
            referencedRelation: "location"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_location_project_fkey1"
            columns: ["project"]
            isOneToOne: false
            referencedRelation: "project"
            referencedColumns: ["id"]
          },
        ]
      }
      project_member: {
        Row: {
          created_at: string
          crew: number | null
          email: string | null
          id: number
          name: string | null
          phone: string | null
          project: string | null
          short_id: string | null
        }
        Insert: {
          created_at?: string
          crew?: number | null
          email?: string | null
          id?: number
          name?: string | null
          phone?: string | null
          project?: string | null
          short_id?: string | null
        }
        Update: {
          created_at?: string
          crew?: number | null
          email?: string | null
          id?: number
          name?: string | null
          phone?: string | null
          project?: string | null
          short_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_member_crew_fkey"
            columns: ["crew"]
            isOneToOne: false
            referencedRelation: "company_crew_member"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_member_project_fkey"
            columns: ["project"]
            isOneToOne: false
            referencedRelation: "project"
            referencedColumns: ["id"]
          },
        ]
      }
      project_position: {
        Row: {
          created_at: string
          department: string | null
          department_order: number | null
          id: number
          order: number | null
          project: string | null
          project_member: number | null
          status: Database["public"]["Enums"]["project_crew_status"] | null
          title: string | null
        }
        Insert: {
          created_at?: string
          department?: string | null
          department_order?: number | null
          id?: number
          order?: number | null
          project?: string | null
          project_member?: number | null
          status?: Database["public"]["Enums"]["project_crew_status"] | null
          title?: string | null
        }
        Update: {
          created_at?: string
          department?: string | null
          department_order?: number | null
          id?: number
          order?: number | null
          project?: string | null
          project_member?: number | null
          status?: Database["public"]["Enums"]["project_crew_status"] | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_position_project_fkey"
            columns: ["project"]
            isOneToOne: false
            referencedRelation: "project"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_position_project_member_fkey"
            columns: ["project_member"]
            isOneToOne: false
            referencedRelation: "project_member"
            referencedColumns: ["id"]
          },
        ]
      }
      rank: {
        Row: {
          company: string | null
          created_at: string
          crew: number[] | null
          id: number
          role: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string
          crew?: number[] | null
          id?: number
          role?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string
          crew?: number[] | null
          id?: number
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rank_company_fkey"
            columns: ["company"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      role_rate: {
        Row: {
          created_at: string
          crew_member: number | null
          currency: string | null
          id: number
          rate: number | null
          role: string | null
          type: Database["public"]["Enums"]["rate_type"] | null
        }
        Insert: {
          created_at?: string
          crew_member?: number | null
          currency?: string | null
          id?: number
          rate?: number | null
          role?: string | null
          type?: Database["public"]["Enums"]["rate_type"] | null
        }
        Update: {
          created_at?: string
          crew_member?: number | null
          currency?: string | null
          id?: number
          rate?: number | null
          role?: string | null
          type?: Database["public"]["Enums"]["rate_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "role_rate_crew_member_fkey"
            columns: ["crew_member"]
            isOneToOne: false
            referencedRelation: "company_crew_member"
            referencedColumns: ["id"]
          },
        ]
      }
      test_db_pull_table_table: {
        Row: {
          created_at: string
          id: number
        }
        Insert: {
          created_at?: string
          id?: number
        }
        Update: {
          created_at?: string
          id?: number
        }
        Relationships: []
      }
    }
    Views: {
      distinct_call_sheet_member: {
        Row: {
          crew_member: number | null
          project: string | null
        }
        Relationships: [
          {
            foreignKeyName: "public_call_sheet_member_crew_member_fkey"
            columns: ["crew_member"]
            isOneToOne: false
            referencedRelation: "company_crew_member"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_call_sheet_member_project_fkey"
            columns: ["project"]
            isOneToOne: false
            referencedRelation: "project"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      get_company_crew_roles_by_departments: {
        Args: {
          company_id: string
          department_names: string[]
        }
        Returns: {
          role: string
          count: number
        }[]
      }
      get_crew_departments: {
        Args: {
          company_id: string
        }
        Returns: {
          department: string
          count: number
        }[]
      }
      get_crew_positions: {
        Args: {
          company_id: string
        }
        Returns: {
          name: string
          department: string[]
          crew_count: number
        }[]
      }
      gtrgm_compress: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      gtrgm_in: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      gtrgm_options: {
        Args: {
          "": unknown
        }
        Returns: undefined
      }
      gtrgm_out: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      set_limit: {
        Args: {
          "": number
        }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: {
          "": string
        }
        Returns: string[]
      }
      slugify: {
        Args: {
          value: string
        }
        Returns: string
      }
      unaccent: {
        Args: {
          "": string
        }
        Returns: string
      }
      unaccent_init: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
    }
    Enums: {
      CallSheetMemberStatus:
        | "sent-call-card"
        | "confirmed"
        | "pending"
        | "call-card-sms-failed"
        | "call-card-sms-delivered"
      CallSheetStatus: "ready" | "draft" | "parsing" | "error" | "processing"
      company_notice_priority: "above" | "below"
      crewing_contact_attempt_status:
        | "pending"
        | "declined"
        | "no_response"
        | "confirmed"
        | "contacted"
      file_type: "default" | "signable"
      hiring_status: "open" | "in_progress" | "closed" | "completed"
      location_type:
        | "shoot"
        | "hospital"
        | "parking"
        | "production office"
        | "basecamp"
        | "food"
      message_source: "twilio"
      message_type: "sms" | "email"
      note_type: "before_details" | "on_page" | "featured"
      notification_type:
        | "message"
        | "message_delivered"
        | "message_failed"
        | "call_card_sent"
        | "call_card_confirmed"
        | "call_card_opened"
        | "call_card_login_email"
        | "call_card_login_phone"
        | "call_card_delivered"
        | "call_card_failed"
        | "call_card_push_sent"
        | "call_card_opened_pdf"
        | "call_card_email_sent"
        | "call_card_email_delivered"
        | "call_card_email_failed"
        | "message_email"
        | "message_email_delivered"
        | "message_email_failed"
        | "message_email_opened"
        | "call_card_email_opened"
      project_crew_status: "declined" | "pending" | "confirmed" | "contacted"
      project_role_type: "admin" | "user" | "guest"
      rate_type: "hour" | "day" | "week"
      role: "admin" | "user" | "guest"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          level: number | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          level?: number | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          level?: number | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      prefixes: {
        Row: {
          bucket_id: string
          created_at: string | null
          level: number
          name: string
          updated_at: string | null
        }
        Insert: {
          bucket_id: string
          created_at?: string | null
          level?: number
          name: string
          updated_at?: string | null
        }
        Update: {
          bucket_id?: string
          created_at?: string | null
          level?: number
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prefixes_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_prefixes: {
        Args: {
          _bucket_id: string
          _name: string
        }
        Returns: undefined
      }
      can_insert_object: {
        Args: {
          bucketid: string
          name: string
          owner: string
          metadata: Json
        }
        Returns: undefined
      }
      delete_prefix: {
        Args: {
          _bucket_id: string
          _name: string
        }
        Returns: boolean
      }
      extension: {
        Args: {
          name: string
        }
        Returns: string
      }
      filename: {
        Args: {
          name: string
        }
        Returns: string
      }
      foldername: {
        Args: {
          name: string
        }
        Returns: string[]
      }
      get_level: {
        Args: {
          name: string
        }
        Returns: number
      }
      get_prefix: {
        Args: {
          name: string
        }
        Returns: string
      }
      get_prefixes: {
        Args: {
          name: string
        }
        Returns: string[]
      }
      get_size_by_bucket: {
        Args: Record<PropertyKey, never>
        Returns: {
          size: number
          bucket_id: string
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          prefix_param: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
        }
        Returns: {
          key: string
          id: string
          created_at: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          bucket_id: string
          prefix_param: string
          delimiter_param: string
          max_keys?: number
          start_after?: string
          next_token?: string
        }
        Returns: {
          name: string
          id: string
          metadata: Json
          updated_at: string
        }[]
      }
      operation: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      search: {
        Args: {
          prefix: string
          bucketname: string
          limits?: number
          levels?: number
          offsets?: number
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          name: string
          id: string
          updated_at: string
          created_at: string
          last_accessed_at: string
          metadata: Json
        }[]
      }
      search_legacy_v1: {
        Args: {
          prefix: string
          bucketname: string
          limits?: number
          levels?: number
          offsets?: number
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          name: string
          id: string
          updated_at: string
          created_at: string
          last_accessed_at: string
          metadata: Json
        }[]
      }
      search_v1_optimised: {
        Args: {
          prefix: string
          bucketname: string
          limits?: number
          levels?: number
          offsets?: number
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          name: string
          id: string
          updated_at: string
          created_at: string
          last_accessed_at: string
          metadata: Json
        }[]
      }
      search_v2: {
        Args: {
          prefix: string
          bucket_name: string
          limits?: number
          levels?: number
          start_after?: string
        }
        Returns: {
          key: string
          name: string
          id: string
          updated_at: string
          created_at: string
          metadata: Json
        }[]
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

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

