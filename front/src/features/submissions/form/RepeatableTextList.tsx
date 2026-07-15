import { useId } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { Field } from './Field'

interface RepeatableTextListProps {
  label: string
  hint?: string
  values: string[]
  onChange: (values: string[]) => void
  placeholder?: string
  addLabel?: string
}

export function RepeatableTextList({
  label,
  hint,
  values,
  onChange,
  placeholder = '',
  addLabel = 'Add another',
}: RepeatableTextListProps) {
  const groupId = useId()

  const update = (index: number, value: string) => {
    onChange(values.map((v, i) => (i === index ? value : v)))
  }

  const remove = (index: number) => {
    if (values.length <= 1) {
      onChange([''])
      return
    }
    onChange(values.filter((_, i) => i !== index))
  }

  const add = () => {
    if (values.some((v) => !v.trim())) return
    onChange([...values, ''])
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <p id={groupId} className="text-sm font-medium text-foreground">
          {label}
        </p>
        {hint ? (
          <p className="text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </div>

      <ul className="space-y-2" aria-labelledby={groupId}>
        {values.map((value, index) => {
          const fieldId = `${groupId}-item-${index}`
          return (
            <li key={fieldId} className="flex items-start gap-2">
              <Field
                id={fieldId}
                label={`${label} ${index + 1}`}
                className="min-w-0 flex-1 [&_label]:sr-only"
              >
                <Input
                  id={fieldId}
                  value={value}
                  onChange={(e) => update(index, e.target.value)}
                  placeholder={placeholder}
                />
              </Field>
              {values.length > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-0.5 shrink-0"
                  onClick={() => remove(index)}
                  aria-label={`Remove ${label.toLowerCase()} ${index + 1}`}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              ) : null}
            </li>
          )
        })}
      </ul>

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={values.some((v) => !v.trim())}
        onClick={add}
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        {addLabel}
      </Button>
    </div>
  )
}
