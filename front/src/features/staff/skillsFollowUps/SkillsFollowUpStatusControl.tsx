import { useState } from 'react'
import { Badge } from '@/components/ui'
import { useToast } from '@/components/shared'
import {
  editableFollowUpStatusOptions,
  isFollowUpStatusReadOnly,
} from '@/features/staff/skillsFollowUps/skillsFollowUpStatusHelpers'
import {
  skillsFollowUpStatusLabel,
  updateSkillsFollowUp,
} from '@/services/skillsFollowUpService'
import type {
  EditableSkillsFollowUpStatus,
  SkillsFollowUpDetailDto,
} from '@/types/skillsFollowUp'
import { toUserFacingErrorMessage } from '@/utils/userFacingError'
import { cn } from '@/utils/cn'

interface SkillsFollowUpStatusControlProps {
  followUpId: number
  status: string
  onUpdated?: (detail: SkillsFollowUpDetailDto) => void
  /** Compact table cell vs slightly roomier detail panel. */
  size?: 'table' | 'detail'
}

function statusBadgeVariant(
  status: string,
): 'default' | 'primary' | 'pending' | 'outline' | 'success' | 'warning' {
  switch (status) {
    case 'accepted':
      return 'pending'
    case 'contacted':
    case 'in_discussion':
      return 'primary'
    case 'converted':
      return 'success'
    case 'closed':
      return 'outline'
    default:
      return 'default'
  }
}

/**
 * Compact status control: badge appearance with an overlaid native select.
 * Converted is read-only (conversion workflow not implemented here).
 */
export function SkillsFollowUpStatusControl({
  followUpId,
  status,
  onUpdated,
  size = 'table',
}: SkillsFollowUpStatusControlProps) {
  const toast = useToast()
  const [isSaving, setIsSaving] = useState(false)
  const readOnly = isFollowUpStatusReadOnly(status)
  const options = editableFollowUpStatusOptions()

  if (readOnly) {
    return (
      <Badge variant={statusBadgeVariant(status)}>
        {skillsFollowUpStatusLabel(status)}
      </Badge>
    )
  }

  const handleChange = async (next: string) => {
    if (next === status || isSaving) return
    if (!options.some((option) => option.value === next)) return

    setIsSaving(true)
    try {
      const detail = await updateSkillsFollowUp(followUpId, {
        status: next as EditableSkillsFollowUpStatus,
      })
      toast.success('Status updated.')
      onUpdated?.(detail)
    } catch (err: unknown) {
      toast.error(
        toUserFacingErrorMessage(err, {
          fallback: "We couldn't update the status. Please try again.",
          context: 'skills-follow-up-status',
        }),
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div
      className={cn(
        'relative inline-flex max-w-full',
        size === 'detail' && 'min-w-[9.5rem]',
      )}
    >
      <Badge
        variant={statusBadgeVariant(status)}
        className={cn(
          'pointer-events-none pr-6',
          isSaving && 'opacity-60',
        )}
      >
        {skillsFollowUpStatusLabel(status)}
      </Badge>
      <select
        aria-label="Follow-up status"
        disabled={isSaving}
        value={status}
        onChange={(event) => {
          void handleChange(event.target.value)
        }}
        className={cn(
          'absolute inset-0 cursor-pointer appearance-none opacity-0',
          'disabled:cursor-not-allowed',
          'focus-visible:outline-none',
        )}
      >
        {/* Keep current value selectable even if unexpected so controlled select stays valid */}
        {!options.some((option) => option.value === status) ? (
          <option value={status}>{skillsFollowUpStatusLabel(status)}</option>
        ) : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}
