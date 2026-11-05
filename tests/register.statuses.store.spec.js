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

})
