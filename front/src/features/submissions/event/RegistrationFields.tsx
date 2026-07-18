import { Input } from '@/components/ui'
import type {
  EventContributionData,
  RegistrationMode,
  ResourceContactMethod,
} from '@/types/submission'
import type { EventFieldErrors } from './validation'
import { ContactMethodList } from '../form/ContactMethodList'
import { Field } from '../form/Field'
import { OptionCardGroup } from '../form/OptionCardGroup'

interface RegistrationFieldsProps {
  data: EventContributionData
  onChange: (partial: Partial<EventContributionData>) => void
  errors: EventFieldErrors
  showErrors: boolean
}

const REGISTRATION_OPTIONS: { value: RegistrationMode; label: string }[] = [
  { value: 'none', label: 'No registration needed' },
  { value: 'required', label: 'Registration required' },
  { value: 'optional', label: 'Registration optional' },
  { value: 'not_sure', label: 'Not sure' },
]

export function RegistrationFields({
  data,
  onChange,
  errors,
  showErrors,
}: RegistrationFieldsProps) {
  const needsDetails =
    data.registrationMode === 'required' ||
    data.registrationMode === 'optional'

  return (
    <div className="space-y-4">
      <OptionCardGroup<RegistrationMode>
        name="event-registration"
        legend="Does registration apply?"
        options={REGISTRATION_OPTIONS}
        value={data.registrationMode}
        onChange={(registrationMode) => onChange({ registrationMode })}
        error={errors.registrationMode}
        className="sm:grid-cols-2"
      />

      {needsDetails ? (
        <Field
          id="event-registration-details"
          label="Registration link or instructions"
          required
          hint="A website, email, phone number, or short written instructions are all fine."
          error={errors.registrationDetails}
        >
          <Input
            id="event-registration-details"
            value={data.registrationDetails}
            onChange={(e) =>
              onChange({ registrationDetails: e.target.value })
            }
            placeholder="e.g. https://example.org/register or email events@example.org"
          />
        </Field>
      ) : null}

      <ContactMethodList
        contacts={data.contacts}
        onChange={(contacts: ResourceContactMethod[]) =>
          onChange({ contacts })
        }
        error={errors.contacts}
        valueErrors={errors.contactValues}
        showErrors={showErrors}
        description="These are the public details people may use to register, ask questions, or learn more about the event. They may be different from your own contact information as the person submitting it."
      />
    </div>
  )
}
