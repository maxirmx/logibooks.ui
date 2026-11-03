// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect } from 'vitest'
import { isSingleWordInput } from '@/helpers/match.type.validation.js'

describe('match.type.validation', () => {
  describe('isSingleWordInput', () => {
    it('handles empty inputs as single word', () => {
      expect(isSingleWordInput('')).toBe(true)
      expect(isSingleWordInput('   ')).toBe(true)
      expect(isSingleWordInput(null)).toBe(true)
      expect(isSingleWordInput(undefined)).toBe(true)
    })

  })

})
