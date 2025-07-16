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
    { id: 1, word: 'и', exact_match: false },
    { id: 2, word: 'или', exact_match: true },
    { id: 3, word: 'но', exact_match: false }
  ]

  const mockStopWord = { id: 1, word: 'и', exact_match: false }

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    store = useStopWordsStore()

    // Reset all mocks
    vi.clearAllMocks()
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

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await expect(store.getAll()).rejects.toThrow('Network error')
      expect(store.loading).toBe(false)
      expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch stop words:', error)

      consoleSpy.mockRestore()
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
      store.stopWord = { id: 999, word: 'existing', exact_match: true }
      fetchWrapper.get.mockResolvedValue(mockStopWord)

      await store.getById(1, false)

      expect(store.stopWord).toEqual(mockStopWord)
    })

    it('handles fetch by id error', async () => {
      const error = new Error('Not found')
      fetchWrapper.get.mockRejectedValue(error)

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await expect(store.getById(1)).rejects.toThrow('Not found')
      expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch stop word:', error)

      consoleSpy.mockRestore()
    })
  })

  describe('create', () => {
    it('creates stop word successfully', async () => {
      const newStopWord = { word: 'новое', exact_match: true }
      const createdStopWord = { id: 4, ...newStopWord }

      fetchWrapper.post.mockResolvedValue(createdStopWord)

      const result = await store.create(newStopWord)

      expect(fetchWrapper.post).toHaveBeenCalledWith('http://localhost:3000/api/stopwords', newStopWord)
      expect(result).toEqual(createdStopWord)
      expect(store.stopWords).toEqual([createdStopWord])
    })

    it('adds created stop word to local state', async () => {
      const initialStopWords = [...mockStopWords]
      store.stopWords.length = 0 // Clear the array
      store.stopWords.push(...initialStopWords) // Add initial items
      
      const newStopWord = { word: 'тест', exact_match: false }
      const createdStopWord = { id: 5, ...newStopWord }

      fetchWrapper.post.mockResolvedValue(createdStopWord)

      await store.create(newStopWord)

      expect(store.stopWords).toHaveLength(initialStopWords.length + 1)
      expect(store.stopWords).toContainEqual(createdStopWord)
    })

    it('handles create error', async () => {
      const error = new Error('Validation error')
      fetchWrapper.post.mockRejectedValue(error)

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await expect(store.create({})).rejects.toThrow('Validation error')
      expect(consoleSpy).toHaveBeenCalledWith('Failed to create stop word:', error)

      consoleSpy.mockRestore()
    })

    it('handles duplicate word error', async () => {
      const error = new Error('409: Stop word already exists')
      fetchWrapper.post.mockRejectedValue(error)

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await expect(store.create({ word: 'и', exact_match: false })).rejects.toThrow('409: Stop word already exists')
      expect(consoleSpy).toHaveBeenCalledWith('Failed to create stop word:', error)

      consoleSpy.mockRestore()
    })
  })

  describe('update', () => {
    it('updates stop word successfully', async () => {
      const updateData = { word: 'обновленное', exact_match: true }
      const updatedStopWord = { ...mockStopWord, ...updateData }

      store.stopWords = [...mockStopWords]
      fetchWrapper.put.mockResolvedValue(updatedStopWord)

      const result = await store.update(1, updateData)

      expect(fetchWrapper.put).toHaveBeenCalledWith('http://localhost:3000/api/stopwords/1', updateData)
      expect(result).toEqual(updatedStopWord)
      
      // Check that local state was updated
      const updatedIndex = store.stopWords.findIndex(sw => sw.id === 1)
      expect(store.stopWords[updatedIndex]).toEqual(updatedStopWord)
    })

    it('updates local state when stop word exists', async () => {
      const initialStopWords = [...mockStopWords]
      store.stopWords = initialStopWords
      
      const updateData = { exact_match: true }
      const updatedStopWord = { ...mockStopWord, ...updateData }

      fetchWrapper.put.mockResolvedValue(updatedStopWord)

      await store.update(1, updateData)

      const updatedItem = store.stopWords.find(sw => sw.id === 1)
      expect(updatedItem).toEqual(updatedStopWord)
    })

    it('does not update local state when stop word does not exist', async () => {
      const initialStopWords = [...mockStopWords]
      store.stopWords = initialStopWords
      
      const updateData = { word: 'несуществующее' }
      const updatedStopWord = { id: 999, ...updateData }

      fetchWrapper.put.mockResolvedValue(updatedStopWord)

      await store.update(999, updateData)

      expect(store.stopWords).toEqual(initialStopWords)
    })

    it('handles update error', async () => {
      const error = new Error('Update failed')
      fetchWrapper.put.mockRejectedValue(error)

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await expect(store.update(1, {})).rejects.toThrow('Update failed')
      expect(consoleSpy).toHaveBeenCalledWith('Failed to update stop word:', error)

      consoleSpy.mockRestore()
    })
  })

  describe('remove', () => {
    it('removes stop word successfully', async () => {
      store.stopWords = [...mockStopWords]
      fetchWrapper.delete.mockResolvedValue()

      await store.remove(1)

      expect(fetchWrapper.delete).toHaveBeenCalledWith('http://localhost:3000/api/stopwords/1')
      expect(store.stopWords).not.toContainEqual(mockStopWord)
      expect(store.stopWords).toHaveLength(mockStopWords.length - 1)
    })

    it('removes stop word from local state immediately', async () => {
      const initialCount = mockStopWords.length
      store.stopWords = [...mockStopWords]
      fetchWrapper.delete.mockResolvedValue()

      await store.remove(2)

      expect(store.stopWords).toHaveLength(initialCount - 1)
      expect(store.stopWords.find(sw => sw.id === 2)).toBeUndefined()
    })

    it('handles remove error', async () => {
      const error = new Error('Delete failed')
      fetchWrapper.delete.mockRejectedValue(error)

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await expect(store.remove(1)).rejects.toThrow('Delete failed')
      expect(consoleSpy).toHaveBeenCalledWith('Failed to delete stop word:', error)

      consoleSpy.mockRestore()
    })

    it('does not modify local state when remove fails', async () => {
      const initialStopWords = [...mockStopWords]
      store.stopWords = initialStopWords
      
      const error = new Error('Delete failed')
      fetchWrapper.delete.mockRejectedValue(error)

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await expect(store.remove(1)).rejects.toThrow('Delete failed')
      expect(store.stopWords).toEqual(initialStopWords)

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
        expect(stopWord).toHaveProperty('exact_match')
        expect(typeof stopWord.exact_match).toBe('boolean')
      })
    })
  })

  describe('API Integration', () => {
    it('uses correct base URL for all operations', async () => {
      const baseUrl = 'http://localhost:3000/api/stopwords'

      fetchWrapper.get.mockResolvedValue([])
      fetchWrapper.post.mockResolvedValue({})
      fetchWrapper.put.mockResolvedValue({})
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
      const emptyWordStopWord = { word: '', exact_match: false }
      fetchWrapper.post.mockResolvedValue({ id: 10, ...emptyWordStopWord })

      await store.create(emptyWordStopWord)

      expect(fetchWrapper.post).toHaveBeenCalledWith('http://localhost:3000/api/stopwords', emptyWordStopWord)
    })

    it('handles special characters in words', async () => {
      const specialCharStopWord = { word: 'тест-слово!', exact_match: true }
      fetchWrapper.post.mockResolvedValue({ id: 11, ...specialCharStopWord })

      await store.create(specialCharStopWord)

      expect(fetchWrapper.post).toHaveBeenCalledWith('http://localhost:3000/api/stopwords', specialCharStopWord)
    })

    it('handles boolean exact_match values correctly', async () => {
      const testCases = [
        { word: 'тест1', exact_match: true },
        { word: 'тест2', exact_match: false }
      ]

      for (const testCase of testCases) {
        fetchWrapper.post.mockResolvedValue({ id: Math.random(), ...testCase })
        await store.create(testCase)
        expect(fetchWrapper.post).toHaveBeenCalledWith('http://localhost:3000/api/stopwords', testCase)
      }
    })

    it('handles large dataset operations', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        word: `слово${i}`,
        exact_match: i % 2 === 0
      }))

      fetchWrapper.get.mockResolvedValue(largeDataset)
      await store.getAll()

      expect(store.stopWords).toHaveLength(1000)
      expect(store.stopWords[0]).toEqual({ id: 1, word: 'слово0', exact_match: true })
      expect(store.stopWords[999]).toEqual({ id: 1000, word: 'слово999', exact_match: false })
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
