import {
  AsYouType,
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js'

const NORTH_AMERICAN_COUNTRIES: CountryCode[] = ['CA', 'US']

export const PHONE_VALIDATION_MESSAGE =
  'Enter a valid Canada or United States phone number.'

function parseNorthAmericanPhone(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return undefined

  for (const country of NORTH_AMERICAN_COUNTRIES) {
    const parsed = parsePhoneNumberFromString(trimmed, country)
    if (parsed && parsed.isValid() && NORTH_AMERICAN_COUNTRIES.includes(parsed.country as CountryCode)) {
      return parsed
    }
  }

  // Explicit +1 / country-code entry without a default country
  const parsed = parsePhoneNumberFromString(trimmed)
  if (
    parsed &&
    parsed.isValid() &&
    parsed.country &&
    NORTH_AMERICAN_COUNTRIES.includes(parsed.country)
  ) {
    return parsed
  }

  return undefined
}

/** True when the value is a valid Canada or US phone number. */
export function isValidNorthAmericanPhone(value: string): boolean {
  return Boolean(parseNorthAmericanPhone(value))
}

/**
 * Format while typing using North American conventions.
 * Does not truncate partial input; invalid partials stay editable.
 */
export function formatPhoneInput(value: string): string {
  if (!value.trim()) return value
  // Prefer CA as default for Rideau-Rockcliffe; US numbers format identically under NANP.
  return new AsYouType('CA').input(value)
}

/** Friendly national display when the number is valid; otherwise return trimmed input. */
export function formatPhoneNational(value: string): string {
  const parsed = parseNorthAmericanPhone(value)
  if (!parsed) return value.trim()
  return parsed.formatNational()
}

/** E.164 for API payloads (`+16135551234`). Returns null when invalid or empty. */
export function normalizePhoneE164(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = parseNorthAmericanPhone(trimmed)
  if (!parsed) return null
  return parsed.format('E.164')
}
