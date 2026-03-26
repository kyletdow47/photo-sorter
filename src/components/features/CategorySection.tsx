'use client'

import { useState } from 'react'
import { clsx } from 'clsx'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { PhotoGrid } from './PhotoGrid'
import type { MediaItem } from '@/types/media'

export interface CategorySectionProps {
  category: string
  color?: string
  media: MediaItem[]
  selectedIds: Set<string>
  onSelect: (id: string, shiftKey: boolean) => void
  onDoubleClick: (id: string) => void
  defaultCollapsed?: boolean
  className?: string
}

const CATEGORY_COLORS: Record<string, string> = {
  portrait: '#4ADE80',
  landscape: '#60A5FA',
  wedding: '#F472B6',
  event: '#FBBF24',
  commercial: '#A78BFA',
  street: '#FB923C',
  nature: '#34D399',
  architecture: '#94A3B8',
  default: '#6B7280',
}

function getCategoryColor(category: string, override?: string): string {
  if (override) return override
  return CATEGORY_COLORS[category.toLowerCase()] ?? CATEGORY_COLORS.default
}

export function CategorySection({
  category,
  color,
  media,
  selectedIds,
  onSelect,
  onDoubleClick,
  defaultCollapsed = false,
  className,
}: CategorySectionProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed)
  const dotColor = getCategoryColor(category, color)

  const selectedCount = media.filter((m) => selectedIds.has(m.id)).length

  return (
    <div className={clsx('rounded-xl border border-view1-border bg-surface/50', className)}>
      {/* Header */}
      <button
        type="button"
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors rounded-t-xl focus:outline-none focus:ring-2 focus:ring-accent focus:ring-inset"
        onClick={() => setCollapsed((prev) => !prev)}
        aria-expanded={!collapsed}
      >
        {/* Collapse chevron */}
        <span className="text-white/40 flex-shrink-0">
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </span>

        {/* Color dot + category name */}
        <span
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: dotColor }}
          aria-hidden
        />
        <span className="font-medium text-sm text-white capitalize flex-1">{category}</span>

        {/* Counts */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {selectedCount > 0 && (
            <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">
              {selectedCount} selected
            </span>
          )}
          <span className="text-xs text-white/40 bg-white/5 px-2 py-0.5 rounded-full">
            {media.length} {media.length === 1 ? 'photo' : 'photos'}
          </span>
        </div>
      </button>

      {/* Collapsible body */}
      <div
        className={clsx(
          'overflow-hidden transition-all duration-300 ease-in-out',
          collapsed ? 'max-h-0' : 'max-h-[10000px]'
        )}
        aria-hidden={collapsed}
      >
        <div className="px-4 pb-4 pt-1">
          <PhotoGrid
            media={media}
            selectedIds={selectedIds}
            onSelect={onSelect}
            onDoubleClick={onDoubleClick}
          />
        </div>
      </div>
    </div>
  )
}
