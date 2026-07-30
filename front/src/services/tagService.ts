import { api, type ApiRequestOptions } from '@/services/api'
import type { Tag, TagDto } from '@/types/tag'
import { slugify } from '@/utils/slugify'

export interface FetchTagsOptions {
  signal?: AbortSignal
}

export interface CreateTagInput {
  name: string
  /** When omitted, derived from `name` via {@link slugify}. */
  slug?: string
}

export interface UpdateTagInput {
  name: string
  /** When omitted, derived from `name` via {@link slugify}. */
  slug?: string
}

interface TagWriteResult {
  tag_id: number
  name: string
  slug: string
  is_active: boolean
}

/**
 * Maps a backend tag DTO to the UI Tag shape.
 * `id` is stringified for MultiSelectItem / React keys; numeric id is retained.
 */
function mapTag(dto: TagDto): Tag {
  return {
    id: String(dto.tag_id),
    slug: dto.slug,
    name: dto.name,
    tag_id: dto.tag_id,
    is_active: dto.is_active,
  }
}

/**
 * Fetch active tags from GET /tags.
 * Envelope is unwrapped by api.ts; backend already returns a flat list.
 */
export async function fetchTags(options: FetchTagsOptions = {}): Promise<Tag[]> {
  const tags = await api.get<TagDto[]>('/tags', {
    signal: options.signal,
  })

  return (tags ?? []).map(mapTag)
}

/**
 * POST /tags — staff_editor+.
 * Sends name + slug (slug auto-generated from name when not provided).
 */
export async function createTag(
  input: CreateTagInput,
  options?: ApiRequestOptions,
): Promise<TagWriteResult> {
  const name = input.name.trim()
  const slug = (input.slug?.trim() || slugify(name)).trim()
  if (!slug) {
    throw new Error('Name must include letters or numbers to generate a slug.')
  }

  return api.post<TagWriteResult>('/tags', { name, slug }, options)
}

/**
 * PUT /tags/:id — staff_editor+.
 * Updates name + slug (slug auto-generated from name when not provided).
 */
export async function updateTag(
  tagId: number,
  input: UpdateTagInput,
  options?: ApiRequestOptions,
): Promise<TagWriteResult> {
  const name = input.name.trim()
  const slug = (input.slug?.trim() || slugify(name)).trim()
  if (!slug) {
    throw new Error('Name must include letters or numbers to generate a slug.')
  }

  return api.put<TagWriteResult>(`/tags/${tagId}`, { name, slug }, options)
}
