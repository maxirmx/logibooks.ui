// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { describe, expect, it } from 'vitest'
import { formatDate, formatDateTime, formatTime } from '@/helpers/date.formatters.js'

describe('date.formatters', () => {
  describe('formatDate', () => {
    it('formats date values as DD.MM.YYYY', () => {
      expect(formatDate('2026-06-10T12:30:15+03:00')).toBe('10.06.2026')
    })

    it('returns empty string for empty date values', () => {
      expect(formatDate(null)).toBe('')
      expect(formatDate(undefined)).toBe('')
      expect(formatDate('')).toBe('')
    })

    it('returns original value for invalid date values', () => {
      expect(formatDate('not-a-date')).toBe('not-a-date')
    })
  })

  describe('formatDateTime', () => {
    it('formats date-time values with Russian locale', () => {
      const value = '2026-06-10T12:30:15+03:00'

      expect(formatDateTime(value)).toBe(new Date(value).toLocaleString('ru-RU'))
    })

    it('returns empty string for empty values', () => {
      expect(formatDateTime(null)).toBe('')
      expect(formatDateTime(undefined)).toBe('')
      expect(formatDateTime('')).toBe('')
    })

    it('returns original value for invalid date-time values', () => {
      expect(formatDateTime('not-a-date')).toBe('not-a-date')
    })
  })

  describe('formatTime', () => {
    it('formats date-time values as local time with Russian locale', () => {
      const value = '2026-06-10T12:30:15+03:00'

      expect(formatTime(value)).toBe(new Date(value).toLocaleTimeString('ru-RU'))
    })

    it('returns empty string for empty values', () => {
      expect(formatTime(null)).toBe('')
      expect(formatTime(undefined)).toBe('')
      expect(formatTime('')).toBe('')
    })

    it('returns original value for invalid date-time values', () => {
      expect(formatTime('not-a-date')).toBe('not-a-date')
    })
  })
})
