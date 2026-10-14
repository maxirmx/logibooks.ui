// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect } from 'vitest'
import { OP_MODE_WAREHOUSE, getRegisterNouns } from '@/helpers/op.mode.js'

describe('op.mode', () => {
  describe('getRegisterNouns', () => {
    describe('noun forms', () => {
      it('returns all required noun forms for warehouse mode', () => {
        const nouns = getRegisterNouns(OP_MODE_WAREHOUSE)

        expect(nouns).toHaveProperty('singular')
        expect(nouns).toHaveProperty('plural')
        expect(nouns).toHaveProperty('genitivePlural')
        expect(nouns).toHaveProperty('genitivePluralCapitalized')
        expect(nouns).toHaveProperty('accusative')
        expect(nouns).toHaveProperty('prepositional')
        expect(nouns).toHaveProperty('genitiveSingular')
      })
    })
  })
})
