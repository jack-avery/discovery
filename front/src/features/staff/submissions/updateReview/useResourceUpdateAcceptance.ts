import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ExistingResourceData } from '@/types/submission'
import type { ResourceUpdateComparison } from '@/features/submissions/updateRequest/buildResourceUpdateComparison'
import {
  composeResourceUpdateFinalVersion,
  type ComposedResourceUpdateVersion,
} from '@/features/submissions/updateRequest/composeResourceUpdateFinalVersion'

export type FieldAcceptanceMap = Record<string, boolean>
export type FieldEditMap = Record<string, string>

export interface ResourceUpdateAcceptanceState {
  accepted: FieldAcceptanceMap
  edits: FieldEditMap
  totalCount: number
  selectedCount: number
  allSelected: boolean
  setFieldAccepted: (fieldId: string, accepted: boolean) => void
  setFieldEdit: (fieldId: string, value: string) => void
  resetFieldEdit: (fieldId: string) => void
  isFieldEdited: (fieldId: string) => boolean
  getProposedValue: (fieldId: string, originalProposed: string) => string
  selectedCountInSection: (fieldIds: string[]) => number
  /**
   * True when the reviewer rejected a changed field or edited any value —
   * approval must stay local-only until backend supports finalized versions.
   */
  hasOutcomeChanges: boolean
  composedFinal: ComposedResourceUpdateVersion | null
}

/**
 * Moderator field acceptance + local edits for a Resource Update comparison.
 * Defaults every field to accepted; resets when the comparison identity changes.
 */
export function useResourceUpdateAcceptance(
  comparison: ResourceUpdateComparison | null,
  resetKey: string | number,
  baseline: ExistingResourceData | null = null,
  proposed: ExistingResourceData | null = null,
): ResourceUpdateAcceptanceState {
  const fieldIds = useMemo(() => {
    if (!comparison) return [] as string[]
    return comparison.sections.flatMap((section) =>
      section.fields.map((field) => field.id),
    )
  }, [comparison])

  const proposedById = useMemo(() => {
    const map: Record<string, string> = {}
    if (!comparison) return map
    for (const section of comparison.sections) {
      for (const field of section.fields) {
        map[field.id] = field.proposed
      }
    }
    return map
  }, [comparison])

  const changedFieldIds = useMemo(() => {
    if (!comparison) return [] as string[]
    return comparison.sections.flatMap((section) =>
      section.fields.filter((field) => field.changed).map((field) => field.id),
    )
  }, [comparison])

  const fieldIdsKey = fieldIds.join('|')

  const [accepted, setAccepted] = useState<FieldAcceptanceMap>({})
  const [edits, setEdits] = useState<FieldEditMap>({})

  useEffect(() => {
    const next: FieldAcceptanceMap = {}
    for (const id of fieldIds) {
      next[id] = true
    }
    setAccepted(next)
    setEdits({})
  }, [resetKey, fieldIdsKey])

  const setFieldAccepted = useCallback((fieldId: string, value: boolean) => {
    setAccepted((current) => ({ ...current, [fieldId]: value }))
  }, [])

  const setFieldEdit = useCallback(
    (fieldId: string, value: string) => {
      setEdits((current) => {
        const original = proposedById[fieldId]
        const effective = value.trim() || 'Not provided'
        if (original != null && effective === original) {
          if (!(fieldId in current)) return current
          const next = { ...current }
          delete next[fieldId]
          return next
        }
        return { ...current, [fieldId]: value }
      })
    },
    [proposedById],
  )

  const resetFieldEdit = useCallback((fieldId: string) => {
    setEdits((current) => {
      if (!(fieldId in current)) return current
      const next = { ...current }
      delete next[fieldId]
      return next
    })
  }, [])

  const isFieldEdited = useCallback(
    (fieldId: string) => {
      const edited = edits[fieldId]
      if (edited == null) return false
      const effective = edited.trim() || 'Not provided'
      return effective !== proposedById[fieldId]
    },
    [edits, proposedById],
  )

  const getProposedValue = useCallback(
    (fieldId: string, originalProposed: string) =>
      edits[fieldId] ?? originalProposed,
    [edits],
  )

  const totalCount = fieldIds.length
  const selectedCount = fieldIds.reduce(
    (count, id) => count + (accepted[id] !== false ? 1 : 0),
    0,
  )
  const allSelected = totalCount === 0 || selectedCount === totalCount

  const selectedCountInSection = useCallback(
    (sectionFieldIds: string[]) =>
      sectionFieldIds.reduce(
        (count, id) => count + (accepted[id] !== false ? 1 : 0),
        0,
      ),
    [accepted],
  )

  const hasOutcomeChanges = useMemo(() => {
    for (const id of changedFieldIds) {
      if (accepted[id] === false) return true
    }
    for (const [id, value] of Object.entries(edits)) {
      const effective = value.trim() || 'Not provided'
      if (effective !== proposedById[id]) return true
    }
    return false
  }, [accepted, changedFieldIds, edits, proposedById])

  const composedFinal = useMemo(() => {
    if (!comparison || !proposed) return null
    return composeResourceUpdateFinalVersion(
      baseline,
      proposed,
      comparison,
      accepted,
      edits,
    )
  }, [accepted, baseline, comparison, edits, proposed])

  return {
    accepted,
    edits,
    totalCount,
    selectedCount,
    allSelected,
    setFieldAccepted,
    setFieldEdit,
    resetFieldEdit,
    isFieldEdited,
    getProposedValue,
    selectedCountInSection,
    hasOutcomeChanges,
    composedFinal,
  }
}
