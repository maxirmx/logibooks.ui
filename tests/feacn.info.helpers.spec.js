import { describe, it, expect, vi, beforeEach } from 'vitest'
import { 
  formatFeacnName, 
  getFeacnTooltip,
  getFeacnInfo,
  getFeacnSearchStatus,
  isFeacnLoading,
  useFeacnTooltips, 
  clearFeacnTooltipCache,
  clearFeacnInfoCache,
  getCachedFeacnInfo
} from '@/helpers/feacn.info.helpers.js'

const getByCodeMock = vi.fn()

vi.mock('@/stores/feacn.codes.store.js', () => ({
  useFeacnCodesStore: () => ({
    getByCode: getByCodeMock
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
})
