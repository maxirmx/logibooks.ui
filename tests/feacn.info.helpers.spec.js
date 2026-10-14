// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { formatFeacnName, formatFeacnNameFromItem, getFeacnTooltip, getFeacnInfo, getFeacnSearchStatus, isFeacnLoading, loadFeacnTooltipOnHover, useFeacnTooltips, useFeacnInfo, clearFeacnInfoCache, getCachedFeacnInfo, preloadFeacnInfo } from '@/helpers/feacn.info.helpers.js'

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

    it('returns default message when both names are missing', async () => {
      getByCodeMock.mockResolvedValue({ normalizedName: '', name: '' })
      const result = await formatFeacnName('000')
      expect(result).toEqual({
        name: 'Код ТН ВЭД 000',
        found: true
      })
    })

    it('keeps transport failures observable to the caller', async () => {
      getByCodeMock.mockRejectedValue(new Error('Network error'))
      await expect(formatFeacnName('error')).rejects.toThrow('Network error')
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

  })

  describe('getFeacnInfo', () => {
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
  })

  describe('formatFeacnNameFromItem', () => {
    it('returns default message for undefined item', () => {
      const result = formatFeacnNameFromItem(undefined)
      expect(result).toBe('Код ТН ВЭД не задан')
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

    it('handles successful bulk lookup with results property', async () => {
      bulkLookupMock.mockResolvedValue({
        results: {
          123: { normalizedName: 'ПРОДУКТ А', name: 'Product A' },
          456: { normalizedName: 'ПРОДУКТ Б', name: 'Product B' }
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
        123: { normalizedName: '', name: 'Fallback Name' }
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
