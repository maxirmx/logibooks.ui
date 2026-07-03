// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, expect, it } from 'vitest'
import {
  wbrnRegisterColumnTitles,
  wbrnRegisterColumnTooltips
} from '@/helpers/wbrn.register.mapping.js'

describe('wbrn.register.mapping', () => {
  it('defines WbrN product and recipient replacement fields', () => {
    expect(wbrnRegisterColumnTitles).toMatchObject({
      shk: 'ШК',
      article: 'Артикул WB',
      productCountryName: 'Страна',
      productLink: 'Ссылка на товар',
      lastName: 'Фамилия',
      firstName: 'Имя',
      patronymic: 'Отчество',
      recipientCountryName: 'Страна получателя',
      recipientCity: 'Город получателя',
      recipientAddress: 'Адрес получателя'
    })
  })

  it('does not expose backend-owned product country code or hidden payment fields', () => {
    expect(wbrnRegisterColumnTitles).not.toHaveProperty('countryCode')
    expect(wbrnRegisterColumnTitles).not.toHaveProperty('paymentAmount')
    expect(wbrnRegisterColumnTitles).not.toHaveProperty('paymentCurrency')
  })

  it('keeps tooltips for only fields that need additional guidance', () => {
    expect(wbrnRegisterColumnTooltips.weightKg).toBe('указывается в килограммах')
    expect(wbrnRegisterColumnTooltips.unitPrice).toBe('цена за единицу товара')
    expect(wbrnRegisterColumnTooltips.recipientAddress).toBe('полный адрес получателя для доставки')
    expect(wbrnRegisterColumnTooltips).not.toHaveProperty('article')
    expect(wbrnRegisterColumnTooltips).not.toHaveProperty('productCountryName')
  })
})
