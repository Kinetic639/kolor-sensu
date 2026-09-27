export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      center_public_profile: {
        Row: {
          created_at: string;
          display_name: string;
          facebook_url: string | null;
          id: number;
          instagram_url: string | null;
          logo_path: string | null;
          public_email: string | null;
          public_phone: string | null;
          published: boolean;
          short_description: string | null;
          updated_at: string;
          website_url: string | null;
        };
        Insert: {
          created_at?: string;
          display_name: string;
          facebook_url?: string | null;
          id?: number;
          instagram_url?: string | null;
          logo_path?: string | null;
          public_email?: string | null;
          public_phone?: string | null;
          published?: boolean;
          short_description?: string | null;
          updated_at?: string;
          website_url?: string | null;
        };
        Update: {
          created_at?: string;
          display_name?: string;
          facebook_url?: string | null;
          id?: number;
          instagram_url?: string | null;
          logo_path?: string | null;
          public_email?: string | null;
          public_phone?: string | null;
          published?: boolean;
          short_description?: string | null;
          updated_at?: string;
          website_url?: string | null;
        };
        Relationships: [];
      };
      center_settings: {
        Row: {
          booking_enabled: boolean;
          business_name: string;
          cancellation_window_hours: number;
          created_at: string;
          default_currency: string;
          default_locale: string;
          default_visit_buffer_minutes: number;
          email: string | null;
          id: number;
          max_booking_horizon_days: number;
          min_booking_lead_minutes: number;
          phone: string | null;
          timezone: string;
          updated_at: string;
        };
        Insert: {
          booking_enabled?: boolean;
          business_name: string;
          cancellation_window_hours?: number;
          created_at?: string;
          default_currency?: string;
          default_locale?: string;
          default_visit_buffer_minutes?: number;
          email?: string | null;
          id?: number;
          max_booking_horizon_days?: number;
          min_booking_lead_minutes?: number;
          phone?: string | null;
          timezone?: string;
          updated_at?: string;
        };
        Update: {
          booking_enabled?: boolean;
          business_name?: string;
          cancellation_window_hours?: number;
          created_at?: string;
          default_currency?: string;
          default_locale?: string;
          default_visit_buffer_minutes?: number;
          email?: string | null;
          id?: number;
          max_booking_horizon_days?: number;
          min_booking_lead_minutes?: number;
          phone?: string | null;
          timezone?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      locations: {
        Row: {
          accessibility_notes: string | null;
          active: boolean;
          address_line1: string | null;
          address_line2: string | null;
          amenities: string[];
          city: string | null;
          country_code: string;
          created_at: string;
          id: string;
          name: string;
          postal_code: string | null;
          public_description: string | null;
          publicly_visible: boolean;
          slug: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          accessibility_notes?: string | null;
          active?: boolean;
          address_line1?: string | null;
          address_line2?: string | null;
          amenities?: string[];
          city?: string | null;
          country_code?: string;
          created_at?: string;
          id?: string;
          name: string;
          postal_code?: string | null;
          public_description?: string | null;
          publicly_visible?: boolean;
          slug: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          accessibility_notes?: string | null;
          active?: boolean;
          address_line1?: string | null;
          address_line2?: string | null;
          amenities?: string[];
          city?: string | null;
          country_code?: string;
          created_at?: string;
          id?: string;
          name?: string;
          postal_code?: string | null;
          public_description?: string | null;
          publicly_visible?: boolean;
          slug?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          active: boolean;
          avatar_url: string | null;
          created_at: string;
          first_name: string;
          id: string;
          last_name: string;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          avatar_url?: string | null;
          created_at?: string;
          first_name?: string;
          id: string;
          last_name?: string;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          avatar_url?: string | null;
          created_at?: string;
          first_name?: string;
          id?: string;
          last_name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      room_availability_exceptions: {
        Row: {
          created_at: string;
          date: string;
          ends_at: string | null;
          id: string;
          reason: string | null;
          room_id: string;
          starts_at: string | null;
          type: Database["public"]["Enums"]["room_availability_exception_type"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          date: string;
          ends_at?: string | null;
          id?: string;
          reason?: string | null;
          room_id: string;
          starts_at?: string | null;
          type: Database["public"]["Enums"]["room_availability_exception_type"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          date?: string;
          ends_at?: string | null;
          id?: string;
          reason?: string | null;
          room_id?: string;
          starts_at?: string | null;
          type?: Database["public"]["Enums"]["room_availability_exception_type"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "room_availability_exceptions_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          },
        ];
      };
      room_images: {
        Row: {
          created_at: string;
          id: string;
          is_main: boolean;
          position: number;
          room_id: string;
          storage_path: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_main?: boolean;
          position: number;
          room_id: string;
          storage_path: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_main?: boolean;
          position?: number;
          room_id?: string;
          storage_path?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "room_images_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          },
        ];
      };
      room_opening_hours: {
        Row: {
          created_at: string;
          ends_at: string;
          id: string;
          room_id: string;
          starts_at: string;
          time_span: unknown;
          updated_at: string;
          weekday: number;
        };
        Insert: {
          created_at?: string;
          ends_at: string;
          id?: string;
          room_id: string;
          starts_at: string;
          time_span?: unknown;
          updated_at?: string;
          weekday: number;
        };
        Update: {
          created_at?: string;
          ends_at?: string;
          id?: string;
          room_id?: string;
          starts_at?: string;
          time_span?: unknown;
          updated_at?: string;
          weekday?: number;
        };
        Relationships: [
          {
            foreignKeyName: "room_opening_hours_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          },
        ];
      };
      room_public_profiles: {
        Row: {
          accessibility_notes: string | null;
          amenities: string[];
          created_at: string;
          display_name: string;
          image_path: string | null;
          long_description: Json;
          published: boolean;
          room_id: string;
          short_description: string | null;
          updated_at: string;
        };
        Insert: {
          accessibility_notes?: string | null;
          amenities?: string[];
          created_at?: string;
          display_name: string;
          image_path?: string | null;
          long_description?: Json;
          published?: boolean;
          room_id: string;
          short_description?: string | null;
          updated_at?: string;
        };
        Update: {
          accessibility_notes?: string | null;
          amenities?: string[];
          created_at?: string;
          display_name?: string;
          image_path?: string | null;
          long_description?: Json;
          published?: boolean;
          room_id?: string;
          short_description?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "room_public_profiles_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: true;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          },
        ];
      };
      rooms: {
        Row: {
          active: boolean;
          capacity: number;
          created_at: string;
          description: string | null;
          id: string;
          location_id: string;
          name: string;
          publicly_visible: boolean;
          slug: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          capacity?: number;
          created_at?: string;
          description?: string | null;
          id?: string;
          location_id: string;
          name: string;
          publicly_visible?: boolean;
          slug: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          capacity?: number;
          created_at?: string;
          description?: string | null;
          id?: string;
          location_id?: string;
          name?: string;
          publicly_visible?: boolean;
          slug?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rooms_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
        ];
      };
      services: {
        Row: {
          active: boolean;
          booking_enabled: boolean;
          category: Database["public"]["Enums"]["service_category"];
          created_at: string;
          default_duration_minutes: number;
          description: string | null;
          id: string;
          name: string;
          publicly_visible: boolean;
          short_description: string | null;
          slug: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          booking_enabled?: boolean;
          category?: Database["public"]["Enums"]["service_category"];
          created_at?: string;
          default_duration_minutes: number;
          description?: string | null;
          id?: string;
          name: string;
          publicly_visible?: boolean;
          short_description?: string | null;
          slug: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          booking_enabled?: boolean;
          category?: Database["public"]["Enums"]["service_category"];
          created_at?: string;
          default_duration_minutes?: number;
          description?: string | null;
          id?: string;
          name?: string;
          publicly_visible?: boolean;
          short_description?: string | null;
          slug?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      site_content: {
        Row: {
          created_at: string;
          draft_payload: Json;
          key: string;
          published_at: string | null;
          published_payload: Json | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          draft_payload: Json;
          key: string;
          published_at?: string | null;
          published_payload?: Json | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          draft_payload?: Json;
          key?: string;
          published_at?: string | null;
          published_payload?: Json | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      specialist_profile_drafts: {
        Row: {
          certificates: string[];
          created_at: string;
          display_name: string;
          education: string[];
          id: string;
          languages: string[];
          long_bio: Json;
          modalities: string[];
          portrait_photo_url: string | null;
          professional_title: string | null;
          profile_photo_url: string | null;
          review_comment: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          short_bio: string;
          specialist_id: string;
          specializations: string[];
          status: Database["public"]["Enums"]["profile_publication_status"];
          submitted_at: string | null;
          submitted_by: string | null;
          therapy_approaches: string[];
          updated_at: string;
        };
        Insert: {
          certificates?: string[];
          created_at?: string;
          display_name?: string;
          education?: string[];
          id?: string;
          languages?: string[];
          long_bio?: Json;
          modalities?: string[];
          portrait_photo_url?: string | null;
          professional_title?: string | null;
          profile_photo_url?: string | null;
          review_comment?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          short_bio?: string;
          specialist_id: string;
          specializations?: string[];
          status?: Database["public"]["Enums"]["profile_publication_status"];
          submitted_at?: string | null;
          submitted_by?: string | null;
          therapy_approaches?: string[];
          updated_at?: string;
        };
        Update: {
          certificates?: string[];
          created_at?: string;
          display_name?: string;
          education?: string[];
          id?: string;
          languages?: string[];
          long_bio?: Json;
          modalities?: string[];
          portrait_photo_url?: string | null;
          professional_title?: string | null;
          profile_photo_url?: string | null;
          review_comment?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          short_bio?: string;
          specialist_id?: string;
          specializations?: string[];
          status?: Database["public"]["Enums"]["profile_publication_status"];
          submitted_at?: string | null;
          submitted_by?: string | null;
          therapy_approaches?: string[];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "specialist_profile_drafts_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "specialist_profile_drafts_specialist_id_fkey";
            columns: ["specialist_id"];
            isOneToOne: false;
            referencedRelation: "specialists";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "specialist_profile_drafts_submitted_by_fkey";
            columns: ["submitted_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      specialist_public_profiles: {
        Row: {
          certificates: string[];
          created_at: string;
          display_name: string;
          education: string[];
          languages: string[];
          long_bio: Json;
          modalities: string[];
          portrait_photo_url: string | null;
          profile_photo_url: string | null;
          publication_status: Database["public"]["Enums"]["profile_publication_status"];
          published_at: string | null;
          short_bio: string;
          specialist_id: string;
          specializations: string[];
          therapy_approaches: string[];
          updated_at: string;
        };
        Insert: {
          certificates?: string[];
          created_at?: string;
          display_name?: string;
          education?: string[];
          languages?: string[];
          long_bio?: Json;
          modalities?: string[];
          portrait_photo_url?: string | null;
          profile_photo_url?: string | null;
          publication_status?: Database["public"]["Enums"]["profile_publication_status"];
          published_at?: string | null;
          short_bio?: string;
          specialist_id: string;
          specializations?: string[];
          therapy_approaches?: string[];
          updated_at?: string;
        };
        Update: {
          certificates?: string[];
          created_at?: string;
          display_name?: string;
          education?: string[];
          languages?: string[];
          long_bio?: Json;
          modalities?: string[];
          portrait_photo_url?: string | null;
          profile_photo_url?: string | null;
          publication_status?: Database["public"]["Enums"]["profile_publication_status"];
          published_at?: string | null;
          short_bio?: string;
          specialist_id?: string;
          specializations?: string[];
          therapy_approaches?: string[];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "specialist_public_profiles_specialist_id_fkey";
            columns: ["specialist_id"];
            isOneToOne: true;
            referencedRelation: "specialists";
            referencedColumns: ["id"];
          },
        ];
      };
      specialist_services: {
        Row: {
          accepting_new_clients: boolean;
          active: boolean;
          created_at: string;
          currency_code: string;
          duration_minutes: number | null;
          id: string;
          price_minor: number;
          service_id: string;
          specialist_id: string;
          supports_in_person: boolean;
          supports_online: boolean;
          updated_at: string;
        };
        Insert: {
          accepting_new_clients?: boolean;
          active?: boolean;
          created_at?: string;
          currency_code?: string;
          duration_minutes?: number | null;
          id?: string;
          price_minor: number;
          service_id: string;
          specialist_id: string;
          supports_in_person?: boolean;
          supports_online?: boolean;
          updated_at?: string;
        };
        Update: {
          accepting_new_clients?: boolean;
          active?: boolean;
          created_at?: string;
          currency_code?: string;
          duration_minutes?: number | null;
          id?: string;
          price_minor?: number;
          service_id?: string;
          specialist_id?: string;
          supports_in_person?: boolean;
          supports_online?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "specialist_services_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "specialist_services_specialist_id_fkey";
            columns: ["specialist_id"];
            isOneToOne: false;
            referencedRelation: "specialists";
            referencedColumns: ["id"];
          },
        ];
      };
      specialist_slug_redirects: {
        Row: {
          created_at: string;
          old_slug: string;
          specialist_id: string;
        };
        Insert: {
          created_at?: string;
          old_slug: string;
          specialist_id: string;
        };
        Update: {
          created_at?: string;
          old_slug?: string;
          specialist_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "specialist_slug_redirects_specialist_id_fkey";
            columns: ["specialist_id"];
            isOneToOne: false;
            referencedRelation: "specialists";
            referencedColumns: ["id"];
          },
        ];
      };
      specialists: {
        Row: {
          accepting_new_clients: boolean;
          active: boolean;
          created_at: string;
          id: string;
          joined_at: string | null;
          professional_title: string | null;
          public_slug: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          accepting_new_clients?: boolean;
          active?: boolean;
          created_at?: string;
          id?: string;
          joined_at?: string | null;
          professional_title?: string | null;
          public_slug: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          accepting_new_clients?: boolean;
          active?: boolean;
          created_at?: string;
          id?: string;
          joined_at?: string | null;
          professional_title?: string | null;
          public_slug?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "specialists_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          created_at: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      workshops: {
        Row: {
          capacity: number;
          cover_image_path: string | null;
          created_at: string;
          currency_code: string;
          ends_at: string;
          id: string;
          location_id: string | null;
          long_description: string | null;
          modality: Database["public"]["Enums"]["workshop_modality"];
          price_minor: number;
          registration_enabled: boolean;
          room_id: string | null;
          short_description: string | null;
          slug: string;
          specialist_id: string;
          starts_at: string;
          status: Database["public"]["Enums"]["workshop_status"];
          title: string;
          updated_at: string;
        };
        Insert: {
          capacity: number;
          cover_image_path?: string | null;
          created_at?: string;
          currency_code?: string;
          ends_at: string;
          id?: string;
          location_id?: string | null;
          long_description?: string | null;
          modality?: Database["public"]["Enums"]["workshop_modality"];
          price_minor: number;
          registration_enabled?: boolean;
          room_id?: string | null;
          short_description?: string | null;
          slug: string;
          specialist_id: string;
          starts_at: string;
          status?: Database["public"]["Enums"]["workshop_status"];
          title: string;
          updated_at?: string;
        };
        Update: {
          capacity?: number;
          cover_image_path?: string | null;
          created_at?: string;
          currency_code?: string;
          ends_at?: string;
          id?: string;
          location_id?: string | null;
          long_description?: string | null;
          modality?: Database["public"]["Enums"]["workshop_modality"];
          price_minor?: number;
          registration_enabled?: boolean;
          room_id?: string | null;
          short_description?: string | null;
          slug?: string;
          specialist_id?: string;
          starts_at?: string;
          status?: Database["public"]["Enums"]["workshop_status"];
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workshops_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workshops_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workshops_room_location_fkey";
            columns: ["room_id", "location_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id", "location_id"];
          },
          {
            foreignKeyName: "workshops_specialist_id_fkey";
            columns: ["specialist_id"];
            isOneToOne: false;
            referencedRelation: "specialists";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      add_room_image: {
        Args: { p_room_id: string; p_storage_path: string };
        Returns: string;
      };
      approve_specialist_profile_draft: {
        Args: { p_draft_id: string; p_review_comment?: string };
        Returns: undefined;
      };
      has_role: {
        Args: { required_role: Database["public"]["Enums"]["app_role"] };
        Returns: boolean;
      };
      list_public_room_locations: {
        Args: never;
        Returns: {
          location_id: string;
          location_name: string;
          location_slug: string;
          room_id: string;
          room_slug: string;
        }[];
      };
      list_published_room_placements: {
        Args: never;
        Returns: {
          location_id: string;
          room_id: string;
          sort_order: number;
        }[];
      };
      publish_site_content: { Args: { p_key: string }; Returns: undefined };
      reject_specialist_profile_draft: {
        Args: { p_draft_id: string; p_review_comment: string };
        Returns: undefined;
      };
      remove_room_image: { Args: { p_image_id: string }; Returns: string };
      reorder_room_images: {
        Args: { p_image_ids: string[]; p_room_id: string };
        Returns: undefined;
      };
      replace_room_opening_hours: {
        Args: { p_intervals: Json; p_room_id: string };
        Returns: {
          created_at: string;
          ends_at: string;
          id: string;
          room_id: string;
          starts_at: string;
          time_span: unknown;
          updated_at: string;
          weekday: number;
        }[];
        SetofOptions: {
          from: "*";
          to: "room_opening_hours";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      save_my_specialist_profile_draft: {
        Args: {
          p_certificates?: string[];
          p_display_name: string;
          p_education?: string[];
          p_languages?: string[];
          p_long_bio?: Json;
          p_modalities?: string[];
          p_portrait_photo_url?: string;
          p_professional_title?: string;
          p_profile_photo_url?: string;
          p_short_bio?: string;
          p_specializations?: string[];
          p_therapy_approaches?: string[];
        };
        Returns: string;
      };
      set_room_main_image: { Args: { p_image_id: string }; Returns: undefined };
      set_specialist_public_slug: {
        Args: { p_public_slug: string; p_specialist_id: string };
        Returns: string;
      };
      submit_my_specialist_profile_draft: {
        Args: { p_draft_id: string };
        Returns: undefined;
      };
    };
    Enums: {
      app_role: "admin" | "specialist";
      profile_publication_status:
        "draft" | "pending_review" | "published" | "rejected";
      room_availability_exception_type:
        "closed_all_day" | "blocked_interval" | "extra_available_interval";
      service_category:
        | "consultation"
        | "psychotherapy"
        | "couples_therapy"
        | "assessment"
        | "workshop_related"
        | "other";
      workshop_modality: "in_person" | "online";
      workshop_status: "draft" | "published" | "cancelled" | "completed";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "specialist"],
      profile_publication_status: [
        "draft",
        "pending_review",
        "published",
        "rejected",
      ],
      room_availability_exception_type: [
        "closed_all_day",
        "blocked_interval",
        "extra_available_interval",
      ],
      service_category: [
        "consultation",
        "psychotherapy",
        "couples_therapy",
        "assessment",
        "workshop_related",
        "other",
      ],
      workshop_modality: ["in_person", "online"],
      workshop_status: ["draft", "published", "cancelled", "completed"],
    },
  },
} as const;
