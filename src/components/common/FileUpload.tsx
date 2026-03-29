'use client'

import { clsx } from 'clsx'
import { Image as ImageIcon, Upload, X } from 'lucide-react'
import { useCallback, useState } from 'react'
import { toast } from 'sonner'

interface UploadFile {
  file: File
  preview: string
  progress: number
}

export interface FileUploadProps {
  onFilesSelected: (files: File[]) => void
  multiple?: boolean
  accept?: string
  maxFiles?: number
  disabled?: boolean
  className?: string
}

export function FileUpload({
  onFilesSelected,
  multiple = true,
  accept = 'image/*',
  maxFiles = 50,
  disabled = false,
  className,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [files, setFiles] = useState<UploadFile[]>([])

  const addFiles = useCallback(
    (incoming: FileList | File[]) => {
      const imageFiles = Array.from(incoming).filter((f) => f.type.startsWith('image/'))
      const slots = maxFiles - files.length
      const limited = imageFiles.slice(0, slots)
      if (limited.length === 0) return

      if (limited.length < imageFiles.length) {
        toast(`Only the first ${limited.length} of ${imageFiles.length} files were added (limit: ${maxFiles})`)
      }

      const entries: UploadFile[] = limited.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
        progress: 0,
      }))
      setFiles((prev) => [...prev, ...entries])
      onFilesSelected(limited)
    },
    [files.length, maxFiles, onFilesSelected]
  )

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => {
      const next = [...prev]
      URL.revokeObjectURL(next[index].preview)
      next.splice(index, 1)
      return next
    })
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLLabelElement>) => {
      e.preventDefault()
      setIsDragging(false)
      if (!disabled) addFiles(e.dataTransfer.files)
    },
    [disabled, addFiles]
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) addFiles(e.target.files)
    },
    [addFiles]
  )

  return (
    <div className={clsx('w-full', className)}>
      <label
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={clsx(
          'flex flex-col items-center justify-center w-full min-h-[160px] rounded-xl border-2 border-dashed transition-colors cursor-pointer',
          isDragging
            ? 'border-accent bg-accent/5'
            : 'border-view1-border hover:border-white/30 bg-surface/50',
          disabled && 'opacity-50 cursor-not-allowed pointer-events-none'
        )}
      >
        <input
          type="file"
          multiple={multiple}
          accept={accept}
          onChange={handleChange}
          disabled={disabled}
          className="sr-only"
          data-testid="file-input"
        />
        <Upload
          size={32}
          className={clsx('mb-3', isDragging ? 'text-accent' : 'text-muted')}
          aria-hidden="true"
        />
        <p className="text-sm font-medium text-white mb-1">
          {isDragging ? 'Drop images here' : 'Drag & drop images'}
        </p>
        <p className="text-xs text-muted">or click to browse · up to {maxFiles} images</p>
      </label>

      {files.length > 0 && (
        <ul className="mt-3 grid grid-cols-4 gap-2" aria-label="Selected files">
          {files.map((f, i) => (
            <li
              key={`${f.file.name}-${i}`}
              className="relative group rounded-lg overflow-hidden bg-surface border border-view1-border aspect-square"
            >
              {f.preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.preview} alt={f.file.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon size={24} className="text-muted" aria-hidden="true" />
                </div>
              )}
              <button
                type="button"
                onClick={() => removeFile(i)}
                aria-label={`Remove ${f.file.name}`}
                className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={12} />
              </button>
              {f.progress > 0 && f.progress < 100 && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/40">
                  <div
                    className="h-full bg-accent transition-all"
                    style={{ width: `${f.progress}%` }}
                    role="progressbar"
                    aria-valuenow={f.progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
