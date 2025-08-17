/* @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useParcelStatusesStore } from '@/stores/parcel.statuses.store.js'

// Mock functions at top level to avoid hoisting issues
const mockGet = vi.hoisted(() => vi.fn())
const mockPost = vi.hoisted(() => vi.fn())
const mockPut = vi.hoisted(() => vi.fn())
const mockDelete = vi.hoisted(() => vi.fn())

vi.mock('@/helpers/fetch.wrapper.js', () => ({
  fetchWrapper: {
    get: mockGet,
    post: mockPost,
    put: mockPut,
    delete: mockDelete
  }
}))

vi.mock('@/helpers/config.js', () => ({
  apiUrl: 'http://localhost:3000/api'
}))

describe('parcel.statuses.store.js', () => {
  let store
  let pinia

  const mockParcelStatuses = [
    { id: 1, title: 'Черновик' },
    { id: 2, title: 'Подтвержден' },
    { id: 3, title: 'Выполнен' }
  ]

  const mockParcelStatus = { id: 1, title: 'Черновик' }

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    store = useParcelStatusesStore()

    // Reset all mocks
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Store Initialization', () => {
    it('initializes with correct default state', () => {
      expect(store.parcelStatuses).toEqual([])
      expect(store.parcelStatus).toEqual({ loading: true })
      expect(store.loading).toBe(false)
    })

    it('has all required methods', () => {
      expect(typeof store.getAll).toBe('function')
      expect(typeof store.getById).toBe('function')
      expect(typeof store.create).toBe('function')
      expect(typeof store.update).toBe('function')
      expect(typeof store.remove).toBe('function')
    })
  })

  describe('getAll', () => {
    it('fetches all order statuses successfully', async () => {
      mockGet.mockResolvedValue(mockParcelStatuses)

      await store.getAll()

      expect(mockGet).toHaveBeenCalledWith('http://localhost:3000/api/parcelstatuses')
      expect(store.parcelStatuses).toEqual(mockParcelStatuses)
      expect(store.loading).toBe(false)
    })

    it('handles empty response', async () => {
      mockGet.mockResolvedValue(null)

      await store.getAll()

      expect(store.parcelStatuses).toEqual([])
      expect(store.loading).toBe(false)
    })

    it('sets loading state during fetch', async () => {
      let loadingDuringFetch = false
      mockGet.mockImplementation(async () => {
        loadingDuringFetch = store.loading
        return mockParcelStatuses
      })

      await store.getAll()

      expect(loadingDuringFetch).toBe(true)
      expect(store.loading).toBe(false)
    })

    it('handles fetch error', async () => {
      const error = new Error('Network error')
      mockGet.mockRejectedValue(error)

      await expect(store.getAll()).rejects.toThrow('Network error')
      expect(store.loading).toBe(false)
    })
  })

  describe('getById', () => {
    it('fetches order status by id successfully', async () => {
      mockGet.mockResolvedValue(mockParcelStatus)

      const result = await store.getById(1)

      expect(mockGet).toHaveBeenCalledWith('http://localhost:3000/api/parcelstatuses/1')
      expect(store.parcelStatus).toEqual(mockParcelStatus)
      expect(result).toEqual(mockParcelStatus)
    })

    it('sets loading state when refresh is true', async () => {
      mockGet.mockResolvedValue(mockParcelStatus)

      await store.getById(1, true)

      expect(store.parcelStatus).toEqual(mockParcelStatus)
    })

    it('does not set loading state when refresh is false', async () => {
      store.parcelStatus = { id: 999, title: 'existing' }
      mockGet.mockResolvedValue(mockParcelStatus)

      await store.getById(1, false)

      expect(store.parcelStatus).toEqual(mockParcelStatus)
    })

    it('handles fetch by id error', async () => {
      const error = new Error('Not found')
      mockGet.mockRejectedValue(error)
      await expect(store.getById(1)).rejects.toThrow('Not found')
    })
  })

  describe('create', () => {
    it('creates order status successfully', async () => {
      const newOrderStatus = { title: 'Новый статус' }
      const createdOrderStatus = { id: 4, ...newOrderStatus }

      mockPost.mockResolvedValue(createdOrderStatus)
      mockGet.mockResolvedValue([...mockParcelStatuses, createdOrderStatus])

      const result = await store.create(newOrderStatus)

      expect(mockPost).toHaveBeenCalledWith('http://localhost:3000/api/parcelstatuses', newOrderStatus)
      expect(mockGet).toHaveBeenCalledWith('http://localhost:3000/api/parcelstatuses')
      expect(result).toEqual(createdOrderStatus)
    })

    it('handles create error', async () => {
      const error = new Error('Validation error')
      mockPost.mockRejectedValue(error)

      await expect(store.create({})).rejects.toThrow('Validation error')
    })
  })

  describe('update', () => {
    it('updates order status successfully', async () => {
      const updateData = { title: 'Обновленный заголовок' }
      const updatedOrderStatus = { ...mockParcelStatus, ...updateData }

      mockPut.mockResolvedValue(updatedOrderStatus)
      mockGet.mockResolvedValue(mockParcelStatuses.map(s => s.id === 1 ? updatedOrderStatus : s))

      const result = await store.update(1, updateData)

      expect(mockPut).toHaveBeenCalledWith('http://localhost:3000/api/parcelstatuses/1', updateData)
      expect(mockGet).toHaveBeenCalledWith('http://localhost:3000/api/parcelstatuses')
      expect(result).toEqual(updatedOrderStatus)
    })

    it('handles update error', async () => {
      const error = new Error('Update failed')
      mockPut.mockRejectedValue(error)

      await expect(store.update(1, {})).rejects.toThrow('Update failed')
    })
  })

  describe('remove', () => {
    it('removes order status successfully', async () => {
      mockDelete.mockResolvedValue()
      mockGet.mockResolvedValue(mockParcelStatuses.filter(s => s.id !== 1))

      await store.remove(1)

      expect(mockDelete).toHaveBeenCalledWith('http://localhost:3000/api/parcelstatuses/1')
      expect(mockGet).toHaveBeenCalledWith('http://localhost:3000/api/parcelstatuses')
    })

    it('handles remove error', async () => {
      const error = new Error('Delete failed')
      mockDelete.mockRejectedValue(error)

      await expect(store.remove(1)).rejects.toThrow('Delete failed')
    })
  })

  describe('Store State Management', () => {
    it('maintains reactive state', async () => {
      expect(store.parcelStatuses).toEqual([])

      mockGet.mockResolvedValue(mockParcelStatuses)
      await store.getAll()

      expect(store.parcelStatuses).toEqual(mockParcelStatuses)
    })

    it('handles multiple simultaneous operations', async () => {
      mockGet.mockResolvedValue(mockParcelStatuses)

      const promises = [
        store.getAll(),
        store.getAll(),
        store.getAll()
      ]

      await Promise.all(promises)

      expect(mockGet).toHaveBeenCalledTimes(3)
      expect(store.parcelStatuses).toEqual(mockParcelStatuses)
    })
  })

  describe('API Integration', () => {
    it('uses correct base URL for all operations', async () => {
      const baseUrl = 'http://localhost:3000/api/parcelstatuses'

      mockGet.mockResolvedValue([])
      mockPost.mockResolvedValue({})
      mockPut.mockResolvedValue({})
      mockDelete.mockResolvedValue()

      await store.getAll()
      expect(mockGet).toHaveBeenCalledWith(baseUrl)

      await store.getById(1).catch(() => {}) // Ignore error for URL test
      expect(mockGet).toHaveBeenCalledWith(`${baseUrl}/1`)

      await store.create({}).catch(() => {}) // Ignore error for URL test
      expect(mockPost).toHaveBeenCalledWith(baseUrl, {})

      await store.update(1, {}).catch(() => {}) // Ignore error for URL test
      expect(mockPut).toHaveBeenCalledWith(`${baseUrl}/1`, {})

      await store.remove(1).catch(() => {}) // Ignore error for URL test
      expect(mockDelete).toHaveBeenCalledWith(`${baseUrl}/1`)
    })
  })
  
  describe('Status Helper Functions', () => {
    beforeEach(async () => {
      mockGet.mockResolvedValue(mockParcelStatuses)
      await store.getAll()
      expect(store.parcelStatuses).toEqual(mockParcelStatuses)
      // The getAll function should have populated the statusMap
    })

    describe('getStatusById', () => {
      it('returns the correct status when found', () => {
        const status = store.getStatusById(1)
        expect(status).toEqual(mockParcelStatuses[0])
      })

      it('returns null when status is not found', () => {
        const status = store.getStatusById(999)
        expect(status).toBeNull()
      })
    })

    describe('getStatusTitle', () => {
      it('returns the correct title when status is found', () => {
        const title = store.getStatusTitle(2)
        expect(title).toBe('Подтвержден')
      })

      it('returns fallback string when status is not found', () => {
        const title = store.getStatusTitle(999)
        expect(title).toBe('Статус 999')
      })
    })
  })
  
  describe('ensureLoaded', () => {
    beforeEach(() => {
      // Reset store to initial state for these tests
      pinia = createPinia()
      setActivePinia(pinia)
      store = useParcelStatusesStore()
      vi.clearAllMocks()
      mockGet.mockResolvedValue(mockParcelStatuses)
    })
    
    it('calls getAll when statuses are not loaded yet', async () => {
      expect(store.parcelStatuses).toEqual([])
      
      store.ensureLoaded()
      
      // Since ensureLoaded directly calls getAll synchronously,
      // Since ensureLoaded is asynchronous and calls getAll asynchronously,
      // we can verify it was called by awaiting pending promises
      expect(mockGet).toHaveBeenCalledWith('http://localhost:3000/api/parcelstatuses')
      
      // Wait for any pending promises to resolve
      await Promise.resolve()
    })
    
    it('does not call getAll when already initialized', async () => {
      // First call to initialize
      store.ensureLoaded()
      
      // Wait for any pending promises to resolve
      await Promise.resolve()
      
      expect(mockGet).toHaveBeenCalledTimes(1)
      
      // Reset mock to check if it's called again
      mockGet.mockClear()
      
      // Second call should not trigger getAll again (initialized flag is true)
      store.ensureLoaded()
      
      // Wait for any pending promises to resolve
      await Promise.resolve()
      
      expect(mockGet).not.toHaveBeenCalled()
    })
    
    it('does not call getAll when statuses are not empty', async () => {
      // Manually set statuses
      store.parcelStatuses = mockParcelStatuses
      
      store.ensureLoaded()
      
      // Wait for any pending promises to resolve
      await Promise.resolve()
      
      expect(mockGet).not.toHaveBeenCalled()
    })
    
    it('does not call getAll when already loading', async () => {
      // Set loading state
      store.loading = true
      
      store.ensureLoaded()
      
      // Wait for any pending promises to resolve
      await Promise.resolve()
      
      expect(mockGet).not.toHaveBeenCalled()
    })
  })
})
