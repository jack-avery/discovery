/**
 * Dashboard DTOs matching GET /dashboard/stats (Frontend Integration Contract).
 */

export interface DashboardStats {
  total_resources: number
  published_resources: number
  pending_submissions: number
  open_issues: number
  total_users: number
}
