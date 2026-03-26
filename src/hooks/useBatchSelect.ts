'use client'

import { useCallback, useState } from 'react'

export interface UseBatchSelectReturn {
  selectedIds: Set<string>
  toggle: (id: string) => void
  selectRange: (startId: string, endId: string, allIds: string[]) => void
  selectAll: (ids: string[]) => void
  deselectAll: () => void
}

export function useBatchSelect(): UseBatchSelectReturn {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const selectRange = useCallback((startId: string, endId: string, allIds: string[]) => {
    const startIndex = allIds.indexOf(startId)
    const endIndex = allIds.indexOf(endId)

    if (startIndex === -1 || endIndex === -1) return

    const low = Math.min(startIndex, endIndex)
    const high = Math.max(startIndex, endIndex)
    const rangeIds = allIds.slice(low, high + 1)

    setSelectedIds((prev) => {
      const next = new Set(prev)
      for (const id of rangeIds) {
        next.add(id)
      }
      return next
    })
  }, [])

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids))
  }, [])

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  return { selectedIds, toggle, selectRange, selectAll, deselectAll }
}
