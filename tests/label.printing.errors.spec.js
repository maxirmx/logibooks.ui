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
  it.each([undefined, '', '   ', { message: detail }])('keeps generic fallback for unusable server messages', (msg) => {
    expect(getPrintingErrorMessage({ data: { code: 'InvalidData', msg } })).toBe('Данные этикетки некорректны.')
  })
  it('retains tailored messages for other error codes', () => {
    expect(getPrintingErrorMessage({ data: { code: 'Overflow', msg: detail } })).toContain('не помещается')
    expect(getPrintingErrorMessage(new Error('network failure'))).toBe('network failure')
  })
})
