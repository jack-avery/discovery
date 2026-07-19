import { CheckboxOptionGroup } from '../form/CheckboxOptionGroup'
import {
  UPDATE_SECTION_OPTIONS,
  type UpdateSectionId,
} from './updateSections'

interface UpdateSectionPickerProps {
  value: UpdateSectionId[]
  onChange: (value: UpdateSectionId[]) => void
}

/**
 * Multi-select: which sections start expanded in the update editor.
 * Does not restrict later editing.
 */
export function UpdateSectionPicker({
  value,
  onChange,
}: UpdateSectionPickerProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-muted-foreground">
        Choose what you&apos;d like to update. You can still edit other details
        afterward.
      </p>

      <CheckboxOptionGroup<UpdateSectionId>
        legend="What would you like to update?"
        options={UPDATE_SECTION_OPTIONS.map((option) => ({
          value: option.id,
          label: option.label,
        }))}
        value={value}
        onChange={onChange}
        className="sm:grid-cols-2"
      />
    </div>
  )
}
