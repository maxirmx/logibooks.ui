import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FormatFeacnName } from '@/helpers/feacn.name.helpers.js'

const getByCodeMock = vi.fn()

vi.mock('@/stores/feacn.codes.store.js', () => ({
  useFeacnCodesStore: () => ({
    getByCode: getByCodeMock
  })
}))

describe('FormatFeacnName', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns not found message when code does not exist', async () => {
    getByCodeMock.mockResolvedValue(null)
    const result = await FormatFeacnName('123')
    expect(result).toBe('Код ТН ВЭД не найден')
  })

  it('returns sentence-cased normalized name when available', async () => {
    getByCodeMock.mockResolvedValue({ NormalizedName: 'ПРОДУКТ', Name: 'ignored' })
    const result = await FormatFeacnName('456')
    expect(result).toBe('Продукт')
  })

  it('falls back to name when normalized name is empty', async () => {
    getByCodeMock.mockResolvedValue({ NormalizedName: '', Name: 'Some Name' })
    const result = await FormatFeacnName('789')
    expect(result).toBe('Some Name')
  })

  it('returns default message when both names are missing', async () => {
    getByCodeMock.mockResolvedValue({ NormalizedName: '', Name: '' })
    const result = await FormatFeacnName('000')
    expect(result).toBe('Код ТН ВЭД 000')
  })
})

