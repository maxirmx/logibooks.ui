// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect } from 'vitest'
import { buildParcelListHeading, formatRegisterInvoice, formatGoodsParcelsCounts } from '@/helpers/register.heading.helpers.js'

function mockGetTransportationDocument( ) {
  return `Документ`
}

describe('register.heading.helpers', () => {
  it('builds heading with invoice info only (counts moved to tooltip)', () => {
    const register = {
      dealNumber: 'DEAL-123',
      invoiceNumber: 'INV-45',
      invoiceDate: '2025-09-01',
      transportationTypeId: 7,
      parcelsTotal: 15,
      placesTotal: 20
    }
    const heading = buildParcelListHeading(register, mockGetTransportationDocument)
    const invoice = formatRegisterInvoice(register, mockGetTransportationDocument)
    expect(heading).toContain('Сделка DEAL-123 (')
    expect(heading).toContain(invoice)
    expect(heading).not.toContain('15/20')
  })

  it('builds heading without counts when missing', () => {
    const register = {
      dealNumber: 'DEAL-123',
      invoiceNumber: 'INV-45',
      invoiceDate: '2025-09-01',
      transportationTypeId: 7
    }
    const heading = buildParcelListHeading(register, mockGetTransportationDocument)
    expect(heading).not.toContain(';')
    expect(heading).toMatch(/Сделка DEAL-123 \(.*INV-45.*\)$/)
  })

  it('builds heading without counts when invoice missing', () => {
    const register = {
      dealNumber: 'D1',
      parcelsTotal: 5,
      placesTotal: 7
    }
    const heading = buildParcelListHeading(register, mockGetTransportationDocument)
    // Invoice placeholder present; counts not included
    expect(heading).toBe('Сделка D1 (ТСД отсутствует)')
  })

  it('returns loading message for null register', () => {
    const heading = buildParcelListHeading(null, mockGetTransportationDocument)
    expect(heading).toBe('Загрузка реестра...')
  })

  it('formatGoodsParcelsCounts returns empty when missing both', () => {
    const register = { dealNumber: 'X' }
    expect(formatGoodsParcelsCounts(register)).toBe('')
  })

  it('formatGoodsParcelsCounts normalizes numbers and missing values to 0', () => {
    const register = { parcelsTotal: '12', placesTotal: null }
    expect(formatGoodsParcelsCounts(register)).toBe('Товаров/Посылок: 12/0')
  })
})
