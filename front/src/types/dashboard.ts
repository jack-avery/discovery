/**
 * Dashboard DTOs matching GET /dashboard/stats (Frontend Integration Contract).
 */

export interface DashboardStats {
  total_resources: number
  published_resources: number
  /**
   * All pending submissions (legacy). Still accepted from the API but unused by the UI.
   * Prefer {@link pending_new_submissions} / {@link pending_resource_updates}.
   */
  pending_submissions?: number
  /** Pending new-resource / event / skill submissions. */
  pending_new_submissions?: number
  /** Pending resource-update submissions. */
  pending_resource_updates?: number
  open_issues: number
  total_users: number
}
