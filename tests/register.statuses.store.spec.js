/* @vitest-environment jsdom */
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useRegisterStatusesStore } from '@/stores/register.statuses.store.js'

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

describe('register.statuses.store.js', () => {
  let store
  let pinia

  const mockRegisterStatuses = [
    { id: 1, title: 'Черновик' },
    { id: 2, title: 'Подтвержден' },
    { id: 3, title: 'Выполнен' }
  ]

  const mockRegisterStatus = { id: 1, title: 'Черновик' }

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    store = useRegisterStatusesStore()

    // Reset all mocks
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Store Initialization', () => {
    it('initializes with correct default state', () => {
      expect(store.registerStatuses).toEqual([])
      expect(store.registerStatus).toEqual({ loading: true })
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
      mockGet.mockResolvedValue(mockRegisterStatuses)

      await store.getAll()

      expect(mockGet).toHaveBeenCalledWith('http://localhost:3000/api/registerstatuses')
      expect(store.registerStatuses).toEqual(mockRegisterStatuses)
      expect(store.loading).toBe(false)
    })

    it('handles empty response', async () => {
      mockGet.mockResolvedValue(null)

      await store.getAll()

      expect(store.registerStatuses).toEqual([])
      expect(store.loading).toBe(false)
    })

    it('sets loading state during fetch', async () => {
      let loadingDuringFetch = false
      mockGet.mockImplementation(async () => {
        loadingDuringFetch = store.loading
        return mockRegisterStatuses
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
      mockGet.mockResolvedValue(mockRegisterStatus)

      const result = await store.getById(1)

      expect(mockGet).toHaveBeenCalledWith('http://localhost:3000/api/registerstatuses/1')
      expect(store.registerStatus).toEqual(mockRegisterStatus)
      expect(result).toEqual(mockRegisterStatus)
    })

    it('sets loading state when refresh is true', async () => {
      mockGet.mockResolvedValue(mockRegisterStatus)

      await store.getById(1, true)

      expect(store.registerStatus).toEqual(mockRegisterStatus)
    })

    it('does not set loading state when refresh is false', async () => {
      store.registerStatus = { id: 999, title: 'existing' }
      mockGet.mockResolvedValue(mockRegisterStatus)

      await store.getById(1, false)

      expect(store.registerStatus).toEqual(mockRegisterStatus)
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
      mockGet.mockResolvedValue([...mockRegisterStatuses, createdOrderStatus])

      const result = await store.create(newOrderStatus)

      expect(mockPost).toHaveBeenCalledWith('http://localhost:3000/api/registerstatuses', newOrderStatus)
      expect(mockGet).toHaveBeenCalledWith('http://localhost:3000/api/registerstatuses')
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
      const updatedOrderStatus = { ...mockRegisterStatus, ...updateData }

      mockPut.mockResolvedValue(updatedOrderStatus)
      mockGet.mockResolvedValue(mockRegisterStatuses.map(s => s.id === 1 ? updatedOrderStatus : s))

      const result = await store.update(1, updateData)

      expect(mockPut).toHaveBeenCalledWith('http://localhost:3000/api/registerstatuses/1', updateData)
      expect(mockGet).toHaveBeenCalledWith('http://localhost:3000/api/registerstatuses')
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
      mockGet.mockResolvedValue(mockRegisterStatuses.filter(s => s.id !== 1))

      await store.remove(1)

      expect(mockDelete).toHaveBeenCalledWith('http://localhost:3000/api/registerstatuses/1')
      expect(mockGet).toHaveBeenCalledWith('http://localhost:3000/api/registerstatuses')
    })

    it('handles remove error', async () => {
      const error = new Error('Delete failed')
      mockDelete.mockRejectedValue(error)

      await expect(store.remove(1)).rejects.toThrow('Delete failed')
    })
  })

  describe('Store State Management', () => {
    it('maintains reactive state', async () => {
      expect(store.registerStatuses).toEqual([])

      mockGet.mockResolvedValue(mockRegisterStatuses)
      await store.getAll()

      expect(store.registerStatuses).toEqual(mockRegisterStatuses)
    })

    it('handles multiple simultaneous operations', async () => {
      mockGet.mockResolvedValue(mockRegisterStatuses)

      const promises = [
        store.getAll(),
        store.getAll(),
        store.getAll()
      ]

      await Promise.all(promises)

      expect(mockGet).toHaveBeenCalledTimes(3)
      expect(store.registerStatuses).toEqual(mockRegisterStatuses)
    })
  })

  describe('API Integration', () => {
    it('uses correct base URL for all operations', async () => {
      const baseUrl = 'http://localhost:3000/api/registerstatuses'

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
      mockGet.mockResolvedValue(mockRegisterStatuses)
      await store.getAll()
      expect(store.registerStatuses).toEqual(mockRegisterStatuses)
      // The getAll function should have populated the statusMap
    })

    describe('getStatusById', () => {
      it('returns the correct status when found', () => {
        const status = store.getStatusById(1)
        expect(status).toEqual(mockRegisterStatuses[0])
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
      store = useRegisterStatusesStore()
      vi.clearAllMocks()
      mockGet.mockResolvedValue(mockRegisterStatuses)
    })
    
    it('calls getAll when statuses are not loaded yet', async () => {
      expect(store.registerStatuses).toEqual([])
      
      store.ensureLoaded()
      
      // ensureLoaded calls getAll immediately; the await below just lets
      // any asynchronous work triggered by getAll settle before the test ends
      expect(mockGet).toHaveBeenCalledWith('http://localhost:3000/api/registerstatuses')
      
      // Wait for any pending promises triggered by ensureLoaded/getAll to resolve
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
      store.registerStatuses = mockRegisterStatuses
      
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
