// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect } from 'vitest'
import { getCustomsProcedureOptionTitle, normalizeCustomsProcedureCode, isReimportCustomsProcedure } from '@/helpers/customs.procedure.helpers.js'
import { matchesProhibitionScope, getRestrictionRouteScopeKeys, getApplicableScopeExplanations } from '@/helpers/prohibition.scope.helpers.js'

describe('procedure.helpers', () => {
  describe('customs procedure option builders', () => {
    it('falls back to backend value when metadata is missing', () => {
      expect(getCustomsProcedureOptionTitle({ value: 99 })).toBe('99')
    })

  })

  describe('normalizeCustomsProcedureCode', () => {
    it('returns null for whitespace-only string', () => {
      expect(normalizeCustomsProcedureCode(' ')).toBe(null)
      expect(normalizeCustomsProcedureCode('   ')).toBe(null)
      expect(normalizeCustomsProcedureCode('\t')).toBe(null)
    })

    it('returns null for non-numeric string', () => {
      expect(normalizeCustomsProcedureCode('abc')).toBe(null)
      expect(normalizeCustomsProcedureCode('ИМ40')).toBe(null)
    })

    it('returns null for non-finite numbers', () => {
      expect(normalizeCustomsProcedureCode(NaN)).toBe(null)
      expect(normalizeCustomsProcedureCode(Infinity)).toBe(null)
      expect(normalizeCustomsProcedureCode(-Infinity)).toBe(null)
    })
  })

  describe('isReimportCustomsProcedure', () => {
    it('returns true for value 60', () => {
      expect(isReimportCustomsProcedure(60)).toBe(true)
      expect(isReimportCustomsProcedure('60')).toBe(true)
    })
  })

  describe('restriction scopes', () => {
    const rule = {
      scopes: [
        { countryIsoNumeric: 643, customsProcedureCode: 10, explanation: 'RU export' },
        { countryIsoNumeric: 860, customsProcedureCode: 40, explanation: 'UZ import' }
      ]
    }

    it('matches country and procedure filters against the same scope', () => {
      expect(matchesProhibitionScope(rule, 'export', 643)).toBe(true)
      expect(matchesProhibitionScope(rule, 'import', 860)).toBe(true)
      expect(matchesProhibitionScope(rule, 'export', 860)).toBe(false)
      expect(matchesProhibitionScope(rule, 'all', 'all')).toBe(true)
    })

    it('resolves bilateral routes for all supported families without fallback', () => {
      expect(getRestrictionRouteScopeKeys({
        theOtherCountryCode: 860,
        customsProcedureCode: 31
      })).toEqual(['643:10', '860:40'])
      expect(getRestrictionRouteScopeKeys({
        theOtherCountryCode: 860,
        customsProcedureCode: 60
      })).toEqual(['860:10', '643:40'])
      expect(getRestrictionRouteScopeKeys({ customsProcedureCode: 10 })).toEqual([])
    })

    it('returns distinct explanations only from active route scopes', () => {
      const routeRule = {
        scopes: [
          { countryIsoNumeric: 643, customsProcedureCode: 10, explanation: 'same' },
          { countryIsoNumeric: 860, customsProcedureCode: 40, explanation: 'same' },
          { countryIsoNumeric: 156, customsProcedureCode: 40, explanation: 'other' }
        ]
      }
      expect(getApplicableScopeExplanations(routeRule, {
        theOtherCountryCode: 860,
        customsProcedureCode: 10
      })).toEqual(['same'])
    })
  })
})
