export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "admin" | "user";
export type LogStatus = "pending" | "approved" | "rejected";
export type ChallengeStatus = "active" | "archived";

export interface Database {
  public: {
    Tables: {
      realms: {
        Row: {
          id: string;
          name: string;
          slug: string;
          avatar_url: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          avatar_url?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          avatar_url?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          username: string;
          email: string;
          name: string;
          role: UserRole;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          email: string;
          name: string;
          role?: UserRole;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          email?: string;
          name?: string;
          role?: UserRole;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_realms: {
        Row: {
          id: string;
          user_id: string;
          realm_id: string;
          joined_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          realm_id: string;
          joined_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          realm_id?: string;
          joined_at?: string;
        };
      };
      invites: {
        Row: {
          id: string;
          email: string;
          token: string;
          realm_id: string;
          invited_by: string;
          used: boolean;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          token: string;
          realm_id: string;
          invited_by: string;
          used?: boolean;
          expires_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          token?: string;
          realm_id?: string;
          invited_by?: string;
          used?: boolean;
          expires_at?: string;
          created_at?: string;
        };
      };
      commitments: {
        Row: {
          id: string;
          realm_id: string;
          name: string;
          description: string | null;
          daily_target: number;
          unit: string;
          active_days: number[];
          punishment_multiplier: number;
          created_by: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          realm_id: string;
          name: string;
          description?: string | null;
          daily_target: number;
          unit: string;
          active_days?: number[];
          punishment_multiplier?: number;
          created_by: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          realm_id?: string;
          name?: string;
          description?: string | null;
          daily_target?: number;
          unit?: string;
          active_days?: number[];
          punishment_multiplier?: number;
          created_by?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_commitments: {
        Row: {
          id: string;
          user_id: string;
          commitment_id: string;
          pending_carry_over: number;
          total_completed: number;
          current_streak: number;
          best_streak: number;
          assigned_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          commitment_id: string;
          pending_carry_over?: number;
          total_completed?: number;
          current_streak?: number;
          best_streak?: number;
          assigned_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          commitment_id?: string;
          pending_carry_over?: number;
          total_completed?: number;
          current_streak?: number;
          best_streak?: number;
          assigned_at?: string;
        };
      };
      daily_logs: {
        Row: {
          id: string;
          user_id: string;
          commitment_id: string;
          date: string;
          target_amount: number;
          completed_amount: number;
          carry_over_from_previous: number;
          status: LogStatus;
          reviewed_by: string | null;
          reviewed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          commitment_id: string;
          date: string;
          target_amount: number;
          completed_amount?: number;
          carry_over_from_previous?: number;
          status?: LogStatus;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          commitment_id?: string;
          date?: string;
          target_amount?: number;
          completed_amount?: number;
          carry_over_from_previous?: number;
          status?: LogStatus;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      holidays: {
        Row: {
          id: string;
          realm_id: string;
          user_id: string | null;
          date: string;
          description: string;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          realm_id: string;
          user_id?: string | null;
          date: string;
          description: string;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          realm_id?: string;
          user_id?: string | null;
          date?: string;
          description?: string;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      challenges: {
        Row: {
          id: string;
          realm_id: string;
          commitment_id: string;
          name: string;
          description: string | null;
          duration_hours: number;
          max_units: number;
          status: ChallengeStatus;
          starts_at: string;
          ends_at: string;
          created_by: string;
          created_at: string;
          updated_at: string;
          results_processed_at: string | null;
        };
        Insert: {
          id?: string;
          realm_id: string;
          commitment_id: string;
          name: string;
          description?: string | null;
          duration_hours: number;
          max_units: number;
          status?: ChallengeStatus;
          starts_at?: string;
          ends_at?: string;
          created_by: string;
          created_at?: string;
          updated_at?: string;
          results_processed_at?: string | null;
        };
        Update: {
          id?: string;
          realm_id?: string;
          commitment_id?: string;
          name?: string;
          description?: string | null;
          duration_hours?: number;
          max_units?: number;
          status?: ChallengeStatus;
          starts_at?: string;
          ends_at?: string;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
          results_processed_at?: string | null;
        };
      };
      challenge_members: {
        Row: {
          id: string;
          challenge_id: string;
          user_id: string;
          votes: Record<string, number>;
          final_reps: number | null;
          joined_at: string;
        };
        Insert: {
          id?: string;
          challenge_id: string;
          user_id: string;
          votes?: Record<string, number>;
          final_reps?: number | null;
          joined_at?: string;
        };
        Update: {
          id?: string;
          challenge_id?: string;
          user_id?: string;
          votes?: Record<string, number>;
          final_reps?: number | null;
          joined_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      user_role: UserRole;
      log_status: LogStatus;
      challenge_status: ChallengeStatus;
    };
  };
}

export type Realm = Database["public"]["Tables"]["realms"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type UserRealm = Database["public"]["Tables"]["user_realms"]["Row"];
export type Invite = Database["public"]["Tables"]["invites"]["Row"];
export type Commitment = Database["public"]["Tables"]["commitments"]["Row"];
export type UserCommitment = Database["public"]["Tables"]["user_commitments"]["Row"];
export type DailyLog = Database["public"]["Tables"]["daily_logs"]["Row"];
export type Holiday = Database["public"]["Tables"]["holidays"]["Row"];
export type Challenge = Database["public"]["Tables"]["challenges"]["Row"];
export type ChallengeMember = Database["public"]["Tables"]["challenge_members"]["Row"];
