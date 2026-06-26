// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { formatIntegerThousands } from '@/helpers/number.formatters.js'

export const CUSTOMS_PROCEDURE_RETURN = 1
export const RETURN_REGISTER_MATCHING_COUNT_HEADER = 'К возврату'

export const warehouseZoneDistribution = [
  { value: 1, label: 'Без зоны' },
  { value: 10, label: 'Зеленая' },
  { value: 20, label: 'Красная' }
]

export function isReturnRegister(item) {
  return Number(item?.customsProcedureCode) === CUSTOMS_PROCEDURE_RETURN
}

export function createWarehouseRegisterHeaders({
  showActions = true,
  selectable = false,
  showMatchingCount = false
} = {}) {
  return [
    ...(selectable
      ? [{ title: '', key: 'selection', sortable: false, align: 'center', width: '48px' }]
      : []),
    ...(showActions
      ? [{ title: '', key: 'actions', sortable: false, align: 'center' }]
      : []),
    { title: 'Номер сделки', key: 'dealNumber', sortable: true },
    { title: 'ТСД', key: 'invoice', sortable: true },
    { title: 'Страны', key: 'countries', sortable: true },
    { title: 'Отправитель/Получатель', key: 'senderRecipient', sortable: true },
    { title: 'Товаров/Посылок', key: 'parcelsTotal', sortable: true, align: 'end', minWidth: '150px', width: '150px' },
    ...(showMatchingCount
      ? [{ title: RETURN_REGISTER_MATCHING_COUNT_HEADER, key: 'matchingParcelsCount', sortable: false, align: 'end', minWidth: '120px', width: '120px' }]
      : []),
    { title: 'Зоны', key: 'parcelsByZone', sortable: false, align: 'end', minWidth: '135px', width: '135px' },
    { title: 'Статус', key: 'statusId', sortable: true },
    { title: 'Склад', key: 'warehouseId', sortable: true },
    { title: 'Дата прибытия', key: 'warehouseArrivalDate', sortable: true }
  ]
}

export function getCountryShortName(countries, countryCode) {
  if (!countryCode || !Array.isArray(countries)) return 'Неизвестно'

  const num = Number(countryCode)
  if (num == 643) return 'Россия'

  const country = countries.find(c => c.isoNumeric === num)
  if (!country) return countryCode

  return country.nameRuShort || country.nameRuOfficial || countryCode
}

export function createTransportationTypesById(ops) {
  if (!Array.isArray(ops?.transportationTypes)) return new Map()
  return new Map(ops.transportationTypes.map(type => [Number(type.value), type]))
}

export function createAirportsById(airports) {
  if (!Array.isArray(airports)) return new Map()
  return new Map(airports.map(airport => [airport.id, airport]))
}

export function isAviaTransportation(item, transportationTypesById) {
  const typeId = Number(item?.transportationTypeCode)
  if (typeId == null || isNaN(typeId)) return false

  const type = transportationTypesById.get(typeId)
  return type?.isAvia || false
}

export function getAirportIata(airportId, airportsById) {
  const id = Number(airportId)
  if (!id) return null

  const airport = airportsById.get(id)
  return airport?.codeIata || null
}

export function getCountryDisplayName(
  item,
  countryCode,
  airportId,
  countries,
  transportationTypesById,
  airportsById
) {
  const countryName = getCountryShortName(countries, countryCode)
  if (!isAviaTransportation(item, transportationTypesById)) {
    return countryName
  }

  const airportCode = getAirportIata(airportId, airportsById)
  if (!airportCode) {
    return countryName
  }

  return `${countryName} (${airportCode})`
}

export function getZoneCount(item, zoneValue) {
  const count = Number(item?.parcelsByZone?.[zoneValue] ?? 0)
  return Number.isFinite(count) && count > 0 ? count : 0
}

export function formatZoneCount(item, zoneValue) {
  const count = getZoneCount(item, zoneValue)
  return count > 0 ? formatIntegerThousands(count) : '-'
}
