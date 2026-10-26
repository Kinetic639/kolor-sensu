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
      appointment_events: {
        Row: {
          actor: string;
          actor_user_id: string | null;
          appointment_id: string;
          details: Json;
          id: number;
          kind: string;
          occurred_at: string;
        };
        Insert: {
          actor: string;
          actor_user_id?: string | null;
          appointment_id: string;
          details?: Json;
          id?: never;
          kind: string;
          occurred_at?: string;
        };
        Update: {
          actor?: string;
          actor_user_id?: string | null;
          appointment_id?: string;
          details?: Json;
          id?: never;
          kind?: string;
          occurred_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "appointment_events_appointment_id_fkey";
            columns: ["appointment_id"];
            isOneToOne: false;
            referencedRelation: "appointments";
            referencedColumns: ["id"];
          },
        ];
      };
      clients: {
        Row: {
          created_at: string;
          email: string;
          email_key: string;
          forgotten_at: string | null;
          id: string;
          name: string;
          first_name: string | null;
          last_name: string | null;
          notes: string | null;
          phone: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          email_key?: never;
          forgotten_at?: string | null;
          id?: string;
          name: string;
          first_name: string | null;
          last_name: string | null;
          notes?: string | null;
          phone?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          email_key?: never;
          forgotten_at?: string | null;
          id?: string;
          name?: string;
          first_name?: string | null;
          last_name?: string | null;
          notes?: string | null;
          phone?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      appointments: {
        Row: {
          access_token_hash: string;
          availability_rule_id: string | null;
          blocks: unknown;
          booked_by: string;
          buffer_minutes: number;
          cancelled_at: string | null;
          cancelled_by: string | null;
          client_id: string | null;
          client_email: string | null;
          client_name: string | null;
          client_first_name: string | null;
          client_last_name: string | null;
          client_notes: string | null;
          client_phone: string | null;
          confirmed_at: string | null;
          created_at: string;
          currency_code: string;
          duration_minutes: number;
          during: unknown;
          hold_expires_at: string | null;
          id: string;
          manage_token_hash: string | null;
          mode: Database["public"]["Enums"]["visit_mode"];
          payment_due_at: string | null;
          price_minor: number;
          privacy_accepted_at: string | null;
          reference: string;
          refund_due_minor: number | null;
          discount_code_id: string | null;
          discount_minor: number;
          list_price_minor: number | null;
          reschedule_count: number;
          reservation_confirm_by: string | null;
          reserved_by_key: string | null;
          room_id: string | null;
          service_id: string;
          specialist_id: string;
          specialist_service_id: string;
          status: Database["public"]["Enums"]["appointment_status"];
          terms_accepted_at: string | null;
          updated_at: string;
        };
        Insert: {
          access_token_hash: string;
          availability_rule_id?: string | null;
          blocks: unknown;
          booked_by?: string;
          buffer_minutes: number;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          client_id?: string | null;
          client_email?: string | null;
          client_name?: string | null;
          client_first_name?: string | null;
          client_last_name?: string | null;
          client_notes?: string | null;
          client_phone?: string | null;
          confirmed_at?: string | null;
          created_at?: string;
          currency_code: string;
          duration_minutes: number;
          during: unknown;
          hold_expires_at?: string | null;
          id?: string;
          manage_token_hash?: string | null;
          mode: Database["public"]["Enums"]["visit_mode"];
          payment_due_at?: string | null;
          price_minor: number;
          privacy_accepted_at?: string | null;
          reference: string;
          refund_due_minor?: number | null;
          discount_code_id?: string | null;
          discount_minor?: number;
          list_price_minor?: number | null;
          reschedule_count?: number;
          reservation_confirm_by?: string | null;
          reserved_by_key?: string | null;
          room_id?: string | null;
          service_id: string;
          specialist_id: string;
          specialist_service_id: string;
          status?: Database["public"]["Enums"]["appointment_status"];
          terms_accepted_at?: string | null;
          updated_at?: string;
        };
        Update: {
          access_token_hash?: string;
          availability_rule_id?: string | null;
          blocks?: unknown;
          booked_by?: string;
          buffer_minutes?: number;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          client_id?: string | null;
          client_email?: string | null;
          client_name?: string | null;
          client_first_name?: string | null;
          client_last_name?: string | null;
          client_notes?: string | null;
          client_phone?: string | null;
          confirmed_at?: string | null;
          created_at?: string;
          currency_code?: string;
          duration_minutes?: number;
          during?: unknown;
          hold_expires_at?: string | null;
          id?: string;
          manage_token_hash?: string | null;
          mode?: Database["public"]["Enums"]["visit_mode"];
          payment_due_at?: string | null;
          price_minor?: number;
          privacy_accepted_at?: string | null;
          reference?: string;
          refund_due_minor?: number | null;
          discount_code_id?: string | null;
          discount_minor?: number;
          list_price_minor?: number | null;
          reschedule_count?: number;
          reservation_confirm_by?: string | null;
          reserved_by_key?: string | null;
          room_id?: string | null;
          service_id?: string;
          specialist_id?: string;
          specialist_service_id?: string;
          status?: Database["public"]["Enums"]["appointment_status"];
          terms_accepted_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "appointments_availability_rule_id_fkey";
            columns: ["availability_rule_id"];
            isOneToOne: false;
            referencedRelation: "specialist_availability_rules";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appointments_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appointments_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appointments_specialist_id_fkey";
            columns: ["specialist_id"];
            isOneToOne: false;
            referencedRelation: "specialists";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appointments_specialist_service_id_fkey";
            columns: ["specialist_service_id"];
            isOneToOne: false;
            referencedRelation: "specialist_services";
            referencedColumns: ["id"];
          },
        ];
      };
      booking_emails: {
        Row: {
          appointment_id: string;
          claimed_at: string;
          kind: string;
          provider_message_id: string | null;
          sent_at: string | null;
        };
        Insert: {
          appointment_id: string;
          claimed_at?: string;
          kind: string;
          provider_message_id?: string | null;
          sent_at?: string | null;
        };
        Update: {
          appointment_id?: string;
          claimed_at?: string;
          kind?: string;
          provider_message_id?: string | null;
          sent_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "booking_emails_appointment_id_fkey";
            columns: ["appointment_id"];
            isOneToOne: false;
            referencedRelation: "appointments";
            referencedColumns: ["id"];
          },
        ];
      };
      article_categories: {
        Row: {
          created_at: string;
          description: string;
          id: string;
          name: string;
          slug: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string;
          id?: string;
          name: string;
          slug: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string;
          id?: string;
          name?: string;
          slug?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      articles: {
        Row: {
          author_kind: string | null;
          author_specialist_id: string | null;
          body: Json | null;
          category_id: string | null;
          content_updated_at: string | null;
          cover_alt: string | null;
          cover_path: string | null;
          created_at: string;
          draft: Json;
          ebook_id: string | null;
          id: string;
          lead: string | null;
          og_image_path: string | null;
          published_at: string | null;
          reviewer_specialist_id: string | null;
          seo_description: string | null;
          seo_title: string | null;
          slug: string | null;
          sources: Json;
          status: string;
          title: string | null;
          updated_at: string;
        };
        Insert: {
          author_kind?: string | null;
          author_specialist_id?: string | null;
          body?: Json | null;
          category_id?: string | null;
          content_updated_at?: string | null;
          cover_alt?: string | null;
          cover_path?: string | null;
          created_at?: string;
          draft?: Json;
          ebook_id?: string | null;
          id?: string;
          lead?: string | null;
          og_image_path?: string | null;
          published_at?: string | null;
          reviewer_specialist_id?: string | null;
          seo_description?: string | null;
          seo_title?: string | null;
          slug?: string | null;
          sources?: Json;
          status?: string;
          title?: string | null;
          updated_at?: string;
        };
        Update: {
          author_kind?: string | null;
          author_specialist_id?: string | null;
          body?: Json | null;
          category_id?: string | null;
          content_updated_at?: string | null;
          cover_alt?: string | null;
          cover_path?: string | null;
          created_at?: string;
          draft?: Json;
          ebook_id?: string | null;
          id?: string;
          lead?: string | null;
          og_image_path?: string | null;
          published_at?: string | null;
          reviewer_specialist_id?: string | null;
          seo_description?: string | null;
          seo_title?: string | null;
          slug?: string | null;
          sources?: Json;
          status?: string;
          title?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      discount_codes: {
        Row: {
          active: boolean;
          code: string;
          created_at: string;
          ends_on: string | null;
          id: string;
          kind: string;
          max_uses: number | null;
          note: string;
          scope: string;
          starts_on: string | null;
          updated_at: string;
          value: number;
          workshop_id: string | null;
        };
        Insert: {
          active?: boolean;
          code: string;
          created_at?: string;
          ends_on?: string | null;
          id?: string;
          kind: string;
          max_uses?: number | null;
          note?: string;
          scope?: string;
          starts_on?: string | null;
          updated_at?: string;
          value: number;
          workshop_id?: string | null;
        };
        Update: {
          active?: boolean;
          code?: string;
          created_at?: string;
          ends_on?: string | null;
          id?: string;
          kind?: string;
          max_uses?: number | null;
          note?: string;
          scope?: string;
          starts_on?: string | null;
          updated_at?: string;
          value?: number;
          workshop_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "discount_codes_workshop_id_fkey";
            columns: ["workshop_id"];
            isOneToOne: false;
            referencedRelation: "workshops";
            referencedColumns: ["id"];
          },
        ];
      };
      ebooks: {
        Row: {
          audience: string | null;
          content_updated_at: string | null;
          contents: Json | null;
          cover_alt: string | null;
          cover_path: string | null;
          created_at: string;
          description: Json | null;
          draft: Json;
          format: string | null;
          id: string;
          naffy_url: string | null;
          show_price: boolean;
          og_image_path: string | null;
          published_at: string | null;
          sample_path: string | null;
          seo_description: string | null;
          seo_title: string | null;
          short_description: string | null;
          slug: string | null;
          status: string;
          title: string | null;
          updated_at: string;
          video_url: string | null;
        };
        Insert: {
          audience?: string | null;
          content_updated_at?: string | null;
          contents?: Json | null;
          cover_alt?: string | null;
          cover_path?: string | null;
          created_at?: string;
          description?: Json | null;
          draft?: Json;
          format?: string | null;
          id?: string;
          naffy_url?: string | null;
          show_price?: boolean;
          og_image_path?: string | null;
          published_at?: string | null;
          sample_path?: string | null;
          seo_description?: string | null;
          seo_title?: string | null;
          short_description?: string | null;
          slug?: string | null;
          status?: string;
          title?: string | null;
          updated_at?: string;
          video_url?: string | null;
        };
        Update: {
          audience?: string | null;
          content_updated_at?: string | null;
          contents?: Json | null;
          cover_alt?: string | null;
          cover_path?: string | null;
          created_at?: string;
          description?: Json | null;
          draft?: Json;
          format?: string | null;
          id?: string;
          naffy_url?: string | null;
          show_price?: boolean;
          og_image_path?: string | null;
          published_at?: string | null;
          sample_path?: string | null;
          seo_description?: string | null;
          seo_title?: string | null;
          short_description?: string | null;
          slug?: string | null;
          status?: string;
          title?: string | null;
          updated_at?: string;
          video_url?: string | null;
        };
        Relationships: [];
      };
      article_services: {
        Row: {
          article_id: string;
          service_id: string;
        };
        Insert: {
          article_id?: string;
          service_id?: string;
        };
        Update: {
          article_id?: string;
          service_id?: string;
        };
        Relationships: [];
      };
      article_specialists: {
        Row: {
          article_id: string;
          specialist_id: string;
        };
        Insert: {
          article_id?: string;
          specialist_id?: string;
        };
        Update: {
          article_id?: string;
          specialist_id?: string;
        };
        Relationships: [];
      };
      article_slug_redirects: {
        Row: {
          article_id: string;
          created_at: string;
          old_slug: string;
        };
        Insert: {
          article_id?: string;
          created_at?: string;
          old_slug?: string;
        };
        Update: {
          article_id?: string;
          created_at?: string;
          old_slug?: string;
        };
        Relationships: [];
      };
      ebook_slug_redirects: {
        Row: {
          created_at: string;
          ebook_id: string;
          old_slug: string;
        };
        Insert: {
          created_at?: string;
          ebook_id?: string;
          old_slug?: string;
        };
        Update: {
          created_at?: string;
          ebook_id?: string;
          old_slug?: string;
        };
        Relationships: [];
      };
      contact_messages: {
        Row: {
          created_at: string;
          email: string;
          id: string;
          message: string;
          name: string;
          notified_at: string | null;
          phone: string | null;
          sender_key: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          id?: string;
          message: string;
          name: string;
          notified_at?: string | null;
          phone?: string | null;
          sender_key: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
          message?: string;
          name?: string;
          notified_at?: string | null;
          phone?: string | null;
          sender_key?: string;
        };
        Relationships: [];
      };
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
      centre_closures: {
        Row: {
          created_at: string;
          ends_on: string;
          id: string;
          reason: string;
          starts_on: string;
        };
        Insert: {
          created_at?: string;
          ends_on: string;
          id?: string;
          reason: string;
          starts_on: string;
        };
        Update: {
          created_at?: string;
          ends_on?: string;
          id?: string;
          reason?: string;
          starts_on?: string;
        };
        Relationships: [];
      };
      center_settings: {
        Row: {
          booking_enabled: boolean;
          business_name: string;
          cancellation_window_hours: number;
          centre_payment_link_hours: number;
          client_retention_years: number | null;
          intake_retention_months: number;
          workshops_in_menu: boolean;
          workshops_on_home: boolean;
          legal_name: string | null;
          regon: string | null;
          registered_address: string | null;
          tax_id: string | null;
          created_at: string;
          default_currency: string;
          default_locale: string;
          default_visit_buffer_minutes: number;
          email: string | null;
          hold_minutes: number;
          id: number;
          max_booking_horizon_days: number;
          max_self_reschedules: number;
          min_booking_lead_minutes: number;
          payment_due_hours: number;
          payment_reminder_hours: number | null;
          phone: string | null;
          reschedule_window_hours: number;
          slot_step_minutes: number;
          timezone: string;
          updated_at: string;
          visit_reminder_hours: number | null;
        };
        Insert: {
          booking_enabled?: boolean;
          business_name: string;
          cancellation_window_hours?: number;
          centre_payment_link_hours?: number;
          client_retention_years?: number | null;
          intake_retention_months?: number;
          workshops_in_menu?: boolean;
          workshops_on_home?: boolean;
          legal_name?: string | null;
          regon?: string | null;
          registered_address?: string | null;
          tax_id?: string | null;
          created_at?: string;
          default_currency?: string;
          default_locale?: string;
          default_visit_buffer_minutes?: number;
          email?: string | null;
          hold_minutes?: number;
          id?: number;
          max_booking_horizon_days?: number;
          max_self_reschedules?: number;
          min_booking_lead_minutes?: number;
          payment_due_hours?: number;
          payment_reminder_hours?: number | null;
          phone?: string | null;
          reschedule_window_hours?: number;
          slot_step_minutes?: number;
          timezone?: string;
          updated_at?: string;
          visit_reminder_hours?: number | null;
        };
        Update: {
          booking_enabled?: boolean;
          business_name?: string;
          cancellation_window_hours?: number;
          centre_payment_link_hours?: number;
          client_retention_years?: number | null;
          intake_retention_months?: number;
          workshops_in_menu?: boolean;
          workshops_on_home?: boolean;
          legal_name?: string | null;
          regon?: string | null;
          registered_address?: string | null;
          tax_id?: string | null;
          created_at?: string;
          default_currency?: string;
          default_locale?: string;
          default_visit_buffer_minutes?: number;
          email?: string | null;
          hold_minutes?: number;
          id?: number;
          max_booking_horizon_days?: number;
          max_self_reschedules?: number;
          min_booking_lead_minutes?: number;
          payment_due_hours?: number;
          payment_reminder_hours?: number | null;
          phone?: string | null;
          reschedule_window_hours?: number;
          slot_step_minutes?: number;
          timezone?: string;
          updated_at?: string;
          visit_reminder_hours?: number | null;
        };
        Relationships: [];
      };
      newsletter_issues: {
        Row: {
          broadcast_id: string | null;
          closing: Json;
          created_at: string;
          id: string;
          in_archive: boolean;
          intro: Json;
          items: Json;
          number: number | null;
          preview_text: string;
          recipients: number | null;
          send_at: string | null;
          sent_by: string | null;
          status: string;
          subject: string;
          updated_at: string;
        };
        Insert: {
          broadcast_id?: string | null;
          closing?: Json;
          created_at?: string;
          id?: string;
          in_archive?: boolean;
          intro?: Json;
          items?: Json;
          number?: number | null;
          preview_text?: string;
          recipients?: number | null;
          send_at?: string | null;
          sent_by?: string | null;
          status?: string;
          subject?: string;
          updated_at?: string;
        };
        Update: {
          broadcast_id?: string | null;
          closing?: Json;
          created_at?: string;
          id?: string;
          in_archive?: boolean;
          intro?: Json;
          items?: Json;
          number?: number | null;
          preview_text?: string;
          recipients?: number | null;
          send_at?: string | null;
          sent_by?: string | null;
          status?: string;
          subject?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      newsletter_subscribers: {
        Row: {
          confirmation_sent_at: string | null;
          confirmed_at: string | null;
          consent_text: string;
          consent_version: string;
          created_at: string;
          email: string;
          id: string;
          requested_at: string;
          resend_contact_id: string | null;
          sender_key: string;
          source: string;
          status: string;
          stop_reason: string | null;
          stopped_at: string | null;
          synced_at: string | null;
          token_hash: string;
          unsubscribe_token: string;
        };
        Insert: {
          confirmation_sent_at?: string | null;
          confirmed_at?: string | null;
          consent_text: string;
          consent_version: string;
          created_at?: string;
          email: string;
          id?: string;
          requested_at?: string;
          resend_contact_id?: string | null;
          sender_key: string;
          source: string;
          status?: string;
          stop_reason?: string | null;
          stopped_at?: string | null;
          synced_at?: string | null;
          token_hash: string;
          unsubscribe_token?: string;
        };
        Update: {
          confirmation_sent_at?: string | null;
          confirmed_at?: string | null;
          consent_text?: string;
          consent_version?: string;
          created_at?: string;
          email?: string;
          id?: string;
          requested_at?: string;
          resend_contact_id?: string | null;
          sender_key?: string;
          source?: string;
          status?: string;
          stop_reason?: string | null;
          stopped_at?: string | null;
          synced_at?: string | null;
          token_hash?: string;
          unsubscribe_token?: string;
        };
        Relationships: [];
      };
      locations: {
        Row: {
          accessibility_notes: string | null;
          directions: string | null;
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
          directions?: string | null;
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
          directions?: string | null;
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
      notifications: {
        Row: {
          actor: string;
          appointment_id: string | null;
          created_at: string;
          details: Json;
          id: number;
          kind: string;
          portal: string;
          read_at: string | null;
          user_id: string;
        };
        Insert: {
          actor: string;
          appointment_id?: string | null;
          created_at?: string;
          details?: Json;
          id?: never;
          kind: string;
          portal: string;
          read_at?: string | null;
          user_id: string;
        };
        Update: {
          actor?: string;
          appointment_id?: string | null;
          created_at?: string;
          details?: Json;
          id?: never;
          kind?: string;
          portal?: string;
          read_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_appointment_id_fkey";
            columns: ["appointment_id"];
            isOneToOne: false;
            referencedRelation: "appointments";
            referencedColumns: ["id"];
          },
        ];
      };
      payments: {
        Row: {
          amount_minor: number;
          appointment_id: string;
          checkout_session_id: string;
          created_at: string;
          currency_code: string;
          fulfilment: string | null;
          id: string;
          payment_intent_id: string | null;
          refunded_minor: number;
          status: Database["public"]["Enums"]["payment_status"];
          updated_at: string;
        };
        Insert: {
          amount_minor: number;
          appointment_id: string;
          checkout_session_id: string;
          created_at?: string;
          currency_code: string;
          fulfilment?: string | null;
          id?: string;
          payment_intent_id?: string | null;
          refunded_minor?: number;
          status?: Database["public"]["Enums"]["payment_status"];
          updated_at?: string;
        };
        Update: {
          amount_minor?: number;
          appointment_id?: string;
          checkout_session_id?: string;
          created_at?: string;
          currency_code?: string;
          fulfilment?: string | null;
          id?: string;
          payment_intent_id?: string | null;
          refunded_minor?: number;
          status?: Database["public"]["Enums"]["payment_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_appointment_id_fkey";
            columns: ["appointment_id"];
            isOneToOne: false;
            referencedRelation: "appointments";
            referencedColumns: ["id"];
          },
        ];
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
          workshop_id: string | null;
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
          workshop_id?: string | null;
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
          workshop_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "room_availability_exceptions_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "room_availability_exceptions_workshop_id_fkey";
            columns: ["workshop_id"];
            isOneToOne: false;
            referencedRelation: "workshops";
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
          color: string | null;
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
          color?: string | null;
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
          color?: string | null;
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
      service_catalogs: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      services: {
        Row: {
          active: boolean;
          after_minutes: number;
          booking_enabled: boolean;
          catalog_id: string | null;
          category: Database["public"]["Enums"]["service_category"];
          created_at: string;
          default_duration_minutes: number;
          description: string | null;
          id: string;
          name: string;
          publicly_visible: boolean;
          requires_intake: boolean;
          short_description: string | null;
          slug: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          after_minutes?: number;
          booking_enabled?: boolean;
          catalog_id?: string | null;
          category?: Database["public"]["Enums"]["service_category"];
          created_at?: string;
          default_duration_minutes: number;
          description?: string | null;
          id?: string;
          name: string;
          publicly_visible?: boolean;
          requires_intake?: boolean;
          short_description?: string | null;
          slug: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          after_minutes?: number;
          booking_enabled?: boolean;
          catalog_id?: string | null;
          category?: Database["public"]["Enums"]["service_category"];
          created_at?: string;
          default_duration_minutes?: number;
          description?: string | null;
          id?: string;
          name?: string;
          publicly_visible?: boolean;
          requires_intake?: boolean;
          short_description?: string | null;
          slug?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "services_catalog_id_fkey";
            columns: ["catalog_id"];
            isOneToOne: false;
            referencedRelation: "service_catalogs";
            referencedColumns: ["id"];
          },
        ];
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
      specialist_availability_exceptions: {
        Row: {
          created_at: string;
          date: string;
          rule_id: string;
        };
        Insert: {
          created_at?: string;
          date: string;
          rule_id: string;
        };
        Update: {
          created_at?: string;
          date?: string;
          rule_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "specialist_availability_exceptions_rule_id_fkey";
            columns: ["rule_id"];
            isOneToOne: false;
            referencedRelation: "specialist_availability_rules";
            referencedColumns: ["id"];
          },
        ];
      };
      specialist_availability_rules: {
        Row: {
          created_at: string;
          ends_at: string;
          id: string;
          interval_weeks: number;
          mode: Database["public"]["Enums"]["availability_mode"];
          note: string | null;
          occurrence_count: number | null;
          recurrence: Database["public"]["Enums"]["availability_recurrence"];
          room_id: string | null;
          specialist_id: string;
          starts_at: string;
          updated_at: string;
          valid_from: string;
          valid_until: string | null;
          weekdays: number[];
        };
        Insert: {
          created_at?: string;
          ends_at: string;
          id?: string;
          interval_weeks?: number;
          mode: Database["public"]["Enums"]["availability_mode"];
          note?: string | null;
          occurrence_count?: number | null;
          recurrence?: Database["public"]["Enums"]["availability_recurrence"];
          room_id?: string | null;
          specialist_id: string;
          starts_at: string;
          updated_at?: string;
          valid_from: string;
          valid_until?: string | null;
          weekdays: number[];
        };
        Update: {
          created_at?: string;
          ends_at?: string;
          id?: string;
          interval_weeks?: number;
          mode?: Database["public"]["Enums"]["availability_mode"];
          note?: string | null;
          occurrence_count?: number | null;
          recurrence?: Database["public"]["Enums"]["availability_recurrence"];
          room_id?: string | null;
          specialist_id?: string;
          starts_at?: string;
          updated_at?: string;
          valid_from?: string;
          valid_until?: string | null;
          weekdays?: number[];
        };
        Relationships: [
          {
            foreignKeyName: "specialist_availability_rules_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "specialist_availability_rules_specialist_id_fkey";
            columns: ["specialist_id"];
            isOneToOne: false;
            referencedRelation: "specialists";
            referencedColumns: ["id"];
          },
        ];
      };
      specialist_profile_drafts: {
        Row: {
          certificates: string[];
          client_groups: string[];
          created_at: string;
          display_name: string;
          education: string[];
          first_name: string;
          id: string;
          languages: string[];
          last_name: string;
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
          client_groups?: string[];
          created_at?: string;
          display_name?: string;
          education?: string[];
          first_name?: string;
          id?: string;
          languages?: string[];
          last_name?: string;
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
          client_groups?: string[];
          created_at?: string;
          display_name?: string;
          education?: string[];
          first_name?: string;
          id?: string;
          languages?: string[];
          last_name?: string;
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
          client_groups: string[];
          created_at: string;
          display_name: string;
          education: string[];
          first_name: string;
          languages: string[];
          last_name: string;
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
          client_groups?: string[];
          created_at?: string;
          display_name?: string;
          education?: string[];
          first_name?: string;
          languages?: string[];
          last_name?: string;
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
          client_groups?: string[];
          created_at?: string;
          display_name?: string;
          education?: string[];
          first_name?: string;
          languages?: string[];
          last_name?: string;
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
      specialist_time_off: {
        Row: {
          created_at: string;
          during: unknown;
          id: string;
          reason: string | null;
          specialist_id: string;
          updated_at: string;
          workshop_id: string | null;
        };
        Insert: {
          created_at?: string;
          during: unknown;
          id?: string;
          reason?: string | null;
          specialist_id: string;
          updated_at?: string;
          workshop_id?: string | null;
        };
        Update: {
          created_at?: string;
          during?: unknown;
          id?: string;
          reason?: string | null;
          specialist_id?: string;
          updated_at?: string;
          workshop_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "specialist_time_off_specialist_id_fkey";
            columns: ["specialist_id"];
            isOneToOne: false;
            referencedRelation: "specialists";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "specialist_time_off_workshop_id_fkey";
            columns: ["workshop_id"];
            isOneToOne: false;
            referencedRelation: "workshops";
            referencedColumns: ["id"];
          },
        ];
      };
      specialists: {
        Row: {
          active: boolean;
          publicly_visible: boolean;
          color: string | null;
          created_at: string;
          id: string;
          joined_at: string | null;
          professional_title: string | null;
          public_slug: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          active?: boolean;
          publicly_visible?: boolean;
          color?: string | null;
          created_at?: string;
          id?: string;
          joined_at?: string | null;
          professional_title?: string | null;
          public_slug: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          active?: boolean;
          publicly_visible?: boolean;
          color?: string | null;
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
      stripe_events: {
        Row: {
          id: string;
          received_at: string;
          type: string;
        };
        Insert: {
          id: string;
          received_at?: string;
          type: string;
        };
        Update: {
          id?: string;
          received_at?: string;
          type?: string;
        };
        Relationships: [];
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
      workshop_articles: {
        Row: {
          article_id: string;
          workshop_id: string;
        };
        Insert: {
          article_id: string;
          workshop_id: string;
        };
        Update: {
          article_id?: string;
          workshop_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workshop_articles_article_id_fkey";
            columns: ["article_id"];
            isOneToOne: false;
            referencedRelation: "articles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workshop_articles_workshop_id_fkey";
            columns: ["workshop_id"];
            isOneToOne: false;
            referencedRelation: "workshops";
            referencedColumns: ["id"];
          },
        ];
      };
      workshop_co_leaders: {
        Row: {
          specialist_id: string;
          workshop_id: string;
        };
        Insert: {
          specialist_id: string;
          workshop_id: string;
        };
        Update: {
          specialist_id?: string;
          workshop_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workshop_co_leaders_specialist_id_fkey";
            columns: ["specialist_id"];
            isOneToOne: false;
            referencedRelation: "specialists";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workshop_co_leaders_workshop_id_fkey";
            columns: ["workshop_id"];
            isOneToOne: false;
            referencedRelation: "workshops";
            referencedColumns: ["id"];
          },
        ];
      };
      workshop_messages: {
        Row: {
          body: string;
          created_at: string;
          created_by: string | null;
          id: string;
          recipients: number;
          subject: string;
          workshop_id: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          recipients?: number;
          subject: string;
          workshop_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          recipients?: number;
          subject?: string;
          workshop_id?: string;
        };
        Relationships: [];
      };
      workshop_online_links: {
        Row: {
          meeting_url: string;
          updated_at: string;
          workshop_id: string;
        };
        Insert: {
          meeting_url: string;
          updated_at?: string;
          workshop_id: string;
        };
        Update: {
          meeting_url?: string;
          updated_at?: string;
          workshop_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workshop_online_links_workshop_id_fkey";
            columns: ["workshop_id"];
            isOneToOne: true;
            referencedRelation: "workshops";
            referencedColumns: ["id"];
          },
        ];
      };
      workshop_emails: {
        Row: {
          claimed_at: string;
          id: number;
          kind: string;
          message_id: string | null;
          registration_id: string;
          sent_at: string | null;
          token_hash: string;
        };
        Insert: {
          claimed_at?: string;
          id?: never;
          kind: string;
          message_id?: string | null;
          registration_id: string;
          sent_at?: string | null;
          token_hash: string;
        };
        Update: {
          claimed_at?: string;
          id?: never;
          kind?: string;
          message_id?: string | null;
          registration_id?: string;
          sent_at?: string | null;
          token_hash?: string;
        };
        Relationships: [];
      };
      workshop_payments: {
        Row: {
          amount_minor: number;
          checkout_session_id: string;
          created_at: string;
          currency_code: string;
          id: string;
          payment_intent_id: string | null;
          refunded_minor: number;
          registration_id: string;
          status: Database["public"]["Enums"]["payment_status"];
          updated_at: string;
        };
        Insert: {
          amount_minor: number;
          checkout_session_id: string;
          created_at?: string;
          currency_code: string;
          id?: string;
          payment_intent_id?: string | null;
          refunded_minor?: number;
          registration_id: string;
          status?: Database["public"]["Enums"]["payment_status"];
          updated_at?: string;
        };
        Update: {
          amount_minor?: number;
          checkout_session_id?: string;
          created_at?: string;
          currency_code?: string;
          id?: string;
          payment_intent_id?: string | null;
          refunded_minor?: number;
          registration_id?: string;
          status?: Database["public"]["Enums"]["payment_status"];
          updated_at?: string;
        };
        Relationships: [];
      };
      workshop_services: {
        Row: {
          service_id: string;
          workshop_id: string;
        };
        Insert: {
          service_id: string;
          workshop_id: string;
        };
        Update: {
          service_id?: string;
          workshop_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workshop_services_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workshop_services_workshop_id_fkey";
            columns: ["workshop_id"];
            isOneToOne: false;
            referencedRelation: "workshops";
            referencedColumns: ["id"];
          },
        ];
      };
      workshop_registrations: {
        Row: {
          discount_code_id: string | null;
          discount_minor: number;
          list_price_minor: number | null;
          access_token_hash: string;
          attended: boolean | null;
          booked_by: string;
          cancelled_at: string | null;
          cancelled_by: string | null;
          client_email: string | null;
          client_name: string | null;
          client_first_name: string | null;
          client_last_name: string | null;
          client_notes: string | null;
          client_phone: string | null;
          confirmed_at: string | null;
          created_at: string;
          currency_code: string;
          hold_expires_at: string | null;
          id: string;
          offer_expires_at: string | null;
          paid_minor: number;
          payment_due_at: string | null;
          price_minor: number;
          privacy_accepted_at: string | null;
          reference: string;
          refund_due_minor: number;
          refund_when_replaced: boolean;
          rescheduled_at: string | null;
          refund_any_time: boolean;
          paid_outside: boolean;
          forgotten_at: string | null;
          refunded_minor: number;
          status: Database["public"]["Enums"]["workshop_registration_status"];
          terms_accepted_at: string | null;
          updated_at: string;
          waitlisted_at: string | null;
          workshop_id: string;
        };
        Insert: {
          access_token_hash: string;
          attended?: boolean | null;
          booked_by?: string;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          client_email?: string | null;
          client_name?: string | null;
          client_first_name?: string | null;
          client_last_name?: string | null;
          client_notes?: string | null;
          client_phone?: string | null;
          confirmed_at?: string | null;
          created_at?: string;
          currency_code: string;
          hold_expires_at?: string | null;
          id?: string;
          offer_expires_at?: string | null;
          paid_minor?: number;
          payment_due_at?: string | null;
          price_minor: number;
          privacy_accepted_at?: string | null;
          reference: string;
          refund_due_minor?: number;
          refund_when_replaced?: boolean;
          rescheduled_at?: string | null;
          refund_any_time?: boolean;
          paid_outside?: boolean;
          forgotten_at?: string | null;
          refunded_minor?: number;
          status?: Database["public"]["Enums"]["workshop_registration_status"];
          terms_accepted_at?: string | null;
          updated_at?: string;
          waitlisted_at?: string | null;
          workshop_id: string;
        };
        Update: {
          access_token_hash?: string;
          attended?: boolean | null;
          booked_by?: string;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          client_email?: string | null;
          client_name?: string | null;
          client_first_name?: string | null;
          client_last_name?: string | null;
          client_notes?: string | null;
          client_phone?: string | null;
          confirmed_at?: string | null;
          created_at?: string;
          currency_code?: string;
          hold_expires_at?: string | null;
          id?: string;
          offer_expires_at?: string | null;
          paid_minor?: number;
          payment_due_at?: string | null;
          price_minor?: number;
          privacy_accepted_at?: string | null;
          reference?: string;
          refund_due_minor?: number;
          refund_when_replaced?: boolean;
          rescheduled_at?: string | null;
          refund_any_time?: boolean;
          paid_outside?: boolean;
          forgotten_at?: string | null;
          refunded_minor?: number;
          status?: Database["public"]["Enums"]["workshop_registration_status"];
          terms_accepted_at?: string | null;
          updated_at?: string;
          waitlisted_at?: string | null;
          workshop_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workshop_registrations_workshop_id_fkey";
            columns: ["workshop_id"];
            isOneToOne: false;
            referencedRelation: "workshops";
            referencedColumns: ["id"];
          },
        ];
      };
      workshops: {
        Row: {
          agenda: string | null;
          audience: string | null;
          body: Json | null;
          cancel_reason: string | null;
          cancelled_at: string | null;
          capacity: number;
          confirmed_at: string | null;
          cover_alt: string | null;
          cover_image_path: string | null;
          created_at: string;
          currency_code: string;
          ends_at: string;
          id: string;
          location_id: string | null;
          long_description: string | null;
          min_participants: number | null;
          minimum_reminded_at: string | null;
          modality: Database["public"]["Enums"]["workshop_modality"];
          price_minor: number;
          registration_closes_at: string | null;
          registration_enabled: boolean;
          room_id: string | null;
          seo_description: string | null;
          seo_title: string | null;
          short_description: string | null;
          slug: string;
          specialist_id: string;
          starts_at: string;
          status: Database["public"]["Enums"]["workshop_status"];
          title: string;
          updated_at: string;
        };
        Insert: {
          agenda?: string | null;
          audience?: string | null;
          body?: Json | null;
          cancel_reason?: string | null;
          cancelled_at?: string | null;
          capacity: number;
          confirmed_at?: string | null;
          cover_alt?: string | null;
          cover_image_path?: string | null;
          created_at?: string;
          currency_code?: string;
          ends_at: string;
          id?: string;
          location_id?: string | null;
          long_description?: string | null;
          min_participants?: number | null;
          minimum_reminded_at?: string | null;
          modality?: Database["public"]["Enums"]["workshop_modality"];
          price_minor: number;
          registration_closes_at?: string | null;
          registration_enabled?: boolean;
          room_id?: string | null;
          seo_description?: string | null;
          seo_title?: string | null;
          short_description?: string | null;
          slug: string;
          specialist_id: string;
          starts_at: string;
          status?: Database["public"]["Enums"]["workshop_status"];
          title: string;
          updated_at?: string;
        };
        Update: {
          agenda?: string | null;
          audience?: string | null;
          body?: Json | null;
          cancel_reason?: string | null;
          cancelled_at?: string | null;
          capacity?: number;
          confirmed_at?: string | null;
          cover_alt?: string | null;
          cover_image_path?: string | null;
          created_at?: string;
          currency_code?: string;
          ends_at?: string;
          id?: string;
          location_id?: string | null;
          long_description?: string | null;
          min_participants?: number | null;
          minimum_reminded_at?: string | null;
          modality?: Database["public"]["Enums"]["workshop_modality"];
          price_minor?: number;
          registration_closes_at?: string | null;
          registration_enabled?: boolean;
          room_id?: string | null;
          seo_description?: string | null;
          seo_title?: string | null;
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
      visit_intakes: {
        Row: {
          client_key: string | null;
          answers: Json;
          appointment_id: string | null;
          created_at: string;
          health_consent_at: string;
          id: string;
          mood: number;
          service_id: string;
          token_hash: string;
          version: number;
        };
        Insert: {
          client_key?: string | null;
          answers: Json;
          appointment_id?: string | null;
          created_at?: string;
          health_consent_at: string;
          id?: string;
          mood: number;
          service_id: string;
          token_hash: string;
          version?: number;
        };
        Update: {
          client_key?: string | null;
          answers?: Json;
          appointment_id?: string | null;
          created_at?: string;
          health_consent_at?: string;
          id?: string;
          mood?: number;
          service_id?: string;
          token_hash?: string;
          version?: number;
        };
        Relationships: [];
      };
      site_announcements: {
        Row: {
          created_at: string;
          ends_on: string;
          id: string;
          link_href: string | null;
          link_label: string | null;
          message: string;
          starts_on: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          ends_on: string;
          id?: string;
          link_href?: string | null;
          link_label?: string | null;
          message: string;
          starts_on: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          ends_on?: string;
          id?: string;
          link_href?: string | null;
          link_label?: string | null;
          message?: string;
          starts_on?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      claim_newsletter_issue: {
        Args: { p_id: string; p_send_at: string };
        Returns: undefined;
      };
      create_newsletter_issue: { Args: never; Returns: string };
      delete_newsletter_issue: { Args: { p_id: string }; Returns: undefined };
      finish_newsletter_issue: {
        Args: { p_broadcast_id: string; p_id: string };
        Returns: number;
      };
      get_newsletter_issue: {
        Args: { p_id: string };
        Returns: {
          broadcast_id: string;
          closing: Json;
          id: string;
          in_archive: boolean;
          intro: Json;
          items: Json;
          number: number;
          preview_text: string;
          recipients: number;
          send_at: string;
          status: string;
          subject: string;
          updated_at: string;
        }[];
      };
      list_discount_codes: {
        Args: never;
        Returns: {
          id: string;
          code: string;
          kind: string;
          value: number;
          starts_on: string | null;
          ends_on: string | null;
          active: boolean;
          note: string;
          created_at: string;
          used_count: number;
          discount_total_minor: number;
          scope: string;
          workshop_id: string | null;
          workshop_title: string | null;
          max_uses: number | null;
        }[];
      };
      note_discount_refusal: {
        Args: { p_access_token: string };
        Returns: undefined;
      };
      list_newsletter_archive: {
        Args: never;
        Returns: {
          closing: Json;
          intro: Json;
          items: Json;
          number: number;
          preview_text: string;
          send_at: string;
          subject: string;
        }[];
      };
      list_newsletter_issues: {
        Args: never;
        Returns: {
          id: string;
          in_archive: boolean;
          number: number;
          recipients: number;
          send_at: string;
          status: string;
          stopped_after: number;
          subject: string;
          updated_at: string;
        }[];
      };
      release_newsletter_issue: { Args: { p_id: string }; Returns: undefined };
      save_discount_code: {
        Args: {
          p_id: string | null;
          p_code: string;
          p_kind: string;
          p_value: number;
          p_starts_on: string | null;
          p_ends_on: string | null;
          p_active: boolean;
          p_note: string;
          p_scope: string;
          p_workshop_id: string | null;
          p_max_uses?: number | null;
        };
        Returns: string;
      };
      delete_discount_code: {
        Args: { p_id: string };
        Returns: undefined;
      };
      workshop_availability: {
        Args: { p_ids: string[] };
        Returns: {
          workshop_id: string;
          seats_left: number;
          waitlist_count: number;
          registration_open: boolean;
          confirmed: boolean;
          pay_later_until: string;
          full_refund_until: string;
        }[];
      };
      hold_workshop_seat: {
        Args: { p_slug: string; p_client_key: string };
        Returns: {
          registration_id: string;
          reference: string;
          access_token: string;
          hold_expires_at: string;
        }[];
      };
      save_workshop_registration_details: {
        Args: {
          p_access_token: string;
          p_first_name: string;
          p_last_name: string;
          p_email: string;
          p_phone: string | null;
          p_notes: string | null;
          p_accept_terms: boolean;
          p_accept_privacy: boolean;
        };
        Returns: undefined;
      };
      reserve_workshop_seat: {
        Args: { p_access_token: string };
        Returns: { reference: string; payment_due_at: string }[];
      };
      confirm_free_workshop_seat: {
        Args: { p_access_token: string };
        Returns: string;
      };
      join_workshop_waitlist: {
        Args: {
          p_slug: string;
          p_client_key: string;
          p_first_name: string;
          p_last_name: string;
          p_email: string;
          p_phone: string | null;
          p_notes: string | null;
          p_accept_terms: boolean;
          p_accept_privacy: boolean;
        };
        Returns: { reference: string; access_token: string }[];
      };
      get_workshop_registration: {
        Args: { p_access_token: string };
        Returns: {
          reference: string;
          status: Database["public"]["Enums"]["workshop_registration_status"];
          workshop_slug: string;
          workshop_title: string;
          workshop_status: Database["public"]["Enums"]["workshop_status"];
          workshop_confirmed: boolean;
          modality: Database["public"]["Enums"]["workshop_modality"];
          starts_at: string;
          ends_at: string;
          location_name: string | null;
          location_address: string | null;
          room_name: string | null;
          price_minor: number;
          currency_code: string;
          paid_minor: number;
          refund_due_minor: number;
          refunded_minor: number;
          client_name: string | null;
          client_email: string | null;
          client_phone: string | null;
          client_notes: string | null;
          details_saved: boolean;
          hold_expires_at: string | null;
          payment_due_at: string | null;
          offer_expires_at: string | null;
          waitlist_position: number | null;
          full_refund_until: string;
          can_pay_later: boolean;
          cancelled_by: string | null;
          meeting_url: string | null;
          list_price_minor: number | null;
          discount_minor: number;
          discount_code: string | null;
          refund_any_time: boolean;
          refund_when_replaced: boolean;
          workshop_cancel_reason: string | null;
          paid_outside: boolean;
          location_directions: string | null;
          client_first_name: string | null;
          client_last_name: string | null;
        }[];
      };
      apply_workshop_discount: {
        Args: { p_access_token: string; p_code: string };
        Returns: {
          code: string;
          list_price_minor: number;
          discount_minor: number;
          price_minor: number;
        }[];
      };
      remove_workshop_discount: {
        Args: { p_access_token: string };
        Returns: undefined;
      };
      attach_workshop_checkout: {
        Args: {
          p_access_token: string;
          p_session_id: string;
          p_expires_at: string;
          p_amount_minor: number;
          p_currency_code: string;
        };
        Returns: undefined;
      };
      pending_workshop_checkout: {
        Args: { p_access_token: string };
        Returns: string | null;
      };
      fulfill_workshop_checkout: {
        Args: {
          p_session_id: string;
          p_paid: boolean;
          p_payment_intent_id: string | null;
        };
        Returns: string;
      };
      fail_workshop_checkout: {
        Args: { p_session_id: string; p_reason: string };
        Returns: undefined;
      };
      record_workshop_refund: {
        Args: { p_payment_intent_id: string; p_refunded_minor: number };
        Returns: boolean;
      };
      claim_workshop_email: {
        Args: { p_reference: string; p_kind: string };
        Returns: {
          reference: string;
          manage_token: string;
          status: Database["public"]["Enums"]["workshop_registration_status"];
          client_name: string | null;
          client_email: string;
          workshop_title: string;
          workshop_slug: string;
          modality: Database["public"]["Enums"]["workshop_modality"];
          starts_at: string;
          ends_at: string;
          location_name: string | null;
          location_address: string | null;
          room_name: string | null;
          leaders: string | null;
          price_minor: number;
          paid_minor: number;
          currency_code: string;
          payment_due_at: string | null;
          waitlist_position: number | null;
          offer_expires_at: string | null;
          cancelled_by: string | null;
          cancel_reason: string | null;
          refund_due_minor: number;
          refunded_minor: number;
          refund_when_replaced: boolean;
          meeting_url: string | null;
          paid_outside: boolean;
          location_directions: string | null;
        }[];
      };
      list_due_workshop_emails: {
        Args: never;
        Returns: { reference: string; kind: string }[];
      };
      list_owed_workshop_refunds: {
        Args: never;
        Returns: {
          registration_id: string;
          reference: string;
          owed_minor: number;
        }[];
      };
      remind_workshop_minimums: {
        Args: never;
        Returns: number;
      };
      centre_add_workshop_participant: {
        Args: {
          p_workshop_id: string;
          p_first_name: string;
          p_last_name: string;
          p_email: string;
          p_phone: string | null;
          p_notes: string | null;
          p_paid_outside: boolean;
        };
        Returns: {
          reference: string;
          status: Database["public"]["Enums"]["workshop_registration_status"];
        }[];
      };
      centre_cancel_workshop_participant: {
        Args: { p_registration_id: string; p_refund_minor: number };
        Returns: { reference: string; refund_minor: number }[];
      };
      set_workshop_attendance: {
        Args: { p_registration_id: string; p_attended: boolean };
        Returns: undefined;
      };
      forget_workshop_participant: {
        Args: { p_registration_id: string };
        Returns: undefined;
      };
      workshop_redirect: {
        Args: { p_slug: string };
        Returns: string | null;
      };
      complete_workshop: {
        Args: { p_id: string };
        Returns: undefined;
      };
      record_workshop_message: {
        Args: { p_workshop_id: string; p_subject: string; p_body: string };
        Returns: {
          message_id: string;
          reference: string;
          client_name: string | null;
          client_email: string;
        }[];
      };
      mark_workshop_email_sent: {
        Args: { p_reference: string; p_kind: string; p_message_id: string };
        Returns: undefined;
      };
      release_workshop_email: {
        Args: { p_reference: string; p_kind: string };
        Returns: undefined;
      };
      list_public_workshops: {
        Args: never;
        Returns: {
          id: string;
          slug: string;
          title: string;
          short_description: string | null;
          body: Json | null;
          audience: string | null;
          agenda: string | null;
          cover_image_path: string | null;
          cover_alt: string | null;
          seo_title: string | null;
          seo_description: string | null;
          modality: Database["public"]["Enums"]["workshop_modality"];
          status: Database["public"]["Enums"]["workshop_status"];
          starts_at: string;
          ends_at: string;
          price_minor: number;
          currency_code: string;
          capacity: number;
          min_participants: number | null;
          location_name: string | null;
          location_address: string | null;
          location_city: string | null;
          room_name: string | null;
          leaders: Json;
          seats_left: number;
          registration_open: boolean;
          confirmed: boolean;
          updated_at: string;
          location_directions: string | null;
        }[];
      };
      workshop_preview: {
        Args: { p_id: string };
        Returns: {
          id: string;
          slug: string;
          title: string;
          short_description: string | null;
          body: Json | null;
          audience: string | null;
          agenda: string | null;
          cover_image_path: string | null;
          cover_alt: string | null;
          seo_title: string | null;
          seo_description: string | null;
          modality: Database["public"]["Enums"]["workshop_modality"];
          status: Database["public"]["Enums"]["workshop_status"];
          starts_at: string;
          ends_at: string;
          price_minor: number;
          currency_code: string;
          capacity: number;
          min_participants: number | null;
          location_name: string | null;
          location_address: string | null;
          location_city: string | null;
          room_name: string | null;
          leaders: Json;
          seats_left: number;
          registration_open: boolean;
          confirmed: boolean;
          updated_at: string;
          location_directions: string | null;
        }[];
      };
      admin_list_workshops: {
        Args: never;
        Returns: {
          id: string;
          slug: string;
          title: string;
          status: Database["public"]["Enums"]["workshop_status"];
          modality: Database["public"]["Enums"]["workshop_modality"];
          starts_at: string;
          ends_at: string;
          capacity: number;
          min_participants: number | null;
          price_minor: number;
          currency_code: string;
          confirmed: boolean;
          registration_enabled: boolean;
          leaders: string | null;
          location_name: string | null;
          room_name: string | null;
          confirmed_count: number;
          awaiting_count: number;
          held_count: number;
          waitlist_count: number;
          paid_minor: number;
          updated_at: string;
        }[];
      };
      admin_get_workshop: {
        Args: { p_id: string };
        Returns: Json;
      };
      save_workshop: {
        Args: { p_id: string | null; p_data: Json };
        Returns: string;
      };
      publish_workshop: {
        Args: { p_id: string };
        Returns: undefined;
      };
      unpublish_workshop: {
        Args: { p_id: string };
        Returns: undefined;
      };
      delete_workshop: {
        Args: { p_id: string };
        Returns: undefined;
      };
      workshop_visibility: {
        Args: never;
        Returns: { in_menu: boolean; on_home: boolean }[];
      };
      set_workshop_visibility: {
        Args: { p_in_menu: boolean | null; p_on_home: boolean | null };
        Returns: undefined;
      };
      cancel_workshop_registration: {
        Args: { p_access_token: string };
        Returns: {
          reference: string;
          refund_minor: number;
          refund_when_replaced: boolean;
        }[];
      };
      transfer_workshop_seat: {
        Args: {
          p_access_token: string;
          p_first_name: string;
          p_last_name: string;
          p_email: string;
          p_phone: string | null;
        };
        Returns: undefined;
      };
      run_workshop_jobs: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      confirm_workshop: {
        Args: { p_id: string };
        Returns: undefined;
      };
      cancel_workshop: {
        Args: { p_id: string; p_reason?: string | null };
        Returns: {
          registration_id: string;
          reference: string;
          client_email: string | null;
          refund_minor: number;
        }[];
      };
      apply_discount_code: {
        Args: { p_access_token: string; p_code: string };
        Returns: {
          code: string;
          list_price_minor: number;
          discount_minor: number;
          price_minor: number;
        }[];
      };
      remove_discount_code: {
        Args: { p_access_token: string };
        Returns: undefined;
      };
      get_booking_discount: {
        Args: { p_access_token: string };
        Returns: {
          code: string;
          list_price_minor: number;
          discount_minor: number;
        }[];
      };
      get_visit_discount: {
        Args: { p_id: string; p_own?: boolean };
        Returns: {
          code: string;
          list_price_minor: number;
          discount_minor: number;
        }[];
      };
      confirm_free_booking: {
        Args: { p_access_token: string };
        Returns: undefined;
      };
      close_visit: {
        Args: {
          p_note?: string;
          p_outcome: "attended" | "no_show";
          p_tags?: string[];
          p_visit: string;
        };
        Returns: undefined;
      };
      get_visit_closure: {
        Args: { p_visit: string };
        Returns: {
          closed_at: string;
          closed_by_name: string | null;
          note: string | null;
          outcome: "attended" | "no_show";
          tags: string[];
        }[];
      };
      save_newsletter_issue: {
        Args: {
          p_closing: Json;
          p_id: string;
          p_in_archive: boolean;
          p_intro: Json;
          p_items: Json;
          p_preview_text: string;
          p_subject: string;
        };
        Returns: undefined;
      };
      set_newsletter_issue_archive: {
        Args: { p_id: string; p_in_archive: boolean };
        Returns: undefined;
      };
      unclosed_visits_summary: {
        Args: { p_own?: boolean };
        Returns: {
          oldest_at: string;
          specialist_id: string;
          specialist_name: string;
          visits: number;
        }[];
      };
      unschedule_newsletter_issue: {
        Args: { p_id: string };
        Returns: undefined;
      };
      visits_to_close_by_specialist: {
        Args: never;
        Returns: {
          email: string;
          specialist_id: string;
          specialist_name: string;
          visits: {
            reference: string;
            service_name: string;
            starts_at: string;
          }[];
        }[];
      };
      set_specialist_active: {
        Args: { p_active: boolean; p_specialist: string };
        Returns: number;
      };
      set_specialist_visibility: {
        Args: { p_specialist: string; p_visible: boolean };
        Returns: undefined;
      };
      my_clients: {
        Args: { p_query?: string };
        Returns: {
          email: string;
          id: string;
          last_visit_at: string | null;
          name: string;
          next_visit_at: string | null;
          phone: string | null;
          upcoming: number;
          visits: number;
          first_name: string | null;
          last_name: string | null;
        }[];
      };
      client_duplicates: {
        Args: { p_client: string };
        Returns: {
          email: string;
          id: string;
          name: string;
          phone: string | null;
          reason: string;
        }[];
      };
      merge_clients: {
        Args: { p_keep: string; p_merge: string };
        Returns: number;
      };
      forget_client: { Args: { p_client: string }; Returns: undefined };
      retention_preview: {
        Args: never;
        Returns: { clients: number; intakes: number }[];
      };
      grant_admin: { Args: { p_user: string }; Returns: undefined };
      list_portal_users: {
        Args: never;
        Returns: {
          email: string;
          first_name: string;
          invited_at: string | null;
          is_admin: boolean;
          is_specialist: boolean;
          joined: boolean;
          last_name: string;
          signed_in_at: string | null;
          user_id: string;
        }[];
      };
      portal_user_id_by_email: { Args: { p_email: string }; Returns: string };
      revoke_admin: { Args: { p_user: string }; Returns: undefined };
      visits_on_days: {
        Args: { p_from: string; p_to: string };
        Returns: number;
      };
      company_details: {
        Args: never;
        Returns: {
          legal_name: string | null;
          regon: string | null;
          registered_address: string | null;
          tax_id: string | null;
        }[];
      };
      current_announcement: {
        Args: never;
        Returns: {
          ends_on: string;
          id: string;
          link_href: string | null;
          link_label: string | null;
          message: string;
        }[];
      };
      attach_visit_intake: {
        Args: { p_access_token: string; p_intake_token: string };
        Returns: boolean;
      };
      accept_booking_terms: { Args: { p_token: string }; Returns: undefined };
      add_room_image: {
        Args: { p_room_id: string; p_storage_path: string };
        Returns: string;
      };
      arrange_services: {
        Args: { p_catalogs: Json; p_services: Json };
        Returns: undefined;
      };
      add_time_off: {
        Args: {
          p_ends_at: string;
          p_reason?: string;
          p_specialist_id?: string;
          p_starts_at: string;
        };
        Returns: string;
      };
      approve_specialist_profile_draft: {
        Args: { p_draft_id: string; p_review_comment?: string };
        Returns: undefined;
      };
      attach_checkout_session: {
        Args: {
          p_access_token: string;
          p_amount_minor: number;
          p_currency_code: string;
          p_expires_at: string;
          p_session_id: string;
        };
        Returns: undefined;
      };
      attach_reservation_payment: {
        Args: {
          p_amount_minor: number;
          p_currency_code: string;
          p_session_id: string;
          p_token: string;
        };
        Returns: undefined;
      };
      booking_window: {
        Args: never;
        Returns: {
          cancellation_window_hours: number;
          hold_minutes: number;
          horizon_days: number;
          max_self_reschedules: number;
          payment_due_hours: number;
          reschedule_window_hours: number;
          slot_step_minutes?: number;
          time_zone: string;
        }[];
      };
      cancel_booking: {
        Args: { p_manage_token: string };
        Returns: {
          payment_intent_id: string | null;
          reference: string;
          refund_minor: number;
        }[];
      };
      cancel_unpaid_visits: {
        Args: never;
        Returns: {
          reference: string;
        }[];
      };
      centre_book_visit: {
        Args: {
          p_client_email: string | null;
          p_client_first_name: string;
          p_client_last_name: string;
          p_client_notes: string | null;
          p_client_phone: string | null;
          p_mode: Database["public"]["Enums"]["visit_mode"];
          p_offer_id: string;
          p_room_id: string | null;
          p_starts_at: string;
        };
        Returns: {
          appointment_id: string;
          ends_at: string;
          payment_due_at: string;
          reference: string;
          starts_at: string;
        }[];
      };
      centre_cancel_visit: {
        Args: {
          p_appointment_id: string;
          p_reason?: string | null;
          p_refund_minor?: number | null;
        };
        Returns: {
          payment_intent_id: string | null;
          reference: string;
          refund_minor: number;
          reschedule_count: number;
        }[];
      };
      centre_refund_visit: {
        Args: {
          p_appointment_id: string;
          p_reason?: string | null;
          p_refund_minor: number;
        };
        Returns: {
          payment_intent_id: string;
          reference: string;
          refund_minor: number;
          refunded_before_minor: number;
        }[];
      };
      centre_reschedule_visit: {
        Args: {
          p_appointment_id: string;
          p_mode: Database["public"]["Enums"]["visit_mode"];
          p_reason?: string | null;
          p_room_id: string | null;
          p_starts_at: string;
        };
        Returns: {
          ends_at: string;
          payment_due_at: string | null;
          reference: string;
          sequence: number;
          starts_at: string;
        }[];
      };
      admin_update_client: {
        Args: {
          p_email: string;
          p_id: string;
          p_first_name: string;
          p_last_name: string;
          p_notes: string | null;
          p_phone: string | null;
        };
        Returns: { id: string; upcoming_updated: number }[];
      };
      centre_resend_payment_link: {
        Args: { p_appointment_id: string };
        Returns: {
          reference: string;
        }[];
      };
      centre_settle_visit: {
        Args: { p_appointment_id: string };
        Returns: {
          payment_intent_id: string;
          reference: string;
          refund_minor: number;
          refunded_before_minor: number;
          settlement_id: number;
        }[];
      };
      claim_booking_email: {
        Args: { p_kind: string; p_reference: string };
        Returns: {
          booked_by: string;
          cancelled_by: string | null;
          client_email: string;
          client_name: string;
          confirm_by: string | null;
          currency_code: string;
          ends_at: string;
          location_address: string;
          location_name: string;
          manage_token: string | null;
          mode: Database["public"]["Enums"]["visit_mode"];
          paid: boolean;
          payment_due_at: string | null;
          price_minor: number;
          reference: string;
          room_name: string;
          service_name: string;
          specialist_name: string;
          starts_at: string;
        }[];
      };
      delete_availability_occurrence: {
        Args: { p_date: string; p_rule_id: string; p_scope: string };
        Returns: undefined;
      };
      delete_availability_rule: { Args: { p_id: string }; Returns: undefined };
      delete_time_off: { Args: { p_id: string }; Returns: undefined };
      edit_availability_occurrence: {
        Args: {
          p_date: string;
          p_ends_at: string;
          p_interval_weeks?: number;
          p_mode: Database["public"]["Enums"]["availability_mode"];
          p_note?: string;
          p_occurrence_count?: number;
          p_recurrence: Database["public"]["Enums"]["availability_recurrence"];
          p_room_id?: string;
          p_rule_id: string;
          p_scope: string;
          p_starts_at: string;
          p_valid_from: string;
          p_valid_until?: string;
          p_weekdays: number[];
        };
        Returns: string;
      };
      fail_checkout_session: {
        Args: { p_reason: string; p_session_id: string };
        Returns: undefined;
      };
      fulfill_checkout_session: {
        Args: {
          p_paid: boolean;
          p_payment_intent_id: string;
          p_session_id: string;
        };
        Returns: string;
      };
      get_booking: {
        Args: { p_access_token: string };
        Returns: {
          booked_by: string;
          cancelled_by: string | null;
          client_email: string;
          client_name: string;
          client_notes: string;
          client_phone: string;
          currency_code: string;
          details_saved: boolean;
          ends_at: string;
          hold_expires_at: string;
          location_name: string;
          mode: Database["public"]["Enums"]["visit_mode"];
          paid: boolean;
          payment_due_at: string | null;
          price_minor: number;
          reference: string;
          refund_due_minor: number | null;
          refunded_minor: number;
          reschedule_count: number;
          room_name: string;
          service_name: string;
          specialist_name: string;
          starts_at: string;
          status: Database["public"]["Enums"]["appointment_status"];
          client_first_name: string | null;
          client_last_name: string | null;
        }[];
      };
      get_visit: {
        Args: { p_id: string; p_own?: boolean };
        Returns: {
          cancelled_at: string | null;
          cancelled_by: string | null;
          client_email: string | null;
          client_id: string | null;
          client_name: string | null;
          client_notes: string | null;
          client_phone: string | null;
          confirmed_at: string | null;
          created_at: string;
          currency_code: string;
          emails: Json | null;
          ends_at: string;
          id: string;
          location_name: string | null;
          mode: Database["public"]["Enums"]["visit_mode"];
          paid: boolean | null;
          payment_due_at: string | null;
          price_minor: number;
          reference: string;
          refund_due_minor: number | null;
          refunded_minor: number | null;
          reschedule_count: number;
          room_color: string | null;
          room_id: string | null;
          room_name: string | null;
          service_id: string;
          service_name: string;
          specialist_color: string | null;
          specialist_id: string;
          specialist_name: string;
          starts_at: string;
          status: Database["public"]["Enums"]["appointment_status"];
        }[];
      };
      has_role: {
        Args: { required_role: Database["public"]["Enums"]["app_role"] };
        Returns: boolean;
      };
      hold_slot: {
        Args: {
          p_client_key: string;
          p_location_slug?: string;
          p_mode: Database["public"]["Enums"]["visit_mode"];
          p_service_slug: string;
          p_specialist_slug: string;
          p_starts_at: string;
        };
        Returns: {
          access_token: string;
          appointment_id: string;
          hold_expires_at: string;
          reference: string;
        }[];
      };
      list_bookable_offers: {
        Args: never;
        Returns: {
          currency_code: string;
          duration_minutes: number;
          price_minor: number;
          service_category: Database["public"]["Enums"]["service_category"];
          service_default_duration_minutes: number;
          service_description: string | null;
          service_id: string;
          service_name: string;
          service_short_description: string | null;
          service_slug: string;
          specialist_name: string;
          specialist_photo_path: string | null;
          specialist_slug: string;
          specialist_title: string | null;
          supports_in_person: boolean;
          supports_online: boolean;
        }[];
      };
      list_due_emails: {
        Args: never;
        Returns: {
          kind: string;
          reference: string;
        }[];
      };
      list_free_slots: {
        Args: {
          p_from: string;
          p_location_slug?: string;
          p_mode: Database["public"]["Enums"]["visit_mode"];
          p_service_slug: string;
          p_specialist_slug: string;
          p_to: string;
        };
        Returns: {
          ends_at: string;
          starts_at: string;
        }[];
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
      list_reschedule_slots: {
        Args: { p_from: string; p_manage_token: string; p_to: string };
        Returns: {
          ends_at: string;
          starts_at: string;
        }[];
      };
      list_room_occupancy: {
        Args: { p_from: string; p_to: string };
        Returns: {
          day: string;
          ends_at: string;
          room_id: string;
          specialist_avatar_url: string | null;
          specialist_first_name: string;
          specialist_id: string;
          specialist_last_name: string;
          specialist_name: string;
          specialist_photo_path: string | null;
          starts_at: string;
        }[];
      };
      get_client: {
        Args: { p_id: string };
        Returns: {
          id: string;
          name: string;
          email: string;
          phone: string | null;
          notes: string | null;
          visits: number;
          upcoming: number;
          cancelled: number;
          last_visit_at: string | null;
          next_visit_at: string | null;
          paid_minor: number;
          created_at: string;
          updated_at: string;
          first_name: string | null;
          last_name: string | null;
        }[];
      };
      mark_notification_read: {
        Args: { p_id: number };
        Returns: boolean;
      };
      mark_notification_unread: {
        Args: { p_id: number };
        Returns: boolean;
      };
      count_visit_views: {
        Args: { p_views: Json };
        Returns: { view_id: string; total: number }[];
      };
      get_visit_client: {
        Args: { p_visit_id: string };
        Returns: {
          id: string;
          name: string;
          email: string;
          phone: string | null;
          notes: string | null;
          visits: number;
          upcoming: number;
          cancelled: number;
          last_visit_at: string | null;
          next_visit_at: string | null;
          paid_minor: number;
          created_at: string;
          updated_at: string;
          first_name: string | null;
          last_name: string | null;
        }[];
      };
      list_settlements: {
        Args: never;
        Returns: {
          appointment_id: string;
          client_email: string | null;
          client_name: string | null;
          client_phone: string | null;
          currency_code: string;
          kind: string;
          owed_minor: number;
          paid_minor: number;
          reference: string;
          refunded_minor: number;
          service_name: string;
          since: string;
          specialist_name: string | null;
          starts_at: string;
          status: Database["public"]["Enums"]["appointment_status"];
        }[];
      };
      list_visit_events: {
        Args: { p_id: string; p_own?: boolean };
        Returns: {
          actor: string;
          actor_name: string | null;
          details: Json;
          id: number;
          kind: string;
          occurred_at: string;
        }[];
      };
      list_visits: {
        Args: {
          p_from: string;
          p_own?: boolean;
          p_specialist_id?: string;
          p_to: string;
        };
        Returns: {
          cancelled_at: string | null;
          cancelled_by: string | null;
          client_email: string | null;
          client_name: string | null;
          client_notes: string | null;
          client_phone: string | null;
          currency_code: string;
          ends_at: string;
          /** The end of its whole time (the time after it too). */
          held_until?: string | null;
          id: string;
          location_name: string | null;
          mode: Database["public"]["Enums"]["visit_mode"];
          paid: boolean | null;
          payment_due_at: string | null;
          price_minor: number;
          reference: string;
          refund_due_minor: number | null;
          refunded_minor: number | null;
          reschedule_count: number;
          room_color: string | null;
          room_id: string | null;
          room_name: string | null;
          service_name: string;
          specialist_color: string | null;
          specialist_id: string;
          specialist_name: string;
          starts_at: string;
          status: Database["public"]["Enums"]["appointment_status"];
        }[];
      };
      list_client_visits: {
        Args: { p_client_id: string };
        Returns: Database["public"]["Functions"]["list_visits"]["Returns"];
      };
      search_clients: {
        Args: {
          p_created_from?: string;
          p_created_to?: string;
          p_desc?: boolean;
          p_last_from?: string;
          p_last_to?: string;
          p_limit?: number;
          p_offset?: number;
          p_query?: string | null;
          p_sort?: string;
          p_upcoming?: boolean;
        };
        Returns: {
          id: string;
          name: string;
          email: string;
          phone: string | null;
          notes: string | null;
          visits: number;
          upcoming: number;
          cancelled: number;
          last_visit_at: string | null;
          next_visit_at: string | null;
          paid_minor: number;
          created_at: string;
          total_count: number;
          first_name: string | null;
          last_name: string | null;
        }[];
      };
      mark_booking_email_sent: {
        Args: { p_kind: string; p_message_id: string; p_reference: string };
        Returns: undefined;
      };
      mark_notifications_read: {
        Args: { p_portal: string };
        Returns: number;
      };
      pending_checkout_session: {
        Args: { p_access_token: string };
        Returns: {
          checkout_session_id: string;
        }[];
      };
      pending_reservation_payment: {
        Args: { p_token: string };
        Returns: {
          checkout_session_id: string;
        }[];
      };
      publish_site_content: { Args: { p_key: string }; Returns: undefined };
      create_article: {
        Args: { p_draft: Json };
        Returns: string;
      };
      save_article_draft: {
        Args: { p_id: string; p_draft: Json };
        Returns: undefined;
      };
      list_articles_admin: {
        Args: never;
        Returns: {
          id: string;
          status: string;
          draft: Json;
          slug: string | null;
          published_at: string | null;
          updated_at: string;
          has_unpublished_changes: boolean;
        }[];
      };
      get_article_admin: {
        Args: { p_id: string };
        Returns: Json;
      };
      publish_article: {
        Args: { p_id: string };
        Returns: undefined;
      };
      unpublish_article: {
        Args: { p_id: string };
        Returns: undefined;
      };
      delete_article: {
        Args: { p_id: string };
        Returns: undefined;
      };
      delete_article_category: {
        Args: { p_id: string };
        Returns: undefined;
      };
      create_ebook: {
        Args: { p_draft: Json };
        Returns: string;
      };
      save_ebook_draft: {
        Args: { p_id: string; p_draft: Json };
        Returns: undefined;
      };
      list_ebooks_admin: {
        Args: never;
        Returns: {
          id: string;
          status: string;
          draft: Json;
          slug: string | null;
          published_at: string | null;
          updated_at: string;
          has_unpublished_changes: boolean;
        }[];
      };
      get_ebook_admin: {
        Args: { p_id: string };
        Returns: Json;
      };
      publish_ebook: {
        Args: { p_id: string };
        Returns: undefined;
      };
      unpublish_ebook: {
        Args: { p_id: string };
        Returns: undefined;
      };
      delete_ebook: {
        Args: { p_id: string };
        Returns: undefined;
      };
      submit_contact_message: {
        Args: {
          p_email: string;
          p_message: string;
          p_name: string;
          p_phone: string | null;
          p_sender_key: string;
        };
        Returns: string;
      };
      confirm_newsletter_subscription: {
        Args: { p_token_hash: string };
        Returns: {
          email: string;
          outcome: string;
        }[];
      };
      finish_newsletter_removal: { Args: { p_id: string }; Returns: undefined };
      find_newsletter_unsubscribe: {
        Args: { p_token: string };
        Returns: {
          email: string;
          status: string;
        }[];
      };
      get_newsletter_consent: {
        Args: { p_id: string };
        Returns: {
          confirmed_at: string;
          consent_text: string;
          consent_version: string;
          email: string;
          requested_at: string;
        }[];
      };
      list_newsletter_subscribers: {
        Args: never;
        Returns: {
          confirmed_at: string;
          consent_version: string;
          email: string;
          id: string;
          requested_at: string;
          source: string;
          status: string;
          stop_reason: string;
          stopped_at: string;
          synced: boolean;
        }[];
      };
      mark_newsletter_confirmation_sent: {
        Args: { p_email: string };
        Returns: undefined;
      };
      mark_newsletter_synced: {
        Args: { p_contact_id: string; p_id: string };
        Returns: undefined;
      };
      newsletter_contacts_to_sync: {
        Args: never;
        Returns: {
          email: string;
          id: string;
          status: string;
          unsubscribe_token: string;
        }[];
      };
      remove_newsletter_subscriber: {
        Args: { p_id: string };
        Returns: undefined;
      };
      request_newsletter_subscription: {
        Args: {
          p_consent_text: string;
          p_consent_version: string;
          p_email: string;
          p_sender_key: string;
          p_source: string;
          p_token_hash: string;
        };
        Returns: string;
      };
      unsubscribe_newsletter: {
        Args: { p_token: string };
        Returns: {
          email: string;
          outcome: string;
        }[];
      };
      stop_newsletter_subscription: {
        Args: { p_email: string; p_reason: string };
        Returns: boolean;
      };
      mark_contact_message_notified: {
        Args: { p_id: string };
        Returns: undefined;
      };
      get_site_content_draft: { Args: { p_key: string }; Returns: Json };
      get_site_content_draft_version: {
        Args: never;
        Returns: string | null;
      };
      confirm_reservation: {
        Args: { p_manage_token: string };
        Returns: string | null;
      };
      record_dispute: {
        Args: {
          p_amount_minor: number;
          p_closed: boolean;
          p_dispute_id: string;
          p_payment_intent_id: string;
          p_reason: string;
          p_reference?: string;
          p_status: string;
        };
        Returns: string | null;
      };
      list_stuck_payments: {
        Args: never;
        Returns: {
          checkout_session_id: string;
        }[];
      };
      record_refund: {
        Args: { p_payment_intent_id: string; p_refunded_minor: number };
        Returns: boolean;
      };
      reject_specialist_profile_draft: {
        Args: { p_draft_id: string; p_review_comment: string };
        Returns: undefined;
      };
      release_booking_email: {
        Args: { p_kind: string; p_reference: string };
        Returns: undefined;
      };
      release_hold: { Args: { p_access_token: string }; Returns: boolean };
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
      reschedule_booking: {
        Args: { p_manage_token: string; p_starts_at: string };
        Returns: {
          ends_at: string;
          reference: string;
          reschedule_count: number;
          starts_at: string;
        }[];
      };
      reserve_hold: {
        Args: { p_access_token: string; p_client_key?: string };
        Returns: {
          confirm_by: string | null;
          outcome: string;
          payment_due_at: string | null;
          reference: string;
        }[];
      };
      reservation_confirm_by: {
        Args: { p_manage_token: string };
        Returns: string | null;
      };
      save_availability_rule: {
        Args: {
          p_ends_at: string;
          p_id?: string;
          p_interval_weeks?: number;
          p_mode: Database["public"]["Enums"]["availability_mode"];
          p_note?: string;
          p_occurrence_count?: number;
          p_recurrence: Database["public"]["Enums"]["availability_recurrence"];
          p_room_id?: string;
          p_specialist_id?: string;
          p_starts_at: string;
          p_valid_from: string;
          p_valid_until?: string;
          p_weekdays: number[];
        };
        Returns: string;
      };
      save_booking_details: {
        Args: {
          p_accept_privacy: boolean;
          p_accept_terms: boolean;
          p_access_token: string;
          p_email: string;
          p_first_name: string;
          p_last_name: string;
          p_notes: string;
          p_phone: string;
        };
        Returns: undefined;
      };
      save_my_specialist_profile_draft: {
        Args: {
          p_certificates?: string[];
          p_client_groups?: string[];
          p_education?: string[];
          p_first_name: string;
          p_languages?: string[];
          p_last_name: string;
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
      search_bookings: {
        Args: {
          p_archived?: boolean;
          p_changed_from?: string;
          p_client_id?: string;
          p_closure?: string;
          p_changed_to?: string;
          p_created_from?: string;
          p_created_to?: string;
          p_desc?: boolean;
          p_from?: string;
          p_limit?: number;
          p_offset?: number;
          p_online?: boolean;
          p_own?: boolean;
          p_payments?: string[];
          p_query?: string;
          p_room_ids?: string[];
          p_service_ids?: string[];
          p_sort?: string;
          p_specialist_ids?: string[];
          p_statuses?: string[];
          p_to?: string;
        };
        Returns: {
          archived: boolean;
          cancelled_at: string | null;
          cancelled_by: string | null;
          client_email: string | null;
          client_id: string | null;
          closure: string | null;
          client_name: string | null;
          client_notes: string | null;
          client_phone: string | null;
          confirmed_at: string | null;
          created_at: string;
          currency_code: string;
          ends_at: string;
          id: string;
          location_name: string | null;
          mode: Database["public"]["Enums"]["visit_mode"];
          paid: boolean | null;
          payment_due_at: string | null;
          price_minor: number;
          reference: string;
          refund_due_minor: number | null;
          refunded_minor: number | null;
          reschedule_count: number;
          room_color: string | null;
          room_id: string | null;
          room_name: string | null;
          service_id: string;
          service_name: string;
          specialist_color: string | null;
          specialist_id: string;
          specialist_name: string;
          starts_at: string;
          status: Database["public"]["Enums"]["appointment_status"];
          changed_at: string;
          total_count: number;
        }[];
      };
      set_room_main_image: { Args: { p_image_id: string }; Returns: undefined };
      set_specialist_color: {
        Args: { p_color: string | null; p_specialist_id: string };
        Returns: string | null;
      };
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
      appointment_status:
        "held" | "awaiting_payment" | "confirmed" | "cancelled" | "expired";
      availability_mode: "in_person" | "online" | "hybrid";
      availability_recurrence: "once" | "weekly";
      payment_status:
        | "pending"
        | "succeeded"
        | "failed"
        | "expired"
        | "refunded"
        | "partially_refunded";
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
      visit_mode: "in_person" | "online";
      workshop_modality: "in_person" | "online";
      workshop_registration_status:
        | "held"
        | "awaiting_payment"
        | "confirmed"
        | "waitlisted"
        | "offered"
        | "cancelled"
        | "expired";
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
      appointment_status: [
        "held",
        "awaiting_payment",
        "confirmed",
        "cancelled",
        "expired",
      ],
      availability_mode: ["in_person", "online", "hybrid"],
      availability_recurrence: ["once", "weekly"],
      payment_status: [
        "pending",
        "succeeded",
        "failed",
        "expired",
        "refunded",
        "partially_refunded",
      ],
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
      visit_mode: ["in_person", "online"],
      workshop_modality: ["in_person", "online"],
      workshop_registration_status: [
        "held",
        "awaiting_payment",
        "confirmed",
        "waitlisted",
        "offered",
        "cancelled",
        "expired",
      ],
      workshop_status: ["draft", "published", "cancelled", "completed"],
    },
  },
} as const;
