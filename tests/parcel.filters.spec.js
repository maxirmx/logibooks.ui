import { describe, expect, it } from 'vitest'
import { createEmptyParcelFilter, validateParcelFilterName } from '@/helpers/parcel.filters.js'

describe('parcel filter helpers', () => {
  it('creates independent empty drafts', () => {
    const first = createEmptyParcelFilter()
    first.excludedCheckStatuses.sw.push(256)
    expect(createEmptyParcelFilter()).toEqual({
      name: '', excludedParcelStatusIds: [],
      excludedCheckStatuses: { common: [], sw: [], fc: [] },
      excludedPassportCheckStatuses: []
    })
  })

  it('validates trimmed names, length, and owner-local duplicates', () => {
    const filters = [{ id: 1, name: 'Мой фильтр' }]
    expect(validateParcelFilterName(' ', filters)).toContain('Укажите')
    expect(validateParcelFilterName('x'.repeat(101), filters)).toContain('100')
    expect(validateParcelFilterName(' МОЙ ФИЛЬТР ', filters)).toContain('уже есть')
    expect(validateParcelFilterName(' мой фильтр ', filters, 1)).toBeNull()
    expect(validateParcelFilterName('Другой', filters)).toBeNull()
  })
})
