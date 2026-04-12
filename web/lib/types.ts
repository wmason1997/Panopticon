// Mirror of Rust model types — keep in sync with api/src/models/

export type SubscriptionTier = "free" | "premium";
export type GoalType = "recurring" | "weekly";
export type GoalVisibility = "public" | "private";

export interface User {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  timezone: string;
  publish_time: string;
  week_start: number;
  oauth_provider: string;
  subscription_tier: SubscriptionTier;
  leaderboard_opt_in: boolean;
  created_at: string;
  updated_at: string;
}

export interface PublicProfile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  subscription_tier: SubscriptionTier;
  leaderboard_opt_in: boolean;
  created_at: string;
  follower_count: number;
  following_count: number;
}

export interface Goal {
  id: string;
  user_id: string;
  goal_type: GoalType;
  title: string;
  target_count: number;
  visibility: GoalVisibility;
  is_archived: boolean;
  week_start_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface WeeklyProgress {
  id: string;
  goal_id: string;
  user_id: string;
  week_start_date: string;
  completed_count: number;
  target_count: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: string;
  weekly_progress_id: string;
  user_id: string;
  content: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserSummary {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

export interface ActivityPoint {
  week_start_date: string;
  completed: number | null;
  target: number | null;
}

export interface FeedItem {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  week_start_date: string;
  completed: number | null;
  target: number | null;
}

export interface PublicNoteView {
  id: string;
  content: string;
  week_start_date: string;
  goal_title: string | null;
  created_at: string;
}

export interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  current_streak: number;
  lifetime_avg_pct: number | null;
}
