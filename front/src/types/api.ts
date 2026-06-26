/** Standard backend response envelope (ok / err). */
export interface ApiSuccess<T> {
  ok: true
  data: T
}

export interface ApiErrorBody {
  ok: false
  error: string
  message?: string
}

export type ApiResponse<T> = ApiSuccess<T> | ApiErrorBody
