import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
} from 'react'
import { Button } from '@/components/ui'
import { UserForm } from '@/features/staff/users/UserForm'
import {
  emptyUserFormDraft,
  hasUserFormErrors,
  toUserFormValues,
  userFormDraftFromManagedUser,
  validateUserForm,
  type UserFormDraft,
  type UserFormFieldErrors,
  type UserFormValues,
  type UserModalMode,
} from '@/features/staff/users/userFormModel'
import type { ManagedUser } from '@/types/user'
import { cn } from '@/utils/cn'

export interface UserModalProps {
  open: boolean
  mode: UserModalMode
  /**
   * Prefill for edit mode (or optional create defaults).
   * Accepts a ManagedUser or a partial draft.
   */
  initialUser?: ManagedUser | Partial<UserFormDraft> | null
  /** Disables controls and shows loading labels on the primary action. */
  isSubmitting?: boolean
  /** When editing yourself, role cannot be changed. */
  disableRoleChange?: boolean
  /**
   * Persist handler. Return field errors to keep the modal open
   * (e.g. duplicate email); return void/undefined on success.
   */
  onSave: (
    values: UserFormValues,
  ) =>
    | void
    | UserFormFieldErrors
    | Promise<void | UserFormFieldErrors>
  onCancel: () => void
}

function resolveInitialDraft(
  mode: UserModalMode,
  initialUser?: ManagedUser | Partial<UserFormDraft> | null,
): UserFormDraft {
  const base = emptyUserFormDraft()
  if (!initialUser) return base

  if ('user_id' in initialUser && typeof initialUser.user_id === 'number') {
    return userFormDraftFromManagedUser(initialUser as ManagedUser)
  }

  const partial = initialUser as Partial<UserFormDraft>
  return {
    ...base,
    ...partial,
    is_active: partial.is_active ?? (mode === 'create' ? true : base.is_active),
  }
}

/**
 * Reusable Create / Edit User modal for staff User Management.
 * Phase 2: UI + client validation only — callers supply onSave.
 */
export function UserModal({
  open,
  mode,
  initialUser = null,
  isSubmitting = false,
  disableRoleChange = false,
  onSave,
  onCancel,
}: UserModalProps) {
  const titleId = useId()
  const descId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  const [values, setValues] = useState<UserFormDraft>(() =>
    resolveInitialDraft(mode, initialUser),
  )
  const [errors, setErrors] = useState<UserFormFieldErrors>({})

  useEffect(() => {
    if (!open) return
    setValues(resolveInitialDraft(mode, initialUser))
    setErrors({})
  }, [open, mode, initialUser])

  useEffect(() => {
    if (!open) return

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const focusTimer = window.setTimeout(() => {
      const firstField = dialogRef.current?.querySelector<HTMLElement>(
        'input:not([readonly]), select, textarea, button:not([disabled])',
      )
      firstField?.focus()
    }, 0)

    return () => {
      window.clearTimeout(focusTimer)
      document.body.style.overflow = previousOverflow
      previousFocusRef.current?.focus()
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (isSubmitting) return
      event.preventDefault()
      onCancel()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, isSubmitting, onCancel])

  if (!open) return null

  const title = mode === 'create' ? 'Create User' : 'Edit User'
  const description =
    mode === 'create'
      ? 'Create a new staff account.'
      : 'Update account information and permissions.'
  const primaryLabel = mode === 'create' ? 'Create User' : 'Save Changes'
  const primaryLoadingLabel = mode === 'create' ? 'Creating…' : 'Saving…'

  const handleChange = (patch: Partial<UserFormDraft>) => {
    setValues((current) => ({ ...current, ...patch }))
    const cleared = Object.keys(patch) as (keyof UserFormFieldErrors)[]
    if (cleared.length === 0) return
    setErrors((current) => {
      const next = { ...current }
      for (const key of cleared) {
        if (key in next) delete next[key]
      }
      return next
    })
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSubmitting) return

    const nextErrors = validateUserForm(values)
    setErrors(nextErrors)
    if (hasUserFormErrors(nextErrors)) return

    const payload = toUserFormValues(values)
    if (!payload) return

    void Promise.resolve(onSave(payload)).then((result) => {
      if (result && hasUserFormErrors(result)) {
        setErrors(result)
      }
    })
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-surface-overlay"
        aria-label="Dismiss"
        disabled={isSubmitting}
        onClick={onCancel}
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className={cn(
          'relative z-10 flex max-h-[min(100dvh,40rem)] w-full flex-col',
          'rounded-t-2xl border border-border bg-surface shadow-lg',
          'sm:max-h-[min(90vh,40rem)] sm:max-w-lg sm:rounded-2xl',
        )}
      >
        <header className="shrink-0 border-b border-border px-5 py-4">
          <h2
            id={titleId}
            className="font-heading text-lg font-semibold text-foreground"
          >
            {title}
          </h2>
          <p id={descId} className="mt-1 text-sm text-muted-foreground">
            {description}
          </p>
        </header>

        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={handleSubmit}
          noValidate
        >
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 scrollbar-thin">
            <UserForm
              mode={mode}
              values={values}
              errors={errors}
              disabled={isSubmitting}
              roleDisabled={disableRoleChange}
              onChange={handleChange}
            />
          </div>

          <footer className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-border px-5 py-4">
            <Button
              type="button"
              variant="secondary"
              disabled={isSubmitting}
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button type="submit" variant="interactive" disabled={isSubmitting}>
              {isSubmitting ? primaryLoadingLabel : primaryLabel}
            </Button>
          </footer>
        </form>
      </div>
    </div>
  )
}
