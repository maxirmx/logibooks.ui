import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildNotificationTooltip, formatNotificationDate } from '@/helpers/notification.helpers.js'

// Mock the notifications store
vi.mock('@/stores/notifications.store.js', () => ({
  useNotificationsStore: vi.fn(() => ({
    getById: vi.fn((id) => {
      const notifications = [
        {
          id: 5,
          number: 'N-42',
          articles: [{article: 'Article 123'}],
          registrationDate: '2025-01-10',
          publicationDate: '2025-01-12',
          terminationDate: '2025-01-30',
          comment: 'Комментарий нотификации'
        },
        {
          id: 10,
          number: 'N-50',
          articles: [{article: 'Article 456'}],
          registrationDate: { year: 2025, month: 2, day: 15 },
          publicationDate: new Date('2025-02-20T00:00:00Z'),
          terminationDate: '2025-03-15'
        }
      ]
      return Promise.resolve(notifications.find(n => n.id === id) || null)
    })
  }))
}))

describe('notification helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('formatNotificationDate', () => {
    it('formats different date inputs to ru locale string', () => {
      expect(formatNotificationDate('2025-02-15')).toBe('15.02.2025')
      expect(formatNotificationDate(new Date('2025-02-15T00:00:00Z'))).toBe('15.02.2025')
      expect(formatNotificationDate({ year: 2025, month: 2, day: 15 })).toBe('15.02.2025')
    })

    it('returns original string for invalid date strings', () => {
      expect(formatNotificationDate('not-a-date')).toBe('not-a-date')
    })

    it('returns empty string for falsy values', () => {
      expect(formatNotificationDate(null)).toBe('')
      expect(formatNotificationDate(undefined)).toBe('')
    })
  })

  describe('buildNotificationTooltip', () => {
    it('builds tooltip string with notification data from store', async () => {
      const tooltip = await buildNotificationTooltip({
        notificationId: 5
      })

      expect(tooltip).toContain('Номер нотификации: N-42')
      expect(tooltip).toContain('Дата регистрации: 10.01.2025')
      expect(tooltip).toContain('Дата публикации: 12.01.2025')
      expect(tooltip).toContain('Срок действия: 30.01.2025')
      expect(tooltip).toContain('Комментарий:')
      expect(tooltip).toContain('Комментарий нотификации')
    })

    it('builds tooltip with different date formats', async () => {
      const tooltip = await buildNotificationTooltip({
        notificationId: 10
      })

      expect(tooltip).toContain('Номер нотификации: N-50')
      expect(tooltip).toContain('Дата регистрации: 15.02.2025')
      expect(tooltip).toContain('Дата публикации: 20.02.2025')
      expect(tooltip).toContain('Срок действия: 15.03.2025')
    })

    it('returns message when notification not found in store', async () => {
      const tooltip = await buildNotificationTooltip({
        notificationId: 999
      })

      expect(tooltip).toBe('Id нотификации: 999 (данные не загружены)')
    })

    it('returns empty string when notification id is missing', async () => {
      expect(await buildNotificationTooltip({})).toBe('')
      expect(await buildNotificationTooltip({ notificationId: null })).toBe('')
      expect(await buildNotificationTooltip({ notificationId: undefined })).toBe('')
    })
  })
})
