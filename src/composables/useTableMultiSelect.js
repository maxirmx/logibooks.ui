// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { ref, computed, watch, nextTick, toValue } from 'vue'
import { reportError } from '@/helpers/error.helpers.js'

/**
 * Composable for multi-select behaviour on data tables.
 *
 * @param {Object} options
 * @param {import('vue').Ref<Array>}  options.items          - reactive list of visible items (each must have `.id`)
 * @param {import('vue').Ref<boolean>} options.loading       - whether the table is loading
 * @param {import('vue').Ref<number|null>} options.selectedId - single-selected parcel id (auth store ref)
 * @param {import('vue').Ref<number>} options.page           - current page ref (used to clear selection on page change)
 * @param {import('vue').Ref}         options.dataTableRef   - template ref to the v-data-table-server
 * @param {Function}                  [options.getBaseRowClass] - optional fn(data) => string for base row CSS class
 */
export function useTableMultiSelect({
  items,
  loading,
  selectedId,
  page,
  dataTableRef,
  getBaseRowClass = () => '',
  onContextMenu = null,
  getItemId = item => item.id,
  isItemSelectable = () => true,
  disabled = false,
  scopeKey = null,
}) {
  const selectableItems = computed(() => items.value.filter(item => getItemId(item) != null && isItemSelectable(item)))
  const isDisabled = () => loading.value || toValue(disabled)
  const selectedIds = ref(new Set(
    selectedId.value != null ? [selectedId.value] : []
  ))
  const lastClickedId = ref(selectedId.value)

  // ------- selection helpers -------

  function updateSelectedIds() {
    if (isDisabled()) return
    const currentIds = new Set(selectableItems.value.map(getItemId))
    selectedIds.value = new Set([...selectedIds.value].filter(id => currentIds.has(id)))

    if (selectedId.value && !currentIds.has(selectedId.value)) {
      selectedId.value = null
    }

    if (lastClickedId.value != null && !currentIds.has(lastClickedId.value)) {
      lastClickedId.value = null
    }
  }

  function handleRowClick(event, { item }) {
    if (isDisabled() || !isItemSelectable(item) ||
        event.target?.closest?.('button, a, input, select, textarea, [role="button"], [role="menuitem"]')) return
    const id = getItemId(item)
    if (id == null) return

    if (event.shiftKey && lastClickedId.value != null) {
      window.getSelection()?.removeAllRanges()
      const ids = selectableItems.value.map(getItemId)
      const startIdx = ids.indexOf(lastClickedId.value)
      const endIdx = ids.indexOf(id)
      if (startIdx !== -1 && endIdx !== -1) {
        const [from, to] = [Math.min(startIdx, endIdx), Math.max(startIdx, endIdx)]
        const newSet = (event.ctrlKey || event.metaKey)
          ? new Set(selectedIds.value)
          : new Set()
        for (let i = from; i <= to; i++) {
          newSet.add(ids[i])
        }
        selectedIds.value = newSet
      } else {
        selectedIds.value = new Set([id])
      }
    } else if (event.ctrlKey || event.metaKey) {
      const newSet = new Set(selectedIds.value)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      selectedIds.value = newSet
    } else {
      selectedIds.value = new Set([id])
    }

    lastClickedId.value = id
    if (selectedIds.value.has(id)) {
      selectedId.value = id
    } else {
      selectedId.value = selectedIds.value.size > 0
        ? [...selectedIds.value].at(-1)
        : null
    }
  }

  // ------- scroll -------

  function scrollToSelectedItem() {
    if (selectedIds.value.size === 0 || !dataTableRef.value) return

    nextTick(() => {
      try {
        const tableElement = dataTableRef.value.$el || dataTableRef.value
        const selectedRows = tableElement.querySelectorAll('.selected-parcel-row')
        const lastRow = selectedRows[selectedRows.length - 1]
        if (lastRow) {
          lastRow.scrollIntoView?.({ behavior: 'smooth', block: 'center', inline: 'nearest' })
        }
      } catch (error) {
        reportError(error, { context: 'parcel selection scroll' })
      }
    })
  }

  // ------- row props -------

  function getRowProps(data) {
    const baseClass = getBaseRowClass(data)
    const selectedClass = selectedIds.value.has(getItemId(data.item)) ? 'selected-parcel-row' : ''
    return { class: `${baseClass} ${selectedClass}`.trim() }
  }

  // ------- computed helpers -------

  const selectedItems = computed(() =>
    selectableItems.value.filter(item => selectedIds.value.has(getItemId(item)))
  )

  // ------- right-click handler -------

  function handleRowContextMenu(event, { item }) {
    if (isDisabled() || !isItemSelectable(item) || getItemId(item) == null) return
    event.preventDefault()

    if (!selectedIds.value.has(getItemId(item))) {
      selectedIds.value = new Set([getItemId(item)])
      selectedId.value = getItemId(item)
      lastClickedId.value = getItemId(item)
    }

    onContextMenu?.()
  }

  // ------- watchers -------

  const stopItemsWatch = watch(
    () => items.value,
    () => {
      updateSelectedIds()
      if (selectedIds.value.size > 0) {
        scrollToSelectedItem()
      }
    }
  )

  function clearSelection() {
    selectedIds.value = new Set()
    selectedId.value = null
    lastClickedId.value = null
  }

  function selectAllCurrentPage() {
    if (isDisabled()) return
    selectedIds.value = new Set(selectableItems.value.map(getItemId))
    selectedId.value = [...selectedIds.value].at(-1) ?? null
    lastClickedId.value = selectedId.value
  }

  function removeSelected(ids) {
    const removed = new Set(ids)
    selectedIds.value = new Set([...selectedIds.value].filter(id => !removed.has(id)))
    if (removed.has(selectedId.value)) selectedId.value = [...selectedIds.value].at(-1) ?? null
    if (removed.has(lastClickedId.value)) lastClickedId.value = selectedId.value
  }

  const stopPageWatch = watch([page, () => toValue(scopeKey)], clearSelection)
  const stopLoadingWatch = watch(() => isDisabled(), busy => {
    if (!busy) updateSelectedIds()
  })

  function stop() {
    stopItemsWatch()
    stopPageWatch()
    stopLoadingWatch()
  }

  return {
    selectedIds,
    lastClickedId,
    selectedItems,
    handleRowClick,
    handleRowContextMenu,
    updateSelectedIds,
    scrollToSelectedItem,
    getRowProps,
    stop,
    clearSelection,
    selectAllCurrentPage,
    removeSelected,
  }
}
