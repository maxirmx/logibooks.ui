// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect } from 'vitest'
import {
  CUSTOMS_PROCEDURE,
  CUSTOMS_PROCEDURE_RETURN,
  CUSTOMS_PROCEDURE_EXPORT,
  CUSTOMS_PROCEDURE_REEXPORT,
  CUSTOMS_PROCEDURE_IMPORT,
  CUSTOMS_PROCEDURE_REIMPORT,
  procedureFilterItems,
  normalizeCustomsProcedureCode,
  isReturnCustomsProcedure,
  isReexportCustomsProcedure,
  isImportCustomsProcedure,
  isReimportCustomsProcedure,
  isImportOrReexportCustomsProcedure,
  isCustomsChargesCalculationProcedure,
  getProcedureLabels,
  getProcedureSortOrder,
  getProcedureRows,
  getProhibitionReasonLines
} from '@/helpers/procedure.helpers.js'

describe('procedure.helpers', () => {
  describe('constants', () => {
    it('CUSTOMS_PROCEDURE has correct values', () => {
      expect(CUSTOMS_PROCEDURE.Return).toBe(1)
      expect(CUSTOMS_PROCEDURE.Export).toBe(10)
      expect(CUSTOMS_PROCEDURE.Reexport).toBe(31)
      expect(CUSTOMS_PROCEDURE.Import).toBe(40)
      expect(CUSTOMS_PROCEDURE.Reimport).toBe(60)
    })

    it('CUSTOMS_PROCEDURE is frozen', () => {
      expect(Object.isFrozen(CUSTOMS_PROCEDURE)).toBe(true)
    })

    it('individual constants match CUSTOMS_PROCEDURE values', () => {
      expect(CUSTOMS_PROCEDURE_RETURN).toBe(CUSTOMS_PROCEDURE.Return)
      expect(CUSTOMS_PROCEDURE_EXPORT).toBe(CUSTOMS_PROCEDURE.Export)
      expect(CUSTOMS_PROCEDURE_REEXPORT).toBe(CUSTOMS_PROCEDURE.Reexport)
      expect(CUSTOMS_PROCEDURE_IMPORT).toBe(CUSTOMS_PROCEDURE.Import)
      expect(CUSTOMS_PROCEDURE_REIMPORT).toBe(CUSTOMS_PROCEDURE.Reimport)
    })

    it('procedureFilterItems has correct structure', () => {
      expect(procedureFilterItems).toHaveLength(3)
      expect(procedureFilterItems[0]).toEqual({ title: 'Любая', value: 'all' })
      expect(procedureFilterItems[1]).toEqual({ title: 'Экспорт из РФ', value: 'export' })
      expect(procedureFilterItems[2]).toEqual({ title: 'Импорт в РФ', value: 'import' })
    })
  })

  describe('normalizeCustomsProcedureCode', () => {
    it('returns null for null', () => {
      expect(normalizeCustomsProcedureCode(null)).toBe(null)
    })

    it('returns null for undefined', () => {
      expect(normalizeCustomsProcedureCode(undefined)).toBe(null)
    })

    it('returns null for empty string', () => {
      expect(normalizeCustomsProcedureCode('')).toBe(null)
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

  describe('getProcedureLabels', () => {
    it('returns empty array for null', () => {
      expect(getProcedureLabels(null)).toEqual([])
    })

    it('returns empty array for undefined', () => {
      expect(getProcedureLabels(undefined)).toEqual([])
    })

    it('returns empty array when neither forExport nor forImport', () => {
      expect(getProcedureLabels({})).toEqual([])
      expect(getProcedureLabels({ forExport: false, forImport: false })).toEqual([])
    })

    it('returns export label when forExport is true', () => {
      expect(getProcedureLabels({ forExport: true })).toEqual(['Экспорт из РФ'])
    })

    it('returns import label when forImport is true', () => {
      expect(getProcedureLabels({ forImport: true })).toEqual(['Импорт в РФ'])
    })

    it('returns both labels when both are true', () => {
      expect(getProcedureLabels({ forExport: true, forImport: true })).toEqual([
        'Экспорт из РФ',
        'Импорт в РФ'
      ])
    })
  })

  describe('getProcedureSortOrder', () => {
    it('returns 0 for null', () => {
      expect(getProcedureSortOrder(null)).toBe(0)
    })

    it('returns 0 for undefined', () => {
      expect(getProcedureSortOrder(undefined)).toBe(0)
    })

    it('returns 0 when neither forImport nor forExport', () => {
      expect(getProcedureSortOrder({})).toBe(0)
      expect(getProcedureSortOrder({ forImport: false, forExport: false })).toBe(0)
    })

    it('returns 1 when only forExport is true', () => {
      expect(getProcedureSortOrder({ forExport: true, forImport: false })).toBe(1)
      expect(getProcedureSortOrder({ forExport: true })).toBe(1)
    })

    it('returns 2 when both forImport and forExport are true', () => {
      expect(getProcedureSortOrder({ forImport: true, forExport: true })).toBe(2)
    })

    it('returns 3 when only forImport is true', () => {
      expect(getProcedureSortOrder({ forImport: true, forExport: false })).toBe(3)
      expect(getProcedureSortOrder({ forImport: true })).toBe(3)
    })
  })

  describe('getProcedureRows', () => {
    it('returns empty array for null', () => {
      expect(getProcedureRows(null)).toEqual([])
    })

    it('returns empty array for undefined', () => {
      expect(getProcedureRows(undefined)).toEqual([])
    })

    it('returns empty array when neither forExport nor forImport', () => {
      expect(getProcedureRows({})).toEqual([])
    })

    it('returns export row when forExport is true', () => {
      const rows = getProcedureRows({ forExport: true, explanationForExport: 'Reason A' })
      expect(rows).toEqual([{ key: 'export', label: 'Экспорт из РФ', reason: 'Reason A' }])
    })

    it('returns export row with empty reason when explanation is missing', () => {
      const rows = getProcedureRows({ forExport: true })
      expect(rows).toEqual([{ key: 'export', label: 'Экспорт из РФ', reason: '' }])
    })

    it('returns import row when forImport is true', () => {
      const rows = getProcedureRows({ forImport: true, explanationForImport: 'Reason B' })
      expect(rows).toEqual([{ key: 'import', label: 'Импорт в РФ', reason: 'Reason B' }])
    })

    it('returns import row with empty reason when explanation is missing', () => {
      const rows = getProcedureRows({ forImport: true })
      expect(rows).toEqual([{ key: 'import', label: 'Импорт в РФ', reason: '' }])
    })

    it('returns both rows when both are true', () => {
      const rows = getProcedureRows({
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

    it('returns empty array for undefined', () => {
      expect(getProhibitionReasonLines(undefined)).toEqual([])
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
