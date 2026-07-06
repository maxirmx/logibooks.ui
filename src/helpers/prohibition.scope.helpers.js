// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

export const PROHIBITION_SCOPE = Object.freeze({
  All: 'all',
  Export: 'export',
  Import: 'import'
})

export const prohibitionScopeFilterItems = [
  { title: 'Любая', value: PROHIBITION_SCOPE.All },
  { title: 'Экспорт из РФ', value: PROHIBITION_SCOPE.Export },
  { title: 'Импорт в РФ', value: PROHIBITION_SCOPE.Import }
]

export function getProhibitionScopeLabels(item) {
  const labels = []
  if (item?.forExport) labels.push('Экспорт из РФ')
  if (item?.forImport) labels.push('Импорт в РФ')
  return labels
}

export function getProhibitionScopeSortOrder(item) {
  if (!item?.forImport && !item?.forExport) return 0
  if (!item?.forImport && item?.forExport) return 1
  if (item?.forImport && item?.forExport) return 2
  return 3
}

export function getProhibitionScopeRows(item) {
  const rows = []
  if (item?.forExport) {
    rows.push({
      key: PROHIBITION_SCOPE.Export,
      label: 'Экспорт из РФ',
      reason: item.explanationForExport || ''
    })
  }
  if (item?.forImport) {
    rows.push({
      key: PROHIBITION_SCOPE.Import,
      label: 'Импорт в РФ',
      reason: item.explanationForImport || ''
    })
  }
  return rows
}

export function getProhibitionReasonLines(item) {
  return getProhibitionScopeRows(item)
    .map(row => row.reason)
    .filter(Boolean)
}
