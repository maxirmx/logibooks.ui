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
    it('returns original value once for invalid date-time values', () => {
      expect(formatDateTimeLines('not-a-date')).toEqual(['not-a-date'])
    })
  })
})
