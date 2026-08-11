import { useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { Button, Card, CardContent, CardHeader, Input } from '@/components/ui'
import { APP_BRANDING } from '@/config/appBranding'
import { ApiError } from '@/services/api'
import { setupPassword } from '@/services/authService'
import {
  looksLikeTechnicalErrorMessage,
  logTechnicalError,
  toUserFacingErrorMessage,
} from '@/utils/userFacingError'
import {
  MIN_PASSWORD_LENGTH,
  validateSetupPasswordFields,
} from '@/features/staff/auth/setupPasswordValidation'

type SetupPhase = 'form' | 'success'

function resolveSetupErrorMessage(error: unknown): string {
  if (error instanceof ApiError && (error.status === 401 || error.status === 400)) {
    logTechnicalError('auth-setup-password', error)
    const message = error.message.trim()
    if (message && !looksLikeTechnicalErrorMessage(message)) {
      return message
    }
    return 'This setup link is invalid or has expired.'
  }

  if (error instanceof ApiError && error.status === 422) {
    if (error.errors?.password) return error.errors.password
    const message = error.message.trim()
    if (message && !looksLikeTechnicalErrorMessage(message)) {
      return message
    }
  }

  return toUserFacingErrorMessage(error, {
    fallback: 'Unable to set your password. Please try again.',
    context: 'auth-setup-password',
    allowSafeApiMessage: true,
  })
}

/**
 * Public form to set a password using a one-time admin-issued setup token.
 */
export function SetupPasswordForm() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const token = useMemo(
    () => (searchParams.get('token') || '').trim(),
    [searchParams],
  )

  const [phase, setPhase] = useState<SetupPhase>('form')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [passwordError, setPasswordError] = useState<string | undefined>()
  const [confirmError, setConfirmError] = useState<string | undefined>()
  const [formError, setFormError] = useState<string | null>(
    token ? null : 'This setup link is missing or incomplete.',
  )
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)

    if (!token) {
      setFormError('This setup link is missing or incomplete.')
      return
    }

    const clientErrors = validateSetupPasswordFields(password, confirmPassword)
    setPasswordError(clientErrors.password)
    setConfirmError(clientErrors.confirm)
    if (clientErrors.password || clientErrors.confirm) return

    setIsSubmitting(true)
    try {
      await setupPassword({ token, password })
      setPassword('')
      setConfirmPassword('')
      setPhase('success')
      // Clear the token from the URL without remounting (keeps success state).
      window.history.replaceState({}, '', '/setup-password')
    } catch (error) {
      if (error instanceof ApiError && error.errors?.password) {
        setPasswordError(error.errors.password)
      }
      setFormError(resolveSetupErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (phase === 'success') {
    return (
      <Card className="w-full">
        <CardHeader>
          <h2 className="font-heading text-lg font-semibold text-foreground">
            Password set
          </h2>
          <p className="text-sm text-muted-foreground">
            Your password has been set successfully. You can now sign in with
            your email and new password.
          </p>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            className="w-full"
            variant="interactive"
            onClick={() => navigate('/sign-in')}
          >
            Continue to Sign In
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <h2 className="font-heading text-lg font-semibold text-foreground">
          Set your password
        </h2>
        <p className="text-sm text-muted-foreground">
          Choose a password for your {APP_BRANDING.communityName} staff account.
          This link can only be used once.
        </p>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={(event) => void handleSubmit(event)}
          noValidate
        >
          {formError ? (
            <p
              className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger"
              role="alert"
            >
              {formError}
            </p>
          ) : null}

          <div className="space-y-1.5">
            <label
              htmlFor="setup-password"
              className="block text-sm font-medium text-foreground"
            >
              New password
              <span className="text-danger" aria-hidden="true">
                {' '}
                *
              </span>
            </label>
            <div className="relative">
              <Input
                id="setup-password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete="new-password"
                value={password}
                disabled={isSubmitting || !token}
                aria-invalid={passwordError ? true : undefined}
                aria-describedby={
                  passwordError ? 'setup-password-error' : undefined
                }
                className="pr-11"
                onChange={(event) => {
                  setPassword(event.target.value)
                  if (formError) setFormError(null)
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                disabled={isSubmitting || !token}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                className="absolute top-1/2 right-1.5 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-ring disabled:pointer-events-none disabled:opacity-50"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" strokeWidth={1.75} />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" strokeWidth={1.75} />
                )}
              </button>
            </div>
            {passwordError ? (
              <p
                id="setup-password-error"
                className="text-xs text-danger"
                role="alert"
              >
                {passwordError}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                At least {MIN_PASSWORD_LENGTH} characters.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="setup-password-confirm"
              className="block text-sm font-medium text-foreground"
            >
              Confirm new password
              <span className="text-danger" aria-hidden="true">
                {' '}
                *
              </span>
            </label>
            <div className="relative">
              <Input
                id="setup-password-confirm"
                type={showConfirm ? 'text' : 'password'}
                name="confirmPassword"
                autoComplete="new-password"
                value={confirmPassword}
                disabled={isSubmitting || !token}
                aria-invalid={confirmError ? true : undefined}
                aria-describedby={
                  confirmError ? 'setup-password-confirm-error' : undefined
                }
                className="pr-11"
                onChange={(event) => {
                  setConfirmPassword(event.target.value)
                  if (formError) setFormError(null)
                }}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((visible) => !visible)}
                disabled={isSubmitting || !token}
                aria-label={
                  showConfirm ? 'Hide confirm password' : 'Show confirm password'
                }
                aria-pressed={showConfirm}
                className="absolute top-1/2 right-1.5 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-ring disabled:pointer-events-none disabled:opacity-50"
              >
                {showConfirm ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" strokeWidth={1.75} />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" strokeWidth={1.75} />
                )}
              </button>
            </div>
            {confirmError ? (
              <p
                id="setup-password-confirm-error"
                className="text-xs text-danger"
                role="alert"
              >
                {confirmError}
              </p>
            ) : null}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || !token}
          >
            {isSubmitting ? 'Saving…' : 'Set password'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
