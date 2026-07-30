import { useId, useState } from 'react'
import { Eye, EyeOff, Info } from 'lucide-react'
import { Field } from '@/features/submissions/form/Field'
import { OptionCardGroup } from '@/features/submissions/form/OptionCardGroup'
import { Button, Input } from '@/components/ui'
import { ROLE_LABELS } from '@/features/staff/users/userDisplay'
import { DEFAULT_ORG_PASSWORD } from '@/features/staff/users/userFormConstants'
import type {
  UserFormDraft,
  UserFormFieldErrors,
  UserModalMode,
} from '@/features/staff/users/userFormModel'
import { usersSelectClassName } from '@/features/staff/users/usersSelectStyles'
import type { StaffManageRole } from '@/types/user'
import { cn } from '@/utils/cn'

const ROLE_OPTIONS: { value: StaffManageRole; label: string }[] = [
  { value: 'administrator', label: ROLE_LABELS.administrator },
  { value: 'staff_editor', label: ROLE_LABELS.staff_editor },
  { value: 'moderator', label: ROLE_LABELS.moderator },
]

interface UserFormProps {
  mode: UserModalMode
  values: UserFormDraft
  errors: UserFormFieldErrors
  disabled?: boolean
  /** Prevents changing role when editing your own account. */
  roleDisabled?: boolean
  onChange: (patch: Partial<UserFormDraft>) => void
}

/**
 * Shared create/edit fields for staff User Management.
 */
export function UserForm({
  mode,
  values,
  errors,
  disabled = false,
  roleDisabled = false,
  onChange,
}: UserFormProps) {
  const baseId = useId()
  const [passwordVisible, setPasswordVisible] = useState(false)

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id={`${baseId}-first-name`}
          label="First Name"
          required
          error={errors.first_name}
        >
          <Input
            type="text"
            name="first_name"
            autoComplete="given-name"
            value={values.first_name}
            disabled={disabled}
            onChange={(event) => onChange({ first_name: event.target.value })}
          />
        </Field>

        <Field
          id={`${baseId}-last-name`}
          label="Last Name"
          required
          error={errors.last_name}
        >
          <Input
            type="text"
            name="last_name"
            autoComplete="family-name"
            value={values.last_name}
            disabled={disabled}
            onChange={(event) => onChange({ last_name: event.target.value })}
          />
        </Field>
      </div>

      <Field
        id={`${baseId}-email`}
        label="Email Address"
        required
        hint="This will also be their username."
        error={errors.email}
      >
        <Input
          type="email"
          name="email"
          autoComplete="email"
          value={values.email}
          disabled={disabled}
          onChange={(event) => onChange({ email: event.target.value })}
        />
      </Field>

      <Field
        id={`${baseId}-role`}
        label="Role"
        required
        error={errors.role}
        hint={
          roleDisabled
            ? 'You cannot change your own role.'
            : undefined
        }
      >
        <select
          name="role"
          value={values.role}
          disabled={disabled || roleDisabled}
          aria-label="Role"
          className={usersSelectClassName}
          onChange={(event) =>
            onChange({ role: event.target.value as StaffManageRole | '' })
          }
        >
          <option value="">Select a role</option>
          {ROLE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </Field>

      {mode === 'create' ? (
        <>
          <div className="space-y-1.5">
            <label
              htmlFor={`${baseId}-default-password`}
              className="block text-sm font-medium text-foreground"
            >
              Default Password
            </label>
            <div className="relative">
              <Input
                id={`${baseId}-default-password`}
                type={passwordVisible ? 'text' : 'password'}
                name="default_password"
                value={DEFAULT_ORG_PASSWORD}
                readOnly
                autoComplete="off"
                className="pr-10"
                aria-readonly="true"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0.5 top-1/2 h-9 w-9 min-h-0 min-w-0 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={
                  passwordVisible
                    ? 'Hide default password'
                    : 'Show default password'
                }
                onClick={() => setPasswordVisible((visible) => !visible)}
              >
                {passwordVisible ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </Button>
            </div>
          </div>

          <aside
            className="flex gap-3 rounded-xl border border-interactive/25 bg-interactive-muted px-4 py-3"
            aria-live="polite"
          >
            <Info
              className="mt-0.5 h-4 w-4 shrink-0 text-interactive"
              strokeWidth={1.75}
              aria-hidden="true"
            />
            <p className="text-sm leading-relaxed text-foreground">
              New users will sign in using the organization&apos;s default
              password and will be required to change it the first time they
              sign in.
            </p>
          </aside>
        </>
      ) : (
        <div
          className={cn(disabled && 'pointer-events-none opacity-50')}
          aria-disabled={disabled || undefined}
        >
          <OptionCardGroup
            name={`${baseId}-status`}
            legend="Status"
            options={[
              { value: 'active', label: 'Active' },
              { value: 'disabled', label: 'Disabled' },
            ]}
            value={values.is_active ? 'active' : 'disabled'}
            onChange={(next) => {
              if (disabled) return
              onChange({ is_active: next === 'active' })
            }}
            showRadioIndicator
            className="sm:grid-cols-2"
          />
        </div>
      )}
    </div>
  )
}
