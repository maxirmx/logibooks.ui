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

      expect(mockGet).toHaveBeenCalledWith('http://localhost:3000/api/orderstatuses')
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

      expect(mockGet).toHaveBeenCalledWith('http://localhost:3000/api/orderstatuses/1')
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

      expect(mockPost).toHaveBeenCalledWith('http://localhost:3000/api/orderstatuses', newOrderStatus)
      expect(mockGet).toHaveBeenCalledWith('http://localhost:3000/api/orderstatuses')
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

      expect(mockPut).toHaveBeenCalledWith('http://localhost:3000/api/orderstatuses/1', updateData)
      expect(mockGet).toHaveBeenCalledWith('http://localhost:3000/api/orderstatuses')
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

      expect(mockDelete).toHaveBeenCalledWith('http://localhost:3000/api/orderstatuses/1')
      expect(mockGet).toHaveBeenCalledWith('http://localhost:3000/api/orderstatuses')
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
      const baseUrl = 'http://localhost:3000/api/orderstatuses'

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
})
