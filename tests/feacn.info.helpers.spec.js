import { describe, it, expect, vi, beforeEach } from 'vitest'
import { 
  formatFeacnName,
  formatFeacnNameFromItem,
  getFeacnTooltip,
  getFeacnInfo,
  getFeacnSearchStatus,
  isFeacnLoading,
  loadFeacnTooltipOnHover,
  useFeacnTooltips, 
  useFeacnInfo,
  clearFeacnTooltipCache,
  clearFeacnInfoCache,
  getCachedFeacnInfo,
  preloadFeacnInfo
} from '@/helpers/feacn.info.helpers.js'

const getByCodeMock = vi.fn()
const bulkLookupMock = vi.fn()

vi.mock('@/stores/feacn.codes.store.js', () => ({
  useFeacnCodesStore: () => ({
    getByCode: getByCodeMock,
    bulkLookup: bulkLookupMock
  })
}))

describe('feacn.info.helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearFeacnInfoCache() // Clear cache before each test
  })

describe('formatFeacnName', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns not found info when code does not exist', async () => {
    getByCodeMock.mockResolvedValue(null)
    const result = await formatFeacnName('123')
    expect(result).toEqual({
      name: 'Несуществующий код ТН ВЭД',
      found: false
    })
  })

  it('returns found info with sentence-cased normalized name when available', async () => {
    getByCodeMock.mockResolvedValue({ normalizedName: 'ПРОДУКТ', name: 'ignored' })
    const result = await formatFeacnName('456')
    expect(result).toEqual({
      name: 'Продукт',
      found: true
    })
  })

  it('falls back to name when normalized name is empty', async () => {
    getByCodeMock.mockResolvedValue({ normalizedName: '', name: 'Some Name' })
    const result = await formatFeacnName('789')
    expect(result).toEqual({
      name: 'Some Name',
      found: true
    })
  })

  it('returns default message when both names are missing', async () => {
    getByCodeMock.mockResolvedValue({ normalizedName: '', name: '' })
    const result = await formatFeacnName('000')
    expect(result).toEqual({
      name: 'Код ТН ВЭД 000',
      found: true
    })
  })

  it('handles errors gracefully', async () => {
    getByCodeMock.mockRejectedValue(new Error('Network error'))
    const result = await formatFeacnName('error')
    expect(result).toEqual({
      name: 'Несуществующий код ТН ВЭД',
      found: false
    })
  })
})

describe('getFeacnTooltip', () => {
  it('returns cached tooltip if available', async () => {
    getByCodeMock.mockResolvedValue({ normalizedName: 'ПРОДУКТ' })
    
    // First call should fetch and cache
    const result1 = await getFeacnTooltip('123')
    expect(result1).toBe('Продукт')
    expect(getByCodeMock).toHaveBeenCalledTimes(1)
    
    // Second call should use cache
    const result2 = await getFeacnTooltip('123')
    expect(result2).toBe('Продукт')
    expect(getByCodeMock).toHaveBeenCalledTimes(1) // No additional call
  })

  it('sets loading placeholder when requested', async () => {
    getByCodeMock.mockResolvedValue({ normalizedName: 'ПРОДУКТ' })
    
    const cache = useFeacnTooltips()
    const promise = getFeacnTooltip('123', true)
    
    // Check that loading placeholder is set immediately
    expect(cache.value['123']).toEqual({
      name: 'Загрузка...',
      found: null,
      loading: true
    })
    
    await promise
    
    // Check final result
    expect(cache.value['123']).toEqual({
      name: 'Продукт',
      found: true,
      loading: false
    })
  })
})

describe('getFeacnInfo', () => {
  it('returns complete info object', async () => {
    getByCodeMock.mockResolvedValue({ normalizedName: 'ПРОДУКТ' })
    
    const result = await getFeacnInfo('123')
    expect(result).toEqual({
      name: 'Продукт',
      found: true,
      loading: false
    })
  })

  it('returns cached info if available', async () => {
    getByCodeMock.mockResolvedValue({ normalizedName: 'ПРОДУКТ' })
    
    // First call
    await getFeacnInfo('123')
    expect(getByCodeMock).toHaveBeenCalledTimes(1)
    
    // Second call should use cache
    const result = await getFeacnInfo('123')
    expect(result).toEqual({
      name: 'Продукт',
      found: true,
      loading: false
    })
    expect(getByCodeMock).toHaveBeenCalledTimes(1)
  })
})

describe('getFeacnSearchStatus', () => {
  it('returns true for found codes', async () => {
    getByCodeMock.mockResolvedValue({ normalizedName: 'ПРОДУКТ' })
    
    const result = await getFeacnSearchStatus('123')
    expect(result).toBe(true)
  })

  it('returns false for not found codes', async () => {
    getByCodeMock.mockResolvedValue(null)
    
    const result = await getFeacnSearchStatus('123')
    expect(result).toBe(false)
  })
})

describe('isFeacnLoading', () => {
  it('returns true when code is loading', async () => {
    getByCodeMock.mockResolvedValue({ normalizedName: 'ПРОДУКТ' })
    
    const promise = getFeacnInfo('123', true)
    
    // Should be loading initially
    expect(isFeacnLoading('123')).toBe(true)
    
    await promise
    
    // Should not be loading after completion
    expect(isFeacnLoading('123')).toBe(false)
  })

  it('returns false for non-existent codes', () => {
    expect(isFeacnLoading('nonexistent')).toBe(false)
  })
})

describe('getCachedFeacnInfo', () => {
  it('returns cached info when available', async () => {
    getByCodeMock.mockResolvedValue({ normalizedName: 'ПРОДУКТ' })
    
    // Cache some data
    await getFeacnInfo('123')
    
    // Get cached data
    const cached = getCachedFeacnInfo('123')
    expect(cached).toEqual({
      name: 'Продукт',
      found: true,
      loading: false
    })
  })

  it('returns null when not cached', () => {
    const cached = getCachedFeacnInfo('nonexistent')
    expect(cached).toBe(null)
  })
})

describe('cache management', () => {
  it('clears cache correctly', async () => {
    getByCodeMock.mockResolvedValue({ normalizedName: 'ПРОДУКТ' })
    
    await getFeacnInfo('123')
    expect(getCachedFeacnInfo('123')).not.toBe(null)
    
    clearFeacnInfoCache()
    expect(getCachedFeacnInfo('123')).toBe(null)
  })

  it('backward compatibility - clearFeacnTooltipCache still works', async () => {
    getByCodeMock.mockResolvedValue({ normalizedName: 'ПРОДУКТ' })
    
    await getFeacnInfo('123')
    expect(getCachedFeacnInfo('123')).not.toBe(null)
    
    clearFeacnTooltipCache()
    expect(getCachedFeacnInfo('123')).toBe(null)
  })
})

describe('formatFeacnNameFromItem', () => {
  it('returns default message for null item', () => {
    const result = formatFeacnNameFromItem(null)
    expect(result).toBe('Код ТН ВЭД не задан')
  })

  it('returns default message for undefined item', () => {
    const result = formatFeacnNameFromItem(undefined)
    expect(result).toBe('Код ТН ВЭД не задан')
  })

  it('formats normalized name with proper case', () => {
    const item = { normalizedName: 'ПРОДУКТ ПИТАНИЯ', name: 'ignored', code: '123' }
    const result = formatFeacnNameFromItem(item)
    expect(result).toBe('Продукт питания')
  })

  it('trims and formats normalized name', () => {
    const item = { normalizedName: '  МОЛОЧНЫЕ ПРОДУКТЫ  ', name: 'ignored', code: '123' }
    const result = formatFeacnNameFromItem(item)
    expect(result).toBe('Молочные продукты')
  })

  it('falls back to name when normalized name is empty', () => {
    const item = { normalizedName: '', name: 'Dairy Products', code: '123' }
    const result = formatFeacnNameFromItem(item)
    expect(result).toBe('Dairy Products')
  })

  it('falls back to name when normalized name is whitespace', () => {
    const item = { normalizedName: '   ', name: 'Meat Products', code: '456' }
    const result = formatFeacnNameFromItem(item)
    expect(result).toBe('Meat Products')
  })

  it('trims name when used', () => {
    const item = { normalizedName: '', name: '  Fish Products  ', code: '789' }
    const result = formatFeacnNameFromItem(item)
    expect(result).toBe('Fish Products')
  })

  it('returns code-based message when both names are empty', () => {
    const item = { normalizedName: '', name: '', code: '000' }
    const result = formatFeacnNameFromItem(item)
    expect(result).toBe('Код ТН ВЭД 000')
  })

  it('returns code-based message when both names are whitespace', () => {
    const item = { normalizedName: '   ', name: '   ', code: '111' }
    const result = formatFeacnNameFromItem(item)
    expect(result).toBe('Код ТН ВЭД 111')
  })

  it('returns code-based message when names are undefined', () => {
    const item = { code: '222' }
    const result = formatFeacnNameFromItem(item)
    expect(result).toBe('Код ТН ВЭД 222')
  })
})

describe('loadFeacnTooltipOnHover', () => {
  it('calls getFeacnTooltip with showLoadingPlaceholder=true', async () => {
    getByCodeMock.mockResolvedValue({ normalizedName: 'ПРОДУКТ' })
    
    const result = await loadFeacnTooltipOnHover('123')
    expect(result).toBe('Продукт')
    
    // Verify loading placeholder was set
    const cache = useFeacnTooltips()
    expect(cache.value['123']).toEqual({
      name: 'Продукт',
      found: true,
      loading: false
    })
  })
})

describe('useFeacnTooltips and useFeacnInfo', () => {
  it('useFeacnTooltips returns the reactive cache object', () => {
    const cache = useFeacnTooltips()
    expect(cache).toBeDefined()
    expect(cache.value).toBeDefined()
  })

  it('useFeacnInfo returns the same reactive cache object', () => {
    const cache1 = useFeacnTooltips()
    const cache2 = useFeacnInfo()
    expect(cache1).toBe(cache2)
  })

  it('cache is reactive and updates correctly', async () => {
    getByCodeMock.mockResolvedValue({ normalizedName: 'ПРОДУКТ' })
    
    const cache = useFeacnInfo()
    await getFeacnInfo('123')
    
    expect(cache.value['123']).toEqual({
      name: 'Продукт',
      found: true,
      loading: false
    })
  })
})

describe('preloadFeacnInfo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearFeacnInfoCache()
  })

  it('handles null codes array', async () => {
    await preloadFeacnInfo(null)
    expect(bulkLookupMock).not.toHaveBeenCalled()
  })

  it('handles undefined codes array', async () => {
    await preloadFeacnInfo(undefined)
    expect(bulkLookupMock).not.toHaveBeenCalled()
  })

  it('handles empty codes array', async () => {
    await preloadFeacnInfo([])
    expect(bulkLookupMock).not.toHaveBeenCalled()
  })

  it('filters out null and undefined codes', async () => {
    bulkLookupMock.mockResolvedValue({})
    await preloadFeacnInfo(['123', null, undefined, '456'])
    expect(bulkLookupMock).toHaveBeenCalledWith(['123', '456'])
  })

  it('filters out empty and whitespace codes', async () => {
    bulkLookupMock.mockResolvedValue({})
    await preloadFeacnInfo(['123', '', '   ', '456'])
    expect(bulkLookupMock).toHaveBeenCalledWith(['123', '456'])
  })

  it('deduplicates codes', async () => {
    bulkLookupMock.mockResolvedValue({})
    await preloadFeacnInfo(['123', '123', '456', '123'])
    expect(bulkLookupMock).toHaveBeenCalledWith(['123', '456'])
  })

  it('trims codes', async () => {
    bulkLookupMock.mockResolvedValue({})
    await preloadFeacnInfo(['  123  ', '456'])
    expect(bulkLookupMock).toHaveBeenCalledWith(['123', '456'])
  })

  it('converts codes to strings', async () => {
    bulkLookupMock.mockResolvedValue({})
    await preloadFeacnInfo([123, 456])
    expect(bulkLookupMock).toHaveBeenCalledWith(['123', '456'])
  })

  it('skips already cached codes', async () => {
    // Pre-cache one code
    await getFeacnInfo('123')
    
    bulkLookupMock.mockResolvedValue({})
    await preloadFeacnInfo(['123', '456'])
    expect(bulkLookupMock).toHaveBeenCalledWith(['456'])
  })

  it('handles successful bulk lookup with results property', async () => {
    bulkLookupMock.mockResolvedValue({
      results: {
        '123': { normalizedName: 'ПРОДУКТ А', name: 'Product A' },
        '456': { normalizedName: 'ПРОДУКТ Б', name: 'Product B' }
      }
    })
    
    await preloadFeacnInfo(['123', '456', '789'])
    
    const cache = getCachedFeacnInfo('123')
    expect(cache).toEqual({
      name: 'Продукт а',
      found: true,
      loading: false
    })
    
    const cache2 = getCachedFeacnInfo('456')
    expect(cache2).toEqual({
      name: 'Продукт б',
      found: true,
      loading: false
    })
    
    const cache3 = getCachedFeacnInfo('789')
    expect(cache3).toEqual({
      name: 'Несуществующий код ТН ВЭД',
      found: false,
      loading: false
    })
  })

  it('handles successful bulk lookup with Results property (capital R)', async () => {
    bulkLookupMock.mockResolvedValue({
      Results: {
        '123': { normalizedName: 'ПРОДУКТ', name: 'Product' }
      }
    })
    
    await preloadFeacnInfo(['123'])
    
    const cache = getCachedFeacnInfo('123')
    expect(cache).toEqual({
      name: 'Продукт',
      found: true,
      loading: false
    })
  })

  it('handles successful bulk lookup with direct results object', async () => {
    bulkLookupMock.mockResolvedValue({
      '123': { normalizedName: 'ПРОДУКТ', name: 'Product' }
    })
    
    await preloadFeacnInfo(['123'])
    
    const cache = getCachedFeacnInfo('123')
    expect(cache).toEqual({
      name: 'Продукт',
      found: true,
      loading: false
    })
  })

  it('falls back to individual loading when bulk lookup fails', async () => {
    bulkLookupMock.mockRejectedValue(new Error('Bulk lookup failed'))
    getByCodeMock.mockResolvedValue({ normalizedName: 'ПРОДУКТ' })
    
    await preloadFeacnInfo(['123'])
    
    expect(getByCodeMock).toHaveBeenCalledWith('123')
    const cache = getCachedFeacnInfo('123')
    expect(cache).toEqual({
      name: 'Продукт',
      found: true,
      loading: false
    })
  })

  it('formats items correctly using formatFeacnNameFromItem', async () => {
    bulkLookupMock.mockResolvedValue({
      '123': { normalizedName: '', name: 'Fallback Name' }
    })
    
    await preloadFeacnInfo(['123'])
    
    const cache = getCachedFeacnInfo('123')
    expect(cache).toEqual({
      name: 'Fallback Name',
      found: true,
      loading: false
    })
  })

  it('does nothing when all codes are already cached', async () => {
    // Pre-cache codes
    await getFeacnInfo('123')
    await getFeacnInfo('456')
    
    await preloadFeacnInfo(['123', '456'])
    expect(bulkLookupMock).not.toHaveBeenCalled()
  })
})

})
