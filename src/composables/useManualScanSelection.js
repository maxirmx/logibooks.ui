import { computed, inject, onUnmounted, ref, toValue, watch } from 'vue'
import { useTableMultiSelect } from './useTableMultiSelect.js'
import { MANUAL_SCAN_KEY } from '@/helpers/manual.scan.key.js'

export function useManualScanSelection({ loading, page, scopeKey, dataTableRef, scan: providedScan = null }) {
  const injectedScan = inject(MANUAL_SCAN_KEY, null)
  const scan = providedScan ?? injectedScan
  const displayedItems = ref([])
  const selection = useTableMultiSelect({
    items: displayedItems, loading, page, scopeKey, dataTableRef, selectedId: ref(null),
    disabled: () => scan?.locked.value,
    getItemId: item => scan?.target.value.getId(item),
    isItemSelectable: item => scan?.target.value.getId(item) != null,
    onContextMenu: () => scan?.run(selection.selectedItems.value, null, true)
  })
  if (scan) watch(scan.completedIds, ids => selection.removeSelected(ids))
  watch(() => toValue(scopeKey), () => {
    selection.clearSelection()
    if (!scan?.locked.value) scan?.invalidateBatch()
  })
  onUnmounted(selection.stop)
  return {
    selection,
    locked: computed(() => scan?.locked.value ?? false),
    updateDisplayedItems: items => { displayedItems.value = items.map(item => item.raw ?? item) }
  }
}
