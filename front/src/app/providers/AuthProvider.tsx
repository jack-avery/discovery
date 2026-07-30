import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  EMPTY_PERMISSIONS,
  hasStaffAccess,
  permissionsFromRoles,
  type StaffPermissions,
} from '@/auth/permissions'
import * as authService from '@/services/authService'
import { setAccessToken } from '@/services/authToken'
import { ApiError } from '@/services/api'
import type { AuthUser, LoginRequest } from '@/types/auth'

export type AuthStatus = 'anonymous' | 'authenticated'

interface AuthContextValue {
  status: AuthStatus
  user: AuthUser | null
  accessToken: string | null
  permissions: StaffPermissions
  isAuthenticated: boolean
  isLoading: boolean
  login: (credentials: LoginRequest) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (error instanceof Error && error.name === 'AbortError')
  )
}

function clearSession(
  setUser: (user: AuthUser | null) => void,
  setToken: (token: string | null) => void,
) {
  setAccessToken(null)
  setToken(null)
  setUser(null)
}

/**
 * Establish staff session from an access token via GET /auth/me.
 * Clears auth state and throws when the account lacks staff roles.
 */
async function establishSessionFromAccessToken(
  accessToken: string,
  signal?: AbortSignal,
): Promise<AuthUser> {
  setAccessToken(accessToken)
  const { user } = await authService.getCurrentUser({ signal })

  if (!hasStaffAccess(user.roles)) {
    try {
      await authService.logout({ signal })
    } catch {
      // Best-effort cookie clear; local state is cleared by the caller.
    }
    setAccessToken(null)
    throw new ApiError(
      'This portal is for RRCRC staff only. Your account does not have staff access.',
      403,
    )
  }

  return user
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [accessToken, setTokenState] = useState<string | null>(null)
  /** True during cold-start session restore and auth mutations. */
  const [isLoading, setIsLoading] = useState(true)

  const applySession = useCallback((nextUser: AuthUser, token: string) => {
    setAccessToken(token)
    setTokenState(token)
    setUser(nextUser)
  }, [])

  /**
   * On load: attempt silent refresh (HttpOnly cookie). When a new access token
   * is issued, load the user from GET /auth/me. No cookie / 401 → anonymous.
   */
  useEffect(() => {
    const controller = new AbortController()
    let cancelled = false

    async function restoreSession() {
      setIsLoading(true)
      try {
        const { access_token } = await authService.refreshAccessToken({
          signal: controller.signal,
        })
        if (cancelled) return

        const nextUser = await establishSessionFromAccessToken(
          access_token,
          controller.signal,
        )
        if (cancelled) return

        applySession(nextUser, access_token)
      } catch (error) {
        if (cancelled || isAbortError(error) || controller.signal.aborted) {
          return
        }
        // 401 (no/expired refresh), network, or inactive account → anonymous.
        clearSession(setUser, setTokenState)
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void restoreSession()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [applySession])

  const login = useCallback(
    async (credentials: LoginRequest) => {
      setIsLoading(true)
      try {
        const result = await authService.login(credentials)
        // Prefer /auth/me over the login payload as the user source of truth.
        const nextUser = await establishSessionFromAccessToken(
          result.access_token,
        )
        applySession(nextUser, result.access_token)
      } catch (error) {
        try {
          await authService.logout()
        } catch {
          // Best-effort cookie clear after a failed establish.
        }
        clearSession(setUser, setTokenState)
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [applySession],
  )

  const logout = useCallback(async () => {
    setIsLoading(true)
    try {
      try {
        await authService.logout()
      } finally {
        clearSession(setUser, setTokenState)
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const refresh = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await authService.refreshAccessToken()
      const nextUser = await establishSessionFromAccessToken(result.access_token)
      applySession(nextUser, result.access_token)
    } catch (error) {
      clearSession(setUser, setTokenState)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [applySession])

  const permissions = useMemo(
    () => (user ? permissionsFromRoles(user.roles) : EMPTY_PERMISSIONS),
    [user],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      status: user && accessToken ? 'authenticated' : 'anonymous',
      user,
      accessToken,
      permissions,
      isAuthenticated: Boolean(user && accessToken),
      isLoading,
      login,
      logout,
      refresh,
    }),
    [user, accessToken, permissions, isLoading, login, logout, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
