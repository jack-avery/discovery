import { useEffect, useState } from 'react'
import { ClipboardList, FileInput } from 'lucide-react'
import { Button } from '@/components/ui'
import { useToast } from '@/components/shared'
import { ConvertToResourceDialog } from '@/features/staff/skillsFollowUps/ConvertToResourceDialog'
import type { ConvertedResourceSelection } from '@/features/staff/skillsFollowUps/ConvertedResourcePicker'
import { SkillsFollowUpStatusControl } from '@/features/staff/skillsFollowUps/SkillsFollowUpStatusControl'
import {
  formatFollowUpLastUpdatedBy,
  isConvertedStatus,
  isInternalNotesWithinLimit,
  notesHaveChanged,
} from '@/features/staff/skillsFollowUps/skillsFollowUpStatusHelpers'
import { fetchResourceById } from '@/services/resourceService'
import {
  formatFollowUpAcceptedAt,
  INTERNAL_NOTES_MAX_LENGTH,
  toConvertFollowUpPayload,
  updateSkillsFollowUp,
} from '@/services/skillsFollowUpService'
import type { SkillsFollowUpDetailDto } from '@/types/skillsFollowUp'
import { toUserFacingErrorMessage } from '@/utils/userFacingError'

interface SkillsFollowUpStaffSectionProps {
  detail: SkillsFollowUpDetailDto
  onUpdated: (detail: SkillsFollowUpDetailDto) => void
}

type ConversionDialogState =
  | { open: false }
  | {
      open: true
      mode: 'convert' | 'change'
      initialSelection: ConvertedResourceSelection | null
    }

/**
 * Staff-only operational block — status, Convert to Resource action, notes.
 */
export function SkillsFollowUpStaffSection({
  detail,
  onUpdated,
}: SkillsFollowUpStaffSectionProps) {
  const toast = useToast()
  const [notesDraft, setNotesDraft] = useState(detail.internal_notes ?? '')
  const [isSavingNotes, setIsSavingNotes] = useState(false)
  const [dialog, setDialog] = useState<ConversionDialogState>({ open: false })
  const [isConverting, setIsConverting] = useState(false)
  const [linkedResource, setLinkedResource] =
    useState<ConvertedResourceSelection | null>(null)
  const [linkedResourceStatus, setLinkedResourceStatus] = useState<
    'idle' | 'loading' | 'ready' | 'unavailable'
  >('idle')

  useEffect(() => {
    setNotesDraft(detail.internal_notes ?? '')
    setDialog({ open: false })
  }, [detail.follow_up_id, detail.internal_notes])

  useEffect(() => {
    if (detail.status !== 'converted' || detail.converted_resource_id == null) {
      setLinkedResource(null)
      setLinkedResourceStatus('idle')
      return
    }

    const resourceId = detail.converted_resource_id
    const controller = new AbortController()
    setLinkedResourceStatus('loading')
    setLinkedResource(null)

    fetchResourceById(resourceId, { signal: controller.signal })
      .then((resource) => {
        if (controller.signal.aborted) return
        setLinkedResource({
          resource_id: resource.resource_id,
          name: resource.version.name?.trim() || 'Untitled resource',
          resource_type: resource.version.resource_type ?? null,
        })
        setLinkedResourceStatus('ready')
      })
      .catch(() => {
        if (controller.signal.aborted) return
        setLinkedResource(null)
        setLinkedResourceStatus('unavailable')
      })

    return () => controller.abort()
  }, [detail.follow_up_id, detail.status, detail.converted_resource_id])

  const dirty = notesHaveChanged(notesDraft, detail.internal_notes)
  const withinLimit = isInternalNotesWithinLimit(notesDraft)
  const canSave = dirty && withinLimit && !isSavingNotes
  const isConverted = isConvertedStatus(detail.status)

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

  const handleConfirmConversion = async (
    resource: ConvertedResourceSelection,
  ) => {
    if (isConverting) return
    setIsConverting(true)
    try {
      const updated = await updateSkillsFollowUp(
        detail.follow_up_id,
        toConvertFollowUpPayload(resource.resource_id),
      )
      toast.success(
        dialog.open && dialog.mode === 'change'
          ? 'Linked resource updated.'
          : 'Marked as converted to resource.',
      )
      setDialog({ open: false })
      onUpdated(updated)
    } catch (err: unknown) {
      toast.error(
        toUserFacingErrorMessage(err, {
          fallback:
            "We couldn't save the resource link. Please try again.",
          context: 'skills-follow-up-convert',
        }),
      )
    } finally {
      setIsConverting(false)
    }
  }

  const headingId = `follow-up-staff-${detail.follow_up_id}`

  return (
    <section
      aria-labelledby={headingId}
      className="min-w-0 rounded-lg border border-interactive/20 bg-interactive-muted/40 px-3.5 py-3.5 sm:px-4 sm:py-4"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex min-w-0 items-center gap-2.5">
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
            Staff Actions
          </h3>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2.5">
          <SkillsFollowUpStatusControl
            followUpId={detail.follow_up_id}
            status={detail.status}
            onUpdated={onUpdated}
            variant="compact"
            disabled={isConverting || dialog.open}
          />
          {!isConverted ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              disabled={isConverting}
              onClick={() =>
                setDialog({
                  open: true,
                  mode: 'convert',
                  initialSelection: null,
                })
              }
            >
              <FileInput className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Convert to Resource
            </Button>
          ) : null}
        </div>
      </div>

      <div className="space-y-4">
        {isConverted ? (
          <div className="rounded-lg border border-border bg-surface px-3 py-2.5">
            <p className="text-[11px] font-medium text-muted-foreground">
              Linked resource
            </p>
            {linkedResourceStatus === 'loading' ||
            (linkedResourceStatus === 'idle' &&
              detail.converted_resource_id != null) ? (
              <p className="mt-1 text-xs text-muted-foreground" role="status">
                Loading linked resource…
              </p>
            ) : null}
            {linkedResourceStatus === 'unavailable' ? (
              <p className="mt-1 text-sm text-muted-foreground" role="status">
                Linked resource unavailable
              </p>
            ) : null}
            {linkedResourceStatus === 'ready' && linkedResource ? (
              <>
                <p className="mt-1 font-heading text-sm font-semibold text-foreground">
                  {linkedResource.name}
                </p>
                {linkedResource.resource_type ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {linkedResource.resource_type}
                  </p>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-2 h-8 px-2"
                  disabled={isConverting}
                  onClick={() =>
                    setDialog({
                      open: true,
                      mode: 'change',
                      initialSelection: linkedResource,
                    })
                  }
                >
                  Change Resource
                </Button>
              </>
            ) : null}
            {linkedResourceStatus === 'unavailable' ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-2 h-8 px-2"
                disabled={isConverting}
                onClick={() =>
                  setDialog({
                    open: true,
                    mode: 'change',
                    initialSelection: null,
                  })
                }
              >
                Change Resource
              </Button>
            ) : null}
          </div>
        ) : null}

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
            disabled={isSavingNotes || isConverting}
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
              disabled={!canSave || isConverting}
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

      <ConvertToResourceDialog
        open={dialog.open}
        mode={dialog.open ? dialog.mode : 'convert'}
        initialSelection={dialog.open ? dialog.initialSelection : null}
        isSubmitting={isConverting}
        onCancel={() => {
          if (!isConverting) setDialog({ open: false })
        }}
        onConfirm={(selection) => {
          void handleConfirmConversion(selection)
        }}
      />
    </section>
  )
}
