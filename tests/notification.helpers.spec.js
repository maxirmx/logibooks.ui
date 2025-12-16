import { describe, it, expect } from 'vitest'
import { buildNotificationTooltip, formatNotificationDate } from '@/helpers/notification.helpers.js'

describe('notification helpers', () => {
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
    it('builds tooltip string with available fields', () => {
      const tooltip = buildNotificationTooltip({
        notificationId: 5,
        notificationNumber: 'N-42',
        notificationRegistrationDate: '2025-01-10',
        notificationPublicationDate: { year: 2025, month: 1, day: 12 },
        notificationTerminationDate: new Date('2025-01-30T00:00:00Z')
      })

      expect(tooltip).toContain('Номер: N-42')
      expect(tooltip).toContain('Дата регистрации: 10.01.2025')
      expect(tooltip).toContain('Дата публикации: 12.01.2025')
      expect(tooltip).toContain('Дата окончания: 30.01.2025')
    })

    it('returns empty string when notification id is missing', () => {
      expect(buildNotificationTooltip({})).toBe('')
      expect(buildNotificationTooltip({ notificationId: null })).toBe('')
    })
  })
})
