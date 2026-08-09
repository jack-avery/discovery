import { api } from '@/services/api'
import type {
  LoginRequest,
  LoginResult,
  MeResult,
  RefreshResult,
} from '@/types/auth'

export interface AuthRequestOptions {
  signal?: AbortSignal
}

/**
 * Staff authentication against backend auth routes:
 * POST /auth/login, POST /auth/refresh, POST /auth/logout, GET /auth/me.
 */
export async function login(
  request: LoginRequest,
  options?: AuthRequestOptions,
): Promise<LoginResult> {
  return api.post<LoginResult>('/auth/login', request, {
    signal: options?.signal,
  })
}

export async function refreshAccessToken(
  options?: AuthRequestOptions,
): Promise<RefreshResult> {
  return api.post<RefreshResult>('/auth/refresh', undefined, {
    signal: options?.signal,
  })
}

export async function logout(options?: AuthRequestOptions): Promise<null> {
  return api.post<null>('/auth/logout', undefined, {
    signal: options?.signal,
  })
}

/**
 * Current authenticated user for the in-memory access token (GET /auth/me).
 * Source of truth for profile + roles after login and on session restore.
 */
export async function getCurrentUser(
  options?: AuthRequestOptions,
): Promise<MeResult> {
  return api.get<MeResult>('/auth/me', {
    signal: options?.signal,
  })
}

export interface SetupPasswordRequest {
  token: string
  password: string
}

/**
 * Public one-time password setup — POST /auth/setup-password.
 * Consumes a token from admin create-user or reset-password.
 */
export async function setupPassword(
  request: SetupPasswordRequest,
  options?: AuthRequestOptions,
): Promise<null> {
  return api.post<null>('/auth/setup-password', request, {
    signal: options?.signal,
  })
}
