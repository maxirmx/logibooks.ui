// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import { reportError } from '@/helpers/error.helpers.js'
import { useParcelMultiSelect } from '@/composables/useParcelMultiSelect.js'
vi.mock('@/helpers/error.helpers.js', () => ({ reportError: vi.fn() }))

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
  it('uses displayed order and skips ineligible monitor rows for range selection', () => {
    const opts = makeOptions({ items: ref([{ parcelId: 5 }, { parcelId: 2, excluded: true }, { parcelId: 7 }, { parcelId: 1 }]) })
    const select = useParcelMultiSelect({ ...opts, getItemId: item => item.parcelId, isItemSelectable: item => !item.excluded })
    select.handleRowClick(clickEvent(), { item: opts.items.value[0] })
    select.handleRowClick(clickEvent({ shiftKey: true }), { item: opts.items.value[3] })
    expect([...select.selectedParcelIds.value]).toEqual([5, 7, 1])
    expect(select.getRowProps({ item: { parcelId: 7 } }).class).toContain('selected-parcel-row')
    select.removeSelected([5, 1])
    expect([...select.selectedParcelIds.value]).toEqual([7])
    expect(opts.selectedParcelId.value).toBe(7)
    select.clearSelection()
    expect(select.selectedItems.value).toEqual([])
    select.selectAllCurrentPage()
    expect([...select.selectedParcelIds.value]).toEqual([5, 7, 1])
    select.removeSelected([5, 7, 1])
    expect(opts.selectedParcelId.value).toBeNull()
    select.stop()
  })

  it('adds ranges with Ctrl/Meta+Shift and falls back when the anchor disappears', () => {
    const opts = makeOptions()
    const select = useParcelMultiSelect(opts)
    select.handleRowClick(clickEvent(), { item: { id: 1 } })
    select.handleRowClick(clickEvent({ ctrlKey: true }), { item: { id: 3 } })
    select.handleRowClick(clickEvent({ metaKey: true, shiftKey: true }), { item: { id: 5 } })
    expect([...select.selectedParcelIds.value]).toEqual([1, 3, 4, 5])
    select.lastClickedId.value = 99
    select.handleRowClick(clickEvent({ shiftKey: true }), { item: { id: 2 } })
    expect([...select.selectedParcelIds.value]).toEqual([2])
    select.handleRowClick(clickEvent({ metaKey: true }), { item: { id: 4 } })
    select.handleRowClick(clickEvent({ metaKey: true }), { item: { id: 4 } })
    expect(opts.selectedParcelId.value).toBe(2)
    select.stop()
  })

  it('ignores interactive controls, invalid rows and selection while loading or busy', () => {
    const opts = makeOptions()
    const busy = ref(false)
    const select = useParcelMultiSelect({ ...opts, disabled: busy, isItemSelectable: item => item.id !== 3 })
    select.handleRowClick(clickEvent({ target: { closest: () => ({}) } }), { item: { id: 1 } })
    select.handleRowClick(clickEvent(), { item: { id: 3 } })
    select.handleRowClick(clickEvent(), { item: {} })
    busy.value = true
    select.handleRowClick(clickEvent(), { item: { id: 1 } })
    select.selectAllCurrentPage()
    const event = { preventDefault: vi.fn() }
    select.handleRowContextMenu(event, { item: { id: 2 } })
    expect(event.preventDefault).not.toHaveBeenCalled()
    expect(select.selectedItems.value).toEqual([])
    busy.value = false
    opts.loading.value = true
    select.handleRowClick(clickEvent(), { item: { id: 2 } })
    expect(select.selectedItems.value).toEqual([])
    select.stop()
  })

  it('clears selection and anchors when page or scope changes, preserving valid refreshed IDs', async () => {
    const opts = makeOptions()
    const scopeKey = ref('box-1')
    const select = useParcelMultiSelect({ ...opts, scopeKey })
    select.handleRowClick(clickEvent(), { item: { id: 5 } })
    opts.loading.value = true
    opts.items.value = makeItems([1, 2])
    await nextTick()
    expect(select.selectedParcelIds.value.has(5)).toBe(true)
    opts.loading.value = false
    await nextTick()
    expect(opts.selectedParcelId.value).toBeNull()
    expect(select.lastClickedId.value).toBeNull()
    select.selectAllCurrentPage()
    opts.items.value = makeItems([1, 2])
    await nextTick()
    expect([...select.selectedParcelIds.value]).toEqual([1, 2])
    scopeKey.value = 'box-2'
    await nextTick()
    expect(select.selectedItems.value).toEqual([])
    select.selectAllCurrentPage()
    opts.page.value = 2
    await nextTick()
    expect(select.selectedItems.value).toEqual([])
    select.stop()
  })

  it('reports unexpected scroll failures and tolerates missing rows or scroll support', async () => {
    const opts = makeOptions()
    const row = { scrollIntoView: vi.fn() }
    opts.dataTableRef.value = { $el: { querySelectorAll: vi.fn(() => [row]) } }
    const select = useParcelMultiSelect(opts)
    select.selectAllCurrentPage()
    select.scrollToSelectedItem()
    await nextTick()
    expect(row.scrollIntoView).toHaveBeenCalled()
    opts.dataTableRef.value.$el.querySelectorAll.mockReturnValue([])
    select.scrollToSelectedItem()
    await nextTick()
    opts.dataTableRef.value.$el.querySelectorAll.mockImplementation(() => { throw new Error('DOM failure') })
    select.scrollToSelectedItem()
    await nextTick()
    expect(reportError).toHaveBeenCalledWith(expect.any(Error), { context: 'parcel selection scroll' })
    select.stop()
  })
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
    it('selects an unselected context-menu row and updates the range anchor', () => {
      const opts = makeOptions()
      const onContextMenu = vi.fn()
      const select = useParcelMultiSelect({ ...opts, onContextMenu })
      select.handleRowContextMenu({ preventDefault: vi.fn() }, { item: { id: 4 } })
      expect([...select.selectedParcelIds.value]).toEqual([4])
      expect(opts.selectedParcelId.value).toBe(4)
      expect(select.lastClickedId.value).toBe(4)
      expect(onContextMenu).toHaveBeenCalledOnce()
      select.stop()
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
