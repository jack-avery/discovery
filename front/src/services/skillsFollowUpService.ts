import { api, type QueryParamValue } from '@/services/api'
import { EMPTY_PAGINATION } from '@/services/resourceService'
import { formatSubmissionDate } from '@/services/staffSubmissionService'
import type { PaginationMeta } from '@/types/resource'
import type {
  EditableSkillsFollowUpStatus,
  ListSkillsFollowUpsQuery,
  SkillsFollowUpDetailDto,
  SkillsFollowUpListDto,
  SkillsFollowUpSort,
  SkillsFollowUpStatus,
  SkillsFollowUpSummaryDto,
} from '@/types/skillsFollowUp'

export const SKILLS_FOLLOW_UPS_PAGE_SIZE = 20

/** Canonical backend statuses (display + filter). */
export const SKILLS_FOLLOW_UP_STATUSES: readonly SkillsFollowUpStatus[] = [
  'accepted',
  'contacted',
  'in_discussion',
  'converted',
  'closed',
] as const

/** Statuses offered in the lightweight editor (excludes converted). */
export const EDITABLE_SKILLS_FOLLOW_UP_STATUSES: readonly EditableSkillsFollowUpStatus[] =
  ['accepted', 'contacted', 'in_discussion', 'closed'] as const

export const INTERNAL_NOTES_MAX_LENGTH = 5000

export interface UpdateSkillsFollowUpInput {
  status?: EditableSkillsFollowUpStatus | SkillsFollowUpStatus
  internal_notes?: string | null
}

export const EMPTY_SKILLS_FOLLOW_UP_LIST: SkillsFollowUpListDto = {
  items: [],
  meta: {
    ...EMPTY_PAGINATION,
    per_page: SKILLS_FOLLOW_UPS_PAGE_SIZE,
  },
}

export interface FetchSkillsFollowUpsOptions {
  signal?: AbortSignal
}

const FOLLOW_UP_STATUSES = new Set<string>(SKILLS_FOLLOW_UP_STATUSES)

export function isSkillsFollowUpStatus(
  value: string,
): value is SkillsFollowUpStatus {
  return FOLLOW_UP_STATUSES.has(value)
}

/**
 * Build GET /skills-follow-ups query params.
 * Backend accepts: status?, page, limit. Sort is applied client-side via
 * reverse pagination (see {@link fetchSkillsFollowUps}).
 */
export function toSkillsFollowUpsApiParams(
  query: ListSkillsFollowUpsQuery = {},
): Record<string, QueryParamValue> {
  const params: Record<string, QueryParamValue> = {
    page: query.page ?? 1,
    limit: query.limit ?? SKILLS_FOLLOW_UPS_PAGE_SIZE,
  }
  if (query.status) {
    params.status = query.status
  }
  return params
}

/**
 * Map a client "oldest first" page onto the backend's newest-first page index.
 * Backend always returns `accepted_at DESC`; reversing pages preserves global order.
 */
export function serverPageForOldestFirst(
  clientPage: number,
  totalPages: number,
): number {
  if (totalPages <= 0) return 1
  const safeClientPage = Math.min(Math.max(1, clientPage), totalPages)
  return totalPages - safeClientPage + 1
}

export function remapMetaForClientPage(
  meta: PaginationMeta,
  clientPage: number,
): PaginationMeta {
  const totalPages = meta.total_pages
  const safeClientPage =
    totalPages <= 0 ? 1 : Math.min(Math.max(1, clientPage), totalPages)
  return {
    ...meta,
    page: safeClientPage,
    has_prev: safeClientPage > 1 && totalPages > 0,
    has_next: safeClientPage < totalPages,
  }
}

/** Reverse one newest-first page into oldest-first order for that slice. */
export function reverseFollowUpPageItems<T>(items: readonly T[]): T[] {
  return [...items].reverse()
}

async function fetchSkillsFollowUpsPage(
  params: Record<string, QueryParamValue>,
  options?: FetchSkillsFollowUpsOptions,
): Promise<SkillsFollowUpListDto> {
  return api.get<SkillsFollowUpListDto>('/skills-follow-ups', {
    params,
    signal: options?.signal,
  })
}

/**
 * GET /skills-follow-ups — moderator+ (hierarchy).
 *
 * Backend always orders by `accepted_at DESC` with no sort query param.
 * Newest first uses that order directly.
 * Oldest first remaps page numbers across the full result set and reverses
 * each page so global order stays correct under server-side pagination.
 */
export async function fetchSkillsFollowUps(
  query: ListSkillsFollowUpsQuery = {},
  options?: FetchSkillsFollowUpsOptions,
): Promise<SkillsFollowUpListDto> {
  const sort: SkillsFollowUpSort = query.sort ?? 'newest'
  const clientPage = Math.max(1, query.page ?? 1)
  const limit = query.limit ?? SKILLS_FOLLOW_UPS_PAGE_SIZE

  if (sort === 'newest') {
    return fetchSkillsFollowUpsPage(
      toSkillsFollowUpsApiParams({ ...query, page: clientPage, limit }),
      options,
    )
  }

  // Oldest first — probe page 1 to learn total_pages, then fetch the
  // mirrored server page and reverse items.
  const probe = await fetchSkillsFollowUpsPage(
    toSkillsFollowUpsApiParams({ ...query, page: 1, limit }),
    options,
  )

  const totalPages = probe.meta.total_pages
  if (totalPages === 0 || probe.meta.total_items === 0) {
    return {
      items: [],
      meta: remapMetaForClientPage(probe.meta, 1),
    }
  }

  const serverPage = serverPageForOldestFirst(clientPage, totalPages)

  const raw =
    serverPage === 1
      ? probe
      : await fetchSkillsFollowUpsPage(
          toSkillsFollowUpsApiParams({
            ...query,
            page: serverPage,
            limit,
          }),
          options,
        )

  return {
    items: reverseFollowUpPageItems(raw.items),
    meta: remapMetaForClientPage(
      {
        ...raw.meta,
        total_pages: totalPages,
        total_items: probe.meta.total_items,
      },
      clientPage,
    ),
  }
}

/** GET /skills-follow-ups/:id — contact + submission detail. */
export async function fetchSkillsFollowUpById(
  followUpId: number,
  options?: FetchSkillsFollowUpsOptions,
): Promise<SkillsFollowUpDetailDto> {
  return api.get<SkillsFollowUpDetailDto>(`/skills-follow-ups/${followUpId}`, {
    signal: options?.signal,
  })
}

/**
 * Build PATCH /skills-follow-ups/:id body.
 * Only includes fields that are explicitly provided.
 * Empty notes are sent as "" (backend accepts and clears the column).
 */
export function toUpdateSkillsFollowUpPayload(
  input: UpdateSkillsFollowUpInput,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {}
  if (input.status !== undefined) {
    payload.status = input.status
  }
  if (input.internal_notes !== undefined) {
    payload.internal_notes = input.internal_notes ?? ''
  }
  return payload
}

export function isEditableSkillsFollowUpStatus(
  status: string,
): status is EditableSkillsFollowUpStatus {
  return (EDITABLE_SKILLS_FOLLOW_UP_STATUSES as readonly string[]).includes(
    status,
  )
}

/** PATCH /skills-follow-ups/:id — status and/or internal_notes (moderator+). */
export async function updateSkillsFollowUp(
  followUpId: number,
  input: UpdateSkillsFollowUpInput,
  options?: FetchSkillsFollowUpsOptions,
): Promise<SkillsFollowUpDetailDto> {
  return api.patch<SkillsFollowUpDetailDto>(
    `/skills-follow-ups/${followUpId}`,
    toUpdateSkillsFollowUpPayload(input),
    { signal: options?.signal },
  )
}

export function formatFollowUpAcceptedAt(
  value: string | null | undefined,
): string {
  return formatSubmissionDate(value, { includeTime: true })
}

export function skillsFollowUpStatusLabel(status: string): string {
  switch (status) {
    case 'accepted':
      return 'Accepted'
    case 'contacted':
      return 'Contacted'
    case 'in_discussion':
      return 'In discussion'
    case 'converted':
      return 'Converted'
    case 'closed':
      return 'Closed'
    default:
      return status.replace(/_/g, ' ')
  }
}

export function displaySubmitterName(
  item: Pick<SkillsFollowUpSummaryDto, 'submitter_name'>,
): string {
  const name = item.submitter_name?.trim()
  return name && name.length > 0 ? name : 'Unknown contributor'
}

export function displaySkillName(
  item: Pick<SkillsFollowUpSummaryDto, 'skill_name'>,
): string {
  const name = item.skill_name?.trim()
  return name && name.length > 0 ? name : 'Untitled skill or service'
}
