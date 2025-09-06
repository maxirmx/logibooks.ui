// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

/**
 * Parses a word or phrase into individual words
 * @param {string} input - The input string to parse
 * @returns {string[]} Array of words found in the input
 */
export function parseWords(input) {
  if (!input || typeof input !== 'string') {
    return []
  }
  return input.match(/[\p{L}\d-]+/gu) || []
}

/**
 * Determines if the input represents a single word
 * @param {string} input - The input string to check
 * @returns {boolean} True if input contains one word or less
 */
export function isSingleWordInput(input) {
  const words = parseWords(input)
  return words.length <= 1
}

/**
 * Checks if a match type ID is disabled for the given word input
 * @param {number} matchTypeId - The match type ID to check
 * @param {string} wordInput - The word or phrase input
 * @returns {boolean} True if the match type should be disabled
 */
export function isMatchTypeDisabled(matchTypeId, wordInput) {
  const isSingle = isSingleWordInput(wordInput)
  
  if (isSingle) {
    // For single words: disable match types 21-30
    return matchTypeId >= 21 && matchTypeId <= 30
  } else {
    // For multi-word: disable match types 11-20 and >30
    return (matchTypeId >= 11 && matchTypeId <= 20) || matchTypeId > 30
  }
}

/**
 * Validates if a match type ID is allowed for the given word input
 * @param {number} matchTypeId - The match type ID to validate
 * @param {string} wordInput - The word or phrase input
 * @returns {boolean} True if the match type is valid/allowed
 */
export function validateMatchType(matchTypeId, wordInput) {
  return !isMatchTypeDisabled(matchTypeId, wordInput)
}

/**
 * Creates a Yup validation test function for match type validation
 * @param {string} errorMessage - Custom error message for validation failure
 * @returns {Function} Yup test function
 */
export function createMatchTypeValidationTest() {
  return function(value) {
    const word = this.parent.word || ''
    return validateMatchType(value, word)
  }
}
