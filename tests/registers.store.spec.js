import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useRegistersStore } from '@/stores/registers.store.js'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'

vi.mock('@/helpers/fetch.wrapper.js', () => ({
  fetchWrapper: { get: vi.fn(), postFile: vi.fn(), put: vi.fn(), post: vi.fn(), delete: vi.fn() }
}))

vi.mock('@/helpers/config.js', () => ({
  apiUrl: 'http://localhost:8080/api'
}))

// Mock console methods to reduce test output clutter
const originalConsoleLog = console.log
const originalConsoleError = console.error

describe('registers store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
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
      it('fetches data from API with default parameters', async () => {
        const mockResponse = {
          items: [{ id: 1, name: 'Register 1' }, { id: 2, name: 'Register 2' }],
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

      it('fetches data with custom parameters', async () => {
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
        await store.getAll(2, 5, 'name', 'desc', 'search term')
        
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
        
        const store = useRegistersStore()
        await store.getAll(1, 10)
        
        expect(store.items).toEqual(mockResponse.items)
        expect(store.totalCount).toBe(25)
        expect(store.hasNextPage).toBe(true)
        expect(store.hasPreviousPage).toBe(false)
        expect(store.loading).toBe(false)
        expect(store.error).toBeNull()
      })

      it('fetches data with new format - middle page', async () => {
        const mockResponse = {
          items: Array(10).fill().map((_, i) => ({ id: i + 11, name: `Register ${i + 11}` })),
          pagination: {
            totalCount: 50,
            hasNextPage: true,
            hasPreviousPage: true
          }
        }
        fetchWrapper.get.mockResolvedValue(mockResponse)
        
        const store = useRegistersStore()
        await store.getAll(2, 10, 'name', 'asc', 'filter')
        
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
        
        const store = useRegistersStore()
        await store.getAll(5, 10)
        
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
        
        const store = useRegistersStore()
        await store.getAll(1, 10, 'id', 'asc', 'nonexistent')
        
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
        expect(store.items).toEqual([{ id: 1 }])
      })
    })

    describe('loading state', () => {
      it('sets loading to true during request and false after completion', async () => {
        let resolvePromise
        const promise = new Promise(resolve => { resolvePromise = resolve })
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
        const promise = new Promise((resolve, reject) => { rejectPromise = reject })
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
        
        const store = useRegistersStore()
        await store.getAll(1, 10, 'id', 'asc', '')
        
        const calledUrl = fetchWrapper.get.mock.calls[0][0]
        expect(calledUrl).not.toContain('search=')
      })

      it('includes search parameter when provided', async () => {
        fetchWrapper.get.mockResolvedValue({
          items: [],
          pagination: { totalCount: 0, hasNextPage: false, hasPreviousPage: false }
        })
        
        const store = useRegistersStore()
        await store.getAll(1, 10, 'id', 'asc', 'test search')
        
        expect(fetchWrapper.get).toHaveBeenCalledWith(
          `${apiUrl}/registers?page=1&pageSize=10&sortBy=id&sortOrder=asc&search=test+search`
        )
      })

      it('handles special characters in search parameter', async () => {
        fetchWrapper.get.mockResolvedValue({
          items: [],
          pagination: { totalCount: 0, hasNextPage: false, hasPreviousPage: false }
        })
        
        const store = useRegistersStore()
        await store.getAll(1, 10, 'id', 'asc', 'test & search + special chars')
        
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

  describe('upload method', () => {
    it('uploads file via postFile', async () => {
      const file = new File(['data'], 'test.xlsx')
      fetchWrapper.postFile.mockResolvedValue({ id: 1 })

      const store = useRegistersStore()
      await store.upload(file)

      expect(fetchWrapper.postFile).toHaveBeenCalled()
      expect(fetchWrapper.postFile.mock.calls[0][0]).toBe(`${apiUrl}/registers/upload`)
      const formData = fetchWrapper.postFile.mock.calls[0][1]
      expect(formData instanceof FormData).toBe(true)
      expect(formData.get('file')).toBe(file)
    })

    it('sets error on failure', async () => {
      const file = new File(['data'], 'test.xlsx')
      fetchWrapper.postFile.mockRejectedValue(new Error('fail'))

      const store = useRegistersStore()
      await expect(store.upload(file)).rejects.toThrow('fail')
      expect(store.error).toBeTruthy()
      expect(store.loading).toBe(false)
    })
  })

  describe('setOrderStatuses method', () => {
    beforeEach(() => {
      // Mock fetchWrapper.put for setOrderStatuses tests
      fetchWrapper.put = vi.fn()
    })

    it('successfully sets order statuses', async () => {
      const mockResponse = { success: true, message: 'Statuses updated' }
      fetchWrapper.put.mockResolvedValue(mockResponse)

      const store = useRegistersStore()
      const result = await store.setOrderStatuses(123, 456)

      expect(fetchWrapper.put).toHaveBeenCalledWith(`${apiUrl}/registers/123/setorderstatuses/456`)
      expect(result).toEqual(mockResponse)
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('handles error in setOrderStatuses', async () => {
      const errorMessage = 'Failed to update statuses'
      const error = new Error(errorMessage)
      fetchWrapper.put.mockRejectedValue(error)

      const store = useRegistersStore()
      
      await expect(store.setOrderStatuses(123, 456)).rejects.toThrow(errorMessage)
      expect(store.error).toBe(error)
      expect(store.loading).toBe(false)
    })

    it('sets loading state during setOrderStatuses request', async () => {
      let resolvePromise
      const promise = new Promise(resolve => { resolvePromise = resolve })
      fetchWrapper.put.mockReturnValue(promise)

      const store = useRegistersStore()
      const setOrderStatusesPromise = store.setOrderStatuses(123, 456)

      expect(store.loading).toBe(true)

      resolvePromise({ success: true })
      await setOrderStatusesPromise

      expect(store.loading).toBe(false)
    })

    it('sets loading to false even when setOrderStatuses request fails', async () => {
      let rejectPromise
      const promise = new Promise((resolve, reject) => { rejectPromise = reject })
      fetchWrapper.put.mockReturnValue(promise)

      const store = useRegistersStore()
      const setOrderStatusesPromise = store.setOrderStatuses(123, 456)

      expect(store.loading).toBe(true)

      rejectPromise(new Error('Test error'))
      await expect(setOrderStatusesPromise).rejects.toThrow('Test error')

      expect(store.loading).toBe(false)
    })

    it('clears previous error on successful setOrderStatuses request', async () => {
      const store = useRegistersStore()
      
      // First request fails
      fetchWrapper.put.mockRejectedValueOnce(new Error('First error'))
      await expect(store.setOrderStatuses(123, 456)).rejects.toThrow('First error')
      expect(store.error).toBeTruthy()
      
      // Second request succeeds
      fetchWrapper.put.mockResolvedValue({ success: true })
      await store.setOrderStatuses(123, 456)
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

    it('gets validation progress', async () => {
      const progress = { total: 10, processed: 5, finished: false }
      fetchWrapper.get.mockResolvedValue(progress)

      const store = useRegistersStore()
      const result = await store.getValidationProgress('abcd')

      expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/registers/validate/abcd`)
      expect(result).toEqual(progress)
    })

    it('cancels validation', async () => {
      fetchWrapper.delete.mockResolvedValue(undefined)

      const store = useRegistersStore()
      await store.cancelValidation('abcd')

      expect(fetchWrapper.delete).toHaveBeenCalledWith(`${apiUrl}/registers/validate/abcd`)
    })
  })

  describe('remove', () => {
    it('removes register successfully', async () => {
      fetchWrapper.delete.mockResolvedValue({})
      fetchWrapper.get.mockResolvedValue({ items: [], pagination: { totalCount: 0, hasNextPage: false, hasPreviousPage: false } })

      const store = useRegistersStore()
      await store.remove(1)

      expect(fetchWrapper.delete).toHaveBeenCalledWith(`${apiUrl}/registers/1`)
      expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/registers?page=1&pageSize=10&sortBy=id&sortOrder=asc`)
    })

    it('handles remove error', async () => {
      const error = new Error('Delete failed')
      fetchWrapper.delete.mockRejectedValue(error)

      const store = useRegistersStore()

      await expect(store.remove(1)).rejects.toThrow('Delete failed')
    })
  })
})
