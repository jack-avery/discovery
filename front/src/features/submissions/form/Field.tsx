import {
  Children,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from 'react'
import { cn } from '@/utils/cn'

interface FieldProps {
  id: string
  label: string
  required?: boolean
  hint?: string
  error?: string
  children: ReactNode
  className?: string
}

export function Field({
  id,
  label,
  required,
  hint,
  error,
  children,
  className,
}: FieldProps) {
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  const control = Children.map(children, (child) => {
    if (!isValidElement(child)) return child
    const element = child as ReactElement<{
      id?: string
      'aria-describedby'?: string
      'aria-invalid'?: boolean | 'true' | 'false'
    }>
    return cloneElement(element, {
      id: element.props.id ?? id,
      'aria-describedby': describedBy ?? element.props['aria-describedby'],
      'aria-invalid': error ? true : element.props['aria-invalid'],
    })
  })

  return (
    <div className={cn('space-y-1.5', className)}>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-foreground"
      >
        {label}
        {required ? (
          <span className="text-danger" aria-hidden="true">
            {' '}
            *
          </span>
        ) : null}
      </label>
      {hint ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {control}
      {error ? (
        <p id={errorId} className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
