// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, expect, it } from 'vitest'
import { wbrnRegisterColumnTitles } from '@/helpers/wbrn.register.mapping.js'

describe('wbrn.register.mapping', () => {
  it('defines WbrN product and recipient replacement fields', () => {
    expect(wbrnRegisterColumnTitles).toMatchObject({
      shk: 'ШК',
      article: 'Артикул',
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
})
