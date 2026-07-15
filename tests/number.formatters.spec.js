// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, expect, it } from 'vitest'
import { formatIntegerThousands, formatPrice, formatWeight } from '@/helpers/number.formatters.js'

describe('number.formatters', () => {
  describe('formatWeight', () => {
    it('formats finite numeric input with three decimals and a sign', () => {
      expect(formatWeight(-1234.5)).toBe('-1\u00A0234.500')
    })

    it('parses strings containing comma and dot separators', () => {
      expect(formatWeight('1,234.567')).toBe('1\u00A0234.567')
    })

    it('parses strings containing only a comma separator', () => {
      expect(formatWeight('123,456')).toBe('123.456')
    })

    it('removes whitespace thousands separators', () => {
      expect(formatWeight('1 234.567')).toBe('1\u00A0234.567')
    })

    it('returns zero for null and blank input', () => {
      expect(formatWeight(null)).toBe('0.000')
      expect(formatWeight('   ')).toBe('0.000')
    })

  })

  describe('formatPrice', () => {
    it('formats and rounds a finite price', () => {
      expect(formatPrice(123.456)).toBe('123.46')
    })

    it('returns zero for an invalid price', () => {
      expect(formatPrice(undefined)).toBe('0.00')
    })
  })

  describe('formatIntegerThousands', () => {
    it('truncates and formats a finite integer count', () => {
      expect(formatIntegerThousands(-1234.999)).toBe('-1\u00A0234')
    })

    it('returns zero for an invalid integer count', () => {
      expect(formatIntegerThousands(NaN)).toBe('0')
    })
  })
})
