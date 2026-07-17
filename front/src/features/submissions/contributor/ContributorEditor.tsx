import { useEffect, useState } from 'react'
import { Input } from '@/components/ui'
import type {
  ContributorInfo,
  PreferredContactMethod,
} from '@/types/submission'
import { CONTRIBUTOR_NAME_MAX_LENGTH } from '@/types/submission'
import { normalizeContributorInfo } from './emptyState'
import {
  isContributorComplete,
  validateContributor,
  type ContributorFieldErrors,
} from './validation'
import { EditorSection } from '../form/EditorSection'
import { Field } from '../form/Field'
import { OptionCardGroup } from '../form/OptionCardGroup'
import { PhoneInput } from '../form/PhoneInput'

interface ContributorEditorProps {
  initialContributor: ContributorInfo
  showErrors: boolean
  onShowErrorsChange: (show: boolean) => void
  onDirtyChange: (dirty: boolean) => void
  onRegisterSave: (save: () => ContributorInfo | null) => void
}

const PREFERRED_OPTIONS: {
  value: PreferredContactMethod
  label: string
}[] = [
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'either', label: 'No preference' },
]

export function ContributorEditor({
  initialContributor,
  showErrors,
  onShowErrorsChange,
  onDirtyChange,
  onRegisterSave,
}: ContributorEditorProps) {
  const [data, setData] = useState<ContributorInfo>(() =>
    normalizeContributorInfo(initialContributor),
  )
  const [baseline] = useState(() =>
    JSON.stringify(normalizeContributorInfo(initialContributor)),
  )
  const [phoneBlurred, setPhoneBlurred] = useState(false)

  useEffect(() => {
    onDirtyChange(JSON.stringify(data) !== baseline)
  }, [data, baseline, onDirtyChange])

  const patch = (partial: Partial<ContributorInfo>) => {
    setData((current) => ({ ...current, ...partial }))
  }

  const allErrors = validateContributor(data)
  const errors: ContributorFieldErrors = {
    ...(showErrors ? allErrors : {}),
    ...(showErrors || phoneBlurred
      ? allErrors.phone
        ? { phone: allErrors.phone }
        : {}
      : {}),
  }

  useEffect(() => {
    onRegisterSave(() => {
      onShowErrorsChange(true)
      if (!isContributorComplete(data)) return null
      return {
        name: data.name.trim(),
        email: data.email.trim(),
        phone: data.phone.trim(),
        preferredContactMethod: data.preferredContactMethod,
      }
    })
  }, [data, onRegisterSave, onShowErrorsChange])

  const phoneRequired = data.preferredContactMethod === 'phone'

  return (
    <div className="space-y-5">
      <aside
        className="rounded-xl border border-border-subtle bg-muted px-4 py-3"
        aria-label="Privacy information"
      >
        <p className="text-sm leading-relaxed text-muted-foreground">
          Your personal contact information is for RRCRC staff and will not be
          displayed publicly on the Resource Map.
        </p>
      </aside>

      <EditorSection
        id="contributor-details"
        title="How can we reach you?"
        description="We only use this if we need to clarify something about your submission."
      >
        <Field
          id="contributor-name"
          label="Full name"
          required
          error={errors.name}
        >
          <Input
            id="contributor-name"
            value={data.name}
            maxLength={CONTRIBUTOR_NAME_MAX_LENGTH}
            onChange={(e) => patch({ name: e.target.value })}
            autoComplete="name"
            placeholder="e.g. Alex Nguyen"
          />
        </Field>

        <Field
          id="contributor-email"
          label="Email address"
          required
          error={errors.email}
        >
          <Input
            id="contributor-email"
            type="email"
            value={data.email}
            onChange={(e) => patch({ email: e.target.value })}
            autoComplete="email"
            placeholder="you@example.org"
          />
        </Field>

        <Field
          id="contributor-phone"
          label="Phone number"
          required={phoneRequired}
          hint={
            phoneRequired
              ? 'Required because you prefer to be contacted by phone. Canada and US numbers only.'
              : 'Optional. Canada and US numbers only.'
          }
          error={errors.phone}
        >
          <PhoneInput
            id="contributor-phone"
            value={data.phone}
            onChange={(phone) => patch({ phone })}
            onBlur={() => setPhoneBlurred(true)}
            aria-required={phoneRequired}
          />
        </Field>

        <OptionCardGroup<PreferredContactMethod>
          name="contributor-preferred"
          legend="Preferred contact method *"
          options={PREFERRED_OPTIONS}
          value={data.preferredContactMethod}
          onChange={(preferredContactMethod) =>
            patch({ preferredContactMethod })
          }
          error={errors.preferredContactMethod}
          className="sm:grid-cols-3"
        />
      </EditorSection>
    </div>
  )
}
