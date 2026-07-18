import { type RegistrationMode, type ResourceContactMethod } from '@/types/submission'
import type { EventContributionData } from '@/types/submission'
import type { EventFieldErrors } from './validation'
import { ContactMethodList } from '../form/ContactMethodList'
import { OptionCardGroup } from '../form/OptionCardGroup'

interface RegistrationFieldsProps {
  data: EventContributionData
  onChange: (partial: Partial<EventContributionData>) => void
  errors: EventFieldErrors
  showErrors: boolean
}

const REGISTRATION_OPTIONS: { value: RegistrationMode; label: string }[] = [
  { value: 'required', label: 'Required' },
  { value: 'not_required', label: 'Not required' },
  { value: 'not_sure', label: 'Not sure' },
]

export function RegistrationFields({
  data,
  onChange,
  errors,
  showErrors,
}: RegistrationFieldsProps) {
  return (
    <div className="space-y-4">
      <OptionCardGroup<RegistrationMode>
        name="event-registration"
        legend="Registration"
        options={REGISTRATION_OPTIONS}
        value={data.registrationMode}
        onChange={(registrationMode) => onChange({ registrationMode })}
        error={errors.registrationMode}
        className="sm:grid-cols-3"
      />

      <ContactMethodList
        contacts={data.contacts}
        onChange={(contacts: ResourceContactMethod[]) =>
          onChange({ contacts })
        }
        error={errors.contacts}
        valueErrors={errors.contactValues}
        showErrors={showErrors}
        description="These are the public details people may use to ask questions or learn more about the event. They may be different from your own contact information as the person submitting it."
      />
    </div>
  )
}
