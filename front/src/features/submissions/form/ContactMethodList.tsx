import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import type { ResourceContactMethod, ResourceContactType } from '@/types/submission'
import {
  isValidNorthAmericanPhone,
  PHONE_VALIDATION_MESSAGE,
} from '@/utils/phone'
import { createContactMethod } from '../existingResource/emptyState'
import { Field } from './Field'
import { PhoneInput } from './PhoneInput'

const CONTACT_TYPES: { value: ResourceContactType; label: string }[] = [
  { value: 'phone', label: 'Phone Number' },
  { value: 'email', label: 'Email' },
  { value: 'website', label: 'Website' },
  { value: 'other', label: 'Other' },
]

const CONTACT_VALUE_LABELS: Record<ResourceContactType, string> = {
  phone: 'Phone Number',
  email: 'Email Address',
  website: 'Website',
  other: 'Contact Information',
}

const CONTACT_VALUE_PLACEHOLDERS: Record<ResourceContactType, string> = {
  phone: '(613) 555-1234',
  email: 'info@example.org',
  website: 'https://',
  other: 'Enter contact information...',
}

interface ContactMethodListProps {
  contacts: ResourceContactMethod[]
  onChange: (contacts: ResourceContactMethod[]) => void
  error?: string
  valueErrors?: Record<string, string>
  showErrors?: boolean
  description?: string
}

const DEFAULT_DESCRIPTION =
  'These are the contact details people will see or use to access the resource. They may be different from your own contact information as the person submitting it.'

export function ContactMethodList({
  contacts,
  onChange,
  error,
  valueErrors = {},
  showErrors,
  description = DEFAULT_DESCRIPTION,
}: ContactMethodListProps) {
  const update = (id: string, patch: Partial<ResourceContactMethod>) => {
    onChange(contacts.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }

  const remove = (id: string) => {
    onChange(contacts.filter((c) => c.id !== id))
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{description}</p>

      {contacts.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border-subtle px-3 py-4 text-sm text-muted-foreground">
          No contact methods. Add one so people can reach this resource.
        </p>
      ) : (
        <ul className="space-y-3">
          {contacts.map((contact, index) => (
            <li
              key={contact.id}
              className="space-y-3 rounded-xl border border-border-subtle p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground">
                  Contact {index + 1}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(contact.id)}
                  aria-label={`Remove contact ${index + 1}`}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Remove
                </Button>
              </div>

              <Field id={`contact-type-${contact.id}`} label="Type">
                <select
                  id={`contact-type-${contact.id}`}
                  value={contact.type}
                  onChange={(e) =>
                    update(contact.id, {
                      type: e.target.value as ResourceContactType,
                    })
                  }
                  className="flex h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus-visible:border-interactive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interactive/40"
                >
                  {CONTACT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </Field>

              <ContactValueField
                contact={contact}
                error={valueErrors[contact.id]}
                forceShowError={Boolean(showErrors)}
                onChange={(value) => update(contact.id, { value })}
              />

              <Field
                id={`contact-label-${contact.id}`}
                label="Label (optional)"
                hint="e.g. Main line, Intake, Crisis line"
              >
                <Input
                  id={`contact-label-${contact.id}`}
                  value={contact.label}
                  onChange={(e) => update(contact.id, { label: e.target.value })}
                  placeholder="Main line"
                />
              </Field>
            </li>
          ))}
        </ul>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={contacts.some((c) => !c.value.trim())}
        onClick={() => {
          if (contacts.some((c) => !c.value.trim())) return
          onChange([...contacts, createContactMethod()])
        }}
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        {contacts.length === 0
          ? 'Add a contact method'
          : 'Add another contact method'}
      </Button>

      {showErrors && error ? (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

function ContactValueField({
  contact,
  error,
  forceShowError,
  onChange,
}: {
  contact: ResourceContactMethod
  error?: string
  forceShowError: boolean
  onChange: (value: string) => void
}) {
  const [blurred, setBlurred] = useState(false)
  const show = forceShowError || blurred
  const localPhoneError =
    contact.type === 'phone' &&
    contact.value.trim() &&
    !isValidNorthAmericanPhone(contact.value)
      ? PHONE_VALIDATION_MESSAGE
      : undefined
  const displayError = show ? (error ?? localPhoneError) : undefined
  const valueLabel = CONTACT_VALUE_LABELS[contact.type]
  const valueHint =
    contact.type === 'phone'
      ? 'Canada and US numbers only.'
      : contact.type === 'other'
        ? 'Provide any other way someone can contact this organization.'
        : undefined

  if (contact.type === 'phone') {
    return (
      <Field
        id={`contact-value-${contact.id}`}
        label={valueLabel}
        required
        hint={valueHint}
        error={displayError}
      >
        <PhoneInput
          id={`contact-value-${contact.id}`}
          value={contact.value}
          onChange={onChange}
          onBlur={() => setBlurred(true)}
          placeholder={CONTACT_VALUE_PLACEHOLDERS.phone}
          aria-invalid={Boolean(displayError)}
        />
      </Field>
    )
  }

  return (
    <Field
      id={`contact-value-${contact.id}`}
      label={valueLabel}
      required
      hint={valueHint}
      error={forceShowError ? error : undefined}
    >
      <Input
        id={`contact-value-${contact.id}`}
        value={contact.value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={CONTACT_VALUE_PLACEHOLDERS[contact.type]}
        aria-invalid={Boolean(forceShowError && error)}
      />
    </Field>
  )
}
