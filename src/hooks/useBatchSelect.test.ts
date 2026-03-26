import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useBatchSelect } from './useBatchSelect'

describe('useBatchSelect', () => {
  it('starts with empty selection', () => {
    const { result } = renderHook(() => useBatchSelect())
    expect(result.current.selectedIds.size).toBe(0)
  })

  describe('toggle', () => {
    it('adds an id when not selected', () => {
      const { result } = renderHook(() => useBatchSelect())
      act(() => result.current.toggle('photo-1'))
      expect(result.current.selectedIds.has('photo-1')).toBe(true)
    })

    it('removes an id when already selected', () => {
      const { result } = renderHook(() => useBatchSelect())
      act(() => result.current.toggle('photo-1'))
      act(() => result.current.toggle('photo-1'))
      expect(result.current.selectedIds.has('photo-1')).toBe(false)
    })

    it('can toggle multiple ids independently', () => {
      const { result } = renderHook(() => useBatchSelect())
      act(() => result.current.toggle('photo-1'))
      act(() => result.current.toggle('photo-2'))
      act(() => result.current.toggle('photo-1'))
      expect(result.current.selectedIds.has('photo-1')).toBe(false)
      expect(result.current.selectedIds.has('photo-2')).toBe(true)
    })
  })

  describe('selectRange', () => {
    const allIds = ['p1', 'p2', 'p3', 'p4', 'p5']

    it('selects a forward range', () => {
      const { result } = renderHook(() => useBatchSelect())
      act(() => result.current.selectRange('p2', 'p4', allIds))
      expect(result.current.selectedIds).toEqual(new Set(['p2', 'p3', 'p4']))
    })

    it('selects a backward range (reversed indices)', () => {
      const { result } = renderHook(() => useBatchSelect())
      act(() => result.current.selectRange('p4', 'p2', allIds))
      expect(result.current.selectedIds).toEqual(new Set(['p2', 'p3', 'p4']))
    })

    it('adds range to existing selection', () => {
      const { result } = renderHook(() => useBatchSelect())
      act(() => result.current.toggle('p1'))
      act(() => result.current.selectRange('p3', 'p4', allIds))
      expect(result.current.selectedIds).toEqual(new Set(['p1', 'p3', 'p4']))
    })

    it('does nothing if id is not in allIds', () => {
      const { result } = renderHook(() => useBatchSelect())
      act(() => result.current.selectRange('unknown', 'p3', allIds))
      expect(result.current.selectedIds.size).toBe(0)
    })
  })

  describe('selectAll', () => {
    it('selects all provided ids', () => {
      const { result } = renderHook(() => useBatchSelect())
      act(() => result.current.selectAll(['p1', 'p2', 'p3']))
      expect(result.current.selectedIds).toEqual(new Set(['p1', 'p2', 'p3']))
    })

    it('replaces existing selection', () => {
      const { result } = renderHook(() => useBatchSelect())
      act(() => result.current.toggle('p5'))
      act(() => result.current.selectAll(['p1', 'p2']))
      expect(result.current.selectedIds).toEqual(new Set(['p1', 'p2']))
    })
  })

  describe('deselectAll', () => {
    it('clears the entire selection', () => {
      const { result } = renderHook(() => useBatchSelect())
      act(() => result.current.selectAll(['p1', 'p2', 'p3']))
      act(() => result.current.deselectAll())
      expect(result.current.selectedIds.size).toBe(0)
    })
  })
})
