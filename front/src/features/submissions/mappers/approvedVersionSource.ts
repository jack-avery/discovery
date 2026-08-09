/**
 * Fields the moderation form may not own. Callers pass values from the
 * proposed (or current) ResourceVersion so approved_version snapshots do not
 * drop publishable data.
 */
export interface ApprovedVersionSourceFields {
  /** Fallback when the form name/title is empty. */
  name?: string | null
  /** Preserved when the form does not edit resource type. */
  resource_type?: string | null
  /** Preserved when the form does not edit image URL. */
  image_url?: string | null
}
