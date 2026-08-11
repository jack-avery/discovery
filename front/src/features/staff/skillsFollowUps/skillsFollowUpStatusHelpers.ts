import {
  EDITABLE_SKILLS_FOLLOW_UP_STATUSES,
  INTERNAL_NOTES_MAX_LENGTH,
  skillsFollowUpStatusLabel,
} from '@/services/skillsFollowUpService'
import type {
  EditableSkillsFollowUpStatus,
  SkillsFollowUpStatus,
} from '@/types/skillsFollowUp'

export function isConvertedStatus(status: string): boolean {
  return status === 'converted'
}

/**
 * Status is never badge-locked; conversion is a separate action/dialog.
 * Kept so call sites/tests can assert the control remains interactive.
 */
export function isFollowUpStatusReadOnly(_status: string): boolean {
  return false
}

/** Ordinary lifecycle options for immediate PATCH (never includes Converted). */
export function editableFollowUpStatusOptions(): ReadonlyArray<{
  value: EditableSkillsFollowUpStatus
  label: string
}> {
  return EDITABLE_SKILLS_FOLLOW_UP_STATUSES.map((value) => ({
    value,
    label: skillsFollowUpStatusLabel(value),
  }))
}

/**
 * Status `<select>` options.
 *
 * Converted is never offered as a selectable conversion path. When the
 * confirmed status is already `converted`, include it only so the controlled
 * select can display the current value while staff moves to another status.
 */
export function followUpStatusSelectOptions(
  currentStatus: string,
): ReadonlyArray<{ value: SkillsFollowUpStatus | string; label: string }> {
  const options: Array<{ value: SkillsFollowUpStatus | string; label: string }> =
    [...editableFollowUpStatusOptions()]

  if (currentStatus === 'converted') {
    options.push({
      value: 'converted',
      label: skillsFollowUpStatusLabel('converted'),
    })
  }

  return options
}

/** Toolbar filter options: All + every backend status including Converted. */
export function skillsFollowUpStatusFilterOptions(): ReadonlyArray<{
  value: SkillsFollowUpStatus | 'all'
  label: string
}> {
  return [
    { value: 'all', label: 'All' },
    { value: 'accepted', label: skillsFollowUpStatusLabel('accepted') },
    { value: 'contacted', label: skillsFollowUpStatusLabel('contacted') },
    {
      value: 'in_discussion',
      label: skillsFollowUpStatusLabel('in_discussion'),
    },
    { value: 'converted', label: skillsFollowUpStatusLabel('converted') },
    { value: 'closed', label: skillsFollowUpStatusLabel('closed') },
  ]
}

/** Changing the status filter always returns to page 1. */
export function pageAfterStatusFilterChange(): number {
  return 1
}

export function notesHaveChanged(
  draft: string,
  saved: string | null | undefined,
): boolean {
  return draft !== (saved ?? '')
}

export function isInternalNotesWithinLimit(value: string): boolean {
  return value.length <= INTERNAL_NOTES_MAX_LENGTH
}

/**
 * Display line for operational metadata when a name is available.
 * Omits the line when only an id would be shown.
 */
export function formatFollowUpLastUpdatedBy(args: {
  updatedAt: string | null | undefined
  updatedBy: string | null | undefined
  formatDate: (value: string | null | undefined) => string
}): string | null {
  const name = args.updatedBy?.trim()
  if (!name) return null
  if (!args.updatedAt) return null
  return `Last updated ${args.formatDate(args.updatedAt)} by ${name}`
}
