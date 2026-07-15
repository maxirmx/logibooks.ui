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
  getProhibitionReasonLines
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

        expect(options.map(option => option.value)).toEqual([40, 10, 60])
        expect(sortSpy).not.toHaveBeenCalled()
      } finally {
        sortSpy.mockRestore()
      }
    })
  })

  describe('normalizeCustomsProcedureCode', () => {
    it('returns null for null', () => {
      expect(normalizeCustomsProcedureCode(null)).toBe(null)
    })

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

    it('returns false for other values', () => {
      expect(isReturnCustomsProcedure(10)).toBe(false)
      expect(isReturnCustomsProcedure(31)).toBe(false)
      expect(isReturnCustomsProcedure(40)).toBe(false)
      expect(isReturnCustomsProcedure(60)).toBe(false)
      expect(isReturnCustomsProcedure(null)).toBe(false)
      expect(isReturnCustomsProcedure(undefined)).toBe(false)
    })
  })

  describe('isReexportCustomsProcedure', () => {
    it('returns true for value 31', () => {
      expect(isReexportCustomsProcedure(31)).toBe(true)
      expect(isReexportCustomsProcedure('31')).toBe(true)
    })

    it('returns false for other values', () => {
      expect(isReexportCustomsProcedure(1)).toBe(false)
      expect(isReexportCustomsProcedure(40)).toBe(false)
      expect(isReexportCustomsProcedure(60)).toBe(false)
      expect(isReexportCustomsProcedure(null)).toBe(false)
    })
  })

  describe('isImportCustomsProcedure', () => {
    it('returns true for value 40', () => {
      expect(isImportCustomsProcedure(40)).toBe(true)
      expect(isImportCustomsProcedure('40')).toBe(true)
    })

    it('returns false for other values', () => {
      expect(isImportCustomsProcedure(1)).toBe(false)
      expect(isImportCustomsProcedure(31)).toBe(false)
      expect(isImportCustomsProcedure(60)).toBe(false)
      expect(isImportCustomsProcedure(null)).toBe(false)
    })
  })

  describe('isReimportCustomsProcedure', () => {
    it('returns true for value 60', () => {
      expect(isReimportCustomsProcedure(60)).toBe(true)
      expect(isReimportCustomsProcedure('60')).toBe(true)
    })

    it('returns false for other values', () => {
      expect(isReimportCustomsProcedure(1)).toBe(false)
      expect(isReimportCustomsProcedure(31)).toBe(false)
      expect(isReimportCustomsProcedure(40)).toBe(false)
      expect(isReimportCustomsProcedure(null)).toBe(false)
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

  describe('getProhibitionScopeLabels', () => {
    it('returns empty array for null', () => {
      expect(getProhibitionScopeLabels(null)).toEqual([])
    })

    it('returns empty array when neither forExport nor forImport', () => {
      expect(getProhibitionScopeLabels({})).toEqual([])
      expect(getProhibitionScopeLabels({ forExport: false, forImport: false })).toEqual([])
    })

    it('returns export label when forExport is true', () => {
      expect(getProhibitionScopeLabels({ forExport: true })).toEqual(['Экспорт из РФ'])
    })

    it('returns import label when forImport is true', () => {
      expect(getProhibitionScopeLabels({ forImport: true })).toEqual(['Импорт в РФ'])
    })

    it('returns both labels when both are true', () => {
      expect(getProhibitionScopeLabels({ forExport: true, forImport: true })).toEqual([
        'Экспорт из РФ',
        'Импорт в РФ'
      ])
    })
  })

  describe('getProhibitionScopeSortOrder', () => {
    it('returns 0 for null', () => {
      expect(getProhibitionScopeSortOrder(null)).toBe(0)
    })

    it('returns 0 when neither forImport nor forExport', () => {
      expect(getProhibitionScopeSortOrder({})).toBe(0)
      expect(getProhibitionScopeSortOrder({ forImport: false, forExport: false })).toBe(0)
    })

    it('returns 1 when only forExport is true', () => {
      expect(getProhibitionScopeSortOrder({ forExport: true, forImport: false })).toBe(1)
      expect(getProhibitionScopeSortOrder({ forExport: true })).toBe(1)
    })

    it('returns 2 when both forImport and forExport are true', () => {
      expect(getProhibitionScopeSortOrder({ forImport: true, forExport: true })).toBe(2)
    })

    it('returns 3 when only forImport is true', () => {
      expect(getProhibitionScopeSortOrder({ forImport: true, forExport: false })).toBe(3)
      expect(getProhibitionScopeSortOrder({ forImport: true })).toBe(3)
    })
  })

  describe('getProhibitionScopeRows', () => {
    it('returns empty array for null', () => {
      expect(getProhibitionScopeRows(null)).toEqual([])
    })

    it('returns empty array when neither forExport nor forImport', () => {
      expect(getProhibitionScopeRows({})).toEqual([])
    })

    it('returns export row when forExport is true', () => {
      const rows = getProhibitionScopeRows({ forExport: true, explanationForExport: 'Reason A' })
      expect(rows).toEqual([{ key: 'export', label: 'Экспорт из РФ', reason: 'Reason A' }])
    })

    it('returns export row with empty reason when explanation is missing', () => {
      const rows = getProhibitionScopeRows({ forExport: true })
      expect(rows).toEqual([{ key: 'export', label: 'Экспорт из РФ', reason: '' }])
    })

    it('returns import row when forImport is true', () => {
      const rows = getProhibitionScopeRows({ forImport: true, explanationForImport: 'Reason B' })
      expect(rows).toEqual([{ key: 'import', label: 'Импорт в РФ', reason: 'Reason B' }])
    })

    it('returns import row with empty reason when explanation is missing', () => {
      const rows = getProhibitionScopeRows({ forImport: true })
      expect(rows).toEqual([{ key: 'import', label: 'Импорт в РФ', reason: '' }])
    })

    it('returns both rows when both are true', () => {
      const rows = getProhibitionScopeRows({
        forExport: true,
        forImport: true,
        explanationForExport: 'Export reason',
        explanationForImport: 'Import reason'
      })
      expect(rows).toEqual([
        { key: 'export', label: 'Экспорт из РФ', reason: 'Export reason' },
        { key: 'import', label: 'Импорт в РФ', reason: 'Import reason' }
      ])
    })
  })

  describe('getProhibitionReasonLines', () => {
    it('returns empty array for null', () => {
      expect(getProhibitionReasonLines(null)).toEqual([])
    })

    it('returns empty array when no rows have reasons', () => {
      expect(getProhibitionReasonLines({ forExport: true })).toEqual([])
      expect(getProhibitionReasonLines({ forImport: true })).toEqual([])
    })

    it('filters out empty reason strings', () => {
      const item = { forExport: true, explanationForExport: '', forImport: true, explanationForImport: 'Import reason' }
      expect(getProhibitionReasonLines(item)).toEqual(['Import reason'])
    })

    it('returns all non-empty reasons', () => {
      const item = {
        forExport: true,
        forImport: true,
        explanationForExport: 'Export reason',
        explanationForImport: 'Import reason'
      }
      expect(getProhibitionReasonLines(item)).toEqual(['Export reason', 'Import reason'])
    })

    it('returns empty array when no rows exist', () => {
      expect(getProhibitionReasonLines({})).toEqual([])
    })
  })
})
