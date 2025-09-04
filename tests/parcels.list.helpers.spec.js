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
  getKeywordFeacnPairs,
  getFeacnCodeItemClass,
  getTnVedCellClass,
  updateParcelTnVed,
  loadOrders
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
        query: { returnTo: 'list', tab: 'details' }
      })
    })

    it('should navigate with empty query parameters when only registerId provided', () => {
      const mockRouter = {
        push: vi.fn()
      }
      const order = { id: 123 }

      navigateToEditParcel(mockRouter, order, 'parcel-edit', { registerId: 456 })

      expect(mockRouter.push).toHaveBeenCalledWith({
        name: 'parcel-edit',
        params: { id: 123, registerId: 456 },
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

    it('should handle validation errors with default message', async () => {
      const mockStore = {
        validate: vi.fn().mockRejectedValue(new Error('Network error')),
        error: ''
      }
      const mockLoadOrders = vi.fn()
      const item = { id: 123 }

      await validateParcelData(item, mockStore, mockLoadOrders)

      expect(mockStore.error).toBe('Ошибка при проверке информации о посылке')
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

    it('should handle export errors with default message', async () => {
      const mockStore = {
        generate: vi.fn().mockRejectedValue(new Error('Network error')),
        error: ''
      }
      const item = { id: 123, postingNumber: 'POST-123' }
      const filename = 'test-filename'

      await exportParcelXmlData(item, mockStore, filename)

      expect(mockStore.error).toBe('Ошибка при выгрузке накладной для посылки')
    })
  })

  describe('approveParcelData', () => {
    it('should approve parcel successfully (default withExcise=false)', async () => {
      const mockStore = {
        approve: vi.fn().mockResolvedValue(),
        error: ''
      }
      const mockLoadOrders = vi.fn()
      const item = { id: 123 }

      await approveParcelData(item, mockStore, mockLoadOrders)

      expect(mockStore.approve).toHaveBeenCalledWith(123, false)
      expect(mockLoadOrders).toHaveBeenCalled()
    })

    it('should approve parcel with excise when withExcise=true', async () => {
      const mockStore = {
        approve: vi.fn().mockResolvedValue(),
        error: ''
      }
      const mockLoadOrders = vi.fn()
      const item = { id: 123 }

      await approveParcelData(item, mockStore, mockLoadOrders, true)

      expect(mockStore.approve).toHaveBeenCalledWith(123, true)
      expect(mockLoadOrders).toHaveBeenCalled()
    })

    it('should handle approval errors without excise', async () => {
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

    it('should handle approval errors with excise and show appropriate message', async () => {
      const mockStore = {
        approve: vi.fn().mockRejectedValue(new Error('Network error')),
        error: ''
      }
      const mockLoadOrders = vi.fn()
      const item = { id: 123 }

      await approveParcelData(item, mockStore, mockLoadOrders, true)

      expect(mockStore.error).toBe('Ошибка при согласовании посылки с акцизом')
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

    it('should lookup FEACN codes without calling loadOrdersFn when not provided', async () => {
      const mockStore = {
        lookupFeacnCode: vi.fn().mockResolvedValue(),
        error: ''
      }
      const item = { id: 123 }

      await lookupFeacn(item, mockStore, null)

      expect(mockStore.lookupFeacnCode).toHaveBeenCalledWith(123)
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

    it('should handle lookup errors with default message', async () => {
      const mockStore = {
        lookupFeacnCode: vi.fn().mockRejectedValue(new Error('Network error')),
        error: ''
      }
      const mockLoadOrders = vi.fn()
      const item = { id: 123 }

      await lookupFeacn(item, mockStore, mockLoadOrders)

      expect(mockStore.error).toBe('Ошибка при подборе кодов ТН ВЭД')
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
        { key: 'feacnLookup', title: 'FEACN Lookup' },
        { key: 'tnVed', title: 'TN VED' },
        { key: 'productName', title: 'Product Name' },
        { key: 'quantity', title: 'Quantity' }
      ]

      const result = filterGenericTemplateHeadersForParcel(headers)

      expect(result).toEqual([
        { key: 'productName', title: 'Product Name' },
        { key: 'quantity', title: 'Quantity' }
      ])
    })

    it('should filter out actions with different suffixes', () => {
      const headers = [
        { key: 'actionsEdit', title: 'Edit Actions' },
        { key: 'actionsDelete', title: 'Delete Actions' },
        { key: 'productName', title: 'Product Name' }
      ]

      const result = filterGenericTemplateHeadersForParcel(headers)

      expect(result).toEqual([
        { key: 'productName', title: 'Product Name' }
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

    it('should generate name with null deal number', () => {
      const result = generateRegisterName(null, 'file.xlsx')

      expect(result).toBe('Реестр для сделки без номера (файл: file.xlsx)')
    })

    it('should generate name with undefined deal number', () => {
      const result = generateRegisterName(undefined, 'file.xlsx')

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

    it('should handle keywords without feacnCodes', () => {
      const store = {
        keyWords: [
          { id: 1 },
          { id: 2, feacnCodes: null }
        ]
      }
      const result = getFeacnCodesForKeywords([1, 2], store)
      expect(result).toEqual([])
    })

    it('should filter out null and empty codes', () => {
      const store = {
        keyWords: [
          { id: 1, feacnCodes: ['123', null, '', '456'] }
        ]
      }
      const result = getFeacnCodesForKeywords([1], store)
      expect(result).toEqual(['123', '456'])
    })

    it('should handle keywords not found in store', () => {
      const store = {
        keyWords: [
          { id: 1, feacnCodes: ['123'] }
        ]
      }
      const result = getFeacnCodesForKeywords([1, 999], store)
      expect(result).toEqual(['123'])
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
        keyWords: [
          { id: 1, word: 'alpha', feacnCodes: ['123', null, '', '456'] }
        ]
      }
      const result = getKeywordFeacnPairs([1], store)
      expect(result).toEqual([
        { id: '1-123', word: 'alpha', feacnCode: '123' },
        { id: '1-456', word: 'alpha', feacnCode: '456' }
      ])
    })
  })

  describe('getFeacnCodeItemClass', () => {
    it('should return basic class when no FEACN codes provided', () => {
      const result = getFeacnCodeItemClass('123', '456', [])
      expect(result).toBe('feacn-code-item')
    })

    it('should return basic class when allFeacnCodes is null', () => {
      const result = getFeacnCodeItemClass('123', '456', null)
      expect(result).toBe('feacn-code-item')
    })

    it('should return matched class when feacnCode matches tnVed and is in allFeacnCodes', () => {
      const result = getFeacnCodeItemClass('123', '123', ['123', '456'])
      expect(result).toBe('feacn-code-item clickable matched')
    })

    it('should return unmatched class when feacnCode does not match tnVed', () => {
      const result = getFeacnCodeItemClass('123', '456', ['123', '456'])
      expect(result).toBe('feacn-code-item clickable unmatched')
    })

    it('should return unmatched class when tnVed is not in allFeacnCodes', () => {
      const result = getFeacnCodeItemClass('123', '789', ['123', '456'])
      expect(result).toBe('feacn-code-item clickable unmatched')
    })

    it('should return unmatched class when tnVed is null', () => {
      const result = getFeacnCodeItemClass('123', null, ['123', '456'])
      expect(result).toBe('feacn-code-item clickable unmatched')
    })
  })

  describe('getTnVedCellClass', () => {
    it('should return not-exists when tnVed is provided but not found, even with empty feacnCodes', async () => {
      const result = await getTnVedCellClass('123', [])
      expect(result).toBe('tnved-cell not-exists')
    })

    it('should return not-exists when tnVed is provided but not found, even with null feacnCodes', async () => {
      const result = await getTnVedCellClass('123', null)
      expect(result).toBe('tnved-cell not-exists')
    })

    it('should return orphan when no tnVed is provided and feacnCodes is empty', async () => {
      const result = await getTnVedCellClass('', [])
      expect(result).toBe('tnved-cell orphan')
    })

    it('should return orphan when no tnVed is provided and feacnCodes is null', async () => {
      const result = await getTnVedCellClass(null, null)
      expect(result).toBe('tnved-cell orphan')
    })
  })

  describe('updateParcelTnVed', () => {
    it('should update parcel TN VED successfully', async () => {
      const mockStore = {
        update: vi.fn().mockResolvedValue(),
        error: ''
      }
      const mockLoadOrders = vi.fn()
      const item = { id: 123, tnVed: 'old-code' }
      const feacnCode = 'new-code'

      await updateParcelTnVed(item, feacnCode, mockStore, mockLoadOrders)

      expect(mockStore.update).toHaveBeenCalledWith(123, { ...item, tnVed: 'new-code' })
      expect(mockLoadOrders).toHaveBeenCalled()
    })

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
      expect(mockLoadOrders).not.toHaveBeenCalled()
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
      expect(mockLoadOrders).not.toHaveBeenCalled()
    })
  })

  describe('loadOrders', () => {
    it('should not load orders when component is not mounted', async () => {
      const mockParcelsStore = {
        getAll: vi.fn(),
        items: []
      }
      const mockIsComponentMounted = { value: false }
      const mockAlertStore = { error: vi.fn() }

      await loadOrders(123, mockParcelsStore, mockIsComponentMounted, mockAlertStore)

      expect(mockParcelsStore.getAll).not.toHaveBeenCalled()
    })
  })

})
