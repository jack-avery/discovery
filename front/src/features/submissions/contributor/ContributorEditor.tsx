import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui'
import type {
  ContributorInfo,
  PreferredContactMethod,
  RelationshipOption,
} from '@/types/submission'
import { CONTRIBUTOR_NAME_MAX_LENGTH } from '@/types/submission'
import { normalizeContributorInfo } from './emptyState'
import {
  isContributorComplete,
  RESOURCE_RELATIONSHIP_OPTIONS,
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
  /** Optional live validity signal for parent Continue gates. */
  onValidityChange?: (complete: boolean) => void
  /**
   * Collect “Your connection to this resource” (required when true).
   * Used for existing-resource create/update flows.
   */
  requireResourceConnection?: boolean
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
  onValidityChange,
  requireResourceConnection = false,
}: ContributorEditorProps) {
  const [data, setData] = useState<ContributorInfo>(() =>
    normalizeContributorInfo(initialContributor),
  )
  const [baseline] = useState(() =>
    JSON.stringify(normalizeContributorInfo(initialContributor)),
  )
  const [phoneBlurred, setPhoneBlurred] = useState(false)
  const prevShowErrorsRef = useRef(showErrors)

  useEffect(() => {
    onDirtyChange(JSON.stringify(data) !== baseline)
  }, [data, baseline, onDirtyChange])

  useEffect(() => {
    onValidityChange?.(
      isContributorComplete(data, { requireResourceConnection }),
    )
  }, [data, onValidityChange, requireResourceConnection])

  const patch = (partial: Partial<ContributorInfo>) => {
    setData((current) => ({ ...current, ...partial }))
  }

  const allErrors = validateContributor(data, { requireResourceConnection })
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
      if (!isContributorComplete(data, { requireResourceConnection })) {
        return null
      }
      return {
        name: data.name.trim(),
        email: data.email.trim(),
        phone: data.phone.trim(),
        preferredContactMethod: data.preferredContactMethod,
        relationship: data.relationship,
        relationshipOther: data.relationshipOther.trim(),
      }
    })
  }, [
    data,
    onRegisterSave,
    onShowErrorsChange,
    requireResourceConnection,
  ])

  // Surface the connection field when Continue/Save fails validation.
  useEffect(() => {
    if (!requireResourceConnection) return
    const justEnabled = showErrors && !prevShowErrorsRef.current
    prevShowErrorsRef.current = showErrors
    if (!justEnabled) return
    if (!allErrors.relationship && !allErrors.relationshipOther) return

    window.requestAnimationFrame(() => {
      document
        .getElementById('contributor-resource-connection')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [requireResourceConnection, showErrors, allErrors.relationship, allErrors.relationshipOther])

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

        {requireResourceConnection ? (
          <div
            id="contributor-resource-connection"
            className="scroll-mt-[var(--editor-sticky-offset,8rem)] space-y-4"
          >
            <OptionCardGroup<RelationshipOption>
              name="contributor-relationship"
              legend="Your connection to this resource"
              options={RESOURCE_RELATIONSHIP_OPTIONS}
              value={data.relationship}
              onChange={(relationship) => patch({ relationship })}
              error={errors.relationship}
              layout="stack"
            />
            {data.relationship === 'other' ? (
              <Field
                id="contributor-relationship-other"
                label="Please explain"
                required
                error={errors.relationshipOther}
              >
                <Input
                  id="contributor-relationship-other"
                  value={data.relationshipOther}
                  onChange={(e) =>
                    patch({ relationshipOther: e.target.value })
                  }
                />
              </Field>
            ) : null}
          </div>
        ) : null}
      </EditorSection>
    </div>
  )
}
