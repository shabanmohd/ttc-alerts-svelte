// Auto-generated types from Supabase schema
// Run: npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/types/database.ts

export interface Database {
  public: {
    Tables: {
      alert_cache: {
        Row: {
          alert_id: string;
          thread_id: string | null;
          header_text: string;
          description_text: string | null;
          effect: string | null;
          cause: string | null;
          severity_level: string | null;
          affected_routes: string[] | null;
          affected_stops: string[] | null;
          active_period_start: string | null;
          active_period_end: string | null;
          categories: string[] | null;
          is_latest: boolean | null;
          similarity_score: number | null;
          raw_data: Record<string, unknown> | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['alert_cache']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['alert_cache']['Insert']>;
      };
      incident_threads: {
        Row: {
          thread_id: string;
          title: string;
          affected_routes: string[] | null;
          categories: string[] | null;
          is_resolved: boolean | null;
          is_hidden: boolean | null;
          resolved_at: string | null;
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
          reason: string | null;
          description: string | null;
          details_url: string | null;
          is_active: boolean | null;
          scraped_at: string;
        };
        Insert: Omit<Database['public']['Tables']['planned_maintenance']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['planned_maintenance']['Insert']>;
      };
      user_preferences: {
        Row: {
          id: string;
          user_id: string;
          preferences: {
            favorites?: { routes: string[] };
            schedules?: { days: string[]; start_time: string; end_time: string }[];
            filters?: Record<string, boolean>;
          } | null;
          push_subscription: Record<string, unknown> | null;
          device_id: string | null;
          device_name: string | null;
          device_type: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['user_preferences']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['user_preferences']['Insert']>;
      };
      device_preferences: {
        Row: {
          id: string;
          device_id: string;
          preferences: {
            favorites?: { routes: string[] };
            schedules?: { days: string[]; start_time: string; end_time: string }[];
            filters?: Record<string, boolean>;
          } | null;
          push_subscription: Record<string, unknown> | null;
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

// UI-friendly maintenance type (mapped from Maintenance)
export interface PlannedMaintenance {
  id: number;
  maintenance_id: string;
  routes: string[];  // Mapped from subway_line
  affected_stations: string;
  description: string | null;
  reason: string | null;
  start_date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
  url: string | null;
}

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
