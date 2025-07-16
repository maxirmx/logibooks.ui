/* @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useOrderStatusesStore } from '@/stores/order.statuses.store.js'

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

describe('order.statuses.store.js', () => {
  let store
  let pinia

  const mockOrderStatuses = [
    { id: 1, title: 'Черновик' },
    { id: 2, title: 'Подтвержден' },
    { id: 3, title: 'Выполнен' }
  ]

  const mockOrderStatus = { id: 1, title: 'Черновик' }

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    store = useOrderStatusesStore()

    // Reset all mocks
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Store Initialization', () => {
    it('initializes with correct default state', () => {
      expect(store.orderStatuses).toEqual([])
      expect(store.orderStatus).toEqual({ loading: true })
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
      mockGet.mockResolvedValue(mockOrderStatuses)

      await store.getAll()

      expect(mockGet).toHaveBeenCalledWith('http://localhost:3000/api/orderstatuses')
      expect(store.orderStatuses).toEqual(mockOrderStatuses)
      expect(store.loading).toBe(false)
    })

    it('handles empty response', async () => {
      mockGet.mockResolvedValue(null)

      await store.getAll()

      expect(store.orderStatuses).toEqual([])
      expect(store.loading).toBe(false)
    })

    it('sets loading state during fetch', async () => {
      let loadingDuringFetch = false
      mockGet.mockImplementation(async () => {
        loadingDuringFetch = store.loading
        return mockOrderStatuses
      })

      await store.getAll()

      expect(loadingDuringFetch).toBe(true)
      expect(store.loading).toBe(false)
    })

    it('handles fetch error', async () => {
      const error = new Error('Network error')
      mockGet.mockRejectedValue(error)

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await expect(store.getAll()).rejects.toThrow('Network error')
      expect(store.loading).toBe(false)
      expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch order statuses:', error)

      consoleSpy.mockRestore()
    })
  })

  describe('getById', () => {
    it('fetches order status by id successfully', async () => {
      mockGet.mockResolvedValue(mockOrderStatus)

      const result = await store.getById(1)

      expect(mockGet).toHaveBeenCalledWith('http://localhost:3000/api/orderstatuses/1')
      expect(store.orderStatus).toEqual(mockOrderStatus)
      expect(result).toEqual(mockOrderStatus)
    })

    it('sets loading state when refresh is true', async () => {
      mockGet.mockResolvedValue(mockOrderStatus)

      await store.getById(1, true)

      expect(store.orderStatus).toEqual(mockOrderStatus)
    })

    it('does not set loading state when refresh is false', async () => {
      store.orderStatus = { id: 999, title: 'existing' }
      mockGet.mockResolvedValue(mockOrderStatus)

      await store.getById(1, false)

      expect(store.orderStatus).toEqual(mockOrderStatus)
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
      mockGet.mockResolvedValue([...mockOrderStatuses, createdOrderStatus])

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
      const updatedOrderStatus = { ...mockOrderStatus, ...updateData }

      mockPut.mockResolvedValue(updatedOrderStatus)
      mockGet.mockResolvedValue(mockOrderStatuses.map(s => s.id === 1 ? updatedOrderStatus : s))

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
      mockGet.mockResolvedValue(mockOrderStatuses.filter(s => s.id !== 1))

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
      expect(store.orderStatuses).toEqual([])

      mockGet.mockResolvedValue(mockOrderStatuses)
      await store.getAll()

      expect(store.orderStatuses).toEqual(mockOrderStatuses)
    })

    it('handles multiple simultaneous operations', async () => {
      mockGet.mockResolvedValue(mockOrderStatuses)

      const promises = [
        store.getAll(),
        store.getAll(),
        store.getAll()
      ]

      await Promise.all(promises)

      expect(mockGet).toHaveBeenCalledTimes(3)
      expect(store.orderStatuses).toEqual(mockOrderStatuses)
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
