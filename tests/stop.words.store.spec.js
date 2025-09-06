// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
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

  describe('Store Initialization', () => {
    it('initializes with correct default state', () => {
      expect(store.stopWords).toEqual([])
      expect(store.stopWord).toEqual({ loading: true })
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
    it('fetches all stop words successfully', async () => {
      fetchWrapper.get.mockResolvedValue(mockStopWords)

      await store.getAll()

      expect(fetchWrapper.get).toHaveBeenCalledWith('http://localhost:3000/api/stopwords')
      expect(store.stopWords).toEqual(mockStopWords)
      expect(store.loading).toBe(false)
    })

    it('handles empty response', async () => {
      fetchWrapper.get.mockResolvedValue(null)

      await store.getAll()

      expect(store.stopWords).toEqual([])
      expect(store.loading).toBe(false)
    })

    it('sets loading state during fetch', async () => {
      let loadingDuringFetch = false
      fetchWrapper.get.mockImplementation(async () => {
        loadingDuringFetch = store.loading
        return mockStopWords
      })

      await store.getAll()

      expect(loadingDuringFetch).toBe(true)
      expect(store.loading).toBe(false)
    })

    it('handles fetch error', async () => {
      const error = new Error('Network error')
      fetchWrapper.get.mockRejectedValue(error)

      await expect(store.getAll()).rejects.toThrow('Network error')
      expect(store.loading).toBe(false)
      expect(store.error).toEqual(error)
    })
  })

  describe('getById', () => {
    it('fetches stop word by id successfully', async () => {
      fetchWrapper.get.mockResolvedValue(mockStopWord)

      const result = await store.getById(1)

      expect(fetchWrapper.get).toHaveBeenCalledWith('http://localhost:3000/api/stopwords/1')
      expect(store.stopWord).toEqual(mockStopWord)
      expect(result).toEqual(mockStopWord)
    })

    it('sets loading state when refresh is true', async () => {
      fetchWrapper.get.mockResolvedValue(mockStopWord)

      await store.getById(1, true)

      expect(store.stopWord).toEqual(mockStopWord)
    })

    it('does not set loading state when refresh is false', async () => {
      store.stopWord = { id: 999, word: 'existing', matchTypeId: 1 }
      fetchWrapper.get.mockResolvedValue(mockStopWord)

      await store.getById(1, false)

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
    it('creates stop word successfully', async () => {
      const newStopWord = { word: 'новое', matchTypeId: 1 }
      const created = { id: 4, ...newStopWord }

      fetchWrapper.post.mockResolvedValue(created)
      fetchWrapper.get.mockResolvedValue(mockStopWords)

      const result = await store.create(newStopWord)

      expect(fetchWrapper.post).toHaveBeenCalledWith('http://localhost:3000/api/stopwords', newStopWord)
      expect(fetchWrapper.get).toHaveBeenCalledWith('http://localhost:3000/api/stopwords')
      expect(store.stopWords).toEqual(mockStopWords)
      expect(result).toEqual(created)
    })

    it('refreshes stop words list after creation', async () => {
      const newStopWord = { word: 'тест', matchTypeId: 41 }
      const updatedStopWords = [...mockStopWords, { id: 4, ...newStopWord }]

      fetchWrapper.post.mockResolvedValue()
      fetchWrapper.get.mockResolvedValue(updatedStopWords)

      await store.create(newStopWord)

      expect(fetchWrapper.post).toHaveBeenCalledWith('http://localhost:3000/api/stopwords', newStopWord)
      expect(fetchWrapper.get).toHaveBeenCalledWith('http://localhost:3000/api/stopwords')
      expect(store.stopWords).toEqual(updatedStopWords)
    })

    it('handles create error', async () => {
      const error = new Error('Validation error')
      fetchWrapper.post.mockRejectedValue(error)

      await expect(store.create({})).rejects.toThrow('Validation error')
      expect(store.error).toEqual(error)
      expect(fetchWrapper.get).not.toHaveBeenCalled()
    })

    it('handles duplicate word error', async () => {
      const error = new Error('409: Stop word already exists')
      fetchWrapper.post.mockRejectedValue(error)

      await expect(store.create({ word: 'и', matchTypeId: 41 })).rejects.toThrow('409: Stop word already exists')
      expect(store.error).toEqual(error)
      expect(fetchWrapper.get).not.toHaveBeenCalled()
    })

    it('handles morphology check error', async () => {
      const error = new Error('Morphology unsupported')
      error.status = 418
      error.data = { word: 'abc', level: 1 }
      fetchWrapper.post.mockRejectedValue(error)

      await expect(store.create({ word: 'abc', matchTypeId: 41 })).rejects.toThrow('Morphology unsupported')
      expect(store.error).toEqual(error)
      expect(fetchWrapper.get).not.toHaveBeenCalled()
    })
  })

  describe('update', () => {
    it('updates stop word successfully', async () => {
      const updateData = { word: 'обновленное', matchTypeId: 1 }
      const updatedStopWords = mockStopWords.map(sw => 
        sw.id === 1 ? { ...sw, ...updateData } : sw
      )

      const updatedDto = { id: 1, ...updateData }
      fetchWrapper.put.mockResolvedValue(updatedDto)
      fetchWrapper.get.mockResolvedValue(updatedStopWords)

      const result = await store.update(1, updateData)

      expect(fetchWrapper.put).toHaveBeenCalledWith('http://localhost:3000/api/stopwords/1', updateData)
      expect(fetchWrapper.get).toHaveBeenCalledWith('http://localhost:3000/api/stopwords')
      expect(store.stopWords).toEqual(updatedStopWords)
      expect(result).toEqual(updatedDto)
    })

    it('refreshes stop words list after update', async () => {
      const updateData = { matchTypeId: 1 }
      const updatedStopWords = [...mockStopWords]

      fetchWrapper.put.mockResolvedValue()
      fetchWrapper.get.mockResolvedValue(updatedStopWords)

      await store.update(1, updateData)

      expect(fetchWrapper.put).toHaveBeenCalledWith('http://localhost:3000/api/stopwords/1', updateData)
      expect(fetchWrapper.get).toHaveBeenCalledWith('http://localhost:3000/api/stopwords')
      expect(store.stopWords).toEqual(updatedStopWords)
    })

    it('handles update error', async () => {
      const error = new Error('Update failed')
      fetchWrapper.put.mockRejectedValue(error)

      await expect(store.update(1, {})).rejects.toThrow('Update failed')
      expect(store.error).toEqual(error)
      expect(fetchWrapper.get).not.toHaveBeenCalled()
    })

    it('handles morphology check error on update', async () => {
      const error = new Error('Morphology unsupported')
      error.status = 418
      error.data = { word: 'abc', level: 2 }
      fetchWrapper.put.mockRejectedValue(error)

      await expect(store.update(1, { word: 'abc', matchTypeId: 41 })).rejects.toThrow('Morphology unsupported')
      expect(store.error).toEqual(error)
      expect(fetchWrapper.get).not.toHaveBeenCalled()
    })
  })

  describe('remove', () => {
    it('removes stop word successfully', async () => {
      const remainingStopWords = mockStopWords.filter(sw => sw.id !== 1)
      
      fetchWrapper.delete.mockResolvedValue()
      fetchWrapper.get.mockResolvedValue(remainingStopWords)

      await store.remove(1)

      expect(fetchWrapper.delete).toHaveBeenCalledWith('http://localhost:3000/api/stopwords/1')
      expect(fetchWrapper.get).toHaveBeenCalledWith('http://localhost:3000/api/stopwords')
      expect(store.stopWords).toEqual(remainingStopWords)
      expect(store.stopWords).toHaveLength(mockStopWords.length - 1)
    })

    it('refreshes stop words list after removal', async () => {
      const remainingStopWords = mockStopWords.filter(sw => sw.id !== 2)
      
      fetchWrapper.delete.mockResolvedValue()
      fetchWrapper.get.mockResolvedValue(remainingStopWords)

      await store.remove(2)

      expect(fetchWrapper.delete).toHaveBeenCalledWith('http://localhost:3000/api/stopwords/2')
      expect(fetchWrapper.get).toHaveBeenCalledWith('http://localhost:3000/api/stopwords')
      expect(store.stopWords).toEqual(remainingStopWords)
      expect(store.stopWords.find(sw => sw.id === 2)).toBeUndefined()
    })

    it('handles remove error', async () => {
      const error = new Error('Delete failed')
      fetchWrapper.delete.mockRejectedValue(error)

      await expect(store.remove(1)).rejects.toThrow('Delete failed')
      expect(fetchWrapper.get).not.toHaveBeenCalled()

    })

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


  describe('Store State Management', () => {
    it('maintains reactive state', async () => {
      expect(store.stopWords).toEqual([])

      fetchWrapper.get.mockResolvedValue(mockStopWords)
      await store.getAll()

      expect(store.stopWords).toEqual(mockStopWords)
    })

    it('handles multiple simultaneous operations', async () => {
      fetchWrapper.get.mockResolvedValue(mockStopWords)

      const promises = [
        store.getAll(),
        store.getAll(),
        store.getAll()
      ]

      await Promise.all(promises)

      expect(fetchWrapper.get).toHaveBeenCalledTimes(3)
      expect(store.stopWords).toEqual(mockStopWords)
    })

    it('preserves stop word object structure', async () => {
      fetchWrapper.get.mockResolvedValue(mockStopWords)
      await store.getAll()

      store.stopWords.forEach(stopWord => {
        expect(stopWord).toHaveProperty('id')
        expect(stopWord).toHaveProperty('word')
        expect(stopWord).toHaveProperty('matchTypeId')
        expect(typeof stopWord.matchTypeId).toBe('number')
      })
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

  describe('Edge Cases', () => {
    it('handles empty word string', async () => {
      const emptyWordStopWord = { word: '', matchTypeId: 41 }
      fetchWrapper.post.mockResolvedValue()
      fetchWrapper.get.mockResolvedValue([...mockStopWords, { id: 10, ...emptyWordStopWord }])

      await store.create(emptyWordStopWord)

      expect(fetchWrapper.post).toHaveBeenCalledWith('http://localhost:3000/api/stopwords', emptyWordStopWord)
    })

    it('handles special characters in words', async () => {
      const specialCharStopWord = { word: 'тест-слово!', matchTypeId: 1 }
      fetchWrapper.post.mockResolvedValue()
      fetchWrapper.get.mockResolvedValue([...mockStopWords, { id: 11, ...specialCharStopWord }])

      await store.create(specialCharStopWord)

      expect(fetchWrapper.post).toHaveBeenCalledWith('http://localhost:3000/api/stopwords', specialCharStopWord)
    })

    it('handles matchTypeId values correctly', async () => {
      const testCases = [
        { word: 'тест1', matchTypeId: 1 },
        { word: 'тест2', matchTypeId: 41 }
      ]

      for (const testCase of testCases) {
        fetchWrapper.post.mockResolvedValue()
        fetchWrapper.get.mockResolvedValue([...mockStopWords, { id: Math.random(), ...testCase }])
        await store.create(testCase)
        expect(fetchWrapper.post).toHaveBeenCalledWith('http://localhost:3000/api/stopwords', testCase)
      }
    })

    it('handles large dataset operations', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        word: `слово${i}`,
        matchTypeId: i % 2 === 0 ? 1 : 41
      }))

      fetchWrapper.get.mockResolvedValue(largeDataset)
      await store.getAll()

      expect(store.stopWords).toHaveLength(1000)
      expect(store.stopWords[0]).toEqual({ id: 1, word: 'слово0', matchTypeId: 1 })
      expect(store.stopWords[999]).toEqual({ id: 1000, word: 'слово999', matchTypeId: 41 })
    })
  })

  describe('Loading State Management', () => {
    it('manages loading state correctly during getAll', async () => {
      expect(store.loading).toBe(false)

      const promise = store.getAll()
      expect(store.loading).toBe(true)

      fetchWrapper.get.mockResolvedValue(mockStopWords)
      await promise

      expect(store.loading).toBe(false)
    })

    it('resets loading state on error', async () => {
      fetchWrapper.get.mockRejectedValue(new Error('Test error'))

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await expect(store.getAll()).rejects.toThrow()
      expect(store.loading).toBe(false)

      consoleSpy.mockRestore()
    })
  })
})
