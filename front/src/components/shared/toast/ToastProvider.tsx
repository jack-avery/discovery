import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { X } from 'lucide-react'
import { cn } from '@/utils/cn'

export type ToastVariant = 'success' | 'error'

export interface ToastInput {
  message: string
  variant?: ToastVariant
  /** Auto-dismiss delay in ms. Defaults to 4000. */
  durationMs?: number
}

interface ToastRecord extends Required<Omit<ToastInput, 'durationMs'>> {
  id: string
  durationMs: number
}

interface ToastContextValue {
  success: (message: string) => void
  error: (message: string) => void
  push: (toast: ToastInput) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const DEFAULT_DURATION_MS = 4000

/**
 * Lightweight app-wide toast host. Success/error feedback for admin flows.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const push = useCallback(
    (input: ToastInput) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const record: ToastRecord = {
        id,
        message: input.message,
        variant: input.variant ?? 'success',
        durationMs: input.durationMs ?? DEFAULT_DURATION_MS,
      }
      setToasts((current) => [...current, record])
      window.setTimeout(() => dismiss(id), record.durationMs)
    },
    [dismiss],
  )

  const value = useMemo<ToastContextValue>(
    () => ({
      push,
      success: (message) => push({ message, variant: 'success' }),
      error: (message) => push({ message, variant: 'error' }),
    }),
    [push],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed bottom-4 right-4 z-[70] flex w-[min(100%-2rem,22rem)] flex-col gap-2"
        aria-live="polite"
        aria-relevant="additions"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={cn(
              'pointer-events-auto flex items-start gap-3 rounded-xl border px-3.5 py-3 shadow-md',
              toast.variant === 'success'
                ? 'border-success/25 bg-surface text-foreground'
                : 'border-danger/30 bg-surface text-foreground',
            )}
          >
            <p className="min-w-0 flex-1 text-sm leading-snug">{toast.message}</p>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="shrink-0 rounded-md p-0.5 text-muted-foreground transition-colors hover:text-foreground focus-ring"
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}
