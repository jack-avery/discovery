import {
  createContext,
  useCallback,
  useContext,
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

function clearSession(setUser: (user: AuthUser | null) => void, setToken: (token: string | null) => void) {
  setAccessToken(null)
  setToken(null)
  setUser(null)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [accessToken, setTokenState] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const applySession = useCallback((nextUser: AuthUser, token: string) => {
    setAccessToken(token)
    setTokenState(token)
    setUser(nextUser)
  }, [])

  const login = useCallback(
    async (credentials: LoginRequest) => {
      setIsLoading(true)
      try {
        const result = await authService.login(credentials)

        if (!hasStaffAccess(result.user.roles)) {
          try {
            await authService.logout()
          } catch {
            // Best-effort cookie clear; local state stays anonymous.
          }
          throw new ApiError(
            'This portal is for RRCRC staff only. Your account does not have staff access.',
            403,
          )
        }

        applySession(result.user, result.access_token)
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
      setAccessToken(result.access_token)
      setTokenState(result.access_token)
    } catch (error) {
      clearSession(setUser, setTokenState)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [])

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
