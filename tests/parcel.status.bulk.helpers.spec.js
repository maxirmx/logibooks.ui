import { describe, expect, it } from 'vitest'
import {
  buildParcelStatusBulkReport,
  normalizeParcelStatusBulkIds,
  parseParcelStatusBulkInput
} from '@/helpers/parcel.status.bulk.helpers.js'

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
})
