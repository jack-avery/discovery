/**
 * Structured note formatting for fields without dedicated backend columns.
 * Produce readable labelled blocks for RRCRC staff — not opaque JSON.
 */

export type NoteSection = {
  heading: string
  lines: string[]
}

export function trimText(value: string | null | undefined): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

/** Build a multi-section notes string. Empty sections are omitted. */
export function formatNoteSections(sections: NoteSection[]): string | undefined {
  const blocks: string[] = []

  for (const section of sections) {
    const lines = section.lines
      .map((line) => trimText(line))
      .filter(Boolean)
    if (lines.length === 0) continue

    const heading = trimText(section.heading)
    if (heading) {
      blocks.push(`${heading}\n${lines.join('\n')}`)
    } else {
      blocks.push(lines.join('\n'))
    }
  }

  if (blocks.length === 0) return undefined
  return blocks.join('\n\n')
}

export function line(label: string, value: string | null | undefined): string | null {
  const text = trimText(value)
  if (!text) return null
  return `${label}: ${text}`
}

export function bulletList(items: string[]): string[] {
  return items.map((item) => trimText(item)).filter(Boolean)
}

/**
 * Remove empty optional fields from a payload without mutating the source.
 * Keeps meaningful false booleans. Omits empty arrays and empty strings.
 */
export function compactPayload<T extends object>(payload: T): T {
  const result: Record<string, unknown> = { ...(payload as Record<string, unknown>) }

  for (const [key, value] of Object.entries(result)) {
    if (value === undefined || value === null) {
      delete result[key]
      continue
    }
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (!trimmed) {
        delete result[key]
        continue
      }
      result[key] = trimmed
      continue
    }
    if (Array.isArray(value) && value.length === 0) {
      delete result[key]
    }
  }

  return result as T
}
