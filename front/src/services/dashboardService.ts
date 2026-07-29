import { api } from '@/services/api'
import type { DashboardStats } from '@/types/dashboard'

export interface FetchDashboardStatsOptions {
  signal?: AbortSignal
}

/**
 * GET /dashboard/stats — moderator+ on the current backend.
 * Frontend always attempts this load for Staff Dashboard visitors;
 * a 403 (e.g. staff_editor) is a temporary backend limitation handled in UI.
 */
export async function getDashboardStats(
  options?: FetchDashboardStatsOptions,
): Promise<DashboardStats> {
  return api.get<DashboardStats>('/dashboard/stats', {
    signal: options?.signal,
  })
}
