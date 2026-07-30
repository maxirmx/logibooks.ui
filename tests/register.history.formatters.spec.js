// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, expect, it } from 'vitest'
import { WBRN_REGISTER_ID } from '@/helpers/company.constants.js'
import { formatRegisterHistoryValue } from '@/helpers/register.history.formatters.js'

const context = {
  companies: [
    { id: 1, shortName: 'Озон' },
    { id: 2, shortName: 'РВБ' }
  ],
  airports: [
    { id: 1, name: 'Шереметьево', codeIata: 'SVO' }
  ],
  getCountryName: (value) => Number(value) === 860 ? 'Узбекистан' : value,
  getTransportationTypeName: (value) => Number(value) === 0 ? 'Авиа' : String(value),
  getCustomsProcedureName: (value) => Number(value) === 10 ? 'Экспорт' : String(value),
  getWarehouseName: (value) => Number(value) === 5 ? 'Основной склад' : String(value),
  getStatusName: (value) => Number(value) === 2 ? 'На складе' : null
}

describe('register history formatters', () => {
  it('uses shared display resolvers for reference values', () => {
    expect(formatRegisterHistoryValue('CompanyId', 1, context)).toBe('Озон')
    expect(formatRegisterHistoryValue('RegisterType', WBRN_REGISTER_ID, context))
      .toBe('РВБ новый формат')
    expect(formatRegisterHistoryValue('StatusId', 2, context)).toBe('На складе')
    expect(formatRegisterHistoryValue('TheOtherCountryCode', 860, context)).toBe('Узбекистан')
    expect(formatRegisterHistoryValue('DepartureAirportId', 1, context))
      .toBe('Шереметьево (SVO)')
    expect(formatRegisterHistoryValue('TransportationTypeCode', 0, context)).toBe('Авиа')
    expect(formatRegisterHistoryValue('CustomsProcedureCode', 10, context)).toBe('Экспорт')
    expect(formatRegisterHistoryValue('WarehouseId', 5, context)).toBe('Основной склад')
  })

  it('never exposes unresolved reference identifiers', () => {
    expect(formatRegisterHistoryValue('CompanyId', 999, context)).toBe('Неизвестная компания')
    expect(formatRegisterHistoryValue('StatusId', 999, context)).toBe('Неизвестный статус')
    expect(formatRegisterHistoryValue('TheOtherCountryCode', 999, context)).toBe('Неизвестная страна')
    expect(formatRegisterHistoryValue('DepartureAirportId', 999, context)).toBe('Неизвестный аэропорт')
    expect(formatRegisterHistoryValue('WarehouseId', 999, context)).toBe('Неизвестный склад')
    expect(formatRegisterHistoryValue('StatusId', 0, context)).toBe('не указано')
  })

  it('formats non-reference values without lookup dependencies', () => {
    expect(formatRegisterHistoryValue('LookupByArticle', 'True', context)).toBe('Да')
    expect(formatRegisterHistoryValue('InvoiceDate', '2026-07-31', context)).toBe('31.07.2026')
    expect(formatRegisterHistoryValue('DealNumber', 'D-42', context)).toBe('D-42')
  })
})
