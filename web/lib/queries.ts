import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "./api";
import type { ActivityPoint, Goal, PublicProfile, User, UserSummary, WeeklyProgress } from "./types";

// ─── Query keys ────────────────────────────────────────────────────────────

export const qk = {
  me: ["me"] as const,
  goals: ["goals"] as const,
  progress: (week?: string) => ["progress", week ?? "current"] as const,
  profile: (id: string) => ["profile", id] as const,
  activity: (id: string) => ["activity", id] as const,
  following: ["following"] as const,
};

// ─── Request types ─────────────────────────────────────────────────────────

export interface UpdateUserInput {
  display_name?: string;
  timezone?: string;
  publish_time?: string;
  week_start?: number;
}

export interface CreateGoalInput {
  goal_type: "recurring" | "weekly";
  title: string;
  target_count?: number;
  visibility?: "public" | "private";
  week_start_date?: string; // required when goal_type = "weekly"
}

// ─── Queries ───────────────────────────────────────────────────────────────

export function useCurrentUser() {
  return useQuery<User, ApiError>({
    queryKey: qk.me,
    queryFn: () => api.get<User>("/users/me"),
    retry: (_count, err) => !(err instanceof ApiError && err.status === 401),
  });
}

export function useGoals() {
  return useQuery<Goal[], ApiError>({
    queryKey: qk.goals,
    queryFn: () => api.get<Goal[]>("/goals"),
  });
}

export function useProgress(week?: string) {
  return useQuery<WeeklyProgress[], ApiError>({
    queryKey: qk.progress(week),
    queryFn: () =>
      api.get<WeeklyProgress[]>(`/progress${week ? `?week=${encodeURIComponent(week)}` : ""}`),
  });
}

// ─── Mutations ─────────────────────────────────────────────────────────────

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation<User, ApiError, UpdateUserInput>({
    mutationFn: (data) => api.patch<User>("/users/me", data),
    onSuccess: (updated) => {
      qc.setQueryData(qk.me, updated);
    },
  });
}

export function useLogProgress() {
  const qc = useQueryClient();
  return useMutation<WeeklyProgress, ApiError, { goalId: string; increment?: number }>({
    mutationFn: ({ goalId, increment }) =>
      api.post<WeeklyProgress>(`/progress/${goalId}`, { increment: increment ?? 1 }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.progress() });
    },
  });
}

export function useCreateGoal() {
  const qc = useQueryClient();
  return useMutation<Goal, ApiError, CreateGoalInput>({
    mutationFn: (data) => api.post<Goal>("/goals", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.goals });
      qc.invalidateQueries({ queryKey: qk.progress() });
    },
  });
}

export function usePublicProfile(id: string) {
  return useQuery<PublicProfile, ApiError>({
    queryKey: qk.profile(id),
    queryFn: () => api.get<PublicProfile>(`/users/${id}`),
  });
}

export function useActivityData(id: string) {
  return useQuery<ActivityPoint[], ApiError>({
    queryKey: qk.activity(id),
    queryFn: () => api.get<ActivityPoint[]>(`/users/${id}/activity`),
  });
}

export function useFollowing() {
  return useQuery<UserSummary[], ApiError>({
    queryKey: qk.following,
    queryFn: () => api.get<UserSummary[]>("/follows/following"),
    retry: (_count, err) => !(err instanceof ApiError && err.status === 401),
  });
}

export function useFollowUser() {
  const qc = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (userId) => api.post(`/follows/${userId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.following }),
  });
}

export function useUnfollowUser() {
  const qc = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (userId) => api.delete(`/follows/${userId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.following }),
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (goalId) => api.delete(`/goals/${goalId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.goals });
      qc.invalidateQueries({ queryKey: qk.progress() });
    },
  });
}
