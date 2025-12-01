// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { describe, it, expect } from 'vitest'
import { 
  getStopWordsText, 
  getStopWordsInfo, 
  getFeacnOrdersText, 
  getFeacnOrdersInfo, 
  getFeacnPrefixesInfo,
  getCheckStatusInfo,
  getCheckStatusClass
} from '@/helpers/parcels.check.helpers.js'
import { CheckStatusCode, SWCheckStatus, FCCheckStatus } from '@/helpers/check.status.code.js'

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

  const mockFeacnPrefixes = [
    { id: 1, code: '1234' },
    { id: 2, code: '5678' },
    { id: 3, code: '9012' }
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
      expect(result).toBe("Ограничения по коду ТН ВЭД (постановление): 'Restricted chemicals', 'Dangerous goods'")
    })

    it('returns null when feacn orders text is empty', () => {
      const item = { feacnOrderIds: [999] }
      const result = getFeacnOrdersInfo(item, mockFeacnOrders)
      expect(result).toBeNull()
    })
  })

  describe('getFeacnPrefixesInfo', () => {
    it('returns null when item has no feacnPrefixIds', () => {
      const item = {}
      const result = getFeacnPrefixesInfo(item, mockFeacnPrefixes)
      expect(result).toBeNull()
    })

    it('returns null when item has empty feacnPrefixIds array', () => {
      const item = { feacnPrefixIds: [] }
      const result = getFeacnPrefixesInfo(item, mockFeacnPrefixes)
      expect(result).toBeNull()
    })

    it('returns formatted feacn prefixes info text for single prefix', () => {
      const item = { feacnPrefixIds: [1] }
      const result = getFeacnPrefixesInfo(item, mockFeacnPrefixes)
      expect(result).toBe("Ограничения по коду ТН ВЭД (установлено вручную): '1234'")
    })

    it('returns formatted feacn prefixes info text for multiple prefixes', () => {
      const item = { feacnPrefixIds: [1, 2, 3] }
      const result = getFeacnPrefixesInfo(item, mockFeacnPrefixes)
      expect(result).toBe("Ограничения по коду ТН ВЭД (установлено вручную): '1234', '5678', '9012'")
    })

    it('filters out non-existent feacn prefix IDs', () => {
      const item = { feacnPrefixIds: [1, 999, 2] }
      const result = getFeacnPrefixesInfo(item, mockFeacnPrefixes)
      expect(result).toBe("Ограничения по коду ТН ВЭД (установлено вручную): '1234', '5678'")
    })

    it('returns null when no valid feacn prefix IDs exist', () => {
      const item = { feacnPrefixIds: [999, 888] }
      const result = getFeacnPrefixesInfo(item, mockFeacnPrefixes)
      expect(result).toBeNull()
    })
  })

  describe('getCheckStatusInfo', () => {
    it('returns combined information when all three types are present', () => {
      const item = { feacnOrderIds: [1], stopWordIds: [1], feacnPrefixIds: [1] }
      const result = getCheckStatusInfo(item, mockFeacnOrders, mockStopWords, mockFeacnPrefixes)
      expect(result).toBe("Ограничения по коду ТН ВЭД (постановление): 'Restricted chemicals'; Стоп-слова и фразы: 'forbidden'; Ограничения по коду ТН ВЭД (установлено вручную): '1234'")
    })

    it('returns combined information when both feacn orders and stopwords are present', () => {
      const item = { feacnOrderIds: [1, 2], stopWordIds: [1, 2] }
      const result = getCheckStatusInfo(item, mockFeacnOrders, mockStopWords, mockFeacnPrefixes)
      expect(result).toBe("Ограничения по коду ТН ВЭД (постановление): 'Restricted chemicals', 'Dangerous goods'; Стоп-слова и фразы: 'forbidden', 'banned'")
    })

    it('returns combined information when both feacn orders and prefixes are present', () => {
      const item = { feacnOrderIds: [1], feacnPrefixIds: [1, 2] }
      const result = getCheckStatusInfo(item, mockFeacnOrders, mockStopWords, mockFeacnPrefixes)
      expect(result).toBe("Ограничения по коду ТН ВЭД (постановление): 'Restricted chemicals'; Ограничения по коду ТН ВЭД (установлено вручную): '1234', '5678'")
    })

    it('returns combined information when both stopwords and prefixes are present', () => {
      const item = { stopWordIds: [1, 2], feacnPrefixIds: [1] }
      const result = getCheckStatusInfo(item, mockFeacnOrders, mockStopWords, mockFeacnPrefixes)
      expect(result).toBe("Стоп-слова и фразы: 'forbidden', 'banned'; Ограничения по коду ТН ВЭД (установлено вручную): '1234'")
    })

    it('returns only feacn orders information when only feacn orders are present', () => {
      const item = { feacnOrderIds: [1], stopWordIds: [], feacnPrefixIds: [] }
      const result = getCheckStatusInfo(item, mockFeacnOrders, mockStopWords, mockFeacnPrefixes)
      expect(result).toBe("Ограничения по коду ТН ВЭД (постановление): 'Restricted chemicals'")
    })

    it('returns only stopwords information when only stopwords are present', () => {
      const item = { feacnOrderIds: [], stopWordIds: [1, 3], feacnPrefixIds: [] }
      const result = getCheckStatusInfo(item, mockFeacnOrders, mockStopWords, mockFeacnPrefixes)
      expect(result).toBe("Стоп-слова и фразы: 'forbidden', 'restricted'")
    })

    it('returns only prefixes information when only prefixes are present', () => {
      const item = { feacnOrderIds: [], stopWordIds: [], feacnPrefixIds: [2, 3] }
      const result = getCheckStatusInfo(item, mockFeacnOrders, mockStopWords, mockFeacnPrefixes)
      expect(result).toBe("Ограничения по коду ТН ВЭД (установлено вручную): '5678', '9012'")
    })

    it('returns null when no information is present', () => {
      const item = { feacnOrderIds: [], stopWordIds: [], feacnPrefixIds: [] }
      const result = getCheckStatusInfo(item, mockFeacnOrders, mockStopWords, mockFeacnPrefixes)
      expect(result).toBeNull()
    })

    it('returns null when item has no relevant properties', () => {
      const item = {}
      const result = getCheckStatusInfo(item, mockFeacnOrders, mockStopWords, mockFeacnPrefixes)
      expect(result).toBeNull()
    })

    it('returns null when item is null', () => {
      const result = getCheckStatusInfo(null, mockFeacnOrders, mockStopWords, mockFeacnPrefixes)
      expect(result).toBeNull()
    })

    it('handles case when feacn orders exist but have no comments', () => {
      const item = { feacnOrderIds: [4, 5], stopWordIds: [1], feacnPrefixIds: [] }
      const result = getCheckStatusInfo(item, mockFeacnOrders, mockStopWords, mockFeacnPrefixes)
      expect(result).toBe("Стоп-слова и фразы: 'forbidden'")
    })

    it('handles case when stopwords have invalid IDs', () => {
      const item = { feacnOrderIds: [1], stopWordIds: [999], feacnPrefixIds: [1] }
      const result = getCheckStatusInfo(item, mockFeacnOrders, mockStopWords, mockFeacnPrefixes)
      expect(result).toBe("Ограничения по коду ТН ВЭД (постановление): 'Restricted chemicals'; Ограничения по коду ТН ВЭД (установлено вручную): '1234'")
    })

    it('handles case when feacn orders have invalid IDs', () => {
      const item = { feacnOrderIds: [999], stopWordIds: [1], feacnPrefixIds: [2] }
      const result = getCheckStatusInfo(item, mockFeacnOrders, mockStopWords, mockFeacnPrefixes)
      expect(result).toBe("Стоп-слова и фразы: 'forbidden'; Ограничения по коду ТН ВЭД (установлено вручную): '5678'")
    })

    it('handles case when feacn prefixes have invalid IDs', () => {
      const item = { feacnOrderIds: [1], stopWordIds: [1], feacnPrefixIds: [999] }
      const result = getCheckStatusInfo(item, mockFeacnOrders, mockStopWords, mockFeacnPrefixes)
      expect(result).toBe("Ограничения по коду ТН ВЭД (постановление): 'Restricted chemicals'; Стоп-слова и фразы: 'forbidden'")
    })

    it('includes matchingFCComment when present with other info', () => {
      const item = { 
        feacnOrderIds: [1],
        stopWordIds: [1],
        matchingFCComment: 'Additional FC information'
      }
      const result = getCheckStatusInfo(item, mockFeacnOrders, mockStopWords, mockFeacnPrefixes)
      expect(result).toBe("Ограничения по коду ТН ВЭД (постановление): 'Restricted chemicals'; Стоп-слова и фразы: 'forbidden'; Additional FC information")
    })

    it('returns only matchingFCComment when no other info present', () => {
      const item = { 
        matchingFCComment: 'FC information only'
      }
      const result = getCheckStatusInfo(item, mockFeacnOrders, mockStopWords, mockFeacnPrefixes)
      expect(result).toBe('FC information only')
    })

    it('ignores empty matchingFCComment', () => {
      const item = { 
        stopWordIds: [1],
        matchingFCComment: ''
      }
      const result = getCheckStatusInfo(item, mockFeacnOrders, mockStopWords, mockFeacnPrefixes)
      expect(result).toBe("Стоп-слова и фразы: 'forbidden'")
    })

    it('ignores null matchingFCComment', () => {
      const item = { 
        stopWordIds: [1],
        matchingFCComment: null
      }
      const result = getCheckStatusInfo(item, mockFeacnOrders, mockStopWords, mockFeacnPrefixes)
      expect(result).toBe("Стоп-слова и фразы: 'forbidden'")
    })

    it('includes matchingFCComment with prefixes', () => {
      const item = { 
        feacnPrefixIds: [1],
        matchingFCComment: 'Prefix comment'
      }
      const result = getCheckStatusInfo(item, mockFeacnOrders, mockStopWords, mockFeacnPrefixes)
      expect(result).toBe("Ограничения по коду ТН ВЭД (установлено вручную): '1234'; Prefix comment")
    })
  })

  describe('Status Check Functions', () => {
    describe('getCheckStatusClass', () => {
      it('returns "has-issues" for status codes with issues', () => {
        const swIssue = CheckStatusCode.fromParts(FCCheckStatus.NotChecked, SWCheckStatus.IssueStopWord)
        const fcIssue = CheckStatusCode.fromParts(FCCheckStatus.IssueFeacnCode, SWCheckStatus.NotChecked)
        const bothIssues = CheckStatusCode.fromParts(FCCheckStatus.IssueNonexistingFeacn, SWCheckStatus.IssueStopWord)
        
        expect(getCheckStatusClass(swIssue.value)).toBe('has-issues')
        expect(getCheckStatusClass(fcIssue.value)).toBe('has-issues')
        expect(getCheckStatusClass(bothIssues.value)).toBe('has-issues')
      })

      it('returns "not-checked" for not checked status', () => {
        expect(getCheckStatusClass(CheckStatusCode.NotChecked.value)).toBe('not-checked')
      })

      it('returns "is-approved-with-excise" for approved with excise status', () => {
        expect(getCheckStatusClass(CheckStatusCode.ApprovedWithExcise.value)).toBe('is-approved-with-excise')
      })

      it('returns "is-approved" for SW approved status', () => {
        const swApproved = CheckStatusCode.fromParts(FCCheckStatus.NoIssues, SWCheckStatus.Approved)
        expect(getCheckStatusClass(swApproved.value)).toBe('is-approved')
      })

      it('returns "no-issues" as default for other status codes', () => {
        const noIssues = CheckStatusCode.fromParts(FCCheckStatus.NoIssues, SWCheckStatus.NoIssues)
        const swNoIssues = CheckStatusCode.fromParts(FCCheckStatus.NotChecked, SWCheckStatus.NoIssues)
        
        expect(getCheckStatusClass(noIssues.value)).toBe('no-issues')
        expect(getCheckStatusClass(swNoIssues.value)).toBe('no-issues')
      })

      it('returns empty string for undefined or null status codes', () => {
        expect(getCheckStatusClass(undefined)).toBe('')
        expect(getCheckStatusClass(null)).toBe('')
      })
    })
  })
})
