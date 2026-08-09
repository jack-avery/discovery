import { useEffect, useState } from 'react'
import { toUserFacingErrorMessage } from '@/utils/userFacingError'

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (error instanceof Error && error.name === 'AbortError')
  )
}

const MOUNT_ONCE: readonly unknown[] = []

interface UseAbortableQueryOptions<T> {
  initialData: T
  fallbackErrorMessage: string
  /**
   * Re-run the fetch when these values change.
   * Omit (or pass nothing) for mount-once lookup endpoints.
   */
  deps?: readonly unknown[]
}

/**
 * Abortable async load with loading/error state.
 * Shared by lookup hooks and filterable resource queries.
 * Surfaces only the friendly fallback message; logs technical details.
 */
export function useAbortableQuery<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  { initialData, fallbackErrorMessage, deps }: UseAbortableQueryOptions<T>,
): {
  data: T
  isLoading: boolean
  error: string | null
} {
  const [data, setData] = useState<T>(initialData)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    setIsLoading(true)
    setError(null)

    fetcher(controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return
        setData(result)
        setError(null)
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted || isAbortError(err)) return
        setData(initialData)
        setError(
          toUserFacingErrorMessage(err, {
            fallback: fallbackErrorMessage,
            context: 'abortable-query',
          }),
        )
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      })

    return () => {
      controller.abort()
    }
    // Caller supplies an explicit deps list (or mount-once default).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- controlled by deps option
  }, deps ?? MOUNT_ONCE)

  return { data, isLoading, error }
}
