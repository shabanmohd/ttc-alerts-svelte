// Auto-generated types from Supabase schema
// Run: npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/types/database.ts

export interface Database {
  public: {
    Tables: {
      alert_cache: {
        Row: {
          id: number;
          alert_id: string;
          thread_id: string | null;
          header_text: string;
          description_text: string | null;
          severity: string | null;
          cause: string | null;
          effect: string | null;
          url: string | null;
          routes: string[];
          stops: string[];
          categories: string[];
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['alert_cache']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['alert_cache']['Insert']>;
      };
      incident_threads: {
        Row: {
          thread_id: string;
          first_alert_id: string;
          alert_ids: string[];
          routes: string[];
          categories: string[];
          is_resolved: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Database['public']['Tables']['incident_threads']['Row'];
        Update: Partial<Database['public']['Tables']['incident_threads']['Insert']>;
      };
      planned_maintenance: {
        Row: {
          id: number;
          maintenance_id: string;
          subway_line: string;
          affected_stations: string;
          start_date: string;
          end_date: string;
          start_time: string | null;
          end_time: string | null;
          reason: string;
          description: string;
          details_url: string | null;
          is_active: boolean;
          scraped_at: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['planned_maintenance']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['planned_maintenance']['Insert']>;
      };
      user_preferences: {
        Row: {
          id: number;
          user_id: string;
          preferences: {
            favorites?: { routes: string[] };
            schedules?: { days: string[]; start_time: string; end_time: string }[];
            filters?: Record<string, boolean>;
          };
          alert_settings: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['user_preferences']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['user_preferences']['Insert']>;
      };
      device_preferences: {
        Row: {
          id: number;
          device_id: string;
          preferences: Record<string, unknown>;
          alert_settings: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['device_preferences']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['device_preferences']['Insert']>;
      };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

// Convenience types
export type Alert = Database['public']['Tables']['alert_cache']['Row'];
export type Thread = Database['public']['Tables']['incident_threads']['Row'];
export type Maintenance = Database['public']['Tables']['planned_maintenance']['Row'];
export type UserPreferences = Database['public']['Tables']['user_preferences']['Row'];
export type DevicePreferences = Database['public']['Tables']['device_preferences']['Row'];

// Alert categories
export type AlertCategory = 
  | 'SERVICE_DISRUPTION'
  | 'SERVICE_RESUMED'
  | 'DELAY'
  | 'DETOUR'
  | 'PLANNED_SERVICE_DISRUPTION'
  | 'ACCESSIBILITY'
  | 'SUBWAY'
  | 'STREETCARS'
  | 'BUS'
  | 'OTHER';

// Thread with alerts for UI
export interface ThreadWithAlerts extends Thread {
  alerts: Alert[];
  latestAlert: Alert;
}
