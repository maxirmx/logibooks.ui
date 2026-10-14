/* @vitest-environment jsdom */
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
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
    { id: 1, title: 'Черновик', icon: 'svg:registered', bkColor: '#FFFFFF', fgColor: '#000000' },
    {
      id: 2,
      title: 'Подтвержден',
      icon: 'svg:very-delivered',
      bkColor: '#00AA00',
      fgColor: '#FFFFFF'
    },
    { id: 3, title: 'Выполнен', icon: null, bkColor: null, fgColor: null }
  ]

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

  describe('getAll', () => {
    it('handles empty response', async () => {
      mockGet.mockResolvedValue(null)

      await store.getAll()

      expect(store.registerStatuses).toEqual([])
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
    it('handles fetch by id error', async () => {
      const error = new Error('Not found')
      mockGet.mockRejectedValue(error)
      await expect(store.getById(1)).rejects.toThrow('Not found')
    })
  })

  describe('create', () => {
    it('handles create error', async () => {
      const error = new Error('Validation error')
      mockPost.mockRejectedValue(error)

      await expect(store.create({})).rejects.toThrow('Validation error')
    })
  })

  describe('update', () => {
    it('handles update error', async () => {
      const error = new Error('Update failed')
      mockPut.mockRejectedValue(error)

      await expect(store.update(1, {})).rejects.toThrow('Update failed')
    })
  })

  describe('remove', () => {
    it('handles remove error', async () => {
      const error = new Error('Delete failed')
      mockDelete.mockRejectedValue(error)

      await expect(store.remove(1)).rejects.toThrow('Delete failed')
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

  })
})
