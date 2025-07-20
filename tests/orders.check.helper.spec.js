import { describe, it, expect } from 'vitest'
import { getStopWordsText, getStopWordsInfo, getFeacnOrdersText, getFeacnOrdersInfo, getCheckStatusInfo } from '@/helpers/orders.check.helper.js'

describe('orders.check.helper', () => {
  const mockStopWords = [
    { id: 1, word: 'forbidden' },
    { id: 2, word: 'banned' },
    { id: 3, word: 'restricted' }
  ]

  const mockFeacnOrders = [
    { id: 1, comment: 'Restricted chemicals' },
    { id: 2, comment: 'Dangerous goods' },
    { id: 3, comment: 'Medical equipment' },
    { id: 4, comment: '' }, // Empty comment
    { id: 5 } // No comment field
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

  describe('getFeacnOrdersText', () => {
    it('returns null when item has no feacnOrderIds', () => {
      const item = {}
      const result = getFeacnOrdersText(item, mockFeacnOrders)
      expect(result).toBeNull()
    })

    it('returns null when item has empty feacnOrderIds array', () => {
      const item = { feacnOrderIds: [] }
      const result = getFeacnOrdersText(item, mockFeacnOrders)
      expect(result).toBeNull()
    })

    it('returns formatted feacn orders text for single order', () => {
      const item = { feacnOrderIds: [1] }
      const result = getFeacnOrdersText(item, mockFeacnOrders)
      expect(result).toBe("'Restricted chemicals'")
    })

    it('returns formatted feacn orders text for multiple orders', () => {
      const item = { feacnOrderIds: [1, 2, 3] }
      const result = getFeacnOrdersText(item, mockFeacnOrders)
      expect(result).toBe("'Restricted chemicals', 'Dangerous goods', 'Medical equipment'")
    })

    it('filters out non-existent feacn order IDs', () => {
      const item = { feacnOrderIds: [1, 999, 2] }
      const result = getFeacnOrdersText(item, mockFeacnOrders)
      expect(result).toBe("'Restricted chemicals', 'Dangerous goods'")
    })

    it('filters out orders with empty comments', () => {
      const item = { feacnOrderIds: [1, 4, 2] }
      const result = getFeacnOrdersText(item, mockFeacnOrders)
      expect(result).toBe("'Restricted chemicals', 'Dangerous goods'")
    })

    it('filters out orders with no comment field', () => {
      const item = { feacnOrderIds: [1, 5, 2] }
      const result = getFeacnOrdersText(item, mockFeacnOrders)
      expect(result).toBe("'Restricted chemicals', 'Dangerous goods'")
    })

    it('returns null when no valid feacn order IDs exist', () => {
      const item = { feacnOrderIds: [999, 888] }
      const result = getFeacnOrdersText(item, mockFeacnOrders)
      expect(result).toBeNull()
    })

    it('returns null when only orders with empty comments exist', () => {
      const item = { feacnOrderIds: [4, 5] }
      const result = getFeacnOrdersText(item, mockFeacnOrders)
      expect(result).toBeNull()
    })
  })

  describe('getFeacnOrdersInfo', () => {
    it('returns null when no feacn orders exist', () => {
      const item = {}
      const result = getFeacnOrdersInfo(item, mockFeacnOrders)
      expect(result).toBeNull()
    })

    it('returns formatted info text with prefix', () => {
      const item = { feacnOrderIds: [1, 2] }
      const result = getFeacnOrdersInfo(item, mockFeacnOrders)
      expect(result).toBe("Возможные ограничения по коду ТН ВЭД: 'Restricted chemicals', 'Dangerous goods'")
    })

    it('returns null when feacn orders text is empty', () => {
      const item = { feacnOrderIds: [999] }
      const result = getFeacnOrdersInfo(item, mockFeacnOrders)
      expect(result).toBeNull()
    })
  })

  describe('getCheckStatusInfo', () => {
    it('returns combined information when both feacn orders and stopwords are present', () => {
      const item = { feacnOrderIds: [1, 2], stopWordIds: [1, 2] }
      const result = getCheckStatusInfo(item, mockFeacnOrders, mockStopWords)
      expect(result).toBe("Возможные ограничения по коду ТН ВЭД: 'Restricted chemicals', 'Dangerous goods'; Стоп-слова и фразы: 'forbidden', 'banned'")
    })

    it('returns only feacn orders information when only feacn orders are present', () => {
      const item = { feacnOrderIds: [1], stopWordIds: [] }
      const result = getCheckStatusInfo(item, mockFeacnOrders, mockStopWords)
      expect(result).toBe("Возможные ограничения по коду ТН ВЭД: 'Restricted chemicals'")
    })

    it('returns only stopwords information when only stopwords are present', () => {
      const item = { feacnOrderIds: [], stopWordIds: [1, 3] }
      const result = getCheckStatusInfo(item, mockFeacnOrders, mockStopWords)
      expect(result).toBe("Стоп-слова и фразы: 'forbidden', 'restricted'")
    })

    it('returns null when neither feacn orders nor stopwords are present', () => {
      const item = { feacnOrderIds: [], stopWordIds: [] }
      const result = getCheckStatusInfo(item, mockFeacnOrders, mockStopWords)
      expect(result).toBeNull()
    })

    it('returns null when item has no relevant properties', () => {
      const item = {}
      const result = getCheckStatusInfo(item, mockFeacnOrders, mockStopWords)
      expect(result).toBeNull()
    })

    it('returns null when item is null', () => {
      const result = getCheckStatusInfo(null, mockFeacnOrders, mockStopWords)
      expect(result).toBeNull()
    })

    it('handles case when feacn orders exist but have no comments', () => {
      const item = { feacnOrderIds: [4, 5], stopWordIds: [1] }
      const result = getCheckStatusInfo(item, mockFeacnOrders, mockStopWords)
      expect(result).toBe("Стоп-слова и фразы: 'forbidden'")
    })

    it('handles case when stopwords have invalid IDs', () => {
      const item = { feacnOrderIds: [1], stopWordIds: [999] }
      const result = getCheckStatusInfo(item, mockFeacnOrders, mockStopWords)
      expect(result).toBe("Возможные ограничения по коду ТН ВЭД: 'Restricted chemicals'")
    })

    it('handles case when feacn orders have invalid IDs', () => {
      const item = { feacnOrderIds: [999], stopWordIds: [1] }
      const result = getCheckStatusInfo(item, mockFeacnOrders, mockStopWords)
      expect(result).toBe("Стоп-слова и фразы: 'forbidden'")
    })
  })
})
