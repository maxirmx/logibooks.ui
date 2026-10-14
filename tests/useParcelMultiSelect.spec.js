// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'
import { useParcelMultiSelect } from '@/composables/useParcelMultiSelect.js'

function makeItems(ids) {
  return ids.map((id) => ({ id }))
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
    ...overrides
  }
}

function clickEvent(modifiers = {}) {
  return {
    shiftKey: false,
    ctrlKey: false,
    metaKey: false,
    ...modifiers
  }
}

describe('useParcelMultiSelect', () => {
  describe('handleRowClick – Ctrl/Meta-click (toggle)', () => {
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

  })

  describe('handleRowContextMenu', () => {
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
      const { handleRowClick, updateSelectedParcelIds, selectedParcelIds } =
        useParcelMultiSelect(opts)

      handleRowClick(clickEvent(), { item: { id: 3 } })
      handleRowClick(clickEvent({ ctrlKey: true }), { item: { id: 5 } })

      // Remove id 5 from items
      opts.items.value = makeItems([1, 2, 3, 4])
      updateSelectedParcelIds()

      expect(selectedParcelIds.value.has(5)).toBe(false)
      expect(selectedParcelIds.value.has(3)).toBe(true)
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

    it('preserves issue row class when an issue row is selected', () => {
      const opts = makeOptions({
        getBaseRowClass: () => 'parcel-has-issues'
      })
      const { handleRowClick, getRowProps } = useParcelMultiSelect(opts)

      handleRowClick(clickEvent(), { item: { id: 2 } })

      const rowClass = getRowProps({ item: { id: 2 } }).class
      expect(rowClass).toContain('parcel-has-issues')
      expect(rowClass).toContain('selected-parcel-row')
    })
  })

  describe('selectedItems computed', () => {
    it('returns only the items whose ids are selected', () => {
      const opts = makeOptions()
      const { handleRowClick, selectedItems } = useParcelMultiSelect(opts)

      handleRowClick(clickEvent(), { item: { id: 1 } })
      handleRowClick(clickEvent({ ctrlKey: true }), { item: { id: 3 } })

      const ids = selectedItems.value.map((i) => i.id).sort()
      expect(ids).toEqual([1, 3])
    })
  })
})
