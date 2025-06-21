import { describe, it, expect } from 'vitest'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'

describe('items per page options', () => {
  it('contains expected options', () => {
    expect(itemsPerPageOptions).toHaveLength(4)
    expect(itemsPerPageOptions[3]).toEqual({ value: -1, title: 'Все' })
  })
})
