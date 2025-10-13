// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getFieldTooltip, getCheckStatusTooltip } from '@/helpers/parcel.tooltip.helpers.js'
import * as parcelsCheckHelpers from '@/helpers/parcels.check.helpers.js'
import { CheckStatusCode } from '@/helpers/check.status.code.js'

// Mock the parcels check helpers
vi.mock('@/helpers/parcels.check.helpers.js', () => ({
  getCheckStatusInfo: vi.fn()
}))

// Mock the CheckStatusCode
vi.mock('@/helpers/check.status.code.js', () => ({
  CheckStatusCode: vi.fn().mockImplementation(() => ({
    toString: vi.fn()
  })),
  SWCheckStatus: {
    NotChecked: 0,
    NoIssues: 0x0010,
    IssueStopWord: 0x0100
  },
  FCCheckStatus: {
    NotChecked: 0,
    NoIssues: 0x0010,
    IssueFeacnCode: 0x0100
  }
}))

// Add static methods to the mocked CheckStatusCode
CheckStatusCode.hasIssues = vi.fn()
CheckStatusCode.fromParts = vi.fn()

describe('parcel tooltip helpers', () => {
  describe('getFieldTooltip', () => {
    const mockColumnTitles = {
      statusId: 'Статус',
      checkStatus: 'Статус проверки',
      tnVed: 'ТН ВЭД код',
      countryCode: 'Страна'
    }

    const mockColumnTooltips = {
      statusId: 'Текущий статус обработки посылки',
      checkStatus: 'Результат автоматической проверки',
      tnVed: 'Товарная номенклатура внешнеэкономической деятельности'
    }

    it('returns combined title and tooltip when both exist', () => {
      const result = getFieldTooltip('statusId', mockColumnTitles, mockColumnTooltips)
      expect(result).toBe('Статус (Текущий статус обработки посылки)')
    })

    it('returns only title when tooltip does not exist', () => {
      const result = getFieldTooltip('countryCode', mockColumnTitles, mockColumnTooltips)
      expect(result).toBe('Страна')
    })

    it('returns null when title does not exist', () => {
      const result = getFieldTooltip('nonExistentKey', mockColumnTitles, mockColumnTooltips)
      expect(result).toBeNull()
    })

    it('returns null when both title and tooltip are missing', () => {
      const result = getFieldTooltip('anotherMissingKey', {}, {})
      expect(result).toBeNull()
    })

    it('returns title when tooltip exists but title is missing', () => {
      const titlesWithoutKey = { otherKey: 'Other Title' }
      const tooltipsWithKey = { missingTitleKey: 'Some tooltip' }
      
      const result = getFieldTooltip('missingTitleKey', titlesWithoutKey, tooltipsWithKey)
      expect(result).toBeNull()
    })

    it('handles empty strings correctly', () => {
      const titlesWithEmpty = { emptyTitle: '' }
      const tooltipsWithEmpty = { emptyTooltip: '' }
      
      const result1 = getFieldTooltip('emptyTitle', titlesWithEmpty, mockColumnTooltips)
      expect(result1).toBeNull()
      
      const result2 = getFieldTooltip('statusId', { statusId: 'Title' }, tooltipsWithEmpty)
      expect(result2).toBe('Title')
    })
  })

  describe('getCheckStatusTooltip', () => {
    let mockCheckStatusInstance

    beforeEach(() => {
      mockCheckStatusInstance = {
        toString: vi.fn()
      }
      vi.clearAllMocks()
      // Reset and configure the mocked constructor
      CheckStatusCode.mockImplementation(() => mockCheckStatusInstance)
    })

    it('returns base title when item has no issues', () => {
      const item = { checkStatus: 50 }
      const feacnOrders = []
      const stopWords = []
      
      mockCheckStatusInstance.toString.mockReturnValue('Статус 50')
      CheckStatusCode.hasIssues.mockReturnValue(false)
      
      const result = getCheckStatusTooltip(item, null, feacnOrders, stopWords)
      
      expect(result).toBe('Статус 50')
      expect(CheckStatusCode).toHaveBeenCalledWith(50)
      expect(CheckStatusCode.hasIssues).toHaveBeenCalledWith(50)
      expect(parcelsCheckHelpers.getCheckStatusInfo).not.toHaveBeenCalled()
    })

    it('returns base title when item has issues but no check info', () => {
      const item = { checkStatus: 150 }
      const feacnOrders = []
      const stopWords = []
      
      mockCheckStatusInstance.toString.mockReturnValue('Статус 150')
      CheckStatusCode.hasIssues.mockReturnValue(true)
      vi.mocked(parcelsCheckHelpers.getCheckStatusInfo).mockReturnValue(null)
      
      const result = getCheckStatusTooltip(item, null, feacnOrders, stopWords)
      
      expect(result).toBe('Статус 150')
      expect(CheckStatusCode).toHaveBeenCalledWith(150)
      expect(CheckStatusCode.hasIssues).toHaveBeenCalledWith(150)
      expect(parcelsCheckHelpers.getCheckStatusInfo).toHaveBeenCalledWith(item, feacnOrders, stopWords)
    })

    it('returns combined title and check info when item has issues and check info', () => {
      const item = { 
        checkStatus: 150,
        stopWordIds: [1, 2],
        feacnOrderIds: [1, 2]
      }
      const feacnOrders = [
        { id: 1, name: 'Order 1' },
        { id: 2, name: 'Order 2' }
      ]
      const stopWords = [
        { id: 1, word: 'forbidden' },
        { id: 2, word: 'restricted' }
      ]
      
      mockCheckStatusInstance.toString.mockReturnValue('Статус 150')
      CheckStatusCode.hasIssues.mockReturnValue(true)
      vi.mocked(parcelsCheckHelpers.getCheckStatusInfo).mockReturnValue('Ограничения по коду ТН ВЭД (постановление):\nOrder 1, Order 2\n\nСтоп-слова и фразы:\nforbidden, restricted')
      
      const result = getCheckStatusTooltip(item, null, feacnOrders, stopWords)
      
      expect(result).toBe('Статус 150\nОграничения по коду ТН ВЭД (постановление):\nOrder 1, Order 2\n\nСтоп-слова и фразы:\nforbidden, restricted')
      expect(CheckStatusCode).toHaveBeenCalledWith(150)
      expect(CheckStatusCode.hasIssues).toHaveBeenCalledWith(150)
      expect(parcelsCheckHelpers.getCheckStatusInfo).toHaveBeenCalledWith(item, feacnOrders, stopWords)
    })

    it('handles empty arrays for feacnOrders and stopWords', () => {
      const item = { checkStatus: 150 }
      const feacnOrders = []
      const stopWords = []
      
      mockCheckStatusInstance.toString.mockReturnValue('Статус 150')
      CheckStatusCode.hasIssues.mockReturnValue(true)
      vi.mocked(parcelsCheckHelpers.getCheckStatusInfo).mockReturnValue('')
      
      const result = getCheckStatusTooltip(item, null, feacnOrders, stopWords)
      
      expect(result).toBe('Статус 150')
      expect(parcelsCheckHelpers.getCheckStatusInfo).toHaveBeenCalledWith(item, feacnOrders, stopWords)
    })

    it('handles undefined checkStatus', () => {
      const item = {}
      const feacnOrders = []
      const stopWords = []
      
      mockCheckStatusInstance.toString.mockReturnValue('Неизвестный статус')
      CheckStatusCode.hasIssues.mockReturnValue(false)
      
      const result = getCheckStatusTooltip(item, null, feacnOrders, stopWords)
      
      expect(result).toBe('Неизвестный статус')
      expect(CheckStatusCode).toHaveBeenCalledWith(undefined)
    })
  })
})
