import { api, ApiError, type QueryParamValue } from '@/services/api'
import type {
  PaginationMeta,
  Resource,
  ResourceDetail,
  ResourceDetailDto,
  ResourceListDto,
  ResourceSummaryDto,
  ResourceVersionDto,
} from '@/types/resource'
import {
  logTechnicalError,
  toUserFacingErrorMessage,
} from '@/utils/userFacingError'

/**
 * Long-term frontend query contract for resource lists.
 * Prefer multi-id arrays; the builder adapts them to repeated query params.
 */
export interface ResourceListQuery {
  /** Empty / omitted = all categories. */
  categoryIds?: number[]
  /** Empty / omitted = all tags. */
  tagIds?: number[]
  search?: string
  resourceType?: string
  page?: number
  perPage?: number
}

/**
 * Limitations encountered when adapting the long-term query to today's API.
 * Exposed so callers can observe unsupported multi-select without UI workarounds.
 */
export type ResourceQueryLimitation =
  | { code: 'MULTI_TAG_UNSUPPORTED'; selectedIds: number[] }

export interface ResourceListResult {
  resources: Resource[]
  pagination: PaginationMeta
  limitations: ResourceQueryLimitation[]
}

export interface FetchResourcesOptions {
  signal?: AbortSignal
}

export const EMPTY_PAGINATION: PaginationMeta = {
  page: 1,
  per_page: 20,
  total_items: 0,
  total_pages: 0,
  has_next: false,
  has_prev: false,
}

export const EMPTY_RESOURCE_LIST: ResourceListResult = {
  resources: [],
  pagination: EMPTY_PAGINATION,
  limitations: [],
}

/**
 * Adapts {@link ResourceListQuery} to GET /resources query params.
 *
 * Categories: repeated `category_id` (OR within type). Tags: single `tag_id`
 * until multi-tag is wired the same way. Also `search`, `resource_type`,
 * `page`, `per_page`.
 *
 * Category multi-select policy (0 / 1 / 2+):
 * - 0 selected → omit that param (all)
 * - 1+ selected → send as `category_id` (scalar or array → repeated params)
 *
 * Tag multi-select policy (0 / 1 / 2+):
 * - 0 selected → omit
 * - 1 selected → send that single id
 * - 2+ selected → omit that param, record a limitation, preserve UI selection upstream
 */
export function buildResourceListParams(query: ResourceListQuery): {
  params: Record<string, QueryParamValue>
  limitations: ResourceQueryLimitation[]
} {
  const params: Record<string, QueryParamValue> = {}
  const limitations: ResourceQueryLimitation[] = []

  const categoryIds = query.categoryIds?.filter((id) => Number.isFinite(id)) ?? []
  const tagIds = query.tagIds?.filter((id) => Number.isFinite(id)) ?? []

  if (categoryIds.length === 1) {
    params.category_id = categoryIds[0]
  } else if (categoryIds.length > 1) {
    params.category_id = categoryIds
  }

  if (tagIds.length === 1) {
    params.tag_id = tagIds[0]
  } else if (tagIds.length > 1) {
    limitations.push({
      code: 'MULTI_TAG_UNSUPPORTED',
      selectedIds: tagIds,
    })
    // Intentionally omit tag_id until backend multi-select is wired here.
  }

  const search = query.search?.trim()
  if (search) {
    params.search = search
  }

  if (query.resourceType) {
    params.resource_type = query.resourceType
  }

  if (query.page !== undefined) {
    params.page = query.page
  }

  if (query.perPage !== undefined) {
    params.per_page = query.perPage
  }

  return { params, limitations }
}

/**
 * Maps a summary DTO to the UI Resource shape.
 */
export function mapResourceSummary(dto: ResourceSummaryDto): Resource {
  return {
    id: String(dto.resource_id),
    resource_id: dto.resource_id,
    slug: dto.slug,
    name: dto.name ?? '',
    is_active: dto.is_active,
    last_verified_at: dto.last_verified_at,
    resource_type: dto.resource_type,
    image_url: dto.image_url,
  }
}

/**
 * Fetch a paginated resource list from GET /resources.
 */
export async function fetchResources(
  query: ResourceListQuery = {},
  options: FetchResourcesOptions = {},
): Promise<ResourceListResult> {
  const { params, limitations } = buildResourceListParams(query)

  const data = await api.get<ResourceListDto>('/resources', {
    params,
    signal: options.signal,
  })

  return {
    resources: (data?.resources ?? []).map(mapResourceSummary),
    pagination: data?.pagination ?? EMPTY_PAGINATION,
    limitations,
  }
}

/**
 * Normalize detail `version` collections so missing keys stay empty arrays.
 * Does not reshape nested objects — preserves backend semantics.
 */
function normalizeVersion(version: ResourceVersionDto): ResourceVersionDto {
  return {
    ...version,
    categories: version.categories ?? [],
    tags: version.tags ?? [],
    locations: version.locations ?? [],
    contacts: version.contacts ?? [],
    hours: version.hours ?? [],
  }
}

/**
 * Adapt GET /resources/<id> payload to ResourceDetail.
 *
 * Mapping (intentional, minimal):
 * - Preserve `{ resource_id, slug, version }` structure unchanged
 * - Default missing nested collections to `[]` so consumers can iterate safely
 *
 * No flattening of categories/tags/locations/contacts/hours.
 */
export function mapResourceDetail(dto: ResourceDetailDto): ResourceDetail {
  return {
    resource_id: dto.resource_id,
    slug: dto.slug,
    version: normalizeVersion(dto.version),
  }
}

/**
 * Fetch a single published resource from GET /resources/<id>.
 */
export async function fetchResourceById(
  resourceId: string | number,
  options: FetchResourcesOptions = {},
): Promise<ResourceDetail> {
  const numericId =
    typeof resourceId === 'number' ? resourceId : Number.parseInt(resourceId, 10)

  if (!Number.isFinite(numericId) || numericId <= 0) {
    throw new ApiError('Invalid resource id.', 400)
  }

  const data = await api.get<ResourceDetailDto>(`/resources/${numericId}`, {
    signal: options.signal,
  })

  if (!data?.version) {
    throw new ApiError('Resource version not found.', 404)
  }

  return mapResourceDetail(data)
}

/**
 * Soft-delete a resource via DELETE /resources/<id> (administrator only).
 * History is preserved server-side; the resource is hidden from public/staff lists.
 */
export async function deleteResource(
  resourceId: string | number,
  options: FetchResourcesOptions = {},
): Promise<void> {
  const numericId =
    typeof resourceId === 'number' ? resourceId : Number.parseInt(resourceId, 10)

  if (!Number.isFinite(numericId) || numericId <= 0) {
    throw new ApiError('Invalid resource id.', 400)
  }

  await api.delete<null>(`/resources/${numericId}`, {
    signal: options.signal,
  })
}

/**
 * User-facing message for soft-delete failures (401 / 403 / 404 / network).
 */
export function toDeleteResourceErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      logTechnicalError('delete-resource', error)
      return 'Your session has expired. Please sign in again to delete this resource.'
    }
    if (error.status === 403) {
      logTechnicalError('delete-resource', error)
      return 'You do not have permission to delete resources.'
    }
    if (error.status === 404) {
      logTechnicalError('delete-resource', error)
      return 'This resource was not found or has already been deleted.'
    }
  }

  return toUserFacingErrorMessage(error, {
    fallback: 'Unable to delete this resource. Please try again.',
    context: 'delete-resource',
  })
}
