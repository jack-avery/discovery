import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Badge } from '@/components/ui'
import { useToast } from '@/components/shared'
import { followUpStatusSelectOptions } from '@/features/staff/skillsFollowUps/skillsFollowUpStatusHelpers'
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
  /**
   * Visual presentation only.
   * - `badge` (default): filled status pill — table and other shared uses
   * - `compact`: neutral outlined control with status-colored dot — Staff Actions header
   */
  variant?: 'badge' | 'compact'
  disabled?: boolean
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

function statusDotClassName(status: string): string {
  switch (status) {
    case 'accepted':
      return 'bg-pending'
    case 'contacted':
    case 'in_discussion':
      return 'bg-primary'
    case 'converted':
      return 'bg-success'
    case 'closed':
      return 'bg-muted-foreground'
    default:
      return 'bg-muted-foreground'
  }
}

/**
 * Compact status control for ordinary lifecycle statuses.
 * Conversion is a separate Staff action + dialog — not offered here.
 */
export function SkillsFollowUpStatusControl({
  followUpId,
  status,
  onUpdated,
  size = 'table',
  variant = 'badge',
  disabled = false,
}: SkillsFollowUpStatusControlProps) {
  const toast = useToast()
  const [isSaving, setIsSaving] = useState(false)
  const options = followUpStatusSelectOptions(status)

  const handleChange = async (next: string) => {
    if (isSaving || disabled) return
    if (next === status) return
    if (next === 'converted') return
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

  const selectElement = (
    <select
      aria-label="Follow-up status"
      disabled={isSaving || disabled}
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
      {!options.some((option) => option.value === status) ? (
        <option value={status}>{skillsFollowUpStatusLabel(status)}</option>
      ) : null}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )

  if (variant === 'compact') {
    return (
      <div className="relative inline-flex max-w-full shrink-0">
        <span
          className={cn(
            'pointer-events-none inline-flex h-8 max-w-full items-center gap-1.5',
            'rounded-md border border-border bg-surface',
            'pl-2.5 pr-1.5 text-xs font-medium text-foreground',
            (isSaving || disabled) && 'opacity-60',
          )}
        >
          <span
            className={cn(
              'h-2 w-2 shrink-0 rounded-full',
              statusDotClassName(status),
            )}
            aria-hidden="true"
          />
          <span className="min-w-0 truncate">
            {skillsFollowUpStatusLabel(status)}
          </span>
          <ChevronDown
            className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
        </span>
        {selectElement}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'relative inline-flex max-w-full',
        size === 'detail' && 'min-w-[12.5rem]',
      )}
    >
      <Badge
        variant={statusBadgeVariant(status)}
        className={cn(
          'pointer-events-none max-w-full whitespace-normal pr-6 text-left',
          (isSaving || disabled) && 'opacity-60',
        )}
      >
        {skillsFollowUpStatusLabel(status)}
      </Badge>
      {selectElement}
    </div>
  )
}
