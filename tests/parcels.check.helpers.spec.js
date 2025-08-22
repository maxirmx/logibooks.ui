import { describe, it, expect } from 'vitest'
import { 
  getStopWordsText, 
  getStopWordsInfo, 
  getFeacnOrdersText, 
  getFeacnOrdersInfo, 
  getCheckStatusInfo,
  HasIssues,
  IsNotChecked,
  HasNoIssues,
  IsApproved,
  getCheckStatusClass
} from '@/helpers/parcels.check.helpers.js'

describe('parcels.check.helpers', () => {
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

  describe('Status Check Functions', () => {
    describe('HasIssues', () => {
      it('returns true for status IDs between 100 and 200', () => {
        expect(HasIssues(101)).toBe(true)
        expect(HasIssues(150)).toBe(true)
        expect(HasIssues(200)).toBe(true)
      })

      it('returns false for status IDs <= 100', () => {
        expect(HasIssues(50)).toBe(false)
        expect(HasIssues(100)).toBe(false)
      })

      it('returns false for status IDs > 200', () => {
        expect(HasIssues(201)).toBe(false)
        expect(HasIssues(300)).toBe(false)
      })
    })

    describe('IsNotChecked', () => {
      it('returns true for status IDs <= 100', () => {
        expect(IsNotChecked(50)).toBe(true)
        expect(IsNotChecked(100)).toBe(true)
      })

      it('returns false for status IDs > 100', () => {
        expect(IsNotChecked(101)).toBe(false)
        expect(IsNotChecked(200)).toBe(false)
      })
    })

    describe('HasNoIssues', () => {
      it('returns true for status IDs between 200 and 300', () => {
        expect(HasNoIssues(201)).toBe(true)
        expect(HasNoIssues(250)).toBe(true)
        expect(HasNoIssues(300)).toBe(true)
      })

      it('returns false for status IDs <= 200', () => {
        expect(HasNoIssues(150)).toBe(false)
        expect(HasNoIssues(200)).toBe(false)
      })

      it('returns false for status IDs > 300', () => {
        expect(HasNoIssues(301)).toBe(false)
        expect(HasNoIssues(400)).toBe(false)
      })
    })

    describe('IsApproved', () => {
      it('returns true for status IDs > 300', () => {
        expect(IsApproved(301)).toBe(true)
        expect(IsApproved(400)).toBe(true)
        expect(IsApproved(999)).toBe(true)
      })

      it('returns false for status IDs <= 300', () => {
        expect(IsApproved(250)).toBe(false)
        expect(IsApproved(300)).toBe(false)
      })
    })

    describe('getCheckStatusClass', () => {
      it('returns "has-issues" for status IDs indicating issues', () => {
        expect(getCheckStatusClass(101)).toBe('has-issues')
        expect(getCheckStatusClass(150)).toBe('has-issues')
        expect(getCheckStatusClass(200)).toBe('has-issues')
      })

      it('returns "not-checked" for status IDs indicating not checked', () => {
        expect(getCheckStatusClass(50)).toBe('not-checked')
        expect(getCheckStatusClass(100)).toBe('not-checked')
      })

      it('returns "no-issues" for status IDs indicating no issues', () => {
        expect(getCheckStatusClass(201)).toBe('no-issues')
        expect(getCheckStatusClass(250)).toBe('no-issues')
        expect(getCheckStatusClass(300)).toBe('no-issues')
      })

      it('returns "is-approved" for status IDs indicating approved', () => {
        expect(getCheckStatusClass(301)).toBe('is-approved')
        expect(getCheckStatusClass(400)).toBe('is-approved')
        expect(getCheckStatusClass(999)).toBe('is-approved')
      })

      it('returns empty string for undefined or null status IDs', () => {
        expect(getCheckStatusClass(undefined)).toBe('')
        expect(getCheckStatusClass(null)).toBe('')
      })
    })
  })
})
