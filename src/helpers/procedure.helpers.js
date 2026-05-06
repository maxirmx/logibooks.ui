// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

export const procedureFilterItems = [
  { title: 'Любая', value: 'all' },
  { title: 'Экспорт из РФ', value: 'export' },
  { title: 'Импорт в РФ', value: 'import' }
]

export function getProcedureLabels(item) {
  const labels = []
  if (item?.forExport) labels.push('Экспорт из РФ')
  if (item?.forImport) labels.push('Импорт в РФ')
  return labels
}

export function getProcedureSortOrder(item) {
  if (!item?.forImport && !item?.forExport) return 0
  if (!item?.forImport && item?.forExport) return 1
  if (item?.forImport && item?.forExport) return 2
  return 3
}

export function getProcedureRows(item) {
  const rows = []
  if (item?.forExport) {
    rows.push({
      key: 'export',
      label: 'Экспорт из РФ',
      reason: item.explanationForExport || ''
    })
  }
  if (item?.forImport) {
    rows.push({
      key: 'import',
      label: 'Импорт в РФ',
      reason: item.explanationForImport || ''
    })
  }
  return rows
}

export function getProhibitionReasonLines(item) {
  return getProcedureRows(item)
    .map(row => row.reason)
    .filter(Boolean)
}
