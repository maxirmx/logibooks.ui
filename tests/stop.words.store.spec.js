// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useStopWordsStore } from '@/stores/stop.words.store.js'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'

vi.mock('@/helpers/fetch.wrapper.js', () => ({
  fetchWrapper: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}))

vi.mock('@/helpers/config.js', () => ({
  apiUrl: 'http://localhost:3000/api'
}))

describe('stop.words.store.js', () => {
  let store
  let pinia

  const mockStopWords = [
    { id: 1, word: 'и', matchTypeId: 1 },
    { id: 2, word: 'или', matchTypeId: 41 },
    { id: 3, word: 'но', matchTypeId: 1 }
  ]

  const mockStopWord = { id: 1, word: 'и', matchTypeId: 1 }

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    store = useStopWordsStore()

    // Reset all mocks
    vi.clearAllMocks()

    // Reset error state to null
    store.error = null
  })

  describe('getAll', () => {
    it('handles empty response', async () => {
      fetchWrapper.get.mockResolvedValue(null)

      await store.getAll()

      expect(store.stopWords).toEqual([])
      expect(store.loading).toBe(false)
    })

  })

  describe('getById', () => {
    it('sets loading state when refresh is true', async () => {
      fetchWrapper.get.mockResolvedValue(mockStopWord)

      await store.getById(1, true)

      expect(store.stopWord).toEqual(mockStopWord)
    })

    it('handles fetch by id error', async () => {
      const error = new Error('Not found')
      fetchWrapper.get.mockRejectedValue(error)

      await expect(store.getById(1)).rejects.toThrow('Not found')
      expect(store.error).toEqual(error)
    })
  })

  describe('create', () => {
    it('handles morphology check error', async () => {
      const error = new Error('Morphology unsupported')
      error.status = 418
      error.data = { word: 'abc', level: 1 }
      fetchWrapper.post.mockRejectedValue(error)

      await expect(store.create({ word: 'abc', matchTypeId: 41 })).rejects.toThrow(
        'Morphology unsupported'
      )
      expect(store.error).toEqual(error)
      expect(fetchWrapper.get).not.toHaveBeenCalled()
    })
  })

  describe('update', () => {
    it('handles morphology check error on update', async () => {
      const error = new Error('Morphology unsupported')
      error.status = 418
      error.data = { word: 'abc', level: 2 }
      fetchWrapper.put.mockRejectedValue(error)

      await expect(store.update(1, { word: 'abc', matchTypeId: 41 })).rejects.toThrow(
        'Morphology unsupported'
      )
      expect(store.error).toEqual(error)
      expect(fetchWrapper.get).not.toHaveBeenCalled()
    })
  })

  describe('remove', () => {
    it('does not refresh list when remove fails', async () => {
      const initialStopWords = [...mockStopWords]
      store.stopWords = initialStopWords

      const error = new Error('Delete failed')
      fetchWrapper.delete.mockRejectedValue(error)

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await expect(store.remove(1)).rejects.toThrow('Delete failed')
      expect(fetchWrapper.get).not.toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })

  describe('API Integration', () => {
    it('uses correct base URL for all operations', async () => {
      const baseUrl = 'http://localhost:3000/api/stopwords'

      fetchWrapper.get.mockResolvedValue([])
      fetchWrapper.post.mockResolvedValue()
      fetchWrapper.put.mockResolvedValue()
      fetchWrapper.delete.mockResolvedValue()

      await store.getAll()
      expect(fetchWrapper.get).toHaveBeenCalledWith(baseUrl)

      await store.getById(1).catch(() => {}) // Ignore error for URL test
      expect(fetchWrapper.get).toHaveBeenCalledWith(`${baseUrl}/1`)

      await store.create({}).catch(() => {}) // Ignore error for URL test
      expect(fetchWrapper.post).toHaveBeenCalledWith(baseUrl, {})

      await store.update(1, {}).catch(() => {}) // Ignore error for URL test
      expect(fetchWrapper.put).toHaveBeenCalledWith(`${baseUrl}/1`, {})

      await store.remove(1).catch(() => {}) // Ignore error for URL test
      expect(fetchWrapper.delete).toHaveBeenCalledWith(`${baseUrl}/1`)
    })

    it('handles network timeout', async () => {
      const timeoutError = new Error('Request timeout')
      fetchWrapper.get.mockRejectedValue(timeoutError)

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await expect(store.getAll()).rejects.toThrow('Request timeout')
      expect(store.loading).toBe(false)

      consoleSpy.mockRestore()
    })
  })

})
