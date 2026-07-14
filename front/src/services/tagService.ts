import { api } from '@/services/api'
import type { Tag, TagDto } from '@/types/tag'

export interface FetchTagsOptions {
  signal?: AbortSignal
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
