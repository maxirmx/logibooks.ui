// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { ref, computed, watch, nextTick } from 'vue'

/**
 * Composable for multi-select behaviour on parcel data tables.
 *
 * @param {Object} options
 * @param {import('vue').Ref<Array>}  options.items          - reactive list of visible items (each must have `.id`)
 * @param {import('vue').Ref<boolean>} options.loading       - whether the table is loading
 * @param {import('vue').Ref<number|null>} options.selectedParcelId - single-selected parcel id (auth store ref)
 * @param {import('vue').Ref<number>} options.page           - current page ref (used to clear selection on page change)
 * @param {import('vue').Ref}         options.dataTableRef   - template ref to the v-data-table-server
 * @param {Function}                  [options.getBaseRowClass] - optional fn(data) => string for base row CSS class
 */
export function useParcelMultiSelect({
  items,
  loading,
  selectedParcelId,
  page,
  dataTableRef,
  getBaseRowClass = () => '',
  onContextMenu = null,
}) {
  const selectedParcelIds = ref(new Set(
    selectedParcelId.value != null ? [selectedParcelId.value] : []
  ))
  const lastClickedId = ref(selectedParcelId.value)

  // ------- selection helpers -------

  function updateSelectedParcelIds() {
    if (loading.value) return
    const currentIds = new Set(items.value.map(i => i.id))
    selectedParcelIds.value = new Set([...selectedParcelIds.value].filter(id => currentIds.has(id)))

    if (selectedParcelId.value && !currentIds.has(selectedParcelId.value)) {
      selectedParcelId.value = null
    }
  }

  function handleRowClick(event, { item }) {
    const id = item.id

    if (event.shiftKey && lastClickedId.value != null) {
      window.getSelection()?.removeAllRanges()
      const ids = items.value.map(i => i.id)
      const startIdx = ids.indexOf(lastClickedId.value)
      const endIdx = ids.indexOf(id)
      if (startIdx !== -1 && endIdx !== -1) {
        const [from, to] = [Math.min(startIdx, endIdx), Math.max(startIdx, endIdx)]
        const newSet = (event.ctrlKey || event.metaKey)
          ? new Set(selectedParcelIds.value)
          : new Set()
        for (let i = from; i <= to; i++) {
          newSet.add(ids[i])
        }
        selectedParcelIds.value = newSet
      }
    } else if (event.ctrlKey || event.metaKey) {
      const newSet = new Set(selectedParcelIds.value)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      selectedParcelIds.value = newSet
    } else {
      selectedParcelIds.value = new Set([id])
    }

    lastClickedId.value = id
    selectedParcelId.value = id
  }

  // ------- scroll -------

  function scrollToSelectedItem() {
    if (selectedParcelIds.value.size === 0 || !dataTableRef.value) return

    nextTick(() => {
      try {
        const tableElement = dataTableRef.value.$el || dataTableRef.value
        const selectedRows = tableElement.querySelectorAll('.selected-parcel-row')
        const lastRow = selectedRows[selectedRows.length - 1]
        if (lastRow) {
          lastRow.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
        }
      } catch {
        // Swallow errors during scroll attempt
      }
    })
  }

  // ------- row props -------

  function getRowProps(data) {
    const baseClass = getBaseRowClass(data)
    const selectedClass = selectedParcelIds.value.has(data.item.id) ? 'selected-parcel-row' : ''
    return { class: `${baseClass} ${selectedClass}`.trim() }
  }

  // ------- computed helpers -------

  const selectedItems = computed(() =>
    items.value.filter(item => selectedParcelIds.value.has(item.id))
  )

  // ------- right-click handler -------

  function handleRowContextMenu(event, { item }) {
    event.preventDefault()

    if (!selectedParcelIds.value.has(item.id)) {
      selectedParcelIds.value = new Set([item.id])
      selectedParcelId.value = item.id
      lastClickedId.value = item.id
    }

    onContextMenu?.()
  }

  // ------- watchers -------

  const stopItemsWatch = watch(
    () => items.value,
    () => {
      updateSelectedParcelIds()
      if (selectedParcelIds.value.size > 0) {
        scrollToSelectedItem()
      }
    }
  )

  const stopPageWatch = watch(page, () => {
    selectedParcelIds.value = new Set()
    selectedParcelId.value = null
    lastClickedId.value = null
  })

  function stop() {
    stopItemsWatch()
    stopPageWatch()
  }

  return {
    selectedParcelIds,
    lastClickedId,
    selectedItems,
    handleRowClick,
    handleRowContextMenu,
    updateSelectedParcelIds,
    scrollToSelectedItem,
    getRowProps,
    stop,
  }
}
