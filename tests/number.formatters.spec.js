// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { describe, it, expect } from 'vitest'
import { formatWeight, formatPrice, formatIntegerThousands } from '@/helpers/number.formatters.js'

describe('number.formatters', () => {
  describe('formatWeight', () => {
    describe('basic formatting with 3 decimal places', () => {
      it('formats a simple number', () => {
        expect(formatWeight(123)).toBe('123.000')
      })

      it('formats a number with decimals', () => {
        expect(formatWeight(123.456)).toBe('123.456')
      })

      it('formats zero', () => {
        expect(formatWeight(0)).toBe('0.000')
      })

      it('formats a small decimal', () => {
        expect(formatWeight(0.123)).toBe('0.123')
      })
    })

    describe('large numbers with thousands separator', () => {
      it('formats thousands with non-breaking space separator', () => {
        expect(formatWeight(1234)).toBe('1\u00A0234.000')
      })

      it('formats larger numbers with multiple separators', () => {
        expect(formatWeight(1234567)).toBe('1\u00A0234\u00A0567.000')
      })

      it('formats millions', () => {
        expect(formatWeight(9876543.21)).toBe('9\u00A0876\u00A0543.210')
      })
    })

    describe('negative numbers', () => {
      it('formats negative number', () => {
        expect(formatWeight(-123)).toBe('-123.000')
      })

      it('formats negative number with thousands', () => {
        expect(formatWeight(-1234567)).toBe('-1\u00A0234\u00A0567.000')
      })

      it('formats small negative number', () => {
        expect(formatWeight(-0.5)).toBe('-0.500')
      })
    })

    describe('string inputs with various separators', () => {
      it('parses string number', () => {
        expect(formatWeight('123.456')).toBe('123.456')
      })

      it('parses string with comma as decimal separator', () => {
        expect(formatWeight('123,456')).toBe('123.456')
      })

      it('parses string with space as thousands separator', () => {
        expect(formatWeight('1 234.567')).toBe('1\u00A0234.567')
      })

      it('parses string with non-breaking space as thousands separator', () => {
        expect(formatWeight('1\u00A0234.567')).toBe('1\u00A0234.567')
      })

      it('parses string with both comma and dot (European format)', () => {
        expect(formatWeight('1,234.567')).toBe('1\u00A0234.567')
      })

      it('parses string with leading/trailing whitespace', () => {
        expect(formatWeight('  123.456  ')).toBe('123.456')
      })
    })

    describe('invalid inputs', () => {
      it('returns 0.000 for null', () => {
        expect(formatWeight(null)).toBe('0.000')
      })

      it('returns 0.000 for undefined', () => {
        expect(formatWeight(undefined)).toBe('0.000')
      })

      it('returns 0.000 for empty string', () => {
        expect(formatWeight('')).toBe('0.000')
      })

      it('returns 0.000 for whitespace string', () => {
        expect(formatWeight('   ')).toBe('0.000')
      })

      it('returns 0.000 for non-numeric string', () => {
        expect(formatWeight('abc')).toBe('0.000')
      })

      it('returns 0.000 for NaN', () => {
        expect(formatWeight(NaN)).toBe('0.000')
      })

      it('returns 0.000 for Infinity', () => {
        expect(formatWeight(Infinity)).toBe('0.000')
      })

      it('returns 0.000 for -Infinity', () => {
        expect(formatWeight(-Infinity)).toBe('0.000')
      })
    })
  })

  describe('formatPrice', () => {
    describe('basic formatting with 2 decimal places', () => {
      it('formats a simple number', () => {
        expect(formatPrice(123)).toBe('123.00')
      })

      it('formats a number with decimals', () => {
        expect(formatPrice(123.45)).toBe('123.45')
      })

      it('formats zero', () => {
        expect(formatPrice(0)).toBe('0.00')
      })

      it('formats a small decimal', () => {
        expect(formatPrice(0.99)).toBe('0.99')
      })

      it('rounds to 2 decimal places', () => {
        expect(formatPrice(123.456)).toBe('123.46')
      })
    })

    describe('large numbers with thousands separator', () => {
      it('formats thousands with non-breaking space separator', () => {
        expect(formatPrice(1234)).toBe('1\u00A0234.00')
      })

      it('formats larger numbers with multiple separators', () => {
        expect(formatPrice(1234567)).toBe('1\u00A0234\u00A0567.00')
      })

      it('formats millions', () => {
        expect(formatPrice(9876543.21)).toBe('9\u00A0876\u00A0543.21')
      })
    })

    describe('negative numbers', () => {
      it('formats negative number', () => {
        expect(formatPrice(-123)).toBe('-123.00')
      })

      it('formats negative number with thousands', () => {
        expect(formatPrice(-1234567)).toBe('-1\u00A0234\u00A0567.00')
      })

      it('formats small negative number', () => {
        expect(formatPrice(-0.5)).toBe('-0.50')
      })
    })

    describe('string inputs with various separators', () => {
      it('parses string number', () => {
        expect(formatPrice('123.45')).toBe('123.45')
      })

      it('parses string with comma as decimal separator', () => {
        expect(formatPrice('123,45')).toBe('123.45')
      })

      it('parses string with space as thousands separator', () => {
        expect(formatPrice('1 234.56')).toBe('1\u00A0234.56')
      })

      it('parses string with non-breaking space as thousands separator', () => {
        expect(formatPrice('1\u00A0234.56')).toBe('1\u00A0234.56')
      })

      it('parses string with both comma and dot (European format)', () => {
        expect(formatPrice('1,234.56')).toBe('1\u00A0234.56')
      })
    })

    describe('invalid inputs', () => {
      it('returns 0.00 for null', () => {
        expect(formatPrice(null)).toBe('0.00')
      })

      it('returns 0.00 for undefined', () => {
        expect(formatPrice(undefined)).toBe('0.00')
      })

      it('returns 0.00 for empty string', () => {
        expect(formatPrice('')).toBe('0.00')
      })

      it('returns 0.00 for whitespace string', () => {
        expect(formatPrice('   ')).toBe('0.00')
      })

      it('returns 0.00 for non-numeric string', () => {
        expect(formatPrice('abc')).toBe('0.00')
      })

      it('returns 0.00 for NaN', () => {
        expect(formatPrice(NaN)).toBe('0.00')
      })

      it('returns 0.00 for Infinity', () => {
        expect(formatPrice(Infinity)).toBe('0.00')
      })

      it('returns 0.00 for -Infinity', () => {
        expect(formatPrice(-Infinity)).toBe('0.00')
      })
    })
  })

  describe('formatIntegerThousands', () => {
    describe('basic formatting with no decimal places', () => {
      it('formats a simple integer', () => {
        expect(formatIntegerThousands(123)).toBe('123')
      })

      it('formats zero', () => {
        expect(formatIntegerThousands(0)).toBe('0')
      })

      it('truncates decimal part', () => {
        expect(formatIntegerThousands(123.999)).toBe('123')
      })

      it('truncates negative decimal part', () => {
        expect(formatIntegerThousands(-123.999)).toBe('-123')
      })
    })

    describe('large numbers with thousands separator', () => {
      it('formats thousands with non-breaking space separator', () => {
        expect(formatIntegerThousands(1234)).toBe('1\u00A0234')
      })

      it('formats larger numbers with multiple separators', () => {
        expect(formatIntegerThousands(1234567)).toBe('1\u00A0234\u00A0567')
      })

      it('formats millions', () => {
        expect(formatIntegerThousands(9876543)).toBe('9\u00A0876\u00A0543')
      })

      it('formats very large numbers', () => {
        expect(formatIntegerThousands(1234567890123)).toBe('1\u00A0234\u00A0567\u00A0890\u00A0123')
      })
    })

    describe('negative numbers', () => {
      it('formats negative integer', () => {
        expect(formatIntegerThousands(-123)).toBe('-123')
      })

      it('formats negative number with thousands', () => {
        expect(formatIntegerThousands(-1234567)).toBe('-1\u00A0234\u00A0567')
      })
    })

    describe('string inputs with various separators', () => {
      it('parses string integer', () => {
        expect(formatIntegerThousands('123')).toBe('123')
      })

      it('parses string with comma as decimal separator (European format)', () => {
        // When only comma is present, parseNumberFlexible treats it as decimal separator
        expect(formatIntegerThousands('1,234')).toBe('1')
      })

      it('parses string with space as thousands separator', () => {
        expect(formatIntegerThousands('1 234')).toBe('1\u00A0234')
      })

      it('parses string with non-breaking space as thousands separator', () => {
        expect(formatIntegerThousands('1\u00A0234')).toBe('1\u00A0234')
      })

      it('parses string with decimals and truncates', () => {
        expect(formatIntegerThousands('123.999')).toBe('123')
      })
    })

    describe('invalid inputs', () => {
      it('returns 0 for null', () => {
        expect(formatIntegerThousands(null)).toBe('0')
      })

      it('returns 0 for undefined', () => {
        expect(formatIntegerThousands(undefined)).toBe('0')
      })

      it('returns 0 for empty string', () => {
        expect(formatIntegerThousands('')).toBe('0')
      })

      it('returns 0 for whitespace string', () => {
        expect(formatIntegerThousands('   ')).toBe('0')
      })

      it('returns 0 for non-numeric string', () => {
        expect(formatIntegerThousands('abc')).toBe('0')
      })

      it('returns 0 for NaN', () => {
        expect(formatIntegerThousands(NaN)).toBe('0')
      })

      it('returns 0 for Infinity', () => {
        expect(formatIntegerThousands(Infinity)).toBe('0')
      })

      it('returns 0 for -Infinity', () => {
        expect(formatIntegerThousands(-Infinity)).toBe('0')
      })
    })
  })
})
