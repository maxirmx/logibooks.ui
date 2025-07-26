import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getFieldTooltip, getCheckStatusTooltip } from '@/helpers/parcel.tooltip.helpers.js'
import * as ordersCheckHelper from '@/helpers/orders.check.helper.js'

// Mock the orders check helper
vi.mock('@/helpers/orders.check.helper.js', () => ({
  HasIssues: vi.fn(),
  getCheckStatusInfo: vi.fn()
}))

describe('parcel tooltip helpers', () => {
  describe('getFieldTooltip', () => {
    const mockColumnTitles = {
      statusId: 'Статус',
      checkStatusId: 'Статус проверки',
      tnVed: 'ТН ВЭД код',
      countryCode: 'Страна'
    }

    const mockColumnTooltips = {
      statusId: 'Текущий статус обработки посылки',
      checkStatusId: 'Результат автоматической проверки',
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
    let mockGetStatusTitle

    beforeEach(() => {
      mockGetStatusTitle = vi.fn()
      vi.clearAllMocks()
    })

    it('returns base title when item has no issues', () => {
      const item = { checkStatusId: 50 }
      const feacnOrders = []
      const stopWords = []
      
      mockGetStatusTitle.mockReturnValue('Статус 50')
      vi.mocked(ordersCheckHelper.HasIssues).mockReturnValue(false)
      
      const result = getCheckStatusTooltip(item, mockGetStatusTitle, feacnOrders, stopWords)
      
      expect(result).toBe('Статус 50')
      expect(mockGetStatusTitle).toHaveBeenCalledWith(50)
      expect(ordersCheckHelper.HasIssues).toHaveBeenCalledWith(50)
      expect(ordersCheckHelper.getCheckStatusInfo).not.toHaveBeenCalled()
    })

    it('returns base title when item has issues but no check info', () => {
      const item = { checkStatusId: 150 }
      const feacnOrders = []
      const stopWords = []
      
      mockGetStatusTitle.mockReturnValue('Статус 150')
      vi.mocked(ordersCheckHelper.HasIssues).mockReturnValue(true)
      vi.mocked(ordersCheckHelper.getCheckStatusInfo).mockReturnValue(null)
      
      const result = getCheckStatusTooltip(item, mockGetStatusTitle, feacnOrders, stopWords)
      
      expect(result).toBe('Статус 150')
      expect(mockGetStatusTitle).toHaveBeenCalledWith(150)
      expect(ordersCheckHelper.HasIssues).toHaveBeenCalledWith(150)
      expect(ordersCheckHelper.getCheckStatusInfo).toHaveBeenCalledWith(item, feacnOrders, stopWords)
    })

    it('returns combined title and check info when item has issues and check info', () => {
      const item = { 
        checkStatusId: 150,
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
      
      mockGetStatusTitle.mockReturnValue('Статус 150')
      vi.mocked(ordersCheckHelper.HasIssues).mockReturnValue(true)
      vi.mocked(ordersCheckHelper.getCheckStatusInfo).mockReturnValue('Возможные ограничения по коду ТН ВЭД:\nOrder 1, Order 2\n\nСтоп-слова и фразы:\nforbidden, restricted')
      
      const result = getCheckStatusTooltip(item, mockGetStatusTitle, feacnOrders, stopWords)
      
      expect(result).toBe('Статус 150\nВозможные ограничения по коду ТН ВЭД:\nOrder 1, Order 2\n\nСтоп-слова и фразы:\nforbidden, restricted')
      expect(mockGetStatusTitle).toHaveBeenCalledWith(150)
      expect(ordersCheckHelper.HasIssues).toHaveBeenCalledWith(150)
      expect(ordersCheckHelper.getCheckStatusInfo).toHaveBeenCalledWith(item, feacnOrders, stopWords)
    })

    it('handles empty arrays for feacnOrders and stopWords', () => {
      const item = { checkStatusId: 150 }
      const feacnOrders = []
      const stopWords = []
      
      mockGetStatusTitle.mockReturnValue('Статус 150')
      vi.mocked(ordersCheckHelper.HasIssues).mockReturnValue(true)
      vi.mocked(ordersCheckHelper.getCheckStatusInfo).mockReturnValue('')
      
      const result = getCheckStatusTooltip(item, mockGetStatusTitle, feacnOrders, stopWords)
      
      expect(result).toBe('Статус 150')
      expect(ordersCheckHelper.getCheckStatusInfo).toHaveBeenCalledWith(item, feacnOrders, stopWords)
    })

    it('handles undefined checkStatusId', () => {
      const item = {}
      const feacnOrders = []
      const stopWords = []
      
      mockGetStatusTitle.mockReturnValue('Неизвестный статус')
      vi.mocked(ordersCheckHelper.HasIssues).mockReturnValue(false)
      
      const result = getCheckStatusTooltip(item, mockGetStatusTitle, feacnOrders, stopWords)
      
      expect(result).toBe('Неизвестный статус')
      expect(mockGetStatusTitle).toHaveBeenCalledWith(undefined)
    })
  })
})
