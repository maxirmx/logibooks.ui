// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks frontend application

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

// Mock helper functions
vi.mock('../src/helpers/parcels.check.helpers.js', () => ({
  HasIssues: vi.fn(() => false)
}))

import {
  navigateToEditParcel,
  validateParcelData,
  exportParcelXmlData,
  approveParcelData,
  getRowPropsForParcel,
  filterGenericTemplateHeadersForParcel,
  generateRegisterName,
  lookupFeacn,
  getFeacnCodesForKeywords,
  getKeywordFeacnPairs
} from '../src/helpers/parcels.list.helpers.js'

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
    it('should navigate to correct route for WBR platform', () => {
      const mockRouter = {
        push: vi.fn()
      }
      const order = { id: 456 }

      navigateToEditParcel(mockRouter, order, 'wbr-parcel-edit', { registerId: 123 })

      expect(mockRouter.push).toHaveBeenCalledWith({
        name: 'wbr-parcel-edit',
        params: { id: 456, registerId: 123 },
        query: {}
      })
    })

    it('should navigate to correct route for Ozon platform', () => {
      const mockRouter = {
        push: vi.fn()
      }
      const order = { id: 789 }

      navigateToEditParcel(mockRouter, order, 'ozon-parcel-edit', { registerId: 456 })

      expect(mockRouter.push).toHaveBeenCalledWith({
        name: 'ozon-parcel-edit',
        params: { id: 789, registerId: 456 },
        query: {}
      })
    })
  })

  describe('validateParcelData', () => {
    it('should validate WBR parcel successfully', async () => {
      const mockStore = {
        validate: vi.fn().mockResolvedValue()
      }
      const mockLoadOrders = vi.fn()
      const item = { id: 123 }

      await validateParcelData(item, mockStore, mockLoadOrders)

      expect(mockStore.validate).toHaveBeenCalledWith(123)
      expect(mockLoadOrders).toHaveBeenCalled()
    })

    it('should handle validation errors', async () => {
      const mockStore = {
        validate: vi.fn().mockRejectedValue({
          response: { data: { message: 'Validation failed' } }
        }),
        error: ''
      }
      const mockLoadOrders = vi.fn()
      const item = { id: 123 }

      await validateParcelData(item, mockStore, mockLoadOrders)

      expect(mockStore.error).toBe('Validation failed')
      expect(mockLoadOrders).not.toHaveBeenCalled()
    })
  })

  describe('exportParcelXmlData', () => {
    it('should export parcel XML successfully with WBR filename format', async () => {
      const mockStore = {
        generate: vi.fn().mockResolvedValue(),
        error: ''
      }
      const item = { id: 123, shk: '123', postingNumber: 'POST-123' }
      const filename = '00000000000000000123'

      await exportParcelXmlData(item, mockStore, filename)

      expect(mockStore.generate).toHaveBeenCalledWith(123, '00000000000000000123')
    })

    it('should export parcel XML successfully with Ozon filename format', async () => {
      const mockStore = {
        generate: vi.fn().mockResolvedValue(),
        error: ''
      }
      const item = { id: 456, postingNumber: 'OZON-456' }
      const filename = 'OZON-456'

      await exportParcelXmlData(item, mockStore, filename)

      expect(mockStore.generate).toHaveBeenCalledWith(456, 'OZON-456')
    })

    it('should handle export errors', async () => {
      const mockStore = {
        generate: vi.fn().mockRejectedValue({
          response: { data: { message: 'Export failed' } }
        }),
        error: ''
      }
      const item = { id: 123, postingNumber: 'POST-123' }
      const filename = 'test-filename'

      await exportParcelXmlData(item, mockStore, filename)

      expect(mockStore.error).toBe('Export failed')
    })
  })

  describe('approveParcelData', () => {
    it('should approve parcel successfully', async () => {
      const mockStore = {
        approve: vi.fn().mockResolvedValue(),
        error: ''
      }
      const mockLoadOrders = vi.fn()
      const item = { id: 123 }

      await approveParcelData(item, mockStore, mockLoadOrders)

      expect(mockStore.approve).toHaveBeenCalledWith(123)
      expect(mockLoadOrders).toHaveBeenCalled()
    })

    it('should handle approval errors', async () => {
      const mockStore = {
        approve: vi.fn().mockRejectedValue({
          response: { data: { message: 'Approval failed' } }
        }),
        error: ''
      }
      const mockLoadOrders = vi.fn()
      const item = { id: 123 }

      await approveParcelData(item, mockStore, mockLoadOrders)

      expect(mockStore.error).toBe('Approval failed')
      expect(mockLoadOrders).not.toHaveBeenCalled()
    })
  })

  describe('lookupFeacn', () => {
    it('should lookup FEACN codes and reload orders', async () => {
      const mockStore = {
        lookupFeacnCode: vi.fn().mockResolvedValue(),
        error: ''
      }
      const mockLoadOrders = vi.fn()
      const item = { id: 123 }

      await lookupFeacn(item, mockStore, mockLoadOrders)

      expect(mockStore.lookupFeacnCode).toHaveBeenCalledWith(123)
      expect(mockLoadOrders).toHaveBeenCalled()
    })

    it('should handle lookup errors', async () => {
      const mockStore = {
        lookupFeacnCode: vi.fn().mockRejectedValue({
          response: { data: { message: 'Lookup failed' } }
        }),
        error: ''
      }
      const mockLoadOrders = vi.fn()
      const item = { id: 123 }

      await lookupFeacn(item, mockStore, mockLoadOrders)

      expect(mockStore.error).toBe('Lookup failed')
      expect(mockLoadOrders).not.toHaveBeenCalled()
    })
  })

  describe('getRowPropsForParcel', () => {
    it('should return class for parcel with issues', async () => {
      const { HasIssues } = await vi.importMock('../src/helpers/parcels.check.helpers.js')
      HasIssues.mockReturnValue(true)

      const data = {
        item: { checkStatusId: 2 }
      }

      const result = getRowPropsForParcel(data)

      expect(result).toEqual({ class: 'order-has-issues' })
      expect(HasIssues).toHaveBeenCalledWith(2)
    })

    it('should return empty class for parcel without issues', async () => {
      const { HasIssues } = await vi.importMock('../src/helpers/parcels.check.helpers.js')
      HasIssues.mockReturnValue(false)

      const data = {
        item: { checkStatusId: 1 }
      }

      const result = getRowPropsForParcel(data)

      expect(result).toEqual({ class: '' })
      expect(HasIssues).toHaveBeenCalledWith(1)
    })
  })

  describe('filterGenericTemplateHeadersForParcel', () => {
    it('should filter out excluded headers', () => {
      const headers = [
        { key: 'actions', title: 'Actions' },
        { key: 'productLink', title: 'Product Link' },
        { key: 'statusId', title: 'Status' },
        { key: 'checkStatusId', title: 'Check Status' },
        { key: 'countryCode', title: 'Country' },
        { key: 'productName', title: 'Product Name' },
        { key: 'quantity', title: 'Quantity' }
      ]

      const result = filterGenericTemplateHeadersForParcel(headers)

      expect(result).toEqual([
        { key: 'productName', title: 'Product Name' },
        { key: 'quantity', title: 'Quantity' }
      ])
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

    it('should generate name with whitespace deal number', () => {
      const result = generateRegisterName('   ', 'file.xlsx')

      expect(result).toBe('Реестр для сделки без номера (файл: file.xlsx)')
    })
  })

  describe('getFeacnCodesForKeywords', () => {
    it('should extract and sort FEACN codes from keywords', () => {
      const store = {
        keyWords: [
          { id: 1, feacnCodes: ['1234567890', '0987654321'] },
          { id: 2, feacnCodes: ['2345678901'] }
        ]
      }
      const result = getFeacnCodesForKeywords([1, 2], store)
      expect(result).toEqual(['0987654321', '1234567890', '2345678901'])
    })

    it('should return empty array for invalid input', () => {
      const store = { keyWords: [] }
      expect(getFeacnCodesForKeywords(null, store)).toEqual([])
      expect(getFeacnCodesForKeywords([], store)).toEqual([])
    })
  })

  describe('getKeywordFeacnPairs', () => {
    it('should create keyword/FEACN code pairs', () => {
      const store = {
        keyWords: [
          { id: 1, word: 'alpha', feacnCodes: ['123', '456'] },
          { id: 2, word: 'beta', feacnCodes: ['789'] }
        ]
      }
      const result = getKeywordFeacnPairs([1, 2], store)
      expect(result).toEqual([
        { id: '1-123', word: 'alpha', feacnCode: '123' },
        { id: '1-456', word: 'alpha', feacnCode: '456' },
        { id: '2-789', word: 'beta', feacnCode: '789' }
      ])
    })

    it('should return empty array for invalid input', () => {
      const store = { keyWords: [] }
      expect(getKeywordFeacnPairs(null, store)).toEqual([])
      expect(getKeywordFeacnPairs([], store)).toEqual([])
    })
  })

})
