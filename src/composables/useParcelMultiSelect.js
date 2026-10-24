import { useTableMultiSelect } from './useTableMultiSelect.js'

export function useParcelMultiSelect({ selectedParcelId, ...options }) {
  const selection = useTableMultiSelect({ ...options, selectedId: selectedParcelId })
  return { ...selection, selectedParcelIds: selection.selectedIds, updateSelectedParcelIds: selection.updateSelectedIds }
}
