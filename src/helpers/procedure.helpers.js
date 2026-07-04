// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

export const CUSTOMS_PROCEDURE = Object.freeze({
  Return: 1,
  Export: 10,
  Reexport: 31,
  Import: 40,
  Reimport: 60
})

export const CUSTOMS_PROCEDURE_RETURN = CUSTOMS_PROCEDURE.Return
export const CUSTOMS_PROCEDURE_EXPORT = CUSTOMS_PROCEDURE.Export
export const CUSTOMS_PROCEDURE_REEXPORT = CUSTOMS_PROCEDURE.Reexport
export const CUSTOMS_PROCEDURE_IMPORT = CUSTOMS_PROCEDURE.Import
export const CUSTOMS_PROCEDURE_REIMPORT = CUSTOMS_PROCEDURE.Reimport

export const procedureFilterItems = [
  { title: 'Любая', value: 'all' },
  { title: 'Экспорт из РФ', value: 'export' },
  { title: 'Импорт в РФ', value: 'import' }
]

export function normalizeCustomsProcedureCode(value) {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed === '') return null
    const code = Number(trimmed)
    return Number.isFinite(code) ? code : null
  }
  const code = Number(value)
  return Number.isFinite(code) ? code : null
}

export function isReturnCustomsProcedure(value) {
  return normalizeCustomsProcedureCode(value) === CUSTOMS_PROCEDURE_RETURN
}

export function isReexportCustomsProcedure(value) {
  return normalizeCustomsProcedureCode(value) === CUSTOMS_PROCEDURE_REEXPORT
}

export function isImportCustomsProcedure(value) {
  return normalizeCustomsProcedureCode(value) === CUSTOMS_PROCEDURE_IMPORT
}

export function isReimportCustomsProcedure(value) {
  return normalizeCustomsProcedureCode(value) === CUSTOMS_PROCEDURE_REIMPORT
}

export function isImportOrReexportCustomsProcedure(value) {
  const code = normalizeCustomsProcedureCode(value)
  return code === CUSTOMS_PROCEDURE_IMPORT || code === CUSTOMS_PROCEDURE_REEXPORT
}

export function isCustomsChargesCalculationProcedure(value) {
  const code = normalizeCustomsProcedureCode(value)
  return code === CUSTOMS_PROCEDURE_IMPORT || code === CUSTOMS_PROCEDURE_REIMPORT
}

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
