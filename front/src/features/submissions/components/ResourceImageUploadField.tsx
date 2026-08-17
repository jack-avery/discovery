import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Button } from '@/components/ui'
import {
  RESOURCE_IMAGE_ACCEPT,
  toResourceImageUploadErrorMessage,
  uploadResourceImage,
  validateResourceImageFile,
} from '@/services/resourceImageUploadService'
import { resolveResourceImageUrl } from '@/utils/resolveResourceImageUrl'
import { Field } from '../form/Field'

interface ResourceImageUploadFieldProps {
  id: string
  value: string | null
  onChange: (imageUrl: string) => void
  onUploadingChange?: (uploading: boolean) => void
  disabled?: boolean
  label?: string
  hint?: string
  previewAlt?: string
}

export function ResourceImageUploadField({
  id,
  value,
  onChange,
  onUploadingChange,
  disabled = false,
  label = 'Resource image (optional)',
  hint = 'Choose one JPEG, PNG, or WebP image up to 5 MB.',
  previewAlt = 'Selected resource image',
}: ResourceImageUploadFieldProps) {
  const [error, setError] = useState<string | undefined>()
  const [uploading, setUploading] = useState(false)
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null)
  const [previewFailed, setPreviewFailed] = useState(false)
  const mountedRef = useRef(false)
  const requestIdRef = useRef(0)
  const abortRef = useRef<AbortController | null>(null)
  const localPreviewRef = useRef<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const uploadingRef = useRef(false)
  const onUploadingChangeRef = useRef(onUploadingChange)

  const previewUrl = localPreviewUrl ?? resolveResourceImageUrl(value)

  useEffect(() => {
    onUploadingChangeRef.current = onUploadingChange
  }, [onUploadingChange])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      requestIdRef.current += 1
      abortRef.current?.abort()
      // Release the parent's uploading gate; it outlives this field.
      if (uploadingRef.current) {
        uploadingRef.current = false
        onUploadingChangeRef.current?.(false)
      }
      if (localPreviewRef.current) {
        URL.revokeObjectURL(localPreviewRef.current)
        localPreviewRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (localPreviewRef.current) {
      URL.revokeObjectURL(localPreviewRef.current)
      localPreviewRef.current = null
      setLocalPreviewUrl(null)
    }
  }, [value])

  useEffect(() => {
    setPreviewFailed(false)
  }, [previewUrl])

  const replaceLocalPreview = (next: string | null) => {
    if (localPreviewRef.current) {
      URL.revokeObjectURL(localPreviewRef.current)
    }
    localPreviewRef.current = next
    setLocalPreviewUrl(next)
  }

  const setUploadActive = (active: boolean) => {
    uploadingRef.current = active
    setUploading(active)
    onUploadingChangeRef.current?.(active)
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    const hadActiveUpload = Boolean(abortRef.current)
    abortRef.current?.abort()
    abortRef.current = null
    if (hadActiveUpload) {
      setUploadActive(false)
    }
    setError(undefined)
    replaceLocalPreview(null)

    const validationError = validateResourceImageFile(file)
    if (validationError) {
      setError(validationError)
      return
    }

    const controller = new AbortController()
    abortRef.current = controller
    replaceLocalPreview(URL.createObjectURL(file))
    setUploadActive(true)

    void uploadResourceImage(file, { signal: controller.signal })
      .then((imageUrl) => {
        if (!mountedRef.current || requestIdRef.current !== requestId) return
        onChange(imageUrl)
        setError(undefined)
      })
      .catch((uploadError: unknown) => {
        if (
          !mountedRef.current ||
          requestIdRef.current !== requestId ||
          isAbortError(uploadError)
        ) {
          return
        }
        setError(toResourceImageUploadErrorMessage(uploadError))
        replaceLocalPreview(null)
      })
      .finally(() => {
        if (!mountedRef.current || requestIdRef.current !== requestId) return
        abortRef.current = null
        setUploadActive(false)
      })
  }

  return (
    <div className="space-y-3">
      <Field
        id={id}
        label={label}
        hint={
          value
            ? `${hint} Choose another image to replace the current image.`
            : hint
        }
        error={error}
      >
        <input
          ref={inputRef}
          type="file"
          accept={RESOURCE_IMAGE_ACCEPT}
          disabled={disabled}
          onChange={handleFileChange}
          className="sr-only"
          tabIndex={-1}
        />
      </Field>
      {previewUrl && !previewFailed ? (
        <img
          src={previewUrl}
          alt={previewAlt}
          className="aspect-[17/8] w-full rounded-lg border border-border object-cover"
          onError={() => setPreviewFailed(true)}
        />
      ) : previewUrl && previewFailed ? (
        <p className="text-sm text-muted-foreground">
          Image preview is unavailable.
        </p>
      ) : null}
      <Button
        type="button"
        variant="outline"
        disabled={disabled}
        aria-controls={id}
        onClick={() => inputRef.current?.click()}
      >
        {previewUrl ? 'Replace image' : 'Choose image'}
      </Button>
      {uploading ? (
        <p
          className="text-xs text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          Uploading image…
        </p>
      ) : null}
    </div>
  )
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (error instanceof Error && error.name === 'AbortError')
  )
}
