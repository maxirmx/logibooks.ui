// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock fetchWrapper
vi.mock('../src/helpers/fetch.wrapper.js', () => ({
  fetchWrapper: {
    get: vi.fn()
  }
}))

// Mock config for apiUrl
vi.mock('../src/helpers/config.js', () => ({
  apiUrl: 'http://test-api'
}))

// Mock CheckStatusCode
vi.mock('../src/helpers/check.status.code.js', () => ({
  CheckStatusCode: {
    hasIssues: vi.fn(() => false)
  }
}))

// Mock Pinia stores
vi.mock('../src/stores/alert.store.js', () => ({
  useAlertStore: vi.fn(() => ({
    error: vi.fn()
  }))
}))

// Mock FEACN info helpers
vi.mock('../src/helpers/feacn.info.helpers.js', () => ({
  getCachedFeacnInfo: vi.fn(),
  preloadFeacnInfo: vi.fn()
}))

import { navigateToEditParcel, validateParcelData, getRowPropsForParcel, filterGenericTemplateHeadersForParcel, getFrozenOrderSortDir, generateRegisterName, getFeacnCodesForKeywords, getKeywordFeacnPairs, getFeacnCodeItemClass, getMatchingFeacnCodeItemClass, getTnVedCellClass, updateParcelTnVed, loadParcels, formatPassport, formatCustomsCharge, hasParcelEditRouteAccess, buildParcelEditCellClass } from '../src/helpers/parcels.list.helpers.js'

// Import mocked FEACN info helpers
import { getCachedFeacnInfo, preloadFeacnInfo } from '../src/helpers/feacn.info.helpers.js'

describe('Parcels List Helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock console.error to suppress expected error logs during testing
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    // Restore console.error after each test
    vi.restoreAllMocks()
  })

  describe('navigateToEditParcel', () => {
    it('should navigate with additional query parameters', () => {
      const mockRouter = {
        push: vi.fn()
      }
      const order = { id: 123 }

      navigateToEditParcel(mockRouter, order, 'parcel-edit', {
        registerId: 456,
        returnTo: 'list',
        tab: 'details'
      })

      expect(mockRouter.push).toHaveBeenCalledWith({
        name: 'parcel-edit',
        params: { id: 123, registerId: 456 },
        query: { returnTo: 'list', tab: 'details', mode: 'modePaperwork' }
      })
    })

  })

  describe('hasParcelEditRouteAccess', () => {
    it('returns true for plain or ref-like hasLogistRole values', () => {
      expect(hasParcelEditRouteAccess({ hasLogistRole: true })).toBe(true)
      expect(hasParcelEditRouteAccess({ hasLogistRole: { value: true } })).toBe(true)
    })
  })

  describe('buildParcelEditCellClass', () => {
    it('handles empty base classes', () => {
      expect(buildParcelEditCellClass(true)).toBe('clickable-cell')
      expect(buildParcelEditCellClass(false)).toBe('')
    })
  })

  describe('validateParcelData', () => {
    it('should validate SW parcel successfully when sw=true', async () => {
      const mockStore = {
        validate: vi.fn().mockResolvedValue(),
        error: ''
      }
      const mockLoadOrders = vi.fn()
      const item = { id: 123 }

      const result = await validateParcelData(item, mockStore, mockLoadOrders, true)

      expect(mockStore.validate).toHaveBeenCalledWith(123, true)
      expect(mockLoadOrders).toHaveBeenCalled()
      expect(result).toBe(true)
    })

    it('should handle SW validation errors', async () => {
      const mockStore = {
        validate: vi.fn().mockRejectedValue({
          response: { data: { message: 'Ошибка при проверке информации о посылке' } }
        }),
        error: ''
      }
      const mockLoadOrders = vi.fn()
      const item = { id: 123 }

      await validateParcelData(item, mockStore, mockLoadOrders, true)

      expect(mockStore.error).toBe('Ошибка при проверке информации о посылке')
      expect(mockLoadOrders).toHaveBeenCalled()
    })

    it('should handle FC validation errors with default message', async () => {
      const mockStore = {
        validateFc: vi.fn().mockRejectedValue(new Error('Network error')),
        error: ''
      }
      const mockLoadOrders = vi.fn()
      const item = { id: 123 }

      await validateParcelData(item, mockStore, mockLoadOrders, false)

      expect(mockStore.error).toBe('Ошибка при проверке информации о посылке')
      expect(mockLoadOrders).toHaveBeenCalled()
    })
  })

  describe('getRowPropsForParcel', () => {
    const passportCheckStatuses = [
      { value: 10, code: 'CheckError' },
      { value: 30, code: 'Checked' },
      { value: 40, code: 'NotExists' },
      { value: 50, code: 'Invalid' }
    ]

    it('should return class for parcel with Duplicate status', async () => {
      const { CheckStatusCode } = await vi.importMock('../src/helpers/check.status.code.js')
      CheckStatusCode.hasIssues.mockReturnValue(true)

      // Duplicate combined value: compose(0x01FE, 0x01FE) = 0x01FE01FE
      const duplicateValue = 0x01fe01fe
      const data = {
        item: { checkStatus: duplicateValue }
      }

      const result = getRowPropsForParcel(data)

      expect(result).toEqual({ class: 'parcel-has-issues' })
      expect(CheckStatusCode.hasIssues).toHaveBeenCalledWith(duplicateValue)
    })

    it('should not return issue class for Duplicate2 status without issue bit', async () => {
      const { CheckStatusCode } = await vi.importMock('../src/helpers/check.status.code.js')
      CheckStatusCode.hasIssues.mockReturnValue(false)

      const duplicate2Value = 0x02320232
      const data = {
        item: { checkStatus: duplicate2Value }
      }

      const result = getRowPropsForParcel(data)

      expect(result).toEqual({ class: '' })
      expect(CheckStatusCode.hasIssues).toHaveBeenCalledWith(duplicate2Value)
    })

    it.each([10, 40, 50])(
      'should return class for passport check issue status %s',
      async (passportCheckStatus) => {
        const { CheckStatusCode } = await vi.importMock('../src/helpers/check.status.code.js')
        CheckStatusCode.hasIssues.mockReturnValue(false)

        const result = getRowPropsForParcel(
          { item: { checkStatus: 0x00010001, passportCheckStatus } },
          passportCheckStatuses
        )

        expect(result).toEqual({ class: 'parcel-has-issues' })
      }
    )

  })

  describe('filterGenericTemplateHeadersForParcel', () => {
    it('should filter out excluded headers', () => {
      const headers = [
        { key: 'actions', title: 'Actions' },
        { key: 'productLink', title: 'Product Link' },
        { key: 'statusId', title: 'Status' },
        { key: 'checkStatus', title: 'Check Status' },
        { key: 'countryCode', title: 'Country' },
        { key: 'feacnLookup', title: 'FEACN Lookup' },
        { key: 'tnVed', title: 'TN VED' },
        { key: 'customsFee', title: 'Customs Fee' },
        { key: 'customsDuty', title: 'Customs Duty' },
        { key: 'passportNumber', title: 'Passport Number' },
        { key: 'productName', title: 'Product Name' },
        { key: 'quantity', title: 'Quantity' }
      ]

      const result = filterGenericTemplateHeadersForParcel(headers)

      expect(result).toEqual([{ key: 'productName', title: 'Product Name' }])
    })

  })

  describe('formatPassport', () => {
    it('formats partial passport data without extra spaces', () => {
      expect(formatPassport({ passportSeries: 'AA', passportNumber: '123' })).toBe('AA 123')
      expect(formatPassport({ passportNumber: '123', passportIssueDate: '2020-01-01' })).toBe(
        '123 выдан 01.01.2020'
      )
      expect(formatPassport({})).toBe('')
      expect(formatPassport(null)).toBe('')
    })
  })

  describe('formatCustomsCharge', () => {
    it('keeps missing charge values empty', () => {
      expect(formatCustomsCharge(null)).toBe('')
      expect(formatCustomsCharge(undefined)).toBe('')
    })
  })

  describe('getFrozenOrderSortDir', () => {
    it('returns null when frozenOrder is not in sort state', () => {
      expect(getFrozenOrderSortDir([{ key: 'id', order: 'asc' }])).toBeNull()
      expect(getFrozenOrderSortDir([])).toBeNull()
      expect(getFrozenOrderSortDir(null)).toBeNull()
    })

  })

  describe('generateRegisterName', () => {
    it('should generate name with deal number', () => {
      const result = generateRegisterName('DEAL-123', 'file.xlsx')

      expect(result).toBe('Реестр для сделки DEAL-123')
    })

    it('should generate name without deal number', () => {
      const result = generateRegisterName('', 'test-file.xlsx')

      expect(result).toBe('Реестр для сделки без номера (файл: test-file.xlsx)')
    })
  })

  describe('getFeacnCodesForKeywords', () => {
    it('should return empty array for invalid input', () => {
      const store = { keyWords: [] }
      expect(getFeacnCodesForKeywords(null, store)).toEqual([])
      expect(getFeacnCodesForKeywords([], store)).toEqual([])
    })

    it('should handle keywords without feacnCodes', () => {
      const store = {
        keyWords: [{ id: 1 }, { id: 2, feacnCodes: null }]
      }
      const result = getFeacnCodesForKeywords([1, 2], store)
      expect(result).toEqual([])
    })

    it('should filter out null and empty codes', () => {
      const store = {
        keyWords: [{ id: 1, feacnCodes: ['123', null, '', '456'] }]
      }
      const result = getFeacnCodesForKeywords([1], store)
      expect(result).toEqual(['123', '456'])
    })

    it('should handle keywords not found in store', () => {
      const store = {
        keyWords: [{ id: 1, feacnCodes: ['123'] }]
      }
      const result = getFeacnCodesForKeywords([1, 999], store)
      expect(result).toEqual(['123'])
    })
  })

  describe('getKeywordFeacnPairs', () => {
    it('should return empty array for invalid input', () => {
      const store = { keyWords: [] }
      expect(getKeywordFeacnPairs(null, store)).toEqual([])
      expect(getKeywordFeacnPairs([], store)).toEqual([])
    })

    it('should handle keywords without feacnCodes', () => {
      const store = {
        keyWords: [
          { id: 1, word: 'alpha' },
          { id: 2, word: 'beta', feacnCodes: null }
        ]
      }
      const result = getKeywordFeacnPairs([1, 2], store)
      expect(result).toEqual([])
    })

    it('should filter out null and empty codes', () => {
      const store = {
        keyWords: [{ id: 1, word: 'alpha', feacnCodes: ['123', null, '', '456'] }]
      }
      const result = getKeywordFeacnPairs([1], store)
      expect(result).toEqual([
        { id: '1-123', word: 'alpha', feacnCode: '123' },
        { id: '1-456', word: 'alpha', feacnCode: '456' }
      ])
    })
  })

  describe('getFeacnCodeItemClass', () => {
    it('should return basic class when allFeacnCodes is null', () => {
      const result = getFeacnCodeItemClass('123', '456', null)
      expect(result).toBe('feacn-code-item')
    })

    it('should return matching highlight class for matching FEACN code', () => {
      const result = getMatchingFeacnCodeItemClass('123', '123', ['123', '456'])
      expect(result).toBe('feacn-code-item clickable matched matching-feacn-code-item')
    })

    it('should return unmatched class when tnVed is null', () => {
      const result = getFeacnCodeItemClass('123', null, ['123', '456'])
      expect(result).toBe('feacn-code-item clickable unmatched')
    })

    it('should return matched-weak class when first 6 characters match', () => {
      const result = getFeacnCodeItemClass('1234567890', '1234561111', ['1234567890', '9876543210'])
      expect(result).toBe('feacn-code-item clickable matched-weak')
    })

  })

  describe('getTnVedCellClass', () => {
    it('should return not-exists when tnVed is provided but not found, even with null feacnCodes', async () => {
      const result = await getTnVedCellClass('123', null)
      expect(result).toBe('tnved-cell not-exists')
    })

    it('should return matched when tnVed exactly matches a feacnCode', async () => {
      // Mock the FEACN info to return found=true
      getCachedFeacnInfo.mockReturnValue({ found: true })
      preloadFeacnInfo.mockResolvedValue()

      const result = await getTnVedCellClass('1234567890', ['1234567890', '9876543210'])
      expect(result).toBe('tnved-cell matched')
    })

    it('should return matched-weak when first 6 characters match', async () => {
      // Mock the FEACN info to return found=true
      getCachedFeacnInfo.mockReturnValue({ found: true })
      preloadFeacnInfo.mockResolvedValue()

      const result = await getTnVedCellClass('1234567890', ['1234561111', '9876543210'])
      expect(result).toBe('tnved-cell matched-weak')
    })

    it('should return unmatched when first 6 characters do not match', async () => {
      getCachedFeacnInfo.mockReturnValue({ found: true })
      preloadFeacnInfo.mockResolvedValue()

      const result = await getTnVedCellClass('1234567890', ['9876543210', '1111111111'])
      expect(result).toBe('tnved-cell unmatched')
    })

    it('should use matchingFC as exact match when it equals tnVed even if not in feacnCodes', async () => {
      getCachedFeacnInfo.mockReturnValue({ found: true })
      preloadFeacnInfo.mockResolvedValue()

      // tnVed not in feacnCodes but matchingFC equals tnVed
      const result = await getTnVedCellClass(
        '7777777777',
        ['1234561111', '9876543210'],
        '7777777777'
      )
      expect(result).toBe('tnved-cell matched')
    })

  })

  describe('updateParcelTnVed', () => {
    it('should update parcel TN VED without calling loadOrdersFn when not provided', async () => {
      const mockStore = {
        update: vi.fn().mockResolvedValue(),
        error: ''
      }
      const item = { id: 123, tnVed: 'old-code' }
      const feacnCode = 'new-code'

      await updateParcelTnVed(item, feacnCode, mockStore, null)

      expect(mockStore.update).toHaveBeenCalledWith(123, { ...item, tnVed: 'new-code' })
    })

    it('should handle update errors with response message', async () => {
      const mockStore = {
        update: vi.fn().mockRejectedValue({
          response: { data: { message: 'Update failed' } }
        }),
        error: ''
      }
      const mockLoadOrders = vi.fn()
      const item = { id: 123, tnVed: 'old-code' }
      const feacnCode = 'new-code'

      await updateParcelTnVed(item, feacnCode, mockStore, mockLoadOrders)

      expect(mockStore.error).toBe('Update failed')
      expect(mockLoadOrders).toHaveBeenCalled()
    })

    it('should handle update errors with default message', async () => {
      const mockStore = {
        update: vi.fn().mockRejectedValue(new Error('Network error')),
        error: ''
      }
      const mockLoadOrders = vi.fn()
      const item = { id: 123, tnVed: 'old-code' }
      const feacnCode = 'new-code'

      await updateParcelTnVed(item, feacnCode, mockStore, mockLoadOrders)

      expect(mockStore.error).toBe('Ошибка при обновлении ТН ВЭД')
      expect(mockLoadOrders).toHaveBeenCalled()
    })
  })

  describe('loadParcels', () => {
    it('should not load parcels when component is not mounted', async () => {
      const mockParcelsStore = {
        getAll: vi.fn(),
        items: []
      }
      const mockIsComponentMounted = { value: false }
      const mockAlertStore = { error: vi.fn() }

      await loadParcels(123, mockParcelsStore, mockIsComponentMounted, mockAlertStore)

      expect(mockParcelsStore.getAll).not.toHaveBeenCalled()
    })

    it('should report FEACN preload errors and still update items', async () => {
      const mockResponse = {
        items: [{ id: 1, tnVed: '1234567890' }],
        pagination: { totalCount: 1, hasNextPage: false, hasPreviousPage: false }
      }
      const mockParcelsStore = {
        getAll: vi.fn().mockResolvedValue(mockResponse),
        updateItems: vi.fn()
      }
      const mockIsComponentMounted = { value: true }
      const mockAlertStore = { error: vi.fn() }
      preloadFeacnInfo.mockRejectedValueOnce(new Error('preload failed'))

      await loadParcels(123, mockParcelsStore, mockIsComponentMounted, mockAlertStore)

      expect(preloadFeacnInfo).toHaveBeenCalledWith(['1234567890'])
      expect(mockAlertStore.error).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'preload failed' }),
        { fallback: 'Не удалось загрузить информацию о кодах ТН ВЭД' }
      )
      expect(mockParcelsStore.updateItems).toHaveBeenCalledWith(mockResponse)
    })

  })
})
