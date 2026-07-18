import { api } from '@/services/api'
import type { LoginRequest, LoginResult, RefreshResult } from '@/types/auth'

export interface AuthRequestOptions {
  signal?: AbortSignal
}

/**
 * Staff authentication against existing backend endpoints only:
 * POST /auth/login, POST /auth/refresh, POST /auth/logout.
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
