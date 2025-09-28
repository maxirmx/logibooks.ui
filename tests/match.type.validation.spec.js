// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
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
    it('parses single word correctly', () => {
      expect(parseWords('test')).toEqual(['test'])
      expect(parseWords('word')).toEqual(['word'])
      expect(parseWords('слово')).toEqual(['слово'])
    })

    it('parses multiple words correctly', () => {
      expect(parseWords('test word')).toEqual(['test', 'word'])
      expect(parseWords('multiple test words')).toEqual(['multiple', 'test', 'words'])
      expect(parseWords('тестовые русские слова')).toEqual(['тестовые', 'русские', 'слова'])
    })

    it('handles words with hyphens', () => {
      expect(parseWords('test-word')).toEqual(['test-word'])
      expect(parseWords('multi-word phrase')).toEqual(['multi-word', 'phrase'])
      expect(parseWords('авто-мото запчасти')).toEqual(['авто-мото', 'запчасти'])
    })

    it('handles words with numbers', () => {
      expect(parseWords('test123')).toEqual(['test123'])
      expect(parseWords('word1 word2')).toEqual(['word1', 'word2'])
      expect(parseWords('продукт123 категория456')).toEqual(['продукт123', 'категория456'])
    })

    it('handles empty and null inputs', () => {
      expect(parseWords('')).toEqual([])
      expect(parseWords(null)).toEqual([])
      expect(parseWords(undefined)).toEqual([])
      expect(parseWords('   ')).toEqual([])
    })

    it('handles special characters and punctuation', () => {
      expect(parseWords('test, word!')).toEqual(['test', 'word'])
      expect(parseWords('hello@world.com')).toEqual(['hello', 'world', 'com'])
      expect(parseWords('символ№1 символ№2')).toEqual(['символ', '1', 'символ', '2'])
    })

    it('handles mixed language input', () => {
      expect(parseWords('test тест')).toEqual(['test', 'тест'])
      expect(parseWords('english русский français')).toEqual(['english', 'русский', 'français'])
    })
  })

  describe('isSingleWordInput', () => {
    it('identifies single word inputs correctly', () => {
      expect(isSingleWordInput('test')).toBe(true)
      expect(isSingleWordInput('слово')).toBe(true)
      expect(isSingleWordInput('test-word')).toBe(true)
      expect(isSingleWordInput('test123')).toBe(true)
    })

    it('identifies multi-word inputs correctly', () => {
      expect(isSingleWordInput('test word')).toBe(false)
      expect(isSingleWordInput('multiple test words')).toBe(false)
      expect(isSingleWordInput('тестовые русские слова')).toBe(false)
      expect(isSingleWordInput('test тест')).toBe(false)
    })

    it('handles empty inputs as single word', () => {
      expect(isSingleWordInput('')).toBe(true)
      expect(isSingleWordInput('   ')).toBe(true)
      expect(isSingleWordInput(null)).toBe(true)
      expect(isSingleWordInput(undefined)).toBe(true)
    })

    it('handles punctuation-only inputs', () => {
      expect(isSingleWordInput('!!!')).toBe(true)
      expect(isSingleWordInput('... ,, ;;')).toBe(true)
    })
  })


  describe('isMatchTypeDisabled', () => {
    it('handles boundary values correctly', () => {
      // Test exact boundaries
      expect(isMatchTypeDisabled(20, 'test')).toBe(false) // Just below disabled range for single
      expect(isMatchTypeDisabled(21, 'test')).toBe(true)  // Start of disabled range for single
      expect(isMatchTypeDisabled(40, 'test')).toBe(true)  // End of disabled range for single
      expect(isMatchTypeDisabled(41, 'test')).toBe(false) // Just above disabled range for single

      expect(isMatchTypeDisabled(10, 'test word')).toBe(false) // Just below disabled range for multi
      expect(isMatchTypeDisabled(11, 'test word')).toBe(true)  // Start of disabled range for multi
      expect(isMatchTypeDisabled(20, 'test word')).toBe(true)  // End of disabled range for multi
      expect(isMatchTypeDisabled(21, 'test word')).toBe(false) // Between ranges for multi
      expect(isMatchTypeDisabled(40, 'test word')).toBe(false) // Just below second disabled range for multi
      expect(isMatchTypeDisabled(41, 'test word')).toBe(true)  // Start of second disabled range for multi
    })

    it('handles zero and negative values', () => {
      expect(isMatchTypeDisabled(0, 'test')).toBe(false)
      expect(isMatchTypeDisabled(-1, 'test')).toBe(false)
      expect(isMatchTypeDisabled(0, 'test word')).toBe(false)
      expect(isMatchTypeDisabled(-1, 'test word')).toBe(false)
    })
  })
})

describe('validateMatchType', () => {
  it('returns opposite of isMatchTypeDisabled', () => {
    const testCases = [
      { matchTypeId: 21, word: 'test', expected: false },
      { matchTypeId: 25, word: 'test', expected: false },
      { matchTypeId: 30, word: 'test', expected: false },
      { matchTypeId: 41, word: 'test', expected: true },
      { matchTypeId: 11, word: 'test word', expected: false },
      { matchTypeId: 31, word: 'test word', expected: true },
      { matchTypeId: 25, word: 'test word', expected: true },
    ]

    testCases.forEach(({ matchTypeId, word, expected }) => {
      expect(validateMatchType(matchTypeId, word)).toBe(expected)
      expect(validateMatchType(matchTypeId, word)).toBe(!isMatchTypeDisabled(matchTypeId, word))
    })
  })
})

describe('createMatchTypeValidationTest', () => {
  it('creates a validation function that works with Yup context', () => {
    const validationTest = createMatchTypeValidationTest()
    
    // Mock Yup context
    const mockContext = {
      parent: { word: 'test' }
    }

    // Test with valid match type for single word
    expect(validationTest.call(mockContext, 41)).toBe(true)
    
    // Test with invalid match type for single word
    expect(validationTest.call(mockContext, 25)).toBe(false)
  })

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

  it('handles empty word in context', () => {
    const validationTest = createMatchTypeValidationTest()
    
    // Mock Yup context with empty word
    const mockContext = {
      parent: { word: '' }
    }

    // Empty word is treated as single word
    expect(validationTest.call(mockContext, 41)).toBe(true)
    expect(validationTest.call(mockContext, 25)).toBe(false)
  })

  it('handles missing word in context', () => {
    const validationTest = createMatchTypeValidationTest()
    
    // Mock Yup context without word
    const mockContext = {
      parent: {}
    }

    // Missing word is treated as single word
    expect(validationTest.call(mockContext, 41)).toBe(true)
    expect(validationTest.call(mockContext, 25)).toBe(false)
  })

  it('accepts custom error message', () => {
    const customMessage = 'Custom validation error'
    const validationTest = createMatchTypeValidationTest(customMessage)
    
    // Function should be created successfully (message is used by Yup, not returned by function)
    expect(typeof validationTest).toBe('function')
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
      { word: 'test-word', matchTypeId: 25, expected: false }, // Hyphenated = single word
      { word: 'test123', matchTypeId: 25, expected: false }, // With numbers = single word
      { word: '', matchTypeId: 25, expected: false }, // Empty = single word
    ]

    scenarios.forEach(({ word, matchTypeId, expected }) => {
      expect(validateMatchType(matchTypeId, word)).toBe(expected)
      expect(isMatchTypeDisabled(matchTypeId, word)).toBe(!expected)
    })
  })
})
