// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, expect, it } from 'vitest'
import {
  formatDate,
  formatDateTime,
  formatDateTimeLines,
  formatTime
} from '@/helpers/date.formatters.js'

describe('date.formatters', () => {
  describe('formatDate', () => {
    it('returns string fallback for invalid non-string date values', () => {
      const value = new Date('invalid')

      expect(formatDate(value)).toBe(String(value))
    })
  })

  describe('formatDateTime', () => {

    it('returns original value for invalid date-time values', () => {
      expect(formatDateTime('not-a-date')).toBe('not-a-date')
    })
  })

  describe('formatTime', () => {
    it('returns empty string for empty values', () => {
      expect(formatTime(null)).toBe('')
      expect(formatTime(undefined)).toBe('')
      expect(formatTime('')).toBe('')
    })

    it('returns original value for invalid date-time values', () => {
      expect(formatTime('not-a-date')).toBe('not-a-date')
    })
  })

  describe('formatDateTimeLines', () => {
    it('displays offset-bearing decision timestamps in Moscow time', () => {
      expect(formatDateTimeLines('2026-03-28T23:30:00Z', 'Europe/Moscow')).toEqual(['29.03.2026', '02:30:00'])
    })

    it('keeps the date and clock of legacy Moscow values without an offset', () => {
      expect(formatDateTimeLines('2026-03-29T02:30:00', 'Europe/Moscow')).toEqual(['29.03.2026', '02:30:00'])
      expect(formatDateTimeLines('2026-03-29', 'Europe/Moscow')).toEqual(['29.03.2026', '00:00:00'])
    })

    it('returns original value once for invalid date-time values', () => {
      expect(formatDateTimeLines('not-a-date')).toEqual(['not-a-date'])
    })
  })
})
