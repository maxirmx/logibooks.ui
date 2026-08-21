// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, vi } from 'vitest'
import {
  buildCustomsProcedureOptions,
  buildRegisterProcedureFilterOptions,
  buildReturnRegisterProcedureOptions,
  getCustomsProcedureOptionTitle,
  normalizeCustomsProcedureCode,
  isReturnCustomsProcedure,
  isReexportCustomsProcedure,
  isImportCustomsProcedure,
  isReimportCustomsProcedure,
  isImportOrReexportCustomsProcedure,
  isCustomsChargesCalculationProcedure
} from '@/helpers/customs.procedure.helpers.js'
import {
  getProhibitionScopeLabels,
  getProhibitionScopeSortOrder,
  getProhibitionScopeRows,
  getProhibitionReasonLines,
  matchesProhibitionScope,
  getRestrictionRouteScopeKeys,
  getApplicableScopeExplanations
} from '@/helpers/prohibition.scope.helpers.js'

describe('procedure.helpers', () => {
  describe('customs procedure option builders', () => {
    const opsProcedures = [
      { value: 1, charCode: '01', name: 'Возврат' },
      { value: 10, charCode: 'ЭК 10', name: 'Экспорт' },
      { value: 31, charCode: 'ЭК 31', name: 'Реэкспорт' },
      { value: 40, charCode: 'ИМ 40', name: 'Импорт' },
      { value: 60, charCode: 'ИМ 60', name: 'Реимпорт' }
    ]

    it('formats titles from backend char code and name', () => {
      expect(getCustomsProcedureOptionTitle(opsProcedures[1])).toBe('ЭК 10 Экспорт')
    })

    it('falls back to backend value when metadata is missing', () => {
      expect(getCustomsProcedureOptionTitle({ value: 99 })).toBe('99')
    })

    it('builds paperwork register selector options without Return', () => {
      expect(buildRegisterProcedureFilterOptions(opsProcedures, { includeReturn: false })).toEqual([
        { title: 'Все', value: 'all' },
        { title: 'ЭК 10 Экспорт', value: 10 },
        { title: 'ЭК 31 Реэкспорт', value: 31 },
        { title: 'ИМ 40 Импорт', value: 40 },
        { title: 'ИМ 60 Реимпорт', value: 60 }
      ])
    })

    it('builds warehouse register selector options with Return', () => {
      expect(buildRegisterProcedureFilterOptions(opsProcedures, { includeReturn: true })).toEqual([
        { title: 'Все', value: 'all' },
        { title: '01 Возврат', value: 1 },
        { title: 'ЭК 10 Экспорт', value: 10 },
        { title: 'ЭК 31 Реэкспорт', value: 31 },
        { title: 'ИМ 40 Импорт', value: 40 },
        { title: 'ИМ 60 Реимпорт', value: 60 }
      ])
    })

    it('returns only all option when register procedure ops are unavailable', () => {
      expect(buildRegisterProcedureFilterOptions(null, { includeReturn: true })).toEqual([
        { title: 'Все', value: 'all' }
      ])
    })

    it('builds return-register options from backend ops and explicit supported order', () => {
      expect(buildReturnRegisterProcedureOptions(opsProcedures)).toEqual([
        { label: '01 Возврат', value: '1' },
        { label: 'ИМ 60 Реимпорт', value: '60' },
        { label: 'ЭК 31 Реэкспорт', value: '31' }
      ])
    })

    it('does not invent return-register fallback options when ops are unavailable', () => {
      expect(buildReturnRegisterProcedureOptions(null)).toEqual([])
    })

    it('supports custom option keys for backend metadata', () => {
      expect(buildCustomsProcedureOptions([opsProcedures[1]], { titleKey: 'label' })).toEqual([
        { label: 'ЭК 10 Экспорт', value: 10 }
      ])
    })

    it('preserves backend order without calling sort when no explicit order is provided', () => {
      const sortSpy = vi.spyOn(Array.prototype, 'sort')
      try {
        const options = buildCustomsProcedureOptions([
          opsProcedures[3],
          opsProcedures[1],
          opsProcedures[4]
        ])

        expect(options.map((option) => option.value)).toEqual([40, 10, 60])
        expect(sortSpy).not.toHaveBeenCalled()
      } finally {
        sortSpy.mockRestore()
      }
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

    it('converts valid numeric string to number', () => {
      expect(normalizeCustomsProcedureCode('40')).toBe(40)
      expect(normalizeCustomsProcedureCode('1')).toBe(1)
      expect(normalizeCustomsProcedureCode('60')).toBe(60)
    })

    it('trims whitespace from string before conversion', () => {
      expect(normalizeCustomsProcedureCode(' 40 ')).toBe(40)
      expect(normalizeCustomsProcedureCode('  31  ')).toBe(31)
    })

    it('returns the number for valid finite numbers', () => {
      expect(normalizeCustomsProcedureCode(40)).toBe(40)
      expect(normalizeCustomsProcedureCode(1)).toBe(1)
      expect(normalizeCustomsProcedureCode(0)).toBe(0)
    })

    it('returns null for non-finite numbers', () => {
      expect(normalizeCustomsProcedureCode(NaN)).toBe(null)
      expect(normalizeCustomsProcedureCode(Infinity)).toBe(null)
      expect(normalizeCustomsProcedureCode(-Infinity)).toBe(null)
    })
  })

  describe('isReturnCustomsProcedure', () => {
    it('returns true for value 1', () => {
      expect(isReturnCustomsProcedure(1)).toBe(true)
      expect(isReturnCustomsProcedure('1')).toBe(true)
    })
  })

  describe('isReexportCustomsProcedure', () => {
    it('returns true for value 31', () => {
      expect(isReexportCustomsProcedure(31)).toBe(true)
      expect(isReexportCustomsProcedure('31')).toBe(true)
    })
  })

  describe('isImportCustomsProcedure', () => {
    it('returns true for value 40', () => {
      expect(isImportCustomsProcedure(40)).toBe(true)
      expect(isImportCustomsProcedure('40')).toBe(true)
    })
  })

  describe('isReimportCustomsProcedure', () => {
    it('returns true for value 60', () => {
      expect(isReimportCustomsProcedure(60)).toBe(true)
      expect(isReimportCustomsProcedure('60')).toBe(true)
    })
  })

  describe('isImportOrReexportCustomsProcedure', () => {
    it('returns true for import (40)', () => {
      expect(isImportOrReexportCustomsProcedure(40)).toBe(true)
      expect(isImportOrReexportCustomsProcedure('40')).toBe(true)
    })

    it('returns true for reexport (31)', () => {
      expect(isImportOrReexportCustomsProcedure(31)).toBe(true)
      expect(isImportOrReexportCustomsProcedure('31')).toBe(true)
    })

    it('returns false for other procedures', () => {
      expect(isImportOrReexportCustomsProcedure(1)).toBe(false)
      expect(isImportOrReexportCustomsProcedure(10)).toBe(false)
      expect(isImportOrReexportCustomsProcedure(60)).toBe(false)
      expect(isImportOrReexportCustomsProcedure(null)).toBe(false)
      expect(isImportOrReexportCustomsProcedure(undefined)).toBe(false)
    })
  })

  describe('isCustomsChargesCalculationProcedure', () => {
    it('returns true for import (40)', () => {
      expect(isCustomsChargesCalculationProcedure(40)).toBe(true)
      expect(isCustomsChargesCalculationProcedure('40')).toBe(true)
    })

    it('returns true for reimport (60)', () => {
      expect(isCustomsChargesCalculationProcedure(60)).toBe(true)
      expect(isCustomsChargesCalculationProcedure('60')).toBe(true)
    })

    it('returns false for other procedures', () => {
      expect(isCustomsChargesCalculationProcedure(1)).toBe(false)
      expect(isCustomsChargesCalculationProcedure(10)).toBe(false)
      expect(isCustomsChargesCalculationProcedure(31)).toBe(false)
      expect(isCustomsChargesCalculationProcedure(null)).toBe(false)
      expect(isCustomsChargesCalculationProcedure(undefined)).toBe(false)
    })
  })

  describe('restriction scopes', () => {
    const rule = {
      scopes: [
        { countryIsoNumeric: 643, customsProcedureCode: 10, explanation: 'RU export' },
        { countryIsoNumeric: 860, customsProcedureCode: 40, explanation: 'UZ import' }
      ]
    }

    it('renders country, procedure and reason rows', () => {
      const countryName = (code) => (Number(code) === 643 ? 'Россия' : 'Узбекистан')
      expect(getProhibitionScopeLabels(rule, countryName)).toEqual([
        'Россия — Экспорт',
        'Узбекистан — Импорт'
      ])
      expect(getProhibitionScopeRows(rule, countryName)).toEqual([
        {
          key: '643:10',
          countryIsoNumeric: 643,
          country: 'Россия',
          customsProcedureCode: 10,
          procedure: 'Экспорт',
          label: 'Россия — Экспорт',
          reason: 'RU export'
        },
        {
          key: '860:40',
          countryIsoNumeric: 860,
          country: 'Узбекистан',
          customsProcedureCode: 40,
          procedure: 'Импорт',
          label: 'Узбекистан — Импорт',
          reason: 'UZ import'
        }
      ])
      expect(getProhibitionReasonLines(rule)).toEqual(['RU export', 'UZ import'])
      expect(getProhibitionScopeSortOrder(rule)).toBe('643:10|860:40')
    })

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
