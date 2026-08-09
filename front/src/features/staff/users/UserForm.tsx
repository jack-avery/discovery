import { useId } from 'react'
import { Field } from '@/features/submissions/form/Field'
import { OptionCardGroup } from '@/features/submissions/form/OptionCardGroup'
import { Input } from '@/components/ui'
import {
  MANAGED_USER_ROLE_ORDER,
  ROLE_LABELS,
} from '@/features/staff/users/userDisplay'
import type {
  UserFormDraft,
  UserFormFieldErrors,
  UserModalMode,
} from '@/features/staff/users/userFormModel'
import { usersSelectClassName } from '@/features/staff/users/usersSelectStyles'
import type { ManagedUserRole } from '@/types/user'
import { cn } from '@/utils/cn'

const ROLE_OPTIONS: { value: ManagedUserRole; label: string }[] =
  MANAGED_USER_ROLE_ORDER.map((value) => ({
    value,
    label: ROLE_LABELS[value],
  }))

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
            onChange({ role: event.target.value as ManagedUserRole | '' })
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

      {mode === 'edit' ? (
        <div
          className={cn(disabled && 'pointer-events-none opacity-50')}
          aria-disabled={disabled || undefined}
        >
          <OptionCardGroup
            name={`${baseId}-status`}
            legend="Status"
            options={[
              { value: 'active', label: 'Active' },
              { value: 'disabled', label: 'Inactive' },
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
      ) : null}
    </div>
  )
}
