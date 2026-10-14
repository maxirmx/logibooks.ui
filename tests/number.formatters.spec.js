// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, expect, it } from 'vitest'
import { formatWeight } from '@/helpers/number.formatters.js'

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

    it('returns zero for null and blank input', () => {
      expect(formatWeight(null)).toBe('0.000')
      expect(formatWeight('   ')).toBe('0.000')
    })
  })

})
