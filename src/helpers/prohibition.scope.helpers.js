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
  { title: 'Экспорт', value: PROHIBITION_SCOPE.Export },
  { title: 'Импорт', value: PROHIBITION_SCOPE.Import }
]

export function getProcedureTitle(customsProcedureCode) {
  if (Number(customsProcedureCode) === 10) return 'Экспорт'
  if (Number(customsProcedureCode) === 40) return 'Импорт'
  return String(customsProcedureCode ?? '')
}

export function getProhibitionScopeRows(item, getCountryName = (code) => String(code ?? '')) {
  return (item?.scopes || [])
    .map((scope) => {
      const country = String(getCountryName(scope.countryIsoNumeric) ?? scope.countryIsoNumeric ?? '')
      return {
        key: `${scope.countryIsoNumeric}:${scope.customsProcedureCode}`,
        countryIsoNumeric: scope.countryIsoNumeric,
        country,
        customsProcedureCode: Number(scope.customsProcedureCode),
        procedure: getProcedureTitle(scope.customsProcedureCode),
        label: `${country} — ${getProcedureTitle(scope.customsProcedureCode)}`,
        reason: scope.explanation || ''
      }
    })
    .sort(
      (left, right) =>
        left.country.localeCompare(right.country, 'ru') ||
        left.customsProcedureCode - right.customsProcedureCode
    )
}

export function getProhibitionScopeLabels(item, getCountryName) {
  return getProhibitionScopeRows(item, getCountryName).map((row) => row.label)
}

export function getProhibitionScopeSortOrder(item) {
  return (item?.scopes || [])
    .map((scope) => `${String(scope.countryIsoNumeric).padStart(3, '0')}:${scope.customsProcedureCode}`)
    .sort()
    .join('|')
}

export function getProhibitionReasonLines(item) {
  return getProhibitionScopeRows(item)
    .map(row => row.reason)
    .filter(Boolean)
}

export function matchesProhibitionScope(item, procedureFilter, countryFilter) {
  return (item?.scopes || []).some((scope) => {
    const procedureMatches =
      procedureFilter === PROHIBITION_SCOPE.All ||
      (procedureFilter === PROHIBITION_SCOPE.Export && Number(scope.customsProcedureCode) === 10) ||
      (procedureFilter === PROHIBITION_SCOPE.Import && Number(scope.customsProcedureCode) === 40)
    const countryMatches =
      countryFilter == null ||
      countryFilter === PROHIBITION_SCOPE.All ||
      Number(scope.countryIsoNumeric) === Number(countryFilter)
    return procedureMatches && countryMatches
  })
}

export function getRestrictionRouteScopeKeys(register) {
  const otherCountry = Number(register?.theOtherCountryCode)
  const procedure = Number(register?.customsProcedureCode)
  if (!otherCountry) return []

  if (procedure === 10 || procedure === 31) {
    return [`643:10`, `${otherCountry}:40`]
  }
  if (procedure === 40 || procedure === 60) {
    return [`${otherCountry}:10`, `643:40`]
  }
  return []
}

export function getApplicableScopeExplanations(item, register) {
  const routeKeys = new Set(getRestrictionRouteScopeKeys(register))
  return [...new Set(
    (item?.scopes || [])
      .filter((scope) =>
        routeKeys.has(`${Number(scope.countryIsoNumeric)}:${Number(scope.customsProcedureCode)}`)
      )
      .map((scope) => scope.explanation?.trim())
      .filter(Boolean)
  )]
}
