export type Json =
  | string | number | boolean | null
  | { [key: string]: Json | undefined }
  | Json[];

type ChildProfileRow = {
  id: string; display_name: string; sidekick_names: string[]; avatar_key: string;
  saga_id: string; created_at: string; updated_at: string;
};
type PartProgressRow = {
  child_id: string; saga_id: string; level_id: string; quest_id: string;
  part_id: string; task_id: string; response: Json | null; correct: boolean;
  attempts: number; variable_key: string | null; variable_value: string | null;
  points: number; completed_at: string | null; updated_at: string;
};
type LevelProgressRow = {
  child_id: string; saga_id: string; level_id: string; level_number: number;
  status: string; current_quest_id: string | null; current_part_id: string | null;
  current_task_id: string | null; started_at: string; completed_at: string | null;
  updated_at: string;
};
type AchievementRow = {
  child_id: string; saga_id: string; achievement_key: string; earned_at: string;
};
type LoginStateRow = {
  attempt_key: string; failed_attempts: number; window_started_at: string;
  locked_until: string | null; updated_at: string;
};
type Table<Row, Insert, Update = Partial<Insert>> = {
  Row: Row; Insert: Insert; Update: Update; Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      child_profiles: Table<ChildProfileRow,
        Omit<ChildProfileRow, "id" | "created_at" | "updated_at"> &
        Partial<Pick<ChildProfileRow, "id" | "created_at" | "updated_at">>>;
      part_progress: Table<PartProgressRow, Partial<PartProgressRow>>;
      level_progress: Table<LevelProgressRow,
        Pick<LevelProgressRow, "child_id" | "saga_id" | "level_id" | "level_number" | "status"> &
        Partial<Omit<LevelProgressRow, "child_id" | "saga_id" | "level_id" | "level_number" | "status">>>;
      achievements: Table<AchievementRow,
        Pick<AchievementRow, "child_id" | "saga_id" | "achievement_key"> &
        Partial<Pick<AchievementRow, "earned_at">>>;
      guardian_login_state: Table<LoginStateRow,
        Pick<LoginStateRow, "attempt_key"> & Partial<Omit<LoginStateRow, "attempt_key">>>;
    };
    Views: Record<string, never>;
    Functions: {
      record_guardian_login: {
        Args: { p_attempt_key: string; p_success: boolean };
        Returns: { allowed: boolean; locked_until: string | null }[];
      };
      record_task_attempt: {
        Args: {
          p_child_id: string; p_saga_id: string; p_level_id: string;
          p_quest_id: string; p_part_id: string; p_task_id: string;
          p_response: Json; p_correct: boolean; p_variable_key: string | null;
          p_variable_value: string | null; p_points: number;
        };
        Returns: {
          correct: boolean;
          points: number;
          newly_completed: boolean;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
