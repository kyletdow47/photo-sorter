'use client'

import React, { useCallback, useRef, useState } from 'react'
import { useUploadStore } from '@/stores/uploadStore'

const ACCEPTED_EXTENSIONS = [
  '.jpg', '.jpeg', '.png', '.webp', '.tiff',
  '.raw', '.cr2', '.nef', '.arw', '.dng',
]
const ACCEPTED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/tiff',
]
const MAX_FILE_SIZE = 500 * 1024 * 1024 // 500MB

interface UploadZoneProps {
  projectId: string
  className?: string
}

function isAcceptedFile(file: File): boolean {
  const ext = '.' + (file.name.split('.').pop()?.toLowerCase() ?? '')
  const hasAcceptedExt = ACCEPTED_EXTENSIONS.includes(ext)
  const hasAcceptedMime = ACCEPTED_MIME_TYPES.includes(file.type)
  // RAW formats have no standard MIME type, rely on extension
  return hasAcceptedExt || hasAcceptedMime
}

export function UploadZone({ projectId, className = '' }: UploadZoneProps) {
  const addFiles = useUploadStore((s) => s.addFiles)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  const processFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files)
      const valid: File[] = []
      const newErrors: string[] = []

      for (const file of fileArray) {
        if (!isAcceptedFile(file)) {
          newErrors.push(`${file.name}: unsupported file type`)
          continue
        }
        if (file.size > MAX_FILE_SIZE) {
          newErrors.push(`${file.name}: exceeds 500MB limit`)
          continue
        }
        valid.push(file)
      }

      setErrors(newErrors)

      if (valid.length > 0) {
        await addFiles(valid, projectId)
      }
    },
    [addFiles, projectId],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragging(false)
      void processFiles(e.dataTransfer.files)
    },
    [processFiles],
  )

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        void processFiles(e.target.files)
        // Reset input so the same file can be re-selected after error
        e.target.value = ''
      }
    },
    [processFiles],
  )

  const handleClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  return (
    <div className={className}>
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload photos — drag and drop or click to browse"
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') handleClick()
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={[
          'flex flex-col items-center justify-center gap-3',
          'rounded-xl border-2 border-dashed p-12 cursor-pointer',
          'transition-colors duration-150',
          isDragging
            ? 'border-accent bg-accent/5'
            : 'border-view1-border bg-surface hover:border-accent/50 hover:bg-accent/5',
        ].join(' ')}
      >
        <UploadIcon isDragging={isDragging} />

        <div className="text-center">
          <p className="text-sm font-medium text-white/70">
            {isDragging ? 'Drop photos here' : 'Drag & drop photos, or click to browse'}
          </p>
          <p className="mt-1 text-xs text-muted">
            JPG, PNG, WEBP, TIFF, RAW, CR2, NEF, ARW, DNG — up to 500 MB each
          </p>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPTED_EXTENSIONS.join(',')}
        className="sr-only"
        aria-hidden="true"
        onChange={handleInputChange}
      />

      {errors.length > 0 && (
        <ul
          role="alert"
          className="mt-3 space-y-1 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3"
        >
          {errors.map((err) => (
            <li key={err} className="text-xs text-red-400">
              {err}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function UploadIcon({ isDragging }: { isDragging: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={[
        'h-10 w-10 transition-colors',
        isDragging ? 'text-accent' : 'text-white/30',
      ].join(' ')}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
      />
    </svg>
  )
}
