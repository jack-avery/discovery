import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ResourceUpdateComparison } from '@/features/submissions/updateRequest/buildResourceUpdateComparison'

export type FieldAcceptanceMap = Record<string, boolean>

export interface ResourceUpdateAcceptanceState {
  accepted: FieldAcceptanceMap
  totalCount: number
  selectedCount: number
  allSelected: boolean
  setFieldAccepted: (fieldId: string, accepted: boolean) => void
  selectedCountInSection: (fieldIds: string[]) => number
}

/**
 * Moderator Keep-this-change selections for a Resource Update comparison.
 * Defaults every field to accepted; resets when the comparison identity changes.
 *
 * TODO(resource-update-moderation): Not wired while baseline is unavailable.
 * Re-enable with ResourceUpdateComparisonView once submission.resource_id
 * exists and true Current→Proposed diffs can be built.
 */
export function useResourceUpdateAcceptance(
  comparison: ResourceUpdateComparison | null,
  resetKey: string | number,
): ResourceUpdateAcceptanceState {
  const fieldIds = useMemo(() => {
    if (!comparison) return [] as string[]
    return comparison.sections.flatMap((section) =>
      section.fields.map((field) => field.id),
    )
  }, [comparison])

  const fieldIdsKey = fieldIds.join('|')

  const [accepted, setAccepted] = useState<FieldAcceptanceMap>({})

  useEffect(() => {
    const next: FieldAcceptanceMap = {}
    for (const id of fieldIds) {
      next[id] = true
    }
    setAccepted(next)
  }, [resetKey, fieldIdsKey])

  const setFieldAccepted = useCallback((fieldId: string, value: boolean) => {
    setAccepted((current) => ({ ...current, [fieldId]: value }))
  }, [])

  const totalCount = fieldIds.length
  const selectedCount = fieldIds.reduce(
    (count, id) => count + (accepted[id] !== false ? 1 : 0),
    0,
  )
  const allSelected = selectedCount === totalCount

  const selectedCountInSection = useCallback(
    (sectionFieldIds: string[]) =>
      sectionFieldIds.reduce(
        (count, id) => count + (accepted[id] !== false ? 1 : 0),
        0,
      ),
    [accepted],
  )

  return {
    accepted,
    totalCount,
    selectedCount,
    allSelected,
    setFieldAccepted,
    selectedCountInSection,
  }
}
