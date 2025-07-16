import { describe, it, expect } from 'vitest'
import { getStopWordsText, getStopWordsInfo } from '@/helpers/stopwords.helper.js'

describe('stopwords.helper', () => {
  const mockStopWords = [
    { id: 1, word: 'forbidden' },
    { id: 2, word: 'banned' },
    { id: 3, word: 'restricted' }
  ]

  describe('getStopWordsText', () => {
    it('returns null when item has no stopWordIds', () => {
      const item = {}
      const result = getStopWordsText(item, mockStopWords)
      expect(result).toBeNull()
    })

    it('returns null when item has empty stopWordIds array', () => {
      const item = { stopWordIds: [] }
      const result = getStopWordsText(item, mockStopWords)
      expect(result).toBeNull()
    })

    it('returns formatted stopwords text for single stopword', () => {
      const item = { stopWordIds: [1] }
      const result = getStopWordsText(item, mockStopWords)
      expect(result).toBe("'forbidden'")
    })

    it('returns formatted stopwords text for multiple stopwords', () => {
      const item = { stopWordIds: [1, 2, 3] }
      const result = getStopWordsText(item, mockStopWords)
      expect(result).toBe("'forbidden', 'banned', 'restricted'")
    })

    it('filters out non-existent stopword IDs', () => {
      const item = { stopWordIds: [1, 999, 2] }
      const result = getStopWordsText(item, mockStopWords)
      expect(result).toBe("'forbidden', 'banned'")
    })

    it('returns null when no valid stopword IDs exist', () => {
      const item = { stopWordIds: [999, 888] }
      const result = getStopWordsText(item, mockStopWords)
      expect(result).toBeNull()
    })
  })

  describe('getStopWordsInfo', () => {
    it('returns null when no stopwords exist', () => {
      const item = {}
      const result = getStopWordsInfo(item, mockStopWords)
      expect(result).toBeNull()
    })

    it('returns formatted info text with prefix', () => {
      const item = { stopWordIds: [1, 2] }
      const result = getStopWordsInfo(item, mockStopWords)
      expect(result).toBe("Стоп-слова и фразы: 'forbidden', 'banned'")
    })

    it('returns null when stopwords text is empty', () => {
      const item = { stopWordIds: [999] }
      const result = getStopWordsInfo(item, mockStopWords)
      expect(result).toBeNull()
    })
  })
})
