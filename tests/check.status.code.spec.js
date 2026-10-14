// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect } from 'vitest'
import CheckStatusCode, {
  createCheckStatusFilterOptions,
  CheckStatusHelper,
  FCCheckStatus,
  SWCheckStatus,
  WStatusValues
} from '@/helpers/check.status.code.js'

import { FCCheckStatusNames, SWCheckStatusNames } from '@/helpers/check.status.code.js'

describe('CheckStatusCode', () => {
  describe('EUR1000 status', () => {
    it('should detect and render only the exact combined status', () => {
      expect(CheckStatusCode.isEUR1000(CheckStatusCode.EUR1000.value)).toBe(true)
      expect(
        CheckStatusCode.isEUR1000(
          CheckStatusCode.compose(FCCheckStatus.EUR1000, SWCheckStatus.NotChecked)
        )
      ).toBe(false)
      expect(CheckStatusCode.EUR1000.toString()).toBe('>1000€')
    })

    it.each([
      ['SW', SWCheckStatusNames],
      ['FC', FCCheckStatusNames]
    ])('should place EUR1000 last in %s filter options, after Duplicate', (_type, names) => {
      const options = createCheckStatusFilterOptions(names)

      expect(options.at(-2).title).toBe('Дубликат')
      expect(options.at(-1)).toEqual({
        value: WStatusValues.EUR1000,
        title: '>1000€'
      })
    })
  })

  describe('isDefect method', () => {
    it('should return false for non-Defect statuses', () => {
      expect(CheckStatusCode.isDefect(CheckStatusCode.NotChecked.value)).toBe(false)
      expect(CheckStatusCode.isDefect(CheckStatusCode.NoIssues.value)).toBe(false)
      expect(CheckStatusCode.isDefect(CheckStatusCode.Duplicate.value)).toBe(false)
      expect(CheckStatusCode.isDefect(CheckStatusCode.MarkedByPartner.value)).toBe(false)
    })

  })

  describe('toInt method', () => {
    it('should return integer value', () => {
      const code = new CheckStatusCode(0x02300010)
      expect(code.toInt()).toBe(0x02300010)
    })
  })

  describe('toString method', () => {
    it('should expose NotChecked translations and use them contextually', () => {
      // Exported mappings should contain the NotChecked Russian string
      expect(SWCheckStatusNames[SWCheckStatus.NotChecked]).toBe('Не проверено')
      expect(FCCheckStatusNames[FCCheckStatus.NotChecked]).toBe('Не проверено')
      expect(SWCheckStatusNames[SWCheckStatus.Duplicate2]).toBe('Дубликат')
      expect(FCCheckStatusNames[FCCheckStatus.Duplicate2]).toBe('Дубликат')

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

    it('should render inherited NoIssues consistently in labels and composed statuses', () => {
      expect(SWCheckStatus.NoIssuesInherited).toBe(0x0090)
      expect(SWCheckStatusNames[SWCheckStatus.NoIssuesInherited]).toBe('🔖 Ок стоп слова')
      const code = CheckStatusCode.fromParts(FCCheckStatus.NotChecked, SWCheckStatus.NoIssuesInherited)
      expect(code.toString(true)).toBe('🔖 Ок стоп слова')
      expect(code.toString(false)).toBe('Ок стоп слова')
    })

  })

  describe('equals method', () => {
    it('should return false for non-CheckStatusCode objects', () => {
      const code = new CheckStatusCode(0x02300010)
      expect(code.equals(0x02300010)).toBe(false)
      expect(code.equals({})).toBe(false)
      expect(code.equals(null)).toBe(false)
    })
  })

  describe('withFC method', () => {
    it('should work with integer input', () => {
      const modified = CheckStatusCode.withFC(0x02300010, FCCheckStatus.MarkedByPartner)
      expect(modified.fc).toBe(FCCheckStatus.MarkedByPartner)
      expect(modified.sw).toBe(0x0010)
    })
  })

  describe('withSW method', () => {
    it('should work with integer input', () => {
      const modified = CheckStatusCode.withSW(0x02300010, SWCheckStatus.MarkedByPartner)
      expect(modified.fc).toBe(0x0230)
      expect(modified.sw).toBe(SWCheckStatus.MarkedByPartner)
    })
  })
})

describe('CheckStatusHelper', () => {
  describe('compose method', () => {
    it('should compose FC and SW correctly', () => {
      expect(CheckStatusHelper.compose(0x0230, 0x0010)).toBe(0x02300010)
      expect(CheckStatusHelper.compose(0x01ff, 0)).toBe(0x01ff0000)
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
    const statusWithIssues = CheckStatusCode.fromParts(
      FCCheckStatus.IssueFeacnCode,
      SWCheckStatus.IssueStopWord
    )
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

  it('should distinguish Duplicate from other issue statuses', () => {
    const duplicate = CheckStatusCode.Duplicate
    const defect = CheckStatusCode.fromParts(FCCheckStatus.Defect, SWCheckStatus.Defect)
    const markedByPartner = CheckStatusCode.MarkedByPartner
    const issueStatus = CheckStatusCode.fromParts(
      FCCheckStatus.IssueFeacnCode,
      SWCheckStatus.IssueStopWord
    )

    // All are issues
    expect(CheckStatusCode.hasIssues(duplicate.value)).toBe(true)
    expect(CheckStatusCode.hasIssues(defect.value)).toBe(true)
    expect(CheckStatusCode.hasIssues(markedByPartner.value)).toBe(true)
    expect(CheckStatusCode.hasIssues(issueStatus.value)).toBe(true)

    // Duplicate and Defect have dedicated detectors
    expect(CheckStatusCode.isDuplicate(duplicate.value)).toBe(true)
    expect(CheckStatusCode.isDefect(duplicate.value)).toBe(false)
    expect(CheckStatusCode.isDuplicate(defect.value)).toBe(false)
    expect(CheckStatusCode.isDefect(defect.value)).toBe(true)
    expect(CheckStatusCode.isDuplicate(markedByPartner.value)).toBe(false)
    expect(CheckStatusCode.isDefect(markedByPartner.value)).toBe(false)
    expect(CheckStatusCode.isDuplicate(issueStatus.value)).toBe(false)
    expect(CheckStatusCode.isDefect(issueStatus.value)).toBe(false)

    // All have different string representations
    expect(duplicate.toString()).toBe('Дубликат')
    expect(defect.toString()).toBe('Брак')
    expect(markedByPartner.toString()).toBe('Исключено партнёром')
    expect(issueStatus.toString()).not.toBe('Дубликат')
  })
})
