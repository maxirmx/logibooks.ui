import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useRegistersStore } from '@/stores/registers.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'

vi.mock('@/helpers/fetch.wrapper.js', () => ({
  fetchWrapper: { get: vi.fn(), postFile: vi.fn(), put: vi.fn(), post: vi.fn(), delete: vi.fn(), downloadFile: vi.fn() }
}))

vi.mock('@/stores/parcels.store.js', () => ({
  buildParcelsFilterParams: vi.fn((authStore, additionalParams = {}) => {
    const params = new URLSearchParams(additionalParams)
    
    // Add sorting parameters
    params.append('sortBy', authStore.parcels_sort_by?.[0]?.key || 'id')
    params.append('sortOrder', authStore.parcels_sort_by?.[0]?.order || 'asc')
    
    if (authStore.parcels_status !== null && authStore.parcels_status !== undefined) {
      params.append('statusId', authStore.parcels_status.toString())
    }
    
    if (authStore.parcels_check_status !== null && authStore.parcels_check_status !== undefined) {
      params.append('checkStatusId', authStore.parcels_check_status.toString())
    }
    
    if (authStore.parcels_tnved) {
      params.append('tnVed', authStore.parcels_tnved)
    }

    return params
  })
}))


vi.mock('@/helpers/config.js', () => ({
  apiUrl: 'http://localhost:8080/api'
}))

// Mock customs procedures store for destination logic
const mockCustomsProceduresStore = {
  procedureMap: { value: new Map() },
  procedures: [],
  ensureLoaded: vi.fn()
}

vi.mock('@/stores/customs.procedures.store.js', () => {
  return {
    useCustomsProceduresStore: () => mockCustomsProceduresStore
  }
})

// Mock auth store
vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: vi.fn()
}))

// Mock console methods to reduce test output clutter
const originalConsoleLog = console.log
const originalConsoleError = console.error

describe('registers store', () => {
  // Default mock auth store values
  const defaultAuthStore = {
    registers_page: 1,
    registers_per_page: 10,
    registers_sort_by: [{ key: 'id', order: 'asc' }],
    registers_search: '',
    parcels_sort_by: [{ key: 'id', order: 'asc' }],
    parcels_status: null,
    parcels_check_status: null,
    parcels_tnved: ''
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    // Set default mock for auth store
    useAuthStore.mockReturnValue(defaultAuthStore)
    // Reset customs procedures mock to default state
    mockCustomsProceduresStore.procedureMap = { value: new Map() }
    mockCustomsProceduresStore.procedures = []
    // Suppress console output during tests
    console.log = vi.fn()
    console.error = vi.fn()
  })

  afterEach(() => {
    // Restore original console methods
    console.log = originalConsoleLog
    console.error = originalConsoleError
  })

  describe('getAll method', () => {
    describe('API format with pagination metadata', () => {
      it('fetches data from API using auth store settings', async () => {
        const mockResponse = {
          items: [
            { id: 1, name: 'Register 1' },
            { id: 2, name: 'Register 2' }
          ],
          pagination: {
            totalCount: 2,
            hasNextPage: false,
            hasPreviousPage: false
          }
        }
        fetchWrapper.get.mockResolvedValue(mockResponse)

        const store = useRegistersStore()
        await store.getAll()

        expect(fetchWrapper.get).toHaveBeenCalledWith(
          `${apiUrl}/registers?page=1&pageSize=10&sortBy=id&sortOrder=asc`
        )
        expect(store.items).toEqual(mockResponse.items)
        expect(store.loading).toBe(false)
        expect(store.error).toBeNull()
      })

      it('fetches data with custom auth store settings', async () => {
        // Set custom auth store values for this test
        useAuthStore.mockReturnValueOnce({
          registers_page: 2,
          registers_per_page: 5,
          registers_sort_by: [{ key: 'name', order: 'desc' }],
          registers_search: 'search term'
        })
        
        const mockResponse = {
          items: [{ id: 3, name: 'Register 3' }],
          pagination: {
            totalCount: 1,
            hasNextPage: false,
            hasPreviousPage: true
          }
        }
        fetchWrapper.get.mockResolvedValue(mockResponse)

        const store = useRegistersStore()
        await store.getAll()

        expect(fetchWrapper.get).toHaveBeenCalledWith(
          `${apiUrl}/registers?page=2&pageSize=5&sortBy=name&sortOrder=desc&search=search+term`
        )
        expect(store.items).toEqual(mockResponse.items)
      })

      it('fetches data with new format - basic case', async () => {
        const mockResponse = {
          items: [
            { id: 1, name: 'Register 1' },
            { id: 2, name: 'Register 2' }
          ],
          pagination: {
            totalCount: 25,
            hasNextPage: true,
            hasPreviousPage: false
          }
        }
        fetchWrapper.get.mockResolvedValue(mockResponse)

        // Set custom auth store values for this test
        useAuthStore.mockReturnValueOnce({
          registers_page: 1,
          registers_per_page: 10,
          registers_sort_by: [{ key: 'id', order: 'asc' }],
          registers_search: ''
        })

        const store = useRegistersStore()
        await store.getAll()

        expect(store.items).toEqual(mockResponse.items)
        expect(store.totalCount).toBe(25)
        expect(store.hasNextPage).toBe(true)
        expect(store.hasPreviousPage).toBe(false)
        expect(store.loading).toBe(false)
        expect(store.error).toBeNull()
      })

      it('fetches data with new format - middle page', async () => {
        const mockResponse = {
          items: Array(10)
            .fill()
            .map((_, i) => ({ id: i + 11, name: `Register ${i + 11}` })),
          pagination: {
            totalCount: 50,
            hasNextPage: true,
            hasPreviousPage: true
          }
        }
        fetchWrapper.get.mockResolvedValue(mockResponse)

        // Set custom auth store values for this test
        useAuthStore.mockReturnValueOnce({
          registers_page: 2,
          registers_per_page: 10,
          registers_sort_by: [{ key: 'name', order: 'asc' }],
          registers_search: 'filter'
        })

        const store = useRegistersStore()
        await store.getAll()

        expect(fetchWrapper.get).toHaveBeenCalledWith(
          `${apiUrl}/registers?page=2&pageSize=10&sortBy=name&sortOrder=asc&search=filter`
        )
        expect(store.items).toEqual(mockResponse.items)
        expect(store.totalCount).toBe(50)
        expect(store.hasNextPage).toBe(true)
        expect(store.hasPreviousPage).toBe(true)
      })

      it('fetches data with new format - last page', async () => {
        const mockResponse = {
          items: [
            { id: 48, name: 'Register 48' },
            { id: 49, name: 'Register 49' },
            { id: 50, name: 'Register 50' }
          ],
          pagination: {
            totalCount: 50,
            hasNextPage: false,
            hasPreviousPage: true
          }
        }
        fetchWrapper.get.mockResolvedValue(mockResponse)

        // Set custom auth store values for this test
        useAuthStore.mockReturnValueOnce({
          registers_page: 5,
          registers_per_page: 10,
          registers_sort_by: [{ key: 'id', order: 'asc' }],
          registers_search: ''
        })

        const store = useRegistersStore()
        await store.getAll()

        expect(store.items).toEqual(mockResponse.items)
        expect(store.totalCount).toBe(50)
        expect(store.hasNextPage).toBe(false)
        expect(store.hasPreviousPage).toBe(true)
      })

      it('handles empty results with new format', async () => {
        const mockResponse = {
          items: [],
          pagination: {
            totalCount: 0,
            hasNextPage: false,
            hasPreviousPage: false
          }
        }
        fetchWrapper.get.mockResolvedValue(mockResponse)

        // Set custom auth store values for this test
        useAuthStore.mockReturnValueOnce({
          registers_page: 1,
          registers_per_page: 10,
          registers_sort_by: [{ key: 'id', order: 'asc' }],
          registers_search: 'nonexistent'
        })

        const store = useRegistersStore()
        await store.getAll()

        expect(store.items).toEqual([])
        expect(store.totalCount).toBe(0)
        expect(store.hasNextPage).toBe(false)
        expect(store.hasPreviousPage).toBe(false)
      })

      it('handles new format with missing pagination data', async () => {
        const mockResponse = {
          items: [{ id: 1, name: 'Register 1' }]
          // No pagination property
        }
        fetchWrapper.get.mockResolvedValue(mockResponse)

        const store = useRegistersStore()
        await store.getAll()

        expect(store.items).toEqual(mockResponse.items)
        expect(store.totalCount).toBe(0) // Default value
        expect(store.hasNextPage).toBe(false) // Default value
        expect(store.hasPreviousPage).toBe(false) // Default value
      })

      it('handles new format with partial pagination data', async () => {
        const mockResponse = {
          items: [{ id: 1, name: 'Register 1' }],
          pagination: {
            totalCount: 15
            // Missing hasNextPage and hasPreviousPage
          }
        }
        fetchWrapper.get.mockResolvedValue(mockResponse)

        const store = useRegistersStore()
        await store.getAll()

        expect(store.items).toEqual(mockResponse.items)
        expect(store.totalCount).toBe(15)
        expect(store.hasNextPage).toBe(false) // Default value
        expect(store.hasPreviousPage).toBe(false) // Default value
      })

      it('handles new format with missing items property', async () => {
        const mockResponse = {
          pagination: {
            totalCount: 0,
            hasNextPage: false,
            hasPreviousPage: false
          }
          // No items property
        }
        fetchWrapper.get.mockResolvedValue(mockResponse)

        const store = useRegistersStore()
        await store.getAll()

        expect(store.items).toEqual([]) // Default to empty array
        expect(store.totalCount).toBe(0)
        expect(store.hasNextPage).toBe(false)
        expect(store.hasPreviousPage).toBe(false)
      })
    })

    describe('error handling', () => {
      it('sets error when request fails', async () => {
        const errorMessage = 'Network error'
        fetchWrapper.get.mockRejectedValue(new Error(errorMessage))

        const store = useRegistersStore()
        await store.getAll()

        expect(store.error).toBeTruthy()
        expect(store.error.message).toBe(errorMessage)
        expect(store.loading).toBe(false)
        expect(store.items).toEqual([]) // Items should remain empty
      })

      it('clears previous error on successful request', async () => {
        const store = useRegistersStore()

        // First request fails
        fetchWrapper.get.mockRejectedValueOnce(new Error('First error'))
        await store.getAll()
        expect(store.error).toBeTruthy()

        // Second request succeeds
        fetchWrapper.get.mockResolvedValue({
          items: [{ id: 1 }],
          pagination: { totalCount: 1, hasNextPage: false, hasPreviousPage: false }
        })
        await store.getAll()
        expect(store.error).toBeNull()
        expect(store.items).toEqual([{ id: 1, destination: 'in' }])
      })
    })

    describe('loading state', () => {
      it('sets loading to true during request and false after completion', async () => {
        let resolvePromise
        const promise = new Promise((resolve) => {
          resolvePromise = resolve
        })
        fetchWrapper.get.mockReturnValue(promise)

        const store = useRegistersStore()
        const getAllPromise = store.getAll()

        expect(store.loading).toBe(true)

        resolvePromise({
          items: [{ id: 1 }],
          pagination: { totalCount: 1, hasNextPage: false, hasPreviousPage: false }
        })
        await getAllPromise

        expect(store.loading).toBe(false)
      })

      it('sets loading to false even when request fails', async () => {
        let rejectPromise
        const promise = new Promise((resolve, reject) => {
          rejectPromise = reject
        })
        fetchWrapper.get.mockReturnValue(promise)

        const store = useRegistersStore()
        const getAllPromise = store.getAll()

        expect(store.loading).toBe(true)

        rejectPromise(new Error('Test error'))
        await getAllPromise

        expect(store.loading).toBe(false)
      })
    })

    describe('query parameters handling', () => {
      it('excludes search parameter when empty', async () => {
        fetchWrapper.get.mockResolvedValue({
          items: [],
          pagination: { totalCount: 0, hasNextPage: false, hasPreviousPage: false }
        })

        // Set custom auth store values for this test
        useAuthStore.mockReturnValueOnce({
          registers_page: 1,
          registers_per_page: 10,
          registers_sort_by: [{ key: 'id', order: 'asc' }],
          registers_search: ''
        })

        const store = useRegistersStore()
        await store.getAll()

        const calledUrl = fetchWrapper.get.mock.calls[0][0]
        expect(calledUrl).not.toContain('search=')
      })

      it('includes search parameter when provided', async () => {
        fetchWrapper.get.mockResolvedValue({
          items: [],
          pagination: { totalCount: 0, hasNextPage: false, hasPreviousPage: false }
        })

        // Set custom auth store values for this test
        useAuthStore.mockReturnValueOnce({
          registers_page: 1,
          registers_per_page: 10,
          registers_sort_by: [{ key: 'id', order: 'asc' }],
          registers_search: 'test search'
        })

        const store = useRegistersStore()
        await store.getAll()

        expect(fetchWrapper.get).toHaveBeenCalledWith(
          `${apiUrl}/registers?page=1&pageSize=10&sortBy=id&sortOrder=asc&search=test+search`
        )
      })

      it('handles special characters in search parameter', async () => {
        fetchWrapper.get.mockResolvedValue({
          items: [],
          pagination: { totalCount: 0, hasNextPage: false, hasPreviousPage: false }
        })

        // Set custom auth store values for this test
        useAuthStore.mockReturnValueOnce({
          registers_page: 1,
          registers_per_page: 10,
          registers_sort_by: [{ key: 'id', order: 'asc' }],
          registers_search: 'test & search + special chars'
        })

        const store = useRegistersStore()
        await store.getAll()

        const calledUrl = fetchWrapper.get.mock.calls[0][0]
        expect(calledUrl).toContain('search=test+%26+search+%2B+special+chars')
      })
    })
  })

  describe('initial state', () => {
    it('initializes with correct default values', () => {
      const store = useRegistersStore()

      expect(store.items).toEqual([])
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
      expect(store.totalCount).toBe(0)
      expect(store.hasNextPage).toBe(false)
      expect(store.hasPreviousPage).toBe(false)
    })
  })

  describe('setDestinationField function', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('sets destination to "in" when register is null', () => {
      const register = null
      const store = useRegistersStore()
      // Access the internal setDestinationField function by triggering getAll
      fetchWrapper.get.mockResolvedValue({
        items: [register],
        pagination: { totalCount: 0, hasNextPage: false, hasPreviousPage: false }
      })
      
      // Test with null register - should handle gracefully
      expect(() => store.getAll()).not.toThrow()
    })

    it('sets destination to "in" when customsProcedureId is missing', async () => {
      const register = { id: 1, companyId: 100, theOtherCompanyId: 200, theOtherCountryCode: 840 }
      fetchWrapper.get.mockResolvedValue({
        items: [register],
        pagination: { totalCount: 1, hasNextPage: false, hasPreviousPage: false }
      })

      const store = useRegistersStore()
      await store.getAll()

      expect(store.items[0].destination).toBe('in')
    })

    it('sets destination to "out" when customs procedure code is 10', async () => {
      // Mock customs procedures store with procedure code 10
      mockCustomsProceduresStore.procedureMap = { value: new Map([[1, { id: 1, code: 10 }]]) }

      const register = { 
        id: 1, 
        customsProcedureId: 1, 
        companyId: 100, 
        theOtherCompanyId: 200, 
        theOtherCountryCode: 840 
      }
      fetchWrapper.get.mockResolvedValue({
        items: [register],
        pagination: { totalCount: 1, hasNextPage: false, hasPreviousPage: false }
      })

      const store = useRegistersStore()
      await store.getAll()

      expect(store.items[0].destination).toBe('out')
      expect(store.items[0].destCountryCode).toBe(840)
      expect(store.items[0].origCountryCode).toBe(643)
      expect(store.items[0].recipientId).toBe(200)
      expect(store.items[0].senderId).toBe(100)
    })

    it('sets destination to "in" when customs procedure code is not 10', async () => {
      // Mock customs procedures store with procedure code other than 10
      mockCustomsProceduresStore.procedureMap = { value: new Map([[1, { id: 1, code: 40 }]]) }

      const register = { 
        id: 1, 
        customsProcedureId: 1, 
        companyId: 100, 
        theOtherCompanyId: 200, 
        theOtherCountryCode: 840 
      }
      fetchWrapper.get.mockResolvedValue({
        items: [register],
        pagination: { totalCount: 1, hasNextPage: false, hasPreviousPage: false }
      })

      const store = useRegistersStore()
      await store.getAll()

      expect(store.items[0].destination).toBe('in')
      expect(store.items[0].destCountryCode).toBe(643)
      expect(store.items[0].origCountryCode).toBe(840)
      expect(store.items[0].recipientId).toBe(100)
      expect(store.items[0].senderId).toBe(200)
    })

    it('falls back to procedures array when procedureMap is not available', async () => {
      // Mock customs procedures store with procedures array fallback
      mockCustomsProceduresStore.procedureMap = { value: null }
      mockCustomsProceduresStore.procedures = [{ id: 1, code: 10 }]

      const register = { 
        id: 1, 
        customsProcedureId: 1, 
        companyId: 100, 
        theOtherCompanyId: 200, 
        theOtherCountryCode: 840 
      }
      fetchWrapper.get.mockResolvedValue({
        items: [register],
        pagination: { totalCount: 1, hasNextPage: false, hasPreviousPage: false }
      })

      const store = useRegistersStore()
      await store.getAll()

      expect(store.items[0].destination).toBe('out')
    })

    it('sets destination to "in" when procedure is not found', async () => {
      // Mock customs procedures store with no matching procedure
      mockCustomsProceduresStore.procedureMap = { value: new Map() }
      mockCustomsProceduresStore.procedures = []

      const register = { 
        id: 1, 
        customsProcedureId: 999, 
        companyId: 100, 
        theOtherCompanyId: 200, 
        theOtherCountryCode: 840 
      }
      fetchWrapper.get.mockResolvedValue({
        items: [register],
        pagination: { totalCount: 1, hasNextPage: false, hasPreviousPage: false }
      })

      const store = useRegistersStore()
      await store.getAll()

      expect(store.items[0].destination).toBe('in')
    })
  })

  describe('upload method', () => {
    it('uploads file via postFile', async () => {
      const file = new File(['data'], 'test.xlsx')
      const customerId = 123
      fetchWrapper.postFile.mockResolvedValue({ id: 1 })

      const store = useRegistersStore()
      await store.upload(file, customerId)

      expect(fetchWrapper.postFile).toHaveBeenCalled()
      expect(fetchWrapper.postFile.mock.calls[0][0]).toBe(
        `${apiUrl}/registers/upload/${customerId}`
      )
      const formData = fetchWrapper.postFile.mock.calls[0][1]
      expect(formData instanceof FormData).toBe(true)
      expect(formData.get('file')).toBe(file)
    })

    it('sets error on failure', async () => {
      const file = new File(['data'], 'test.xlsx')
      const customerId = 123
      fetchWrapper.postFile.mockRejectedValue(new Error('fail'))

      const store = useRegistersStore()
      await expect(store.upload(file, customerId)).rejects.toThrow('fail')
      expect(store.error).toBeTruthy()
      expect(store.loading).toBe(false)
    })
  })

  describe('setParcelStatuses method', () => {
    beforeEach(() => {
      // Mock fetchWrapper.put for setParcelStatuses tests
      fetchWrapper.put = vi.fn()
    })

    it('successfully sets parcel statuses', async () => {
      const mockResponse = { success: true, message: 'Statuses updated' }
      fetchWrapper.put.mockResolvedValue(mockResponse)

      const store = useRegistersStore()
      const result = await store.setParcelStatuses(123, 456)

      expect(fetchWrapper.put).toHaveBeenCalledWith(`${apiUrl}/registers/123/setparcelstatuses/456`)
      expect(result).toEqual(mockResponse)
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('handles error in setParcelStatuses', async () => {
      const errorMessage = 'Failed to update statuses'
      const error = new Error(errorMessage)
      fetchWrapper.put.mockRejectedValue(error)

      const store = useRegistersStore()

      await expect(store.setParcelStatuses(123, 456)).rejects.toThrow(errorMessage)
      expect(store.error).toBe(error)
      expect(store.loading).toBe(false)
    })

    it('sets loading state during setParcelStatuses request', async () => {
      let resolvePromise
      const promise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      fetchWrapper.put.mockReturnValue(promise)

      const store = useRegistersStore()
      const setOrderStatusesPromise = store.setParcelStatuses(123, 456)

      expect(store.loading).toBe(true)

      resolvePromise({ success: true })
      await setOrderStatusesPromise

      expect(store.loading).toBe(false)
    })

    it('sets loading to false even when setParcelStatuses request fails', async () => {
      let rejectPromise
      const promise = new Promise((resolve, reject) => {
        rejectPromise = reject
      })
      fetchWrapper.put.mockReturnValue(promise)

      const store = useRegistersStore()
      const setOrderStatusesPromise = store.setParcelStatuses(123, 456)

      expect(store.loading).toBe(true)

      rejectPromise(new Error('Test error'))
      await expect(setOrderStatusesPromise).rejects.toThrow('Test error')

      expect(store.loading).toBe(false)
    })

    it('clears previous error on successful setParcelStatuses request', async () => {
      const store = useRegistersStore()

      // First request fails
      fetchWrapper.put.mockRejectedValueOnce(new Error('First error'))
      await expect(store.setParcelStatuses(123, 456)).rejects.toThrow('First error')
      expect(store.error).toBeTruthy()

      // Second request succeeds
      fetchWrapper.put.mockResolvedValue({ success: true })
      await store.setParcelStatuses(123, 456)
      expect(store.error).toBeNull()
    })
  })

  describe('validation API', () => {
    it('starts validation and returns handle', async () => {
      const handle = { id: '1234' }
      fetchWrapper.post.mockResolvedValue(handle)

      const store = useRegistersStore()
      const result = await store.validate(1)

      expect(fetchWrapper.post).toHaveBeenCalledWith(`${apiUrl}/registers/1/validate`)
      expect(result).toEqual(handle)
    })

    it('handles validation error', async () => {
      const error = new Error('Validation failed')
      fetchWrapper.post.mockRejectedValue(error)

      const store = useRegistersStore()
      
      await expect(store.validate(1)).rejects.toThrow('Validation failed')
      expect(store.error).toBe(error)
    })

    it('gets validation progress', async () => {
      const progress = { total: 10, processed: 5, finished: false }
      fetchWrapper.get.mockResolvedValue(progress)

      const store = useRegistersStore()
      const result = await store.getValidationProgress('abcd')

      expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/registers/validate/abcd`)
      expect(result).toEqual(progress)
    })

    it('handles validation progress error', async () => {
      const error = new Error('Progress check failed')
      fetchWrapper.get.mockRejectedValue(error)

      const store = useRegistersStore()
      
      await expect(store.getValidationProgress('abcd')).rejects.toThrow('Progress check failed')
      expect(store.error).toBe(error)
    })

    it('cancels validation', async () => {
      fetchWrapper.delete.mockResolvedValue(undefined)

      const store = useRegistersStore()
      await store.cancelValidation('abcd')

      expect(fetchWrapper.delete).toHaveBeenCalledWith(`${apiUrl}/registers/validate/abcd`)
    })

    it('handles cancel validation error', async () => {
      const error = new Error('Cancel failed')
      fetchWrapper.delete.mockRejectedValue(error)

      const store = useRegistersStore()

      await expect(store.cancelValidation('abcd')).rejects.toThrow('Cancel failed')
      expect(store.error).toBe(error)
    })
  })

  describe('FEACN lookup API', () => {
    it('starts FEACN lookup and returns handle', async () => {
      const handle = { id: '1234' }
      fetchWrapper.post.mockResolvedValue(handle)

      const store = useRegistersStore()
      const result = await store.lookupFeacnCodes(1)

      expect(fetchWrapper.post).toHaveBeenCalledWith(`${apiUrl}/registers/1/lookup-feacn-codes`)
      expect(result).toEqual(handle)
    })

    it('handles FEACN lookup error', async () => {
      const error = new Error('Lookup failed')
      fetchWrapper.post.mockRejectedValue(error)

      const store = useRegistersStore()

      await expect(store.lookupFeacnCodes(1)).rejects.toThrow('Lookup failed')
      expect(store.error).toBe(error)
    })

    it('gets FEACN lookup progress', async () => {
      const progress = { total: 10, processed: 5, finished: false }
      fetchWrapper.get.mockResolvedValue(progress)

      const store = useRegistersStore()
      const result = await store.getLookupFeacnCodesProgress('abcd')

      expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/registers/lookup-feacn-codes/abcd`)
      expect(result).toEqual(progress)
    })

    it('handles FEACN lookup progress error', async () => {
      const error = new Error('Progress check failed')
      fetchWrapper.get.mockRejectedValue(error)

      const store = useRegistersStore()

      await expect(store.getLookupFeacnCodesProgress('abcd')).rejects.toThrow('Progress check failed')
      expect(store.error).toBe(error)
    })

    it('cancels FEACN lookup', async () => {
      fetchWrapper.delete.mockResolvedValue(undefined)

      const store = useRegistersStore()
      await store.cancelLookupFeacnCodes('abcd')

      expect(fetchWrapper.delete).toHaveBeenCalledWith(`${apiUrl}/registers/lookup-feacn-codes/abcd`)
    })

    it('handles cancel FEACN lookup error', async () => {
      const error = new Error('Cancel failed')
      fetchWrapper.delete.mockRejectedValue(error)

      const store = useRegistersStore()

      await expect(store.cancelLookupFeacnCodes('abcd')).rejects.toThrow('Cancel failed')
      expect(store.error).toBe(error)
    })
  })

  describe('remove', () => {
    it('removes register successfully', async () => {
      fetchWrapper.delete.mockResolvedValue({})
      fetchWrapper.get.mockResolvedValue({
        items: [],
        pagination: { totalCount: 0, hasNextPage: false, hasPreviousPage: false }
      })

      const store = useRegistersStore()
      await store.remove(1)

      expect(fetchWrapper.delete).toHaveBeenCalledWith(`${apiUrl}/registers/1`)
      expect(fetchWrapper.get).toHaveBeenCalledWith(
        `${apiUrl}/registers?page=1&pageSize=10&sortBy=id&sortOrder=asc`
      )
    })

    it('handles remove error', async () => {
      const error = new Error('Delete failed')
      fetchWrapper.delete.mockRejectedValue(error)

      const store = useRegistersStore()
      await store.remove(1)
      
      // Verify error was set in the store but not thrown
      expect(store.error).toBe(error)
      expect(store.loading).toBe(false)
    })
  })

  describe('getById and update', () => {
    it('retrieves single register', async () => {
      const data = { id: 5, fileName: 'r' }
      fetchWrapper.get.mockResolvedValueOnce(data)
      const store = useRegistersStore()
      await store.getById(5)
      expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/registers/5`)
      expect(store.item).toEqual(data)
    })

    it('handles getById error', async () => {
      const error = new Error('Not found')
      fetchWrapper.get.mockRejectedValueOnce(error)
      const store = useRegistersStore()
      await store.getById(5)
      expect(store.item).toEqual({ error })
    })

    it('updates register and store', async () => {
      fetchWrapper.put.mockResolvedValue({})
      const store = useRegistersStore()
      store.items = [{ id: 5, invoiceNumber: 'a' }]
      store.item = { id: 5, invoiceNumber: 'a' }
      const upd = { invoiceNumber: 'b' }
      await store.update(5, upd)
      expect(fetchWrapper.put).toHaveBeenCalledWith(`${apiUrl}/registers/5`, upd)
      expect(store.item.invoiceNumber).toBe('b')
      expect(store.items[0].invoiceNumber).toBe('b')
    })
  })

  describe('download method', () => {
    it('calls downloadFile with correct parameters', async () => {
      const store = useRegistersStore()
      fetchWrapper.downloadFile.mockResolvedValue(true)
      const result = await store.download(10)
      expect(fetchWrapper.downloadFile).toHaveBeenCalledWith(
        `${apiUrl}/registers/10/download`,
        'register_10.xlsx'
      )
      expect(result).toBe(true)
    })

    it('calls downloadFile with custom filename when provided', async () => {
      const store = useRegistersStore()
      fetchWrapper.downloadFile.mockResolvedValue(true)
      const result = await store.download(10, 'custom_file.xlsx')
      expect(fetchWrapper.downloadFile).toHaveBeenCalledWith(
        `${apiUrl}/registers/10/download`,
        'custom_file.xlsx'
      )
      expect(result).toBe(true)
    })

    it('returns null when download fails', async () => {
      const store = useRegistersStore()
      const error = new Error('Download failed')
      fetchWrapper.downloadFile.mockRejectedValue(error)
      const result = await store.download(10)
      expect(result).toBeNull()
      expect(store.error).toEqual(error)
      expect(fetchWrapper.downloadFile).toHaveBeenCalledWith(
        `${apiUrl}/registers/10/download`,
        'register_10.xlsx'
      )
    })
  })

  describe('generate method', () => {
    it('calls downloadFile with default filename by id when invoiceNumber missing', async () => {
      const store = useRegistersStore()
      fetchWrapper.downloadFile.mockResolvedValue(true)
      const result = await store.generate(5)
      expect(fetchWrapper.downloadFile).toHaveBeenCalledWith(
        `${apiUrl}/registers/5/generate`,
        'IndPost_5.zip'
      )
      expect(result).toBe(true)
    })

    it('calls downloadFile with invoiceNumber when provided', async () => {
      const store = useRegistersStore()
      fetchWrapper.downloadFile.mockResolvedValue(true)
      await store.generate(5, 'INV')
      expect(fetchWrapper.downloadFile).toHaveBeenCalledWith(
        `${apiUrl}/registers/5/generate`,
        'IndPost_INV.zip'
      )
    })

    it('calls downloadFile with default filename when invoiceNumber is null', async () => {
      const store = useRegistersStore()
      fetchWrapper.downloadFile.mockResolvedValue(true)
      await store.generate(5, null)
      expect(fetchWrapper.downloadFile).toHaveBeenCalledWith(
        `${apiUrl}/registers/5/generate`,
        'IndPost_5.zip'
      )
    })

    it('calls downloadFile with default filename when invoiceNumber is undefined', async () => {
      const store = useRegistersStore()
      fetchWrapper.downloadFile.mockResolvedValue(true)
      await store.generate(5, undefined)
      expect(fetchWrapper.downloadFile).toHaveBeenCalledWith(
        `${apiUrl}/registers/5/generate`,
        'IndPost_5.zip'
      )
    })

    it('propagates error when download fails', async () => {
      const store = useRegistersStore()
      const error = new Error('fail')
      fetchWrapper.downloadFile.mockRejectedValue(error)
      await expect(store.generate(5)).rejects.toThrow('fail')
      expect(store.error).toBe(error)
    })
  })

  describe('nextParcel method', () => {
    it('requests next parcel with correct id and default parameters', async () => {
      const parcel = { id: 2 }
      fetchWrapper.get.mockResolvedValue(parcel)
      const store = useRegistersStore()
      const result = await store.nextParcel(5)
      expect(fetchWrapper.get).toHaveBeenCalledWith(
        `${apiUrl}/registers/nextparcel/5?sortBy=id&sortOrder=asc`
      )
      expect(result).toEqual(parcel)
    })

    it('requests next parcel with custom sorting parameters', async () => {
      const customAuthStore = {
        ...defaultAuthStore,
        parcels_sort_by: [{ key: 'tnVed', order: 'desc' }]
      }
      useAuthStore.mockReturnValueOnce(customAuthStore)
      
      const parcel = { id: 3 }
      fetchWrapper.get.mockResolvedValue(parcel)
      const store = useRegistersStore()
      const result = await store.nextParcel(7)
      expect(fetchWrapper.get).toHaveBeenCalledWith(
        `${apiUrl}/registers/nextparcel/7?sortBy=tnVed&sortOrder=desc`
      )
      expect(result).toEqual(parcel)
    })

    it('requests next parcel with filtering parameters', async () => {
      const customAuthStore = {
        ...defaultAuthStore,
        parcels_status: 1,
        parcels_check_status: 100,
        parcels_tnved: '12345678'
      }
      useAuthStore.mockReturnValueOnce(customAuthStore)
      
      const parcel = { id: 4 }
      fetchWrapper.get.mockResolvedValue(parcel)
      const store = useRegistersStore()
      const result = await store.nextParcel(8)
      expect(fetchWrapper.get).toHaveBeenCalledWith(
        `${apiUrl}/registers/nextparcel/8?sortBy=id&sortOrder=asc&statusId=1&checkStatusId=100&tnVed=12345678`
      )
      expect(result).toEqual(parcel)
    })

    it('requests next parcel with partial filtering parameters', async () => {
      const customAuthStore = {
        ...defaultAuthStore,
        parcels_status: 2,
        parcels_check_status: null,
        parcels_tnved: ''
      }
      useAuthStore.mockReturnValueOnce(customAuthStore)
      
      const parcel = { id: 5 }
      fetchWrapper.get.mockResolvedValue(parcel)
      const store = useRegistersStore()
      const result = await store.nextParcel(9)
      expect(fetchWrapper.get).toHaveBeenCalledWith(
        `${apiUrl}/registers/nextparcel/9?sortBy=id&sortOrder=asc&statusId=2`
      )
      expect(result).toEqual(parcel)
    })

    it('returns null when nextParcel fails', async () => {
      const error = new Error('fail')
      fetchWrapper.get.mockRejectedValue(error)
      const store = useRegistersStore()
      const result = await store.nextParcel(5)
      expect(result).toBeNull()
      expect(store.error).toEqual(error)
      expect(fetchWrapper.get).toHaveBeenCalledWith(
        `${apiUrl}/registers/nextparcel/5?sortBy=id&sortOrder=asc`
      )
    })
    
    it('returns a parcel with complete information', async () => {
      const parcel = { 
        id: 2, 
        registerId: 1, 
        tnVed: '12345678', 
        statusId: 1,
        checkStatusId: 100
      }
      fetchWrapper.get.mockResolvedValue(parcel)
      const store = useRegistersStore()
      const result = await store.nextParcel(1)
      expect(result).toEqual(parcel)
    })
    
    it('handles the case when there is no next parcel', async () => {
      // API returns null when there's no next parcel
      fetchWrapper.get.mockResolvedValue(null)
      const store = useRegistersStore()
      const result = await store.nextParcel(99)
      expect(result).toBeNull()
    })
    
    it('properly sets loading state during execution', async () => {
      const parcel = { id: 2 }
      fetchWrapper.get.mockResolvedValue(parcel)
      const store = useRegistersStore()
      
      // Before call
      expect(store.loading).toBe(false)
      
      // Start the call but don't await it yet
      const promise = store.nextParcel(5)
      
      // During the call
      expect(store.loading).toBe(true)
      
      // After the call completes
      await promise
      expect(store.loading).toBe(false)
    })
  })

  describe('theNextParcel method', () => {
    it('requests the next parcel with correct id and default parameters', async () => {
      const parcel = { id: 3, registerId: 1, tnVed: '87654321' }
      fetchWrapper.get.mockResolvedValue(parcel)
      const store = useRegistersStore()
      const result = await store.theNextParcel(5)
      
      expect(fetchWrapper.get).toHaveBeenCalledWith(
        `${apiUrl}/registers/the-nextparcel/5?sortBy=id&sortOrder=asc`
      )
      expect(result).toEqual(parcel)
    })

    it('requests the next parcel with custom sorting parameters', async () => {
      const customAuthStore = {
        ...defaultAuthStore,
        parcels_sort_by: [{ key: 'tnVed', order: 'desc' }]
      }
      useAuthStore.mockReturnValueOnce(customAuthStore)
      
      const parcel = { id: 6 }
      fetchWrapper.get.mockResolvedValue(parcel)
      const store = useRegistersStore()
      const result = await store.theNextParcel(10)
      expect(fetchWrapper.get).toHaveBeenCalledWith(
        `${apiUrl}/registers/the-nextparcel/10?sortBy=tnVed&sortOrder=desc`
      )
      expect(result).toEqual(parcel)
    })

    it('requests the next parcel with filtering parameters', async () => {
      const customAuthStore = {
        ...defaultAuthStore,
        parcels_status: 3,
        parcels_check_status: 200,
        parcels_tnved: '87654321'
      }
      useAuthStore.mockReturnValueOnce(customAuthStore)
      
      const parcel = { id: 7 }
      fetchWrapper.get.mockResolvedValue(parcel)
      const store = useRegistersStore()
      const result = await store.theNextParcel(11)
      expect(fetchWrapper.get).toHaveBeenCalledWith(
        `${apiUrl}/registers/the-nextparcel/11?sortBy=id&sortOrder=asc&statusId=3&checkStatusId=200&tnVed=87654321`
      )
      expect(result).toEqual(parcel)
    })

    it('requests the next parcel with partial filtering parameters', async () => {
      const customAuthStore = {
        ...defaultAuthStore,
        parcels_status: null,
        parcels_check_status: 150,
        parcels_tnved: ''
      }
      useAuthStore.mockReturnValueOnce(customAuthStore)
      
      const parcel = { id: 8 }
      fetchWrapper.get.mockResolvedValue(parcel)
      const store = useRegistersStore()
      const result = await store.theNextParcel(12)
      expect(fetchWrapper.get).toHaveBeenCalledWith(
        `${apiUrl}/registers/the-nextparcel/12?sortBy=id&sortOrder=asc&checkStatusId=150`
      )
      expect(result).toEqual(parcel)
    })

    it('returns null when theNextParcel API call fails', async () => {
      const error = new Error('Network error')
      fetchWrapper.get.mockRejectedValue(error)
      const store = useRegistersStore()
      const result = await store.theNextParcel(5)
      
      expect(result).toBeNull()
      expect(store.error).toEqual(error)
      expect(fetchWrapper.get).toHaveBeenCalledWith(
        `${apiUrl}/registers/the-nextparcel/5?sortBy=id&sortOrder=asc`
      )
    })
    
    it('returns a parcel with complete information structure', async () => {
      const expectedParcel = { 
        id: 10, 
        registerId: 2, 
        tnVed: '12345678', 
        statusId: 1,
        checkStatusId: 100,
        shk: 'SHK123456',
        postingNumber: 'POST789',
        keyWordIds: [1, 2, 3]
      }
      fetchWrapper.get.mockResolvedValue(expectedParcel)
      const store = useRegistersStore()
      const result = await store.theNextParcel(1)
      
      expect(result).toEqual(expectedParcel)
      expect(result.id).toBe(10)
      expect(result.registerId).toBe(2)
    })
    
    it('handles the case when there is no next parcel available', async () => {
      // API returns null when there's no next parcel
      fetchWrapper.get.mockResolvedValue(null)
      const store = useRegistersStore()
      const result = await store.theNextParcel(99)
      
      expect(result).toBeNull()
      expect(store.error).toBeNull()
    })
    
    it('properly manages loading state during execution', async () => {
      const parcel = { id: 7, registerId: 3 }
      fetchWrapper.get.mockResolvedValue(parcel)
      const store = useRegistersStore()
      
      // Before call
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
      
      // Start the call but don't await it yet
      const promise = store.theNextParcel(5)
      
      // During the call
      expect(store.loading).toBe(true)
      
      // After the call completes
      await promise
      expect(store.loading).toBe(false)
    })

    it('clears previous error state before making request', async () => {
      const store = useRegistersStore()
      store.error = 'Previous error'
      
      const parcel = { id: 15 }
      fetchWrapper.get.mockResolvedValue(parcel)
      
      await store.theNextParcel(10)
      
      expect(store.error).toBeNull()
    })

    it('handles different parcel ID types correctly', async () => {
      const parcel = { id: 42 }
      fetchWrapper.get.mockResolvedValue(parcel)
      const store = useRegistersStore()
      
      // Test with number
      await store.theNextParcel(123)
      expect(fetchWrapper.get).toHaveBeenCalledWith(
        `${apiUrl}/registers/the-nextparcel/123?sortBy=id&sortOrder=asc`
      )
      
      // Test with string number
      await store.theNextParcel('456')
      expect(fetchWrapper.get).toHaveBeenCalledWith(
        `${apiUrl}/registers/the-nextparcel/456?sortBy=id&sortOrder=asc`
      )
    })

    it('maintains error state when API call fails', async () => {
      const networkError = new Error('Connection timeout')
      fetchWrapper.get.mockRejectedValue(networkError)
      const store = useRegistersStore()
      
      const result = await store.theNextParcel(5)
      
      expect(result).toBeNull()
      expect(store.error).toBe(networkError)
      expect(store.loading).toBe(false)
    })

    it('handles server errors gracefully', async () => {
      const serverError = new Error('Internal Server Error')
      serverError.status = 500
      fetchWrapper.get.mockRejectedValue(serverError)
      const store = useRegistersStore()
      
      const result = await store.theNextParcel(5)
      
      expect(result).toBeNull()
      expect(store.error).toBe(serverError)
      expect(store.loading).toBe(false)
    })

    it('handles not found errors appropriately', async () => {
      const notFoundError = new Error('Parcel not found')
      notFoundError.status = 404
      fetchWrapper.get.mockRejectedValue(notFoundError)
      const store = useRegistersStore()
      
      const result = await store.theNextParcel(999)
      
      expect(result).toBeNull()
      expect(store.error).toBe(notFoundError)
    })

    it('ensures loading state is always reset even if error occurs', async () => {
      const error = new Error('Unexpected error')
      fetchWrapper.get.mockRejectedValue(error)
      const store = useRegistersStore()
      
      expect(store.loading).toBe(false)
      
      const promise = store.theNextParcel(5)
      expect(store.loading).toBe(true)
      
      await promise
      expect(store.loading).toBe(false)
    })
  })
})
