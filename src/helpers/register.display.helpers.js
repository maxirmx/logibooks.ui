// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import {
  WBR_COMPANY_ID,
  WBR2_REGISTER_ID,
  WBRN_REGISTER_ID
} from '@/helpers/company.constants.js'

export function getCompanyDisplayName(companies, companyId, fallback = 'Неизвестно') {
  if (companyId === null || companyId === undefined || companyId === '') {
    return fallback
  }

  const id = Number(companyId)
  if (Number.isNaN(id)) {
    return fallback
  }

  const company = Array.isArray(companies)
    ? companies.find((item) => Number(item.id) === id)
    : null

  return company?.shortName || company?.name || fallback
}

export function getRegisterTypeDisplayName(
  companies,
  registerType,
  fallback = 'Неизвестно'
) {
  const id = Number(registerType)
  const wbrName = getCompanyDisplayName(companies, WBR_COMPANY_ID, fallback)

  if (id === WBR2_REGISTER_ID) return `${wbrName} формат 2`
  if (id === WBRN_REGISTER_ID) return `${wbrName}`

  return getCompanyDisplayName(companies, id, fallback)
}

export function formatAirportDisplayName(airport) {
  if (!airport) return ''

  const name = airport.name || '—'
  const code = airport.codeIata || ''
  return code ? `${name} (${code})` : name
}

export function getAirportDisplayName(airports, airportId, fallback = 'Неизвестно') {
  const id = Number(airportId)
  const airport = Array.isArray(airports)
    ? airports.find((item) => Number(item.id) === id)
    : null

  return formatAirportDisplayName(airport) || fallback
}
