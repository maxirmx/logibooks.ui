import { describe, it, expect, vi, beforeEach } from 'vitest'
import { 
  formatFeacnName, 
  getFeacnTooltip, 
  loadFeacnTooltipOnHover, 
  useFeacnTooltips, 
  clearFeacnTooltipCache 
} from '@/helpers/feacn.tooltip.helpers.js'

const getByCodeMock = vi.fn()

vi.mock('@/stores/feacn.codes.store.js', () => ({
  useFeacnCodesStore: () => ({
    getByCode: getByCodeMock
  })
}))

describe('feacn.tooltip.helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearFeacnTooltipCache() // Clear cache before each test
  })

describe('formatFeacnName', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns not found message when code does not exist', async () => {
    getByCodeMock.mockResolvedValue(null)
    const result = await formatFeacnName('123')
    expect(result).toBe('Код ТН ВЭД не найден')
  })

  it('returns sentence-cased normalized name when available', async () => {
    getByCodeMock.mockResolvedValue({ normalizedName: 'ПРОДУКТ', name: 'ignored' })
    const result = await formatFeacnName('456')
    expect(result).toBe('Продукт')
  })

  it('falls back to name when normalized name is empty', async () => {
    getByCodeMock.mockResolvedValue({ normalizedName: '', name: 'Some Name' })
    const result = await formatFeacnName('789')
    expect(result).toBe('Some Name')
  })

  it('returns default message when both names are missing', async () => {
    getByCodeMock.mockResolvedValue({ normalizedName: '', name: '' })
    const result = await formatFeacnName('000')
    expect(result).toBe('Код ТН ВЭД 000')
  })
})

describe('getFeacnTooltip', () => {
  it('caches tooltip results', async () => {
    getByCodeMock.mockResolvedValue({ normalizedName: 'ПРОДУКТ', name: 'ignored' })
    
    // First call
    const result1 = await getFeacnTooltip('123')
    expect(result1).toBe('Продукт')
    expect(getByCodeMock).toHaveBeenCalledTimes(1)
    
    // Second call should use cache
    const result2 = await getFeacnTooltip('123')
    expect(result2).toBe('Продукт')
    expect(getByCodeMock).toHaveBeenCalledTimes(1) // No additional call
  })

  it('shows loading placeholder when requested', async () => {
    getByCodeMock.mockResolvedValue({ normalizedName: 'ПРОДУКТ', name: 'ignored' })
    
    const tooltips = useFeacnTooltips()
    const promise = getFeacnTooltip('456', true)
    
    // Check that loading placeholder is set immediately
    expect(tooltips.value['456']).toBe('Загрузка...')
    
    // Wait for completion
    const result = await promise
    expect(result).toBe('Продукт')
    expect(tooltips.value['456']).toBe('Продукт')
  })

  it('handles errors gracefully', async () => {
    getByCodeMock.mockRejectedValue(new Error('Network error'))
    
    const result = await getFeacnTooltip('789')
    expect(result).toBe('Код ТН ВЭД не найден')
  })
})

describe('loadFeacnTooltipOnHover', () => {
  it('is a convenience wrapper that shows loading placeholder', async () => {
    getByCodeMock.mockResolvedValue({ normalizedName: 'ПРОДУКТ', name: 'ignored' })
    
    const tooltips = useFeacnTooltips()
    const promise = loadFeacnTooltipOnHover('999')
    
    // Check that loading placeholder is set
    expect(tooltips.value['999']).toBe('Загрузка...')
    
    const result = await promise
    expect(result).toBe('Продукт')
  })
})

describe('cache management', () => {
  it('useFeacnTooltips returns reactive cache', () => {
    const tooltips = useFeacnTooltips()
    expect(tooltips.value).toEqual({})
    
    tooltips.value['test'] = 'Test Value'
    expect(tooltips.value['test']).toBe('Test Value')
  })

  it('clearFeacnTooltipCache clears the cache', async () => {
    getByCodeMock.mockResolvedValue({ normalizedName: 'ПРОДУКТ', name: 'ignored' })
    
    // Add something to cache
    await getFeacnTooltip('123')
    const tooltips = useFeacnTooltips()
    expect(Object.keys(tooltips.value)).toHaveLength(1)
    
    // Clear cache
    clearFeacnTooltipCache()
    expect(tooltips.value).toEqual({})
  })
})

})
