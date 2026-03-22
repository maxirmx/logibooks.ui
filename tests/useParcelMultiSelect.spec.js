// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import { useParcelMultiSelect } from '@/composables/useParcelMultiSelect.js'

function makeItems(ids) {
  return ids.map(id => ({ id }))
}

function makeOptions(overrides = {}) {
  const items = ref(makeItems([1, 2, 3, 4, 5]))
  const loading = ref(false)
  const selectedParcelId = ref(null)
  const page = ref(1)
  const dataTableRef = ref(null)
  return {
    items,
    loading,
    selectedParcelId,
    page,
    dataTableRef,
    ...overrides,
  }
}

function clickEvent(modifiers = {}) {
  return {
    shiftKey: false,
    ctrlKey: false,
    metaKey: false,
    ...modifiers,
  }
}

describe('useParcelMultiSelect', () => {
  describe('handleRowClick – plain click', () => {
    it('selects only the clicked row', () => {
      const opts = makeOptions()
      const { handleRowClick, selectedParcelIds } = useParcelMultiSelect(opts)

      handleRowClick(clickEvent(), { item: { id: 2 } })

      expect([...selectedParcelIds.value]).toEqual([2])
      expect(opts.selectedParcelId.value).toBe(2)
    })

    it('replaces an existing selection with the newly clicked row', () => {
      const opts = makeOptions()
      const { handleRowClick, selectedParcelIds } = useParcelMultiSelect(opts)

      handleRowClick(clickEvent(), { item: { id: 1 } })
      handleRowClick(clickEvent(), { item: { id: 3 } })

      expect([...selectedParcelIds.value]).toEqual([3])
      expect(opts.selectedParcelId.value).toBe(3)
    })
  })

  describe('handleRowClick – Ctrl/Meta-click (toggle)', () => {
    it('adds a row to the selection when not already selected', () => {
      const opts = makeOptions()
      const { handleRowClick, selectedParcelIds } = useParcelMultiSelect(opts)

      handleRowClick(clickEvent(), { item: { id: 1 } })
      handleRowClick(clickEvent({ ctrlKey: true }), { item: { id: 3 } })

      expect(selectedParcelIds.value.has(1)).toBe(true)
      expect(selectedParcelIds.value.has(3)).toBe(true)
      expect(opts.selectedParcelId.value).toBe(3)
    })

    it('removes a row from the selection when already selected and updates selectedParcelId to another selected row', () => {
      const opts = makeOptions()
      const { handleRowClick, selectedParcelIds } = useParcelMultiSelect(opts)

      // Select rows 1 and 3
      handleRowClick(clickEvent(), { item: { id: 1 } })
      handleRowClick(clickEvent({ ctrlKey: true }), { item: { id: 3 } })

      // Deselect row 3 via Ctrl-click
      handleRowClick(clickEvent({ ctrlKey: true }), { item: { id: 3 } })

      expect(selectedParcelIds.value.has(3)).toBe(false)
      expect(selectedParcelIds.value.has(1)).toBe(true)
      // selectedParcelId must NOT point to the deselected row
      expect(opts.selectedParcelId.value).not.toBe(3)
      expect(opts.selectedParcelId.value).toBe(1)
    })

    it('sets selectedParcelId to null when deselecting the only selected row', () => {
      const opts = makeOptions()
      const { handleRowClick, selectedParcelIds } = useParcelMultiSelect(opts)

      // Select row 2
      handleRowClick(clickEvent(), { item: { id: 2 } })
      // Deselect row 2 via Ctrl-click
      handleRowClick(clickEvent({ ctrlKey: true }), { item: { id: 2 } })

      expect(selectedParcelIds.value.size).toBe(0)
      expect(opts.selectedParcelId.value).toBeNull()
    })

    it('behaves the same with metaKey as with ctrlKey', () => {
      const opts = makeOptions()
      const { handleRowClick, selectedParcelIds } = useParcelMultiSelect(opts)

      handleRowClick(clickEvent(), { item: { id: 1 } })
      handleRowClick(clickEvent({ metaKey: true }), { item: { id: 2 } })
      // Deselect row 2
      handleRowClick(clickEvent({ metaKey: true }), { item: { id: 2 } })

      expect(selectedParcelIds.value.has(2)).toBe(false)
      expect(selectedParcelIds.value.has(1)).toBe(true)
      expect(opts.selectedParcelId.value).toBe(1)
    })

    it('selectedParcelId points to added row when Ctrl-clicking an unselected row', () => {
      const opts = makeOptions()
      const { handleRowClick } = useParcelMultiSelect(opts)

      handleRowClick(clickEvent(), { item: { id: 1 } })
      handleRowClick(clickEvent({ ctrlKey: true }), { item: { id: 5 } })

      expect(opts.selectedParcelId.value).toBe(5)
    })
  })

  describe('handleRowClick – Shift-click (range selection)', () => {
    it('selects a range from lastClickedId to clicked row', () => {
      const opts = makeOptions()
      const { handleRowClick, selectedParcelIds } = useParcelMultiSelect(opts)

      handleRowClick(clickEvent(), { item: { id: 2 } })
      handleRowClick(clickEvent({ shiftKey: true }), { item: { id: 4 } })

      expect([...selectedParcelIds.value].sort()).toEqual([2, 3, 4])
      expect(opts.selectedParcelId.value).toBe(4)
    })

    it('selects a reversed range when clicking above the anchor row', () => {
      const opts = makeOptions()
      const { handleRowClick, selectedParcelIds } = useParcelMultiSelect(opts)

      handleRowClick(clickEvent(), { item: { id: 4 } })
      handleRowClick(clickEvent({ shiftKey: true }), { item: { id: 2 } })

      expect([...selectedParcelIds.value].sort()).toEqual([2, 3, 4])
      expect(opts.selectedParcelId.value).toBe(2)
    })

    it('extends existing selection with Ctrl+Shift-click', () => {
      const opts = makeOptions()
      const { handleRowClick, selectedParcelIds } = useParcelMultiSelect(opts)

      handleRowClick(clickEvent(), { item: { id: 1 } })
      handleRowClick(clickEvent({ ctrlKey: true }), { item: { id: 3 } })
      handleRowClick(clickEvent({ shiftKey: true, ctrlKey: true }), { item: { id: 5 } })

      // Should have original selection (1) plus range from 3 to 5
      expect(selectedParcelIds.value.has(1)).toBe(true)
      expect(selectedParcelIds.value.has(3)).toBe(true)
      expect(selectedParcelIds.value.has(4)).toBe(true)
      expect(selectedParcelIds.value.has(5)).toBe(true)
    })

    it('falls back to single selection when anchor is not in item list', () => {
      const opts = makeOptions()
      const { handleRowClick, selectedParcelIds } = useParcelMultiSelect(opts)

      // Simulate shift-click with no prior selection (lastClickedId = null)
      handleRowClick(clickEvent({ shiftKey: true }), { item: { id: 3 } })

      expect([...selectedParcelIds.value]).toEqual([3])
      expect(opts.selectedParcelId.value).toBe(3)
    })
  })

  describe('handleRowContextMenu', () => {
    it('selects the right-clicked row when it is not already selected', () => {
      const opts = makeOptions()
      const { handleRowContextMenu, selectedParcelIds } = useParcelMultiSelect(opts)

      const event = { preventDefault: vi.fn() }
      handleRowContextMenu(event, { item: { id: 2 } })

      expect([...selectedParcelIds.value]).toEqual([2])
      expect(opts.selectedParcelId.value).toBe(2)
    })

    it('does not change selection when the right-clicked row is already selected', () => {
      const opts = makeOptions()
      const { handleRowClick, handleRowContextMenu, selectedParcelIds } = useParcelMultiSelect(opts)

      handleRowClick(clickEvent(), { item: { id: 1 } })
      handleRowClick(clickEvent({ ctrlKey: true }), { item: { id: 3 } })

      const event = { preventDefault: vi.fn() }
      handleRowContextMenu(event, { item: { id: 3 } })

      expect(selectedParcelIds.value.has(1)).toBe(true)
      expect(selectedParcelIds.value.has(3)).toBe(true)
    })
  })

  describe('updateSelectedParcelIds', () => {
    it('removes ids no longer present in items', () => {
      const opts = makeOptions()
      const { handleRowClick, updateSelectedParcelIds, selectedParcelIds } = useParcelMultiSelect(opts)

      handleRowClick(clickEvent(), { item: { id: 3 } })
      handleRowClick(clickEvent({ ctrlKey: true }), { item: { id: 5 } })

      // Remove id 5 from items
      opts.items.value = makeItems([1, 2, 3, 4])
      updateSelectedParcelIds()

      expect(selectedParcelIds.value.has(5)).toBe(false)
      expect(selectedParcelIds.value.has(3)).toBe(true)
    })

    it('clears selectedParcelId when it is no longer in items', () => {
      const opts = makeOptions()
      const { handleRowClick, updateSelectedParcelIds } = useParcelMultiSelect(opts)

      handleRowClick(clickEvent(), { item: { id: 5 } })
      opts.items.value = makeItems([1, 2, 3])
      updateSelectedParcelIds()

      expect(opts.selectedParcelId.value).toBeNull()
    })
  })

  describe('page change watcher', () => {
    it('clears all selection state when page changes', async () => {
      const opts = makeOptions()
      const { handleRowClick, selectedParcelIds } = useParcelMultiSelect(opts)

      handleRowClick(clickEvent(), { item: { id: 2 } })
      expect(selectedParcelIds.value.size).toBe(1)

      opts.page.value = 2
      // Allow watcher to flush
      await Promise.resolve()

      expect(selectedParcelIds.value.size).toBe(0)
      expect(opts.selectedParcelId.value).toBeNull()
    })
  })

  describe('getRowProps', () => {
    it('adds selected-parcel-row class to selected rows', () => {
      const opts = makeOptions()
      const { handleRowClick, getRowProps } = useParcelMultiSelect(opts)

      handleRowClick(clickEvent(), { item: { id: 2 } })

      expect(getRowProps({ item: { id: 2 } }).class).toContain('selected-parcel-row')
      expect(getRowProps({ item: { id: 1 } }).class).not.toContain('selected-parcel-row')
    })
  })

  describe('selectedItems computed', () => {
    it('returns only the items whose ids are selected', () => {
      const opts = makeOptions()
      const { handleRowClick, selectedItems } = useParcelMultiSelect(opts)

      handleRowClick(clickEvent(), { item: { id: 1 } })
      handleRowClick(clickEvent({ ctrlKey: true }), { item: { id: 3 } })

      const ids = selectedItems.value.map(i => i.id).sort()
      expect(ids).toEqual([1, 3])
    })
  })
})
