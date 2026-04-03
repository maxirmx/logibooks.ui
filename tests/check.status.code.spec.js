// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect } from 'vitest'
import CheckStatusCode, { 
  CheckStatusHelper, 
  FCCheckStatus, 
  SWCheckStatus
} from '@/helpers/check.status.code.js'

import { FCCheckStatusNames, SWCheckStatusNames } from '@/helpers/check.status.code.js'

describe('FCCheckStatus', () => {
  it('should be frozen', () => {
    expect(() => {
      FCCheckStatus.NewValue = 999
    }).toThrow()
  })
})

describe('SWCheckStatus', () => {
  it('should be frozen', () => {
    expect(() => {
      SWCheckStatus.NewValue = 999
    }).toThrow()
  })
})

describe('CheckStatusCode', () => {
  describe('Constructor', () => {
    it('should create from integer value', () => {
      const code = new CheckStatusCode(0x00020001)
      expect(code.value).toBe(0x00020001)
    })

    it('should create from FC and SW parts', () => {
      const code = new CheckStatusCode({ fc: FCCheckStatus.ApprovedWithExcise, sw: SWCheckStatus.NoIssues })
      expect(code.fc).toBe(FCCheckStatus.ApprovedWithExcise)
      expect(code.sw).toBe(SWCheckStatus.NoIssues)
    })

    it('should handle zero value', () => {
      const code = new CheckStatusCode(0)
      expect(code.value).toBe(0)
      expect(code.fc).toBe(0)
      expect(code.sw).toBe(0)
    })

    it('should handle undefined/null values', () => {
      const code1 = new CheckStatusCode()
      const code2 = new CheckStatusCode(null)
      expect(code1.value).toBe(0)
      expect(code2.value).toBe(0)
    })
  })

  describe('Static methods for component extraction', () => {
    it('should extract FC component correctly', () => {
      expect(CheckStatusCode.getFC(0x02300010)).toBe(0x0230)
      expect(CheckStatusCode.getFC(0x01FF0000)).toBe(0x01FF)
      expect(CheckStatusCode.getFC(0x00000010)).toBe(0)
    })

    it('should extract FC as enum value', () => {
      expect(CheckStatusCode.getFCe(0x02300010)).toBe(FCCheckStatus.ApprovedWithExcise)
      expect(CheckStatusCode.getFCe(0x01FF0000)).toBe(FCCheckStatus.MarkedByPartner)
    })

    it('should extract SW component correctly', () => {
      expect(CheckStatusCode.getSW(0x02300010)).toBe(0x0010)
      expect(CheckStatusCode.getSW(0x000001FF)).toBe(0x01FF)
      expect(CheckStatusCode.getSW(0x02300000)).toBe(0)
    })

    it('should extract SW as enum value', () => {
      expect(CheckStatusCode.getSWe(0x02300010)).toBe(SWCheckStatus.NoIssues)
      expect(CheckStatusCode.getSWe(0x000001FF)).toBe(SWCheckStatus.MarkedByPartner)
    })
  })

  describe('Instance properties', () => {
    it('should return correct FC component', () => {
      const code = new CheckStatusCode(0x02300010)
      expect(code.fc).toBe(0x0230)
    })

    it('should return correct SW component', () => {
      const code = new CheckStatusCode(0x02300010)
      expect(code.sw).toBe(0x0010)
    })
  })

  describe('hasIssues method', () => {
    it('should detect issues in FC component', () => {
      expect(CheckStatusCode.hasIssues(0x01000000)).toBe(true)
      expect(CheckStatusCode.hasIssues(0x01010000)).toBe(true)
    })

    it('should detect issues in SW component', () => {
      expect(CheckStatusCode.hasIssues(0x00000100)).toBe(true)
      expect(CheckStatusCode.hasIssues(0x00000101)).toBe(true)
    })

    it('should return false when no issues', () => {
      expect(CheckStatusCode.hasIssues(0x00020001)).toBe(false)
      expect(CheckStatusCode.hasIssues(0x00000000)).toBe(false)
    })

    it('should detect Duplicate status as having issues', () => {
      expect(CheckStatusCode.hasIssues(CheckStatusCode.Duplicate.value)).toBe(true)
    })

    it('should detect NotFound status as having issues', () => {
      const value = CheckStatusCode.compose(FCCheckStatus.NotFound, SWCheckStatus.NotFound)
      expect(CheckStatusCode.hasIssues(value)).toBe(true)
    })
  })

  describe('isDuplicate method', () => {
    it('should return true for Duplicate status', () => {
      expect(CheckStatusCode.isDuplicate(CheckStatusCode.Duplicate.value)).toBe(true)
    })

    it('should return true for manually composed Duplicate value', () => {
      const value = CheckStatusCode.compose(FCCheckStatus.Duplicate, SWCheckStatus.Duplicate)
      expect(CheckStatusCode.isDuplicate(value)).toBe(true)
    })

    it('should return false for non-Duplicate statuses', () => {
      expect(CheckStatusCode.isDuplicate(CheckStatusCode.NotChecked.value)).toBe(false)
      expect(CheckStatusCode.isDuplicate(CheckStatusCode.NoIssues.value)).toBe(false)
      expect(CheckStatusCode.isDuplicate(CheckStatusCode.ApprovedWithExcise.value)).toBe(false)
      expect(CheckStatusCode.isDuplicate(CheckStatusCode.MarkedByPartner.value)).toBe(false)
    })

    it('should return false when only FC is Duplicate', () => {
      const value = CheckStatusCode.compose(FCCheckStatus.Duplicate, SWCheckStatus.NotChecked)
      expect(CheckStatusCode.isDuplicate(value)).toBe(false)
    })

    it('should return false when only SW is Duplicate', () => {
      const value = CheckStatusCode.compose(FCCheckStatus.NotChecked, SWCheckStatus.Duplicate)
      expect(CheckStatusCode.isDuplicate(value)).toBe(false)
    })

    it('should return false for zero value', () => {
      expect(CheckStatusCode.isDuplicate(0)).toBe(false)
    })

    it('should return false for issue statuses', () => {
      const swIssue = CheckStatusCode.compose(FCCheckStatus.NotChecked, SWCheckStatus.IssueStopWord)
      const fcIssue = CheckStatusCode.compose(FCCheckStatus.IssueFeacnCode, SWCheckStatus.NotChecked)
      expect(CheckStatusCode.isDuplicate(swIssue)).toBe(false)
      expect(CheckStatusCode.isDuplicate(fcIssue)).toBe(false)
    })
  })

  describe('isNotFound method', () => {
    it('should return true for NotFound status', () => {
      const value = CheckStatusCode.compose(FCCheckStatus.NotFound, SWCheckStatus.NotFound)
      expect(CheckStatusCode.isNotFound(value)).toBe(true)
    })

    it('should return false for non-NotFound statuses', () => {
      expect(CheckStatusCode.isNotFound(CheckStatusCode.NotChecked.value)).toBe(false)
      expect(CheckStatusCode.isNotFound(CheckStatusCode.NoIssues.value)).toBe(false)
      expect(CheckStatusCode.isNotFound(CheckStatusCode.Duplicate.value)).toBe(false)
      expect(CheckStatusCode.isNotFound(CheckStatusCode.MarkedByPartner.value)).toBe(false)
    })

    it('should return false when only one component is NotFound', () => {
      const onlyFc = CheckStatusCode.compose(FCCheckStatus.NotFound, SWCheckStatus.NotChecked)
      const onlySw = CheckStatusCode.compose(FCCheckStatus.NotChecked, SWCheckStatus.NotFound)

      expect(CheckStatusCode.isNotFound(onlyFc)).toBe(false)
      expect(CheckStatusCode.isNotFound(onlySw)).toBe(false)
    })
  })

  describe('compose method', () => {
    it('should compose FC and SW correctly', () => {
      expect(CheckStatusCode.compose(0x0230, 0x0010)).toBe(0x02300010)
      expect(CheckStatusCode.compose(0x01FF, 0)).toBe(0x01FF0000)
      expect(CheckStatusCode.compose(0, 0x01FF)).toBe(0x000001FF)
    })

    it('should handle zero values', () => {
      expect(CheckStatusCode.compose(0, 0)).toBe(0)
    })

    it('should handle large values', () => {
      expect(CheckStatusCode.compose(0xFFFF, 0xFFFF)).toBe(0xFFFFFFFF)
    })
  })

  describe('Factory methods', () => {
    it('should create from parts', () => {
      const code = CheckStatusCode.fromParts(FCCheckStatus.ApprovedWithExcise, SWCheckStatus.NoIssues)
      expect(code.fc).toBe(FCCheckStatus.ApprovedWithExcise)
      expect(code.sw).toBe(SWCheckStatus.NoIssues)
    })

    it('should create from integer', () => {
      const code = CheckStatusCode.fromInt(0x02300010)
      expect(code.value).toBe(0x02300010)
    })
  })

  describe('toInt method', () => {
    it('should return integer value', () => {
      const code = new CheckStatusCode(0x02300010)
      expect(code.toInt()).toBe(0x02300010)
    })
  })

  describe('toString method', () => {
    it('should format special combined statuses', () => {
      const approvedWithExcise = CheckStatusCode.ApprovedWithExcise
      expect(approvedWithExcise.toString()).toBe('Согл. с акцизом')

      const markedByPartner = CheckStatusCode.MarkedByPartner  
      expect(markedByPartner.toString()).toBe('Исключено партнёром')

      const duplicate = CheckStatusCode.Duplicate
      expect(duplicate.toString()).toBe('Дубликат')

      const notFound = CheckStatusCode.fromParts(FCCheckStatus.NotFound, SWCheckStatus.NotFound)
      expect(notFound.toString()).toBe('Не найдена')
    })

    it('should format individual statuses correctly', () => {
      const noIssues = CheckStatusCode.fromParts(FCCheckStatus.NoIssues, SWCheckStatus.NoIssues)
      expect(noIssues.toString()).toBe('Ок стоп слова, Ок ТН ВЭД')

      const swApproved = CheckStatusCode.fromParts(FCCheckStatus.NotChecked, SWCheckStatus.Approved)
      expect(swApproved.toString()).toBe('Согласовано')

      const fcIssue = CheckStatusCode.fromParts(FCCheckStatus.IssueFeacnCode, SWCheckStatus.NotChecked)
      expect(fcIssue.toString()).toBe('Стоп ТН ВЭД')
    })

    it('should respect wFlag for inherited SW strings (flag vs plain)', () => {
      // When wFlag = true SW uses swStrings1 (keeps flag emoji)
      const inheritedWithFlag = CheckStatusCode.fromParts(FCCheckStatus.NotChecked, SWCheckStatus.ApprovedInherited)
      expect(inheritedWithFlag.toString(true)).toBe('🔖 Согласовано')

      const inheritedIssueWithFlag = CheckStatusCode.fromParts(FCCheckStatus.NotChecked, SWCheckStatus.IssueStopWordInherited)
      expect(inheritedIssueWithFlag.toString(true)).toBe('🔖 Стоп слово')

      // When wFlag = false SW uses swStrings2 (removes flag for inherited values)
      expect(inheritedWithFlag.toString()).toBe('Согласовано')
      expect(inheritedIssueWithFlag.toString()).toBe('Стоп слово')
    })

    it('should handle mixed statuses', () => {
      const mixed = CheckStatusCode.fromParts(FCCheckStatus.IssueNonexistingFeacn, SWCheckStatus.IssueStopWord)
      expect(mixed.toString()).toBe('Стоп слово, Нет ТН ВЭД')

      const partialIssue = CheckStatusCode.fromParts(FCCheckStatus.IssueInvalidFeacnFormat, SWCheckStatus.NoIssues)
      expect(partialIssue.toString()).toBe('Ок стоп слова, Формат ТН ВЭД')
    })

    it('should handle zero/not checked values', () => {
      const notChecked = CheckStatusCode.NotChecked
      expect(notChecked.toString()).toBe('Не проверено')

      const onlyFC = CheckStatusCode.fromParts(FCCheckStatus.NoIssues, SWCheckStatus.NotChecked)
      expect(onlyFC.toString()).toBe('Ок ТН ВЭД')

      const onlySW = CheckStatusCode.fromParts(FCCheckStatus.NotChecked, SWCheckStatus.Approved)
      expect(onlySW.toString()).toBe('Согласовано')
    })

    it('should expose NotChecked translations and use them contextually', () => {
      // Exported mappings should contain the NotChecked Russian string
      expect(SWCheckStatusNames[SWCheckStatus.NotChecked]).toBe('Не проверено')
      expect(FCCheckStatusNames[FCCheckStatus.NotChecked]).toBe('Не проверено')

      // When only FC is NotChecked and SW has NoIssues, toString uses SW string only
      const onlySw = CheckStatusCode.fromParts(FCCheckStatus.NotChecked, SWCheckStatus.NoIssues)
      expect(onlySw.toString()).toBe('Ок стоп слова')

      // When only SW is NotChecked and FC has NoIssues, toString uses FC string only
      const onlyFc = CheckStatusCode.fromParts(FCCheckStatus.NoIssues, SWCheckStatus.NotChecked)
      expect(onlyFc.toString()).toBe('Ок ТН ВЭД')

      // When both are NotChecked, special-case should return global NotChecked
      const both = CheckStatusCode.fromParts(FCCheckStatus.NotChecked, SWCheckStatus.NotChecked)
      expect(both.toString()).toBe('Не проверено')
    })

    it('should handle unknown status values', () => {
      const unknown = CheckStatusCode.fromParts(0x9999, 0x8888)
      expect(unknown.toString()).toBe('')
    })
  })

  describe('equals method', () => {
    it('should return true for equal values', () => {
      const code1 = new CheckStatusCode(0x02300010)
      const code2 = new CheckStatusCode(0x02300010)
      expect(code1.equals(code2)).toBe(true)
    })

    it('should return false for different values', () => {
      const code1 = new CheckStatusCode(0x02300010)
      const code2 = new CheckStatusCode(0x01FF0010)
      expect(code1.equals(code2)).toBe(false)
    })

    it('should return false for non-CheckStatusCode objects', () => {
      const code = new CheckStatusCode(0x02300010)
      expect(code.equals(0x02300010)).toBe(false)
      expect(code.equals({})).toBe(false)
      expect(code.equals(null)).toBe(false)
    })
  })

  describe('withFC method', () => {
    it('should replace FC component and preserve SW', () => {
      const original = new CheckStatusCode(0x02300010)
      const modified = CheckStatusCode.withFC(original, FCCheckStatus.MarkedByPartner)
      expect(modified.fc).toBe(FCCheckStatus.MarkedByPartner)
      expect(modified.sw).toBe(0x0010)
    })

    it('should work with integer input', () => {
      const modified = CheckStatusCode.withFC(0x02300010, FCCheckStatus.MarkedByPartner)
      expect(modified.fc).toBe(FCCheckStatus.MarkedByPartner)
      expect(modified.sw).toBe(0x0010)
    })
  })

  describe('withSW method', () => {
    it('should replace SW component and preserve FC', () => {
      const original = new CheckStatusCode(0x02300010)
      const modified = CheckStatusCode.withSW(original, SWCheckStatus.MarkedByPartner)
      expect(modified.fc).toBe(0x0230)
      expect(modified.sw).toBe(SWCheckStatus.MarkedByPartner)
    })

    it('should work with integer input', () => {
      const modified = CheckStatusCode.withSW(0x02300010, SWCheckStatus.MarkedByPartner)
      expect(modified.fc).toBe(0x0230)
      expect(modified.sw).toBe(SWCheckStatus.MarkedByPartner)
    })
  })

  describe('Predefined constants', () => {
    it('should have NotChecked constant', () => {
      const notChecked = CheckStatusCode.NotChecked
      expect(notChecked.fc).toBe(FCCheckStatus.NotChecked)
      expect(notChecked.sw).toBe(SWCheckStatus.NotChecked)
    })

    it('should have NoIssues constant', () => {
      const noIssues = CheckStatusCode.NoIssues
      expect(noIssues.fc).toBe(FCCheckStatus.NoIssues)
      expect(noIssues.sw).toBe(SWCheckStatus.NoIssues)
    })

    it('should have ApprovedWithExcise constant', () => {
      const approved = CheckStatusCode.ApprovedWithExcise
      expect(approved.fc).toBe(FCCheckStatus.ApprovedWithExcise)
      expect(approved.sw).toBe(SWCheckStatus.ApprovedWithExcise)
    })

    it('should have MarkedByPartner constant', () => {
      const marked = CheckStatusCode.MarkedByPartner
      expect(marked.fc).toBe(FCCheckStatus.MarkedByPartner)
      expect(marked.sw).toBe(SWCheckStatus.MarkedByPartner)
    })

    it('should have Duplicate constant', () => {
      const duplicate = CheckStatusCode.Duplicate
      expect(duplicate.fc).toBe(FCCheckStatus.Duplicate)
      expect(duplicate.sw).toBe(SWCheckStatus.Duplicate)
      expect(duplicate.value).toBe(CheckStatusCode.compose(FCCheckStatus.Duplicate, SWCheckStatus.Duplicate))
    })
  })
})

describe('CheckStatusHelper', () => {
  describe('compose method', () => {
    it('should compose FC and SW correctly', () => {
      expect(CheckStatusHelper.compose(0x0230, 0x0010)).toBe(0x02300010)
      expect(CheckStatusHelper.compose(0x01FF, 0)).toBe(0x01FF0000)
    })
  })

  describe('decompose method', () => {
    it('should decompose combined value correctly', () => {
      const result = CheckStatusHelper.decompose(0x02300010)
      expect(result.fc).toBe(0x0230)
      expect(result.sw).toBe(0x0010)
    })

    it('should handle zero value', () => {
      const result = CheckStatusHelper.decompose(0)
      expect(result.fc).toBe(0)
      expect(result.sw).toBe(0)
    })
  })

  describe('hasIssues method', () => {
    it('should detect issues correctly', () => {
      expect(CheckStatusHelper.hasIssues(0x01000000)).toBe(true)
      expect(CheckStatusHelper.hasIssues(0x00000100)).toBe(true)
      expect(CheckStatusHelper.hasIssues(0x02300010)).toBe(false)
    })
  })

  describe('fromParts method', () => {
    it('should create CheckStatusCode from parts', () => {
      const code = CheckStatusHelper.fromParts(FCCheckStatus.ApprovedWithExcise, SWCheckStatus.NoIssues)
      expect(code).toBeInstanceOf(CheckStatusCode)
      expect(code.fc).toBe(FCCheckStatus.ApprovedWithExcise)
      expect(code.sw).toBe(SWCheckStatus.NoIssues)
    })
  })

  describe('fromInt method', () => {
    it('should create CheckStatusCode from integer', () => {
      const code = CheckStatusHelper.fromInt(0x02300010)
      expect(code).toBeInstanceOf(CheckStatusCode)
      expect(code.value).toBe(0x02300010)
    })
  })
})

describe('Integration tests', () => {
  it('should work with complex scenarios', () => {
    // Create a status with issues
    const statusWithIssues = CheckStatusCode.fromParts(FCCheckStatus.IssueFeacnCode, SWCheckStatus.IssueStopWord)
    expect(CheckStatusCode.hasIssues(statusWithIssues.value)).toBe(true)

    // Modify FC component
    const modifiedFC = CheckStatusCode.withFC(statusWithIssues, FCCheckStatus.NoIssues)
    expect(modifiedFC.fc).toBe(FCCheckStatus.NoIssues)
    expect(modifiedFC.sw).toBe(SWCheckStatus.IssueStopWord)

    // Modify SW component
    const modifiedSW = CheckStatusCode.withSW(modifiedFC, SWCheckStatus.NoIssues)
    expect(modifiedSW.fc).toBe(FCCheckStatus.NoIssues)
    expect(modifiedSW.sw).toBe(SWCheckStatus.NoIssues)
    expect(CheckStatusCode.hasIssues(modifiedSW.value)).toBe(false)
  })

  it('should maintain consistency between different creation methods', () => {
    const fc = FCCheckStatus.ApprovedWithExcise
    const sw = SWCheckStatus.MarkedByPartner

    const fromParts = CheckStatusCode.fromParts(fc, sw)
    const fromComposed = CheckStatusCode.fromInt(CheckStatusCode.compose(fc, sw))
    const fromHelper = CheckStatusHelper.fromParts(fc, sw)

    expect(fromParts.equals(fromComposed)).toBe(true)
    expect(fromParts.equals(fromHelper)).toBe(true)
    expect(fromComposed.equals(fromHelper)).toBe(true)
  })

  it('should handle bit manipulation correctly', () => {
    // Test with maximum values
    const maxFC = 0xFFFF
    const maxSW = 0xFFFF
    const combined = CheckStatusCode.compose(maxFC, maxSW)
    
    expect(CheckStatusCode.getFC(combined)).toBe(maxFC)
    expect(CheckStatusCode.getSW(combined)).toBe(maxSW)
  })

  it('should work with real enum values', () => {
    // Test common status combinations
    const approved = CheckStatusCode.fromParts(FCCheckStatus.ApprovedWithExcise, SWCheckStatus.ApprovedWithExcise)
    expect(approved.fc).toBe(0x0230)
    expect(approved.sw).toBe(0x0230)
    expect(CheckStatusCode.hasIssues(approved.value)).toBe(false)

    const hasIssues = CheckStatusCode.fromParts(FCCheckStatus.IssueNonexistingFeacn, SWCheckStatus.IssueStopWord)
    expect(hasIssues.fc).toBe(0x0101)
    expect(hasIssues.sw).toBe(0x0100)
    expect(CheckStatusCode.hasIssues(hasIssues.value)).toBe(true)
  })

  it('should correctly handle Duplicate status in all operations', () => {
    const duplicate = CheckStatusCode.Duplicate
    
    // Verify it's composed of Duplicate parts
    expect(duplicate.fc).toBe(FCCheckStatus.Duplicate)
    expect(duplicate.sw).toBe(SWCheckStatus.Duplicate)
    
    // Verify it's detected as having issues
    expect(CheckStatusCode.hasIssues(duplicate.value)).toBe(true)
    
    // Verify isDuplicate
    expect(CheckStatusCode.isDuplicate(duplicate.value)).toBe(true)
    
    // Verify toString
    expect(duplicate.toString()).toBe('Дубликат')
    
    // Verify it can be decomposed correctly
    const decomposed = CheckStatusHelper.decompose(duplicate.value)
    expect(decomposed.fc).toBe(FCCheckStatus.Duplicate)
    expect(decomposed.sw).toBe(SWCheckStatus.Duplicate)
    
    // Verify CheckStatusHelper also sees it as having issues
    expect(CheckStatusHelper.hasIssues(duplicate.value)).toBe(true)
  })

  it('should correctly handle NotFound status in all operations', () => {
    const notFound = CheckStatusCode.fromParts(FCCheckStatus.NotFound, SWCheckStatus.NotFound)

    expect(notFound.fc).toBe(FCCheckStatus.NotFound)
    expect(notFound.sw).toBe(SWCheckStatus.NotFound)
    expect(CheckStatusCode.hasIssues(notFound.value)).toBe(true)
    expect(CheckStatusCode.isNotFound(notFound.value)).toBe(true)
    expect(notFound.toString()).toBe('Не найдена')

    const decomposed = CheckStatusHelper.decompose(notFound.value)
    expect(decomposed.fc).toBe(FCCheckStatus.NotFound)
    expect(decomposed.sw).toBe(SWCheckStatus.NotFound)
    expect(CheckStatusHelper.hasIssues(notFound.value)).toBe(true)
  })

  it('should distinguish Duplicate from other issue statuses', () => {
    const duplicate = CheckStatusCode.Duplicate
    const notFound = CheckStatusCode.fromParts(FCCheckStatus.NotFound, SWCheckStatus.NotFound)
    const markedByPartner = CheckStatusCode.MarkedByPartner
    const issueStatus = CheckStatusCode.fromParts(FCCheckStatus.IssueFeacnCode, SWCheckStatus.IssueStopWord)
    
    // All are issues
    expect(CheckStatusCode.hasIssues(duplicate.value)).toBe(true)
    expect(CheckStatusCode.hasIssues(notFound.value)).toBe(true)
    expect(CheckStatusCode.hasIssues(markedByPartner.value)).toBe(true)
    expect(CheckStatusCode.hasIssues(issueStatus.value)).toBe(true)
    
    // Duplicate and NotFound have dedicated detectors
    expect(CheckStatusCode.isDuplicate(duplicate.value)).toBe(true)
    expect(CheckStatusCode.isNotFound(duplicate.value)).toBe(false)
    expect(CheckStatusCode.isDuplicate(notFound.value)).toBe(false)
    expect(CheckStatusCode.isNotFound(notFound.value)).toBe(true)
    expect(CheckStatusCode.isDuplicate(markedByPartner.value)).toBe(false)
    expect(CheckStatusCode.isNotFound(markedByPartner.value)).toBe(false)
    expect(CheckStatusCode.isDuplicate(issueStatus.value)).toBe(false)
    expect(CheckStatusCode.isNotFound(issueStatus.value)).toBe(false)
    
    // All have different string representations
    expect(duplicate.toString()).toBe('Дубликат')
    expect(notFound.toString()).toBe('Не найдена')
    expect(markedByPartner.toString()).toBe('Исключено партнёром')
    expect(issueStatus.toString()).not.toBe('Дубликат')
  })
})
