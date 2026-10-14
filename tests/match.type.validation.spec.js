// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect } from 'vitest'
import {
  parseWords,
  isSingleWordInput,
  isMatchTypeDisabled,
  validateMatchType,
  createMatchTypeValidationTest
} from '@/helpers/match.type.validation.js'

describe('match.type.validation', () => {
  describe('parseWords', () => {
    it('handles empty and null inputs', () => {
      expect(parseWords('')).toEqual([])
      expect(parseWords(null)).toEqual([])
      expect(parseWords(undefined)).toEqual([])
      expect(parseWords('   ')).toEqual([])
    })

  })

  describe('isSingleWordInput', () => {
    it('handles empty inputs as single word', () => {
      expect(isSingleWordInput('')).toBe(true)
      expect(isSingleWordInput('   ')).toBe(true)
      expect(isSingleWordInput(null)).toBe(true)
      expect(isSingleWordInput(undefined)).toBe(true)
    })

  })

})

describe('createMatchTypeValidationTest', () => {
  it('creates a validation function for multi-word input', () => {
    const validationTest = createMatchTypeValidationTest()

    // Mock Yup context with multi-word
    const mockContext = {
      parent: { word: 'test word' }
    }

    // Test with valid match type for multi-word
    expect(validationTest.call(mockContext, 25)).toBe(true)

    // Test with invalid match type for multi-word
    expect(validationTest.call(mockContext, 15)).toBe(false)
    expect(validationTest.call(mockContext, 45)).toBe(false)
  })

})

describe('comprehensive integration tests', () => {
  it('validates real-world scenarios correctly', () => {
    const scenarios = [
      // Single word scenarios
      { word: 'автомобиль', matchTypeId: 1, expected: true },
      { word: 'автомобиль', matchTypeId: 10, expected: true },
      { word: 'автомобиль', matchTypeId: 11, expected: true },
      { word: 'автомобиль', matchTypeId: 20, expected: true },
      { word: 'автомобиль', matchTypeId: 21, expected: false }, // Disabled for single
      { word: 'автомобиль', matchTypeId: 25, expected: false }, // Disabled for single
      { word: 'автомобиль', matchTypeId: 30, expected: false }, // Disabled for single
      { word: 'автомобиль', matchTypeId: 31, expected: false },
      { word: 'автомобиль', matchTypeId: 41, expected: true },

      // Multi-word scenarios
      { word: 'автомобильные запчасти', matchTypeId: 1, expected: true },
      { word: 'автомобильные запчасти', matchTypeId: 10, expected: true },
      { word: 'автомобильные запчасти', matchTypeId: 11, expected: false }, // Disabled for multi
      { word: 'автомобильные запчасти', matchTypeId: 15, expected: false }, // Disabled for multi
      { word: 'автомобильные запчасти', matchTypeId: 20, expected: false }, // Disabled for multi
      { word: 'автомобильные запчасти', matchTypeId: 21, expected: true },
      { word: 'автомобильные запчасти', matchTypeId: 25, expected: true },
      { word: 'автомобильные запчасти', matchTypeId: 30, expected: true },
      { word: 'автомобильные запчасти', matchTypeId: 31, expected: true }, // Disabled for multi
      { word: 'автомобильные запчасти', matchTypeId: 41, expected: false }, // Disabled for multi

      // Edge cases
      { word: 'test-word', matchTypeId: 25, expected: true }, // Hyphenated = multi-word now
      { word: 'test123', matchTypeId: 25, expected: false }, // With numbers = single word
      { word: '', matchTypeId: 25, expected: false } // Empty = single word
    ]

    scenarios.forEach(({ word, matchTypeId, expected }) => {
      expect(validateMatchType(matchTypeId, word)).toBe(expected)
      expect(isMatchTypeDisabled(matchTypeId, word)).toBe(!expected)
    })
  })
})
