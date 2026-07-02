import { describe, expect, it } from 'vitest'
import {
  buildParcelStatusBulkReport,
  getParcelStatusBulkNumberLabel,
  normalizeParcelStatusBulkIds,
  parseParcelStatusBulkInput
} from '@/helpers/parcel.status.bulk.helpers.js'
import { GTC_COMPANY_ID, OZON_COMPANY_ID, WBR_COMPANY_ID, WBR2_REGISTER_ID, WBRN_REGISTER_ID } from '@/helpers/company.constants.js'

describe('parcel status bulk helpers', () => {
  it('parses comma-separated and Excel-style pasted values with ordered de-duplication', () => {
    expect(parseParcelStatusBulkInput(' A-1, B-2\tC-3\r\nA-1\n\n D-4 ')).toEqual([
      'A-1',
      'B-2',
      'C-3',
      'D-4'
    ])
  })

  it('handles empty values', () => {
    expect(parseParcelStatusBulkInput(null)).toEqual([])
    expect(parseParcelStatusBulkInput(' , \n\t ')).toEqual([])
  })

  it('normalizes positive integer parcel ids only', () => {
    expect(normalizeParcelStatusBulkIds([1, '2', 0, -1, 1.5, 'bad', null])).toEqual([1, 2])
    expect(normalizeParcelStatusBulkIds(null)).toEqual([])
  })

  it('formats missing and blocked parcel report as a copyable multiline text', () => {
    expect(buildParcelStatusBulkReport(
      ['MISS-1', 'MISS-2'],
      [{ parcelId: 10, number: 'BLOCK-1' }, { parcelId: 11 }]
    )).toBe('Не найдены:\nMISS-1\nMISS-2\n\nНедоступны для изменения:\nBLOCK-1\n#11')
  })

  it('formats blocked-only reports and ignores invalid report inputs', () => {
    expect(buildParcelStatusBulkReport('not-array', [{ parcelId: 5, number: 'BLOCK-5' }]))
      .toBe('Недоступны для изменения:\nBLOCK-5')
    expect(buildParcelStatusBulkReport('not-array', 'not-array')).toBe('')
  })

  it('builds parcel-number labels from register type', () => {
    expect(getParcelStatusBulkNumberLabel({ registerType: WBR_COMPANY_ID })).toBe('ШК')
    expect(getParcelStatusBulkNumberLabel({ registerType: WBR2_REGISTER_ID })).toBe('ШК')
    expect(getParcelStatusBulkNumberLabel({ registerType: WBRN_REGISTER_ID })).toBe('ШК')
    expect(getParcelStatusBulkNumberLabel({ registerType: OZON_COMPANY_ID })).toBe('№ отправления')
    expect(getParcelStatusBulkNumberLabel({ registerType: GTC_COMPANY_ID })).toBe('№ посылки')
  })

  it('falls back to company id and then to a neutral parcel-number label', () => {
    expect(getParcelStatusBulkNumberLabel({ companyId: WBR_COMPANY_ID })).toBe('ШК')
    expect(getParcelStatusBulkNumberLabel({ companyId: OZON_COMPANY_ID })).toBe('№ отправления')
    expect(getParcelStatusBulkNumberLabel({ registerType: 999 })).toBe('Номер посылки')
    expect(getParcelStatusBulkNumberLabel(null)).toBe('Номер посылки')
  })
})
