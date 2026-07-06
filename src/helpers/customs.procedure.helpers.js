// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

export const CUSTOMS_PROCEDURE_ALL = 'all'

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

export const RETURN_REGISTER_CUSTOMS_PROCEDURE = Object.freeze({
  Return: CUSTOMS_PROCEDURE_RETURN,
  Reexport: CUSTOMS_PROCEDURE_REEXPORT,
  Reimport: CUSTOMS_PROCEDURE_REIMPORT
})

export const RETURN_REGISTER_CUSTOMS_PROCEDURE_ORDER = [
  RETURN_REGISTER_CUSTOMS_PROCEDURE.Return,
  RETURN_REGISTER_CUSTOMS_PROCEDURE.Reimport,
  RETURN_REGISTER_CUSTOMS_PROCEDURE.Reexport
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

export function getCustomsProcedureOptionTitle(procedure) {
  const charCode = typeof procedure?.charCode === 'string' ? procedure.charCode.trim() : ''
  const name = typeof procedure?.name === 'string' ? procedure.name.trim() : ''
  const title = [charCode, name].filter(Boolean).join(' ')
  if (title) return title

  const value = procedure?.value
  return value === null || value === undefined || value === '' ? '' : String(value)
}

export function buildCustomsProcedureOptions(customsProcedures, {
  includeAll = false,
  allTitle = 'Все',
  includeReturn = true,
  allowedValues = null,
  sortOrder = null,
  stringifyValue = false,
  titleKey = 'title'
} = {}) {
  const options = includeAll
    ? [{ [titleKey]: allTitle, value: CUSTOMS_PROCEDURE_ALL }]
    : []

  if (!Array.isArray(customsProcedures)) {
    return options
  }

  const allowed = Array.isArray(allowedValues)
    ? new Set(allowedValues.map(Number))
    : null
  const order = Array.isArray(sortOrder)
    ? new Map(sortOrder.map((value, index) => [Number(value), index]))
    : null

  const procedures = customsProcedures
    .map((procedure) => ({
      procedure,
      code: normalizeCustomsProcedureCode(procedure?.value)
    }))
    .filter(({ code }) => {
      if (code === null) return false
      if (!includeReturn && code === CUSTOMS_PROCEDURE_RETURN) return false
      if (allowed && !allowed.has(code)) return false
      return true
    })
    .sort((left, right) => {
      if (!order) return 0
      return (order.get(left.code) ?? Number.MAX_SAFE_INTEGER) -
        (order.get(right.code) ?? Number.MAX_SAFE_INTEGER)
    })

  return [
    ...options,
    ...procedures.map(({ procedure, code }) => ({
      [titleKey]: getCustomsProcedureOptionTitle(procedure),
      value: stringifyValue ? String(code) : code
    }))
  ]
}

export function buildRegisterProcedureFilterOptions(customsProcedures, { includeReturn = false } = {}) {
  return buildCustomsProcedureOptions(customsProcedures, {
    includeAll: true,
    includeReturn
  })
}

export function buildReturnRegisterProcedureOptions(customsProcedures) {
  return buildCustomsProcedureOptions(customsProcedures, {
    allowedValues: RETURN_REGISTER_CUSTOMS_PROCEDURE_ORDER,
    sortOrder: RETURN_REGISTER_CUSTOMS_PROCEDURE_ORDER,
    stringifyValue: true,
    titleKey: 'label'
  })
}
