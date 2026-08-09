import { useEffect, useState } from 'react'
import { Input, Textarea } from '@/components/ui'
import type {
  AvailabilityOption,
  Contribution,
  PersonalProviderOption,
  SavedContributionPayload,
  SkillsServicesData,
} from '@/types/submission'
import { SKILLS_TITLE_MAX_LENGTH } from '@/types/submission'
import {
  createEmptySkillsServicesData,
  isSkillsServicesData,
  normalizeSkillsServicesData,
} from './emptyState'
import { buildSkillsServicesSummary } from './summary'
import {
  getRevealedSkillsSections,
  isSkillsOfferReady,
  isSkillsServicesComplete,
  SKILLS_SECTIONS,
  validateSkillsServices,
} from './validation'
import { CheckboxOptionGroup } from '../form/CheckboxOptionGroup'
import { EditorSection } from '../form/EditorSection'
import { Field } from '../form/Field'
import { OptionCardGroup } from '../form/OptionCardGroup'
import { RepeatableTextList } from '../form/RepeatableTextList'

interface SkillsServicesEditorProps {
  initialContribution: Contribution | null
  showErrors: boolean
  onShowErrorsChange: (show: boolean) => void
  onDirtyChange: (dirty: boolean) => void
  onRegisterSave: (save: () => SavedContributionPayload | null) => void
  onProgressChange?: (progress: {
    sections: readonly string[]
    revealed: number
  } | null) => void
}

const AVAILABILITY_OPTIONS: {
  value: AvailabilityOption
  label: string
}[] = [
  { value: 'weekdays', label: 'Weekdays' },
  { value: 'evenings', label: 'Evenings' },
  { value: 'weekends', label: 'Weekends' },
  { value: 'flexible', label: 'Flexible' },
]

const PROVIDER_OPTIONS: {
  value: PersonalProviderOption
  label: string
}[] = [
  { value: 'yes', label: 'Yes' },
  {
    value: 'on_behalf',
    label: "No, I'm submitting this on someone else's behalf",
  },
]

function initialDataFromContribution(
  contribution: Contribution | null,
): SkillsServicesData {
  if (contribution && isSkillsServicesData(contribution.data)) {
    return normalizeSkillsServicesData(
      JSON.parse(JSON.stringify(contribution.data)) as SkillsServicesData,
    )
  }
  return createEmptySkillsServicesData()
}

export function SkillsServicesEditor({
  initialContribution,
  showErrors,
  onShowErrorsChange,
  onDirtyChange,
  onRegisterSave,
  onProgressChange,
}: SkillsServicesEditorProps) {
  const [data, setData] = useState<SkillsServicesData>(() =>
    initialDataFromContribution(initialContribution),
  )
  const [baseline] = useState(() =>
    JSON.stringify(initialDataFromContribution(initialContribution)),
  )

  useEffect(() => {
    onDirtyChange(JSON.stringify(data) !== baseline)
  }, [data, baseline, onDirtyChange])

  const patch = (partial: Partial<SkillsServicesData>) => {
    setData((current) => ({ ...current, ...partial }))
  }

  const errors = showErrors ? validateSkillsServices(data) : {}
  const showOptional = isSkillsOfferReady(data)
  const revealed = getRevealedSkillsSections(data)

  useEffect(() => {
    onProgressChange?.({
      sections: SKILLS_SECTIONS,
      revealed,
    })
  }, [revealed, onProgressChange])

  useEffect(() => {
    return () => onProgressChange?.(null)
  }, [onProgressChange])

  useEffect(() => {
    onRegisterSave(() => {
      onShowErrorsChange(true)
      if (!isSkillsServicesComplete(data)) return null
      const meta = buildSkillsServicesSummary(data)
      return {
        title: meta.title,
        summary: meta.summary,
        highlights: meta.highlights,
        status: 'complete',
        data,
      }
    })
  }, [data, onRegisterSave, onShowErrorsChange])

  return (
    <div className="space-y-5">
      <aside
        className="rounded-xl border border-interactive/30 bg-interactive-muted px-4 py-3"
        aria-label="What happens next"
      >
        <p className="text-sm leading-relaxed text-foreground">
          A member of the RRCRC team will review your submission and may
          contact you to learn more about your idea and discuss how it could
          best support the community.
        </p>
      </aside>

      <EditorSection
        id="skills-offer"
        title="What would you like to offer?"
        description="Share a clear title and a short description. You do not need to have every detail figured out."
      >
        <Field
          id="skills-title"
          label="Title"
          required
          error={errors.title}
        >
          <Input
            id="skills-title"
            value={data.title}
            maxLength={SKILLS_TITLE_MAX_LENGTH}
            onChange={(e) => patch({ title: e.target.value })}
            placeholder="e.g. Free resume reviews, Neighbourhood walking group, Beginner woodworking workshops"
          />
        </Field>

        <Field
          id="skills-description"
          label="Description"
          required
          hint="Tell us what you would like to provide, how it would help others, and anything people should know."
          error={errors.description}
        >
          <Textarea
            id="skills-description"
            value={data.description}
            onChange={(e) => patch({ description: e.target.value })}
            placeholder="e.g. I would like to offer free one-on-one resume reviews for neighbours who are looking for work."
          />
        </Field>
      </EditorSection>

      {showOptional ? (
        <>
          <EditorSection
            id="skills-audience"
            title="Who do you think would benefit?"
            description="This is optional. A few words are enough—seniors, newcomers, families, youth, small business owners, or anyone interested."
          >
            <Field id="skills-who-benefits" label="Who might this help? (optional)">
              <Textarea
                id="skills-who-benefits"
                value={data.whoBenefits}
                onChange={(e) => patch({ whoBenefits: e.target.value })}
                placeholder="e.g. Newcomers looking for conversation practice"
              />
            </Field>
          </EditorSection>

          <EditorSection
            id="skills-availability"
            title="When are you generally available?"
            description="Keep it simple. RRCRC staff will discuss the details with you later."
          >
            <CheckboxOptionGroup<AvailabilityOption>
              legend="General availability (optional)"
              options={AVAILABILITY_OPTIONS}
              value={data.availability}
              onChange={(availability) => patch({ availability })}
              hint="Choose any that fit—nothing here is binding."
            />
            <Field
              id="skills-availability-notes"
              label="Anything else we should know? (optional)"
            >
              <Textarea
                id="skills-availability-notes"
                value={data.availabilityNotes}
                onChange={(e) => patch({ availabilityNotes: e.target.value })}
                placeholder="e.g. Best reached by email in evenings"
              />
            </Field>
          </EditorSection>

          <EditorSection
            id="skills-languages"
            title="What languages can you offer this in?"
            description="Optional. Add as many as apply."
          >
            <RepeatableTextList
              label="Languages"
              hint="Add each language people could receive this offer in."
              values={data.languages}
              onChange={(languages) => patch({ languages })}
              placeholder="e.g. English"
              addLabel="Add another language"
            />
          </EditorSection>

          <EditorSection
            id="skills-about"
            title="Tell us a little about yourself"
            description="Help us understand your background and why you'd like to contribute."
          >
            <Field
              id="skills-about-you"
              label="About you"
              required
              error={errors.aboutYou}
            >
              <Textarea
                id="skills-about-you"
                value={data.aboutYou}
                onChange={(e) => patch({ aboutYou: e.target.value })}
                className="min-h-[8rem]"
                placeholder="A few sentences about your experience or connection to the community is enough."
              />
            </Field>
          </EditorSection>

          <EditorSection
            id="skills-inspiration"
            title="What inspired you to offer this?"
            description="Optional. This helps RRCRC understand motivation and community fit."
          >
            <Field id="skills-why" label="Your inspiration (optional)">
              <Textarea
                id="skills-why"
                value={data.inspiration}
                onChange={(e) => patch({ inspiration: e.target.value })}
                placeholder="What made you think of offering this?"
              />
            </Field>
          </EditorSection>

          <EditorSection
            id="skills-connection"
            title="Is this something you personally provide?"
          >
            <OptionCardGroup<PersonalProviderOption>
              name="skills-provider"
              legend="Your connection"
              options={PROVIDER_OPTIONS}
              value={data.providedPersonally}
              onChange={(providedPersonally) => patch({ providedPersonally })}
              layout="stack"
            />
            {data.providedPersonally === 'on_behalf' ? (
              <Field
                id="skills-on-behalf"
                label="Please tell us a little about that person. (optional)"
              >
                <Textarea
                  id="skills-on-behalf"
                  value={data.onBehalfOfNotes}
                  onChange={(e) =>
                    patch({ onBehalfOfNotes: e.target.value })
                  }
                  placeholder="Their first name, role, or how you know them is helpful."
                />
              </Field>
            ) : null}
          </EditorSection>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Add a title and description to continue with a few optional questions.
        </p>
      )}
    </div>
  )
}
