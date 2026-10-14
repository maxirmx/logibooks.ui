/* @vitest-environment jsdom */
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

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
    { id: 1, title: 'Черновик', bkColor: '#112233', restrictionReason: 'Стоп-слово' },
    { id: 2, title: 'Подтвержден', bkColor: '#445566', restrictionReason: 'Запрет' },
    { id: 3, title: 'Выполнен', bkColor: null, restrictionReason: '' }
  ]

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

  describe('getAll', () => {
    it('handles empty response', async () => {
      mockGet.mockResolvedValue(null)

      await store.getAll()

      expect(store.parcelStatuses).toEqual([])
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

    it('handles errors in concurrent calls', async () => {
      const error = new Error('Network error')
      mockGet.mockRejectedValue(error)

      const promise1 = store.ensureLoaded()
      const promise2 = store.ensureLoaded()

      await expect(promise1).rejects.toThrow('Network error')
      await expect(promise2).rejects.toThrow('Network error')

      // Only one getAll should be called even with errors
      expect(mockGet).toHaveBeenCalledTimes(1)
    })

  })
})
