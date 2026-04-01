import type { FieldDefinition, FieldError } from '../fields/types'
import { FieldRenderer } from '../fields/FieldRenderer'
import { FieldGroupSection, groupFields } from '../FieldGroupSection'

interface EditorContentPanelProps {
  fields: FieldDefinition[]
  formData: Record<string, unknown>
  fieldErrors: Record<string, FieldError>
  isSubmitting: boolean
  onFieldChange: (fieldName: string, value: unknown) => void
}

export function EditorContentPanel({
  fields,
  formData,
  fieldErrors,
  isSubmitting,
  onFieldChange,
}: EditorContentPanelProps) {
  const groups = groupFields(fields)
  const isSingleDefaultGroup =
    groups.length === 1 && groups[0].name === '__default__'

  if (isSingleDefaultGroup) {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <div className="flex flex-col gap-4">
          {fields.map((field) => (
            <FieldRenderer
              key={field.name}
              field={field}
              value={formData[field.name]}
              onChange={(value) => onFieldChange(field.name, value)}
              error={fieldErrors[field.name]}
              disabled={isSubmitting}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="flex flex-col gap-6">
        {groups.map((group, index) => (
          <FieldGroupSection
            key={group.name}
            group={group}
            formData={formData}
            fieldErrors={fieldErrors}
            isSubmitting={isSubmitting}
            onFieldChange={onFieldChange}
            initialOpen={index === 0}
          />
        ))}
      </div>
    </div>
  )
}
