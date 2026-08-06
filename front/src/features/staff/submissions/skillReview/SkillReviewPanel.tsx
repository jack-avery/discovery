import { useCallback, useEffect, useMemo, useState } from 'react'
import { Badge, Input, Textarea } from '@/components/ui'
import { DetailSectionCard } from '@/features/discover/DetailInfoCard'
import { ResourceDetailHero } from '@/features/discover/resourceDetailSections'
import { WorkspaceSection } from '@/features/discover/WorkspaceSection'
import { normalizeSkillsServicesData } from '@/features/submissions/skillsServices/emptyState'
import {
  isSkillsServicesComplete,
  validateSkillsServices,
} from '@/features/submissions/skillsServices/validation'
import { CheckboxOptionGroup } from '@/features/submissions/form/CheckboxOptionGroup'
import { Field } from '@/features/submissions/form/Field'
import { OptionCardGroup } from '@/features/submissions/form/OptionCardGroup'
import { RepeatableTextList } from '@/features/submissions/form/RepeatableTextList'
import {
  SKILLS_EDITED_FOLLOW_UP_HELPER,
  type SubmissionApprovalGate,
} from '@/features/staff/submissions/submissionApprovalGate'
import { SectionEditChrome } from '@/features/staff/submissions/SectionEditChrome'
import {
  getEditedSkillSections,
  hasSkillReviewChanges,
  resetSkillReviewSection,
  type SkillReviewSectionId,
} from '@/features/staff/submissions/skillReview/skillReviewDiff'
import { mapSkillSubmissionToSkillsServicesData } from '@/features/staff/submissions/skillReview/mapSkillSubmissionToSkillsServicesData'
import type {
  AvailabilityOption,
  PersonalProviderOption,
  SkillsServicesData,
} from '@/types/submission'
import { SKILLS_TITLE_MAX_LENGTH } from '@/types/submission'
import type { SubmissionDetailDto } from '@/types/moderationSubmission'
import { Clock, Globe2, HeartHandshake, Info, Sparkles, Users } from 'lucide-react'

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

/**
 * Editable skills/services moderation view — SkillDetailPresentation hierarchy
 * + community-asset form controls.
 */
export function SkillReviewPanel({
  submission,
  onApprovalGateChange,
  onFinalVersionChange,
}: {
  submission: SubmissionDetailDto
  onApprovalGateChange?: (gate: SubmissionApprovalGate) => void
  onFinalVersionChange?: (data: SkillsServicesData | null) => void
}) {
  const version = submission.proposed_version

  const baseline = useMemo(
    () => mapSkillSubmissionToSkillsServicesData(submission),
    // Recompute when the selected submission payload changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional stable keys
    [
      submission.submission_id,
      submission.proposed_version,
      submission.submission_message,
    ],
  )

  const [data, setData] = useState<SkillsServicesData>(() =>
    structuredClone(baseline),
  )

  useEffect(() => {
    setData(structuredClone(baseline))
  }, [baseline, submission.submission_id])

  const patch = useCallback((partial: Partial<SkillsServicesData>) => {
    setData((current) =>
      normalizeSkillsServicesData({ ...current, ...partial }),
    )
  }, [])

  const editedSections = useMemo(
    () => getEditedSkillSections(baseline, data),
    [baseline, data],
  )
  const editedSet = useMemo(() => new Set(editedSections), [editedSections])
  const hasEdits = useMemo(
    () => hasSkillReviewChanges(baseline, data),
    [baseline, data],
  )
  const isComplete = useMemo(() => isSkillsServicesComplete(data), [data])
  const showErrors = hasEdits
  const errors = useMemo(
    () => (showErrors ? validateSkillsServices(data) : {}),
    [data, showErrors],
  )

  const resetSection = useCallback(
    (sectionId: SkillReviewSectionId) => {
      setData((current) =>
        resetSkillReviewSection(current, baseline, sectionId),
      )
    },
    [baseline],
  )

  useEffect(() => {
    onFinalVersionChange?.(hasEdits ? data : null)
  }, [data, hasEdits, onFinalVersionChange])

  useEffect(() => {
    if (!onApprovalGateChange) return
    if (hasEdits) {
      onApprovalGateChange({
        approveDisabled: true,
        approveHelper: isComplete
          ? SKILLS_EDITED_FOLLOW_UP_HELPER
          : `${SKILLS_EDITED_FOLLOW_UP_HELPER} Fix validation errors in the highlighted fields, or reset your changes.`,
      })
      return
    }
    onApprovalGateChange({ approveDisabled: false })
  }, [hasEdits, isComplete, onApprovalGateChange])

  useEffect(() => {
    return () => {
      onApprovalGateChange?.({ approveDisabled: false })
      onFinalVersionChange?.(null)
    }
  }, [onApprovalGateChange, onFinalVersionChange, submission.submission_id])

  if (!version) {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        This skills submission has no proposed version to review.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <ResourceDetailHero
        imageUrl={version.image_url}
        alt={`${data.title || version.name} photo`}
        fallbackAlt="Community skills placeholder"
      />

      <WorkspaceSection aria-label="General information" divider className="pb-3">
        <div className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <Badge variant="primary">Skills & Services</Badge>
            <SectionEditChrome
              edited={editedSet.has('offer')}
              onReset={() => resetSection('offer')}
            />
          </div>
          <Field
            id="review-skills-title"
            label="Title"
            required
            error={errors.title}
          >
            <Input
              id="review-skills-title"
              value={data.title}
              maxLength={SKILLS_TITLE_MAX_LENGTH}
              onChange={(event) => patch({ title: event.target.value })}
            />
          </Field>
        </div>
      </WorkspaceSection>

      <DetailSectionCard
        icon={<Info className="h-4 w-4" strokeWidth={2} />}
        title="About"
        headerAction={
          editedSet.has('offer') || editedSet.has('about') ? (
            <SectionEditChrome
              edited
              onReset={() => {
                if (editedSet.has('offer')) resetSection('offer')
                if (editedSet.has('about')) resetSection('about')
              }}
            />
          ) : undefined
        }
      >
        <div className="space-y-4">
          <Field
            id="review-skills-description"
            label="Description"
            required
            error={errors.description}
          >
            <Textarea
              id="review-skills-description"
              value={data.description}
              onChange={(event) => patch({ description: event.target.value })}
            />
          </Field>
          <Field
            id="review-skills-about-you"
            label="About the contributor"
            required
            error={errors.aboutYou}
          >
            <Textarea
              id="review-skills-about-you"
              value={data.aboutYou}
              onChange={(event) => patch({ aboutYou: event.target.value })}
              className="min-h-[8rem]"
            />
          </Field>
          <Field id="review-skills-inspiration" label="Inspiration (optional)">
            <Textarea
              id="review-skills-inspiration"
              value={data.inspiration}
              onChange={(event) => patch({ inspiration: event.target.value })}
            />
          </Field>
        </div>
      </DetailSectionCard>

      <DetailSectionCard
        icon={<Users className="h-4 w-4" strokeWidth={2} />}
        title="Who Can Benefit"
        headerAction={
          editedSet.has('audience') ? (
            <SectionEditChrome
              edited
              onReset={() => resetSection('audience')}
            />
          ) : undefined
        }
      >
        <Field id="review-skills-who-benefits" label="Who might this help?">
          <Textarea
            id="review-skills-who-benefits"
            value={data.whoBenefits}
            onChange={(event) => patch({ whoBenefits: event.target.value })}
          />
        </Field>
      </DetailSectionCard>

      <DetailSectionCard
        icon={<Clock className="h-4 w-4" strokeWidth={2} />}
        title="Availability"
        headerAction={
          editedSet.has('availability') ? (
            <SectionEditChrome
              edited
              onReset={() => resetSection('availability')}
            />
          ) : undefined
        }
      >
        <div className="space-y-4">
          <CheckboxOptionGroup<AvailabilityOption>
            legend="General availability"
            options={AVAILABILITY_OPTIONS}
            value={data.availability}
            onChange={(availability) => patch({ availability })}
          />
          <Field
            id="review-skills-availability-notes"
            label="Availability notes (optional)"
          >
            <Textarea
              id="review-skills-availability-notes"
              value={data.availabilityNotes}
              onChange={(event) =>
                patch({ availabilityNotes: event.target.value })
              }
            />
          </Field>
        </div>
      </DetailSectionCard>

      <DetailSectionCard
        icon={<Globe2 className="h-4 w-4" strokeWidth={2} />}
        title="Languages"
        headerAction={
          editedSet.has('languages') ? (
            <SectionEditChrome
              edited
              onReset={() => resetSection('languages')}
            />
          ) : undefined
        }
      >
        <RepeatableTextList
          label="Languages"
          values={data.languages}
          onChange={(languages) => patch({ languages })}
          placeholder="e.g. English"
          addLabel="Add another language"
        />
      </DetailSectionCard>

      <DetailSectionCard
        icon={<HeartHandshake className="h-4 w-4" strokeWidth={2} />}
        title="Connection"
        headerAction={
          editedSet.has('connection') ? (
            <SectionEditChrome
              edited
              onReset={() => resetSection('connection')}
            />
          ) : undefined
        }
      >
        <div className="space-y-4">
          <OptionCardGroup<PersonalProviderOption>
            name="review-skills-provider"
            legend="Is this something they personally provide?"
            options={PROVIDER_OPTIONS}
            value={data.providedPersonally}
            onChange={(providedPersonally) => patch({ providedPersonally })}
            layout="stack"
          />
          {data.providedPersonally === 'on_behalf' ? (
            <Field
              id="review-skills-on-behalf"
              label="About that person (optional)"
            >
              <Textarea
                id="review-skills-on-behalf"
                value={data.onBehalfOfNotes}
                onChange={(event) =>
                  patch({ onBehalfOfNotes: event.target.value })
                }
              />
            </Field>
          ) : null}
        </div>
      </DetailSectionCard>

      <DetailSectionCard
        icon={<Sparkles className="h-4 w-4" strokeWidth={2} />}
        title="Submitter contact"
      >
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Name
            </dt>
            <dd className="mt-0.5 text-foreground">
              {submission.submitter_name?.trim() || 'Not provided'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Email
            </dt>
            <dd className="mt-0.5 text-foreground">
              {submission.submitter_email?.trim() || 'Not provided'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Phone
            </dt>
            <dd className="mt-0.5 text-foreground">
              {submission.submitter_phone?.trim() || 'Not provided'}
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-muted-foreground">
          Submitter contact details come from the submission record and are not
          part of the skills offer form. They remain read-only here.
        </p>
      </DetailSectionCard>

      <WorkspaceSection aria-label="Disclaimer">
        <p className="text-xs leading-relaxed text-muted-foreground">
          A member of the RRCRC team will follow up with the contributor as
          needed before anything is published.
        </p>
      </WorkspaceSection>
    </div>
  )
}
