// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect } from 'vitest'
import { getStopWordsInfo, getCheckStatusInfo, getCheckStatusClass } from '@/helpers/parcels.check.helpers.js'
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

  describe('getStopWordsInfo', () => {
    it('returns null when stopwords text is empty', () => {
      const item = { stopWordIds: [999] }
      const result = getStopWordsInfo(item, mockStopWords)
      expect(result).toBeNull()
    })
  })

  describe('getCheckStatusInfo', () => {
    it('handles case when feacn orders have invalid IDs', () => {
      const item = { feacnOrderIds: [999], stopWordIds: [1], feacnPrefixIds: [2] }
      const result = getCheckStatusInfo(item, mockFeacnOrders, mockStopWords, mockFeacnPrefixes)
      expect(result).toBe(
        "Стоп-слова и фразы: 'forbidden'; Ограничения по коду ТН ВЭД (установлено вручную): '5678'"
      )
    })

    it('handles case when feacn prefixes have invalid IDs', () => {
      const item = { feacnOrderIds: [1], stopWordIds: [1], feacnPrefixIds: [999] }
      const result = getCheckStatusInfo(item, mockFeacnOrders, mockStopWords, mockFeacnPrefixes)
      expect(result).toBe(
        "Ограничения по коду ТН ВЭД (постановление): 'Restricted chemicals'; Стоп-слова и фразы: 'forbidden'"
      )
    })

    it('includes matchingSWComment when present with other info', () => {
      const item = {
        feacnOrderIds: [1],
        stopWordIds: [1],
        matchingSWComment: 'Additional SW information'
      }
      const result = getCheckStatusInfo(item, mockFeacnOrders, mockStopWords, mockFeacnPrefixes)
      expect(result).toBe(
        "Ограничения по коду ТН ВЭД (постановление): 'Restricted chemicals'; Стоп-слова и фразы: 'forbidden'; Additional SW information"
      )
    })

  })

  describe('Status Check Functions', () => {
    describe('getCheckStatusClass', () => {
      it('returns "is-approved-with-excise" for approved with excise status', () => {
        expect(getCheckStatusClass(CheckStatusCode.ApprovedWithExcise.value)).toBe(
          'is-approved-with-excise'
        )
      })

      it('returns "is-approved" for SW approved status', () => {
        const swApproved = CheckStatusCode.fromParts(FCCheckStatus.NoIssues, SWCheckStatus.Approved)
        expect(getCheckStatusClass(swApproved.value)).toBe('is-approved')
      })

      it('returns "has-issues-with-inheritance" for IssueStopWordInherited status', () => {
        const swIssueInherited = CheckStatusCode.fromParts(
          FCCheckStatus.NoIssues,
          SWCheckStatus.IssueStopWordInherited
        )
        expect(getCheckStatusClass(swIssueInherited.value)).toBe('has-issues-with-inheritance')
      })

      it('returns "is-approved-with-inheritance" for ApprovedInherited status', () => {
        const swApprovedInherited = CheckStatusCode.fromParts(
          FCCheckStatus.NoIssues,
          SWCheckStatus.ApprovedInherited
        )
        expect(getCheckStatusClass(swApprovedInherited.value)).toBe('is-approved-with-inheritance')
      })

      it('returns "is-duplicate2" for Duplicate2 status', () => {
        expect(getCheckStatusClass(CheckStatusCode.Duplicate2.value)).toBe('is-duplicate2')
      })

    })
  })
})
