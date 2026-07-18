import type { InputHTMLAttributes } from 'react'
import { Input } from '@/components/ui'
import {
  formatPhoneInput,
  formatPhoneNational,
  isValidNorthAmericanPhone,
} from '@/utils/phone'

type PhoneInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'value' | 'onChange'
> & {
  value: string
  onChange: (value: string) => void
}

/**
 * Canada/US phone input with AsYouType formatting while editing.
 * Formats to national style on blur when valid.
 * Validation messaging stays in the parent Field (blur/submit UX).
 */
export function PhoneInput({
  value,
  onChange,
  onBlur,
  ...props
}: PhoneInputProps) {
  return (
    <Input
      {...props}
      type="tel"
      inputMode="tel"
      autoComplete={props.autoComplete ?? 'tel'}
      value={value}
      placeholder={props.placeholder ?? '(613) 555-1234'}
      onChange={(event) => {
        onChange(formatPhoneInput(event.target.value))
      }}
      onBlur={(event) => {
        const current = event.target.value
        if (current.trim() && isValidNorthAmericanPhone(current)) {
          onChange(formatPhoneNational(current))
        }
        onBlur?.(event)
      }}
    />
  )
}
