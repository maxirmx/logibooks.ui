// Copyright (C) 2026 Maxim [maxirmx] Samsonov (http://www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, expect, it } from 'vitest'
import { getPrintingErrorMessage } from '@/helpers/label.printing.helpers.js'

const detail = 'Не удалось напечатать стикер. Не указаны данные: дата общей накладной.'
describe('detailed core sticker validation messages', () => {
  it.each([
    { data: { code: 'InvalidData', msg: detail } },
    { cause: { data: { code: 'InvalidData', msg: detail } }, code: 'SubmissionFailed' },
    { code: 'InvalidData', data: { msg: detail } }
  ])('preserves the server explanation for direct and wrapped failures', (error) => {
    expect(getPrintingErrorMessage(error)).toBe(detail)
  })
})
