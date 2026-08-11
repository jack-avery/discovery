import { useState, type FormEvent } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/app/providers/AuthProvider'
import { resolvePostLoginPath } from '@/auth/postLoginNavigation'
import { Button, Card, CardContent, CardHeader, Input } from '@/components/ui'
import { APP_BRANDING } from '@/config/appBranding'
import { Field } from '@/features/submissions/form/Field'
import { ApiError } from '@/services/api'
import {
  looksLikeTechnicalErrorMessage,
  logTechnicalError,
  toUserFacingErrorMessage,
} from '@/utils/userFacingError'

const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password.'

function resolveLoginErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 401) {
    logTechnicalError('auth-login', error)
    return INVALID_CREDENTIALS_MESSAGE
  }

  if (error instanceof ApiError && error.status === 403) {
    const message = error.message.trim()
    if (message && !looksLikeTechnicalErrorMessage(message)) {
      logTechnicalError('auth-login', error)
      return message
    }
  }

  return toUserFacingErrorMessage(error, {
    fallback: 'Unable to sign in. Please try again.',
    context: 'auth-login',
  })
}

export function SignInForm() {
  const { login, isLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [emailError, setEmailError] = useState<string | undefined>()
  const [passwordError, setPasswordError] = useState<string | undefined>()
  const [formError, setFormError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)

    const trimmedEmail = email.trim()
    let hasClientError = false

    if (!trimmedEmail) {
      setEmailError('Email is required.')
      hasClientError = true
    } else {
      setEmailError(undefined)
    }

    if (!password) {
      setPasswordError('Password is required.')
      hasClientError = true
    } else {
      setPasswordError(undefined)
    }

    if (hasClientError) return

    try {
      const user = await login({ email: trimmedEmail, password })
      setFormError(null)
      navigate(resolvePostLoginPath(user.roles, location.state), { replace: true })
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.errors?.email) setEmailError(error.errors.email)
        if (error.errors?.password) setPasswordError(error.errors.password)
      }
      setFormError(resolveLoginErrorMessage(error))
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <h2 className="font-heading text-lg font-semibold text-foreground">
          Sign in
        </h2>
        <p className="text-sm text-muted-foreground">
          Use your {APP_BRANDING.communityName} account. Staff open the
          workspace; contributors continue on Discover.
        </p>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)} noValidate>
          {formError ? (
            <p
              className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger"
              role="alert"
            >
              {formError}
            </p>
          ) : null}

          <Field id="staff-email" label="Email" required error={emailError}>
            <Input
              type="email"
              name="email"
              autoComplete="username"
              value={email}
              disabled={isLoading}
              onChange={(event) => {
                setEmail(event.target.value)
                if (formError) setFormError(null)
              }}
            />
          </Field>

          <div className="space-y-1.5">
            <label
              htmlFor="staff-password"
              className="block text-sm font-medium text-foreground"
            >
              Password
              <span className="text-danger" aria-hidden="true">
                {' '}
                *
              </span>
            </label>
            <div className="relative">
              <Input
                id="staff-password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete="current-password"
                value={password}
                disabled={isLoading}
                aria-invalid={passwordError ? true : undefined}
                aria-describedby={
                  passwordError ? 'staff-password-error' : undefined
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
                disabled={isLoading}
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
                id="staff-password-error"
                className="text-xs text-danger"
                role="alert"
              >
                {passwordError}
              </p>
            ) : null}
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Signing in…' : 'Sign In'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
