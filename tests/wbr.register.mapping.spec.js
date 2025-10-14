// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { describe, it, expect } from 'vitest'
import { CheckStatusCode } from '@/helpers/check.status.code.js'

describe('check.status.code.js hasIssues', () => {

  describe('hasIssues', () => {
    it('returns true for status codes with issues', () => {
      expect(CheckStatusCode.hasIssues(0x01000000)).toBe(true) // FC has issues
      expect(CheckStatusCode.hasIssues(0x00000100)).toBe(true) // SW has issues
      expect(CheckStatusCode.hasIssues(0x01000100)).toBe(true) // Both have issues
    })

    it('returns false for status codes without issues', () => {
      expect(CheckStatusCode.hasIssues(0x00000000)).toBe(false) // No issues
      expect(CheckStatusCode.hasIssues(0x00200010)).toBe(false) // No issues
      expect(CheckStatusCode.hasIssues(0)).toBe(false) // Undefined equivalent
    })
  })
})
