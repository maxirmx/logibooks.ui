// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { formatDate, formatDateTime } from '@/helpers/date.formatters.js'
import {
  getAirportDisplayName,
  getCompanyDisplayName,
  getRegisterTypeDisplayName
} from '@/helpers/register.display.helpers.js'

function isEmpty(value) {
  return value === null || value === undefined || value === ''
}

function isEmptyReference(value) {
  return isEmpty(value) || Number(value) === 0
}

function resolveReference(value, resolver, fallback, { zeroIsEmpty = true } = {}) {
  if (isEmpty(value) || (zeroIsEmpty && Number(value) === 0)) return 'не указано'

  const displayValue = resolver?.(value)
  if (
    displayValue === null ||
    displayValue === undefined ||
    displayValue === '' ||
    String(displayValue) === String(value)
  ) {
    return fallback
  }

  return displayValue
}

export function formatRegisterHistoryValue(
  field,
  value,
  {
    companies = [],
    airports = [],
    getCountryName,
    getTransportationTypeName,
    getCustomsProcedureName,
    getWarehouseName,
    getStatusName
  } = {}
) {
  if (isEmpty(value)) return 'не указано'

  switch (field) {
    case 'CompanyId':
    case 'TheOtherCompanyId':
      return isEmptyReference(value)
        ? 'не указано'
        : getCompanyDisplayName(companies, value, 'Неизвестная компания')
    case 'RegisterType':
      return isEmptyReference(value)
        ? 'не указано'
        : getRegisterTypeDisplayName(companies, value, 'Неизвестная компания')
    case 'StatusId':
      return resolveReference(value, getStatusName, 'Неизвестный статус')
    case 'TheOtherCountryCode':
      return resolveReference(value, getCountryName, 'Неизвестная страна')
    case 'DepartureAirportId':
    case 'ArrivalAirportId':
      return isEmptyReference(value)
        ? 'не указано'
        : getAirportDisplayName(airports, value, 'Неизвестный аэропорт')
    case 'TransportationTypeCode':
      return resolveReference(
        value,
        getTransportationTypeName,
        'Неизвестный тип транспорта',
        { zeroIsEmpty: false }
      )
    case 'CustomsProcedureCode':
      return resolveReference(
        value,
        getCustomsProcedureName,
        'Неизвестная таможенная процедура'
      )
    case 'WarehouseId':
      return resolveReference(value, getWarehouseName, 'Неизвестный склад')
    case 'DTime':
      return formatDateTime(value)
    case 'InvoiceDate':
    case 'WarehouseArrivalDate':
      return formatDate(value)
    default:
      if (value === 'True' || value === 'true') return 'Да'
      if (value === 'False' || value === 'false') return 'Нет'
      return value
  }
}
