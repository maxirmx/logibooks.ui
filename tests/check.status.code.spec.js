// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect } from 'vitest'
import CheckStatusCode, { 
  CheckStatusHelper, 
  FCCheckStatus, 
  SWCheckStatus,
  WStatusValues
} from '@/helpers/check.status.code.js'

import { FCCheckStatusNames, SWCheckStatusNames } from '@/helpers/check.status.code.js'

describe('WStatusValues', () => {
  it('should have correct common values', () => {
    expect(WStatusValues.ApprovedWithExcise).toBe(0x0230)
    expect(WStatusValues.MarkedByPartner).toBe(0x01FF)
  })

  it('should be frozen', () => {
    expect(() => {
      WStatusValues.NewValue = 999
    }).toThrow()
  })
})

describe('FCCheckStatus', () => {
  it('should have correct enum values', () => {
    expect(FCCheckStatus.NotChecked).toBe(0)
    expect(FCCheckStatus.NoIssues).toBe(0x0010)
    expect(FCCheckStatus.ApprovedWithExcise).toBe(0x0230)
    expect(FCCheckStatus.IssueFeacnCode).toBe(0x0100)
    expect(FCCheckStatus.IssueNonexistingFeacn).toBe(0x0101)
    expect(FCCheckStatus.IssueInvalidFeacnFormat).toBe(0x0102)
    expect(FCCheckStatus.MarkedByPartner).toBe(0x01FF)
  })

  it('should be frozen', () => {
    expect(() => {
      FCCheckStatus.NewValue = 999
    }).toThrow()
  })
})

describe('SWCheckStatus', () => {
  it('should have correct enum values', () => {
    expect(SWCheckStatus.NotChecked).toBe(0x0000)
    expect(SWCheckStatus.NoIssues).toBe(0x0010)
    expect(SWCheckStatus.Approved).toBe(0x0020)
    expect(SWCheckStatus.ApprovedWithExcise).toBe(0x0230)
    expect(SWCheckStatus.IssueStopWord).toBe(0x0100)
    expect(SWCheckStatus.MarkedByPartner).toBe(0x01FF)
  })

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
})