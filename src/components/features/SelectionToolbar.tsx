'use client'

import { clsx } from 'clsx'
import { CheckSquare, Download, FolderInput, Square, Trash2 } from 'lucide-react'
import { Button } from '@/components/common'

export interface SelectionToolbarProps {
  selectedCount: number
  totalCount: number
  onMoveToCategory?: () => void
  onDownload?: () => void
  onDelete?: () => void
  onSelectAll: () => void
  onDeselectAll: () => void
  className?: string
}

export function SelectionToolbar({
  selectedCount,
  totalCount,
  onMoveToCategory,
  onDownload,
  onDelete,
  onSelectAll,
  onDeselectAll,
  className,
}: SelectionToolbarProps) {
  if (selectedCount === 0) return null

  const allSelected = selectedCount === totalCount

  return (
    <div
      role="toolbar"
      aria-label="Batch selection actions"
      className={clsx(
        'fixed bottom-6 left-1/2 -translate-x-1/2 z-50',
        'flex items-center gap-2 px-4 py-3',
        'bg-surface/95 backdrop-blur-md border border-view1-border rounded-2xl shadow-2xl',
        className
      )}
    >
      {/* Count */}
      <span className="text-sm font-medium text-white pr-2 border-r border-view1-border mr-1">
        {selectedCount} selected
      </span>

      {/* Move to category */}
      {onMoveToCategory && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onMoveToCategory}
          title="Move to category"
          className="gap-1.5"
        >
          <FolderInput className="w-4 h-4" />
          <span className="hidden sm:inline">Move</span>
        </Button>
      )}

      {/* Download */}
      {onDownload && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onDownload}
          title="Download selected"
          className="gap-1.5"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Download</span>
        </Button>
      )}

      {/* Select all / Deselect all */}
      {allSelected ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={onDeselectAll}
          title="Deselect all"
          className="gap-1.5"
        >
          <CheckSquare className="w-4 h-4" />
          <span className="hidden sm:inline">Deselect all</span>
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={onSelectAll}
          title="Select all"
          className="gap-1.5"
        >
          <Square className="w-4 h-4" />
          <span className="hidden sm:inline">Select all</span>
        </Button>
      )}

      {/* Delete — separated visually */}
      {onDelete && (
        <>
          <div className="w-px h-5 bg-view1-border mx-1" />
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            title="Delete selected"
            className="gap-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Delete</span>
          </Button>
        </>
      )}
    </div>
  )
}
