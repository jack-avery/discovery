import { useEffect, useState } from 'react'
import { ClipboardList } from 'lucide-react'
import { Button } from '@/components/ui'
import { useToast } from '@/components/shared'
import { SkillsFollowUpStatusControl } from '@/features/staff/skillsFollowUps/SkillsFollowUpStatusControl'
import {
  formatFollowUpLastUpdatedBy,
  isInternalNotesWithinLimit,
  notesHaveChanged,
} from '@/features/staff/skillsFollowUps/skillsFollowUpStatusHelpers'
import {
  formatFollowUpAcceptedAt,
  INTERNAL_NOTES_MAX_LENGTH,
  updateSkillsFollowUp,
} from '@/services/skillsFollowUpService'
import type { SkillsFollowUpDetailDto } from '@/types/skillsFollowUp'
import { toUserFacingErrorMessage } from '@/utils/userFacingError'

interface SkillsFollowUpStaffSectionProps {
  detail: SkillsFollowUpDetailDto
  onUpdated: (detail: SkillsFollowUpDetailDto) => void
}

/**
 * Staff-only operational block — visually distinct from contributor-submitted
 * Contact / About sections. Status + internal notes + subtle update metadata.
 */
export function SkillsFollowUpStaffSection({
  detail,
  onUpdated,
}: SkillsFollowUpStaffSectionProps) {
  const toast = useToast()
  const [notesDraft, setNotesDraft] = useState(detail.internal_notes ?? '')
  const [isSavingNotes, setIsSavingNotes] = useState(false)

  useEffect(() => {
    setNotesDraft(detail.internal_notes ?? '')
  }, [detail.follow_up_id, detail.internal_notes])

  const dirty = notesHaveChanged(notesDraft, detail.internal_notes)
  const withinLimit = isInternalNotesWithinLimit(notesDraft)
  const canSave = dirty && withinLimit && !isSavingNotes

  const lastUpdatedLine = formatFollowUpLastUpdatedBy({
    updatedAt: detail.updated_at,
    updatedBy: detail.updated_by,
    formatDate: formatFollowUpAcceptedAt,
  })

  const handleSaveNotes = async () => {
    if (!canSave) return
    setIsSavingNotes(true)
    try {
      const updated = await updateSkillsFollowUp(detail.follow_up_id, {
        internal_notes: notesDraft,
      })
      toast.success('Internal notes saved.')
      onUpdated(updated)
    } catch (err: unknown) {
      toast.error(
        toUserFacingErrorMessage(err, {
          fallback: "We couldn't save internal notes. Please try again.",
          context: 'skills-follow-up-notes',
        }),
      )
    } finally {
      setIsSavingNotes(false)
    }
  }

  const headingId = `follow-up-staff-${detail.follow_up_id}`

  return (
    <section
      aria-labelledby={headingId}
      className="min-w-0 rounded-lg border border-interactive/20 bg-interactive-muted/40 px-3.5 py-3.5 sm:px-4 sm:py-4"
    >
      <div className="mb-3 flex items-center gap-2.5">
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-interactive-muted text-interactive"
          aria-hidden="true"
        >
          <ClipboardList className="h-3.5 w-3.5" strokeWidth={2} />
        </span>
        <h3
          id={headingId}
          className="text-xs font-semibold uppercase tracking-wide text-foreground"
        >
          Staff follow-up
        </h3>
      </div>

      <div className="space-y-4">
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-muted-foreground">Status</p>
          <div className="mt-1.5">
            <SkillsFollowUpStatusControl
              followUpId={detail.follow_up_id}
              status={detail.status}
              onUpdated={onUpdated}
              size="detail"
            />
          </div>
        </div>

        <div className="min-w-0">
          <label
            htmlFor={`follow-up-internal-notes-${detail.follow_up_id}`}
            className="text-[11px] font-medium text-muted-foreground"
          >
            Internal notes
          </label>
          <textarea
            id={`follow-up-internal-notes-${detail.follow_up_id}`}
            value={notesDraft}
            maxLength={INTERNAL_NOTES_MAX_LENGTH}
            rows={4}
            disabled={isSavingNotes}
            onChange={(event) => setNotesDraft(event.target.value)}
            placeholder="Staff-only notes about outreach or next steps…"
            className="mt-1.5 w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus-visible:border-interactive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interactive/40 disabled:cursor-not-allowed disabled:opacity-60"
          />
          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-muted-foreground">
              {notesDraft.length.toLocaleString()} /{' '}
              {INTERNAL_NOTES_MAX_LENGTH.toLocaleString()}
            </p>
            <Button
              type="button"
              size="sm"
              disabled={!canSave}
              onClick={() => {
                void handleSaveNotes()
              }}
            >
              {isSavingNotes ? 'Saving…' : 'Save notes'}
            </Button>
          </div>
        </div>

        {detail.accepted_by?.trim() ? (
          <p className="text-xs text-muted-foreground">
            Accepted by {detail.accepted_by.trim()}
          </p>
        ) : null}

        {lastUpdatedLine ? (
          <p className="text-xs text-muted-foreground">{lastUpdatedLine}</p>
        ) : null}
      </div>
    </section>
  )
}
