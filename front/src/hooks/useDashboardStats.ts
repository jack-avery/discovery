import { useEffect, useState } from 'react'
import { ApiError } from '@/services/api'
import { getDashboardStats } from '@/services/dashboardService'
import type { DashboardStats } from '@/types/dashboard'
import {
  logTechnicalError,
  toUserFacingErrorMessage,
} from '@/utils/userFacingError'

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (error instanceof Error && error.name === 'AbortError')
  )
}

export type DashboardStatsLoadState =
  | { status: 'loading'; stats: null; error: null; isForbidden: false }
  | { status: 'success'; stats: DashboardStats; error: null; isForbidden: false }
  | {
      status: 'error'
      stats: null
      error: string
      isForbidden: boolean
    }

/**
 * Loads GET /dashboard/stats for the Staff Dashboard KPI cards.
 */
export function useDashboardStats(): DashboardStatsLoadState & {
  reload: () => void
} {
  const [reloadToken, setReloadToken] = useState(0)
  const [state, setState] = useState<DashboardStatsLoadState>({
    status: 'loading',
    stats: null,
    error: null,
    isForbidden: false,
  })

  useEffect(() => {
    const controller = new AbortController()

    setState({
      status: 'loading',
      stats: null,
      error: null,
      isForbidden: false,
    })

    getDashboardStats({ signal: controller.signal })
      .then((stats) => {
        if (controller.signal.aborted) return
        setState({
          status: 'success',
          stats,
          error: null,
          isForbidden: false,
        })
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted || isAbortError(err)) return

        const isForbidden = err instanceof ApiError && err.status === 403
        if (isForbidden) {
          logTechnicalError('dashboard-stats', err)
        }

        const message = isForbidden
          ? 'Your account can open the dashboard, but analytics are temporarily unavailable for this role.'
          : toUserFacingErrorMessage(err, {
              fallback:
                "We couldn't load dashboard analytics. Please try again.",
              context: 'dashboard-stats',
            })

        setState({
          status: 'error',
          stats: null,
          error: message,
          isForbidden,
        })
      })

    return () => {
      controller.abort()
    }
  }, [reloadToken])

  return {
    ...state,
    reload: () => setReloadToken((token) => token + 1),
  }
}
