// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, expect, it } from 'vitest'
import { createPassportCheckStatusOptions, getPassportCheckStatusPresentation, hasPassportCheckIssues, PassportCheckStatusCode, PassportCheckStatusFilterValue, PassportCheckStatusPresentation } from '@/helpers/passport.check.status.helpers.js'

describe('passport check status helpers', () => {
  it('maps backend status codes to named UI presentation entities', () => {
    expect(getPassportCheckStatusPresentation(PassportCheckStatusCode.Invalid)).toBe(
      PassportCheckStatusPresentation.Invalid
    )
    expect(getPassportCheckStatusPresentation(PassportCheckStatusCode.NotExists)).toBe(
      PassportCheckStatusPresentation.NotExists
    )
    expect(getPassportCheckStatusPresentation(PassportCheckStatusCode.Checked)).toBe(
      PassportCheckStatusPresentation.Checked
    )
    expect(getPassportCheckStatusPresentation(PassportCheckStatusCode.NotChecked)).toBe(
      PassportCheckStatusPresentation.NotChecked
    )
    expect(getPassportCheckStatusPresentation(PassportCheckStatusCode.CheckError)).toBe(
      PassportCheckStatusPresentation.CheckError
    )
    expect(getPassportCheckStatusPresentation(PassportCheckStatusCode.InProgress)).toBe(
      PassportCheckStatusPresentation.InProgress
    )
  })

  it('identifies passport check issue statuses using backend-defined values', () => {
    const statuses = [
      { value: 5, code: PassportCheckStatusCode.NotChecked },
      { value: 10, code: PassportCheckStatusCode.CheckError },
      { value: 20, code: PassportCheckStatusCode.InProgress },
      { value: 30, code: PassportCheckStatusCode.Checked },
      { value: 40, code: PassportCheckStatusCode.NotExists },
      { value: 50, code: PassportCheckStatusCode.Invalid }
    ]

    expect(hasPassportCheckIssues(statuses, 10)).toBe(true)
    expect(hasPassportCheckIssues(statuses, '40')).toBe(true)
    expect(hasPassportCheckIssues(statuses, 50)).toBe(true)
    expect(hasPassportCheckIssues(statuses, 5)).toBe(false)
    expect(hasPassportCheckIssues(statuses, 20)).toBe(false)
    expect(hasPassportCheckIssues(statuses, 30)).toBe(false)
    expect(hasPassportCheckIssues(statuses, 999)).toBe(false)
    expect(hasPassportCheckIssues([], 10)).toBe(false)
    expect(hasPassportCheckIssues(null, 10)).toBe(false)
  })

  it('builds selector options from backend localized names', () => {
    const statuses = [
      { value: 0, code: PassportCheckStatusCode.NotChecked, name: 'Не проверен' },
      { value: 30, code: PassportCheckStatusCode.Checked, name: 'Проверен' }
    ]

    expect(createPassportCheckStatusOptions(statuses)).toEqual([
      { value: null, title: 'Все' },
      { value: PassportCheckStatusFilterValue.Problems, title: 'С проблемами' },
      { value: 0, title: 'Не проверен' },
      { value: 30, title: 'Проверен' }
    ])
    expect(createPassportCheckStatusOptions(null)).toEqual([
      { value: null, title: 'Все' },
      { value: PassportCheckStatusFilterValue.Problems, title: 'С проблемами' }
    ])
  })

})
