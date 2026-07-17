import { useState, type FormEvent } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/app/providers/AuthProvider'
import { Field } from '@/features/submissions/form/Field'
import { Button, Card, CardContent, CardHeader, Input } from '@/components/ui'
import { ApiError } from '@/services/api'

function resolveReturnPath(state: unknown): string {
  if (
    state &&
    typeof state === 'object' &&
    'from' in state &&
    state.from &&
    typeof state.from === 'object' &&
    'pathname' in state.from &&
    typeof state.from.pathname === 'string' &&
    state.from.pathname.startsWith('/staff')
  ) {
    const from = state.from as { pathname: string; search?: string; hash?: string }
    return `${from.pathname}${from.search ?? ''}${from.hash ?? ''}`
  }
  return '/staff'
}

export function SignInForm() {
  const { login, isLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
      await login({ email: trimmedEmail, password })
      navigate(resolveReturnPath(location.state), { replace: true })
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.errors?.email) setEmailError(error.errors.email)
        if (error.errors?.password) setPasswordError(error.errors.password)
        setFormError(error.message)
        return
      }
      setFormError(
        error instanceof Error ? error.message : 'Unable to sign in. Please try again.',
      )
    }
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <h2 className="font-heading text-lg font-semibold text-foreground">
          RRCRC Staff Portal
        </h2>
        <p className="text-sm text-muted-foreground">
          Sign in with your staff account to access moderation tools.
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
              onChange={(event) => setEmail(event.target.value)}
            />
          </Field>

          <Field id="staff-password" label="Password" required error={passwordError}>
            <Input
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              disabled={isLoading}
              onChange={(event) => setPassword(event.target.value)}
            />
          </Field>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Signing in…' : 'Sign In'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
