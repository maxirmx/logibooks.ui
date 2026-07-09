// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, expect, it } from 'vitest'
import {
  createPassportCheckStatusOptions,
  getPassportCheckStatusPresentation,
  PassportCheckStatusCode,
  PassportCheckStatusPresentation,
  resolvePassportCheckStatus
} from '@/helpers/passport.check.status.helpers.js'

describe('passport check status helpers', () => {
  it('maps backend status codes to named UI presentation entities', () => {
    expect(getPassportCheckStatusPresentation(PassportCheckStatusCode.Invalid)).toBe(
      PassportCheckStatusPresentation.HasIssues
    )
    expect(getPassportCheckStatusPresentation(PassportCheckStatusCode.NotExists)).toBe(
      PassportCheckStatusPresentation.HasIssues
    )
    expect(getPassportCheckStatusPresentation(PassportCheckStatusCode.Checked)).toBe(
      PassportCheckStatusPresentation.NoIssues
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

  it('keeps mixed presentation entities explicit for error and in-progress states', () => {
    expect(PassportCheckStatusPresentation.CheckError).toMatchObject({
      colorClass: 'passport-check-status__dot--color-not-checked',
      borderClass: 'passport-check-status__dot--border-has-issues'
    })
    expect(PassportCheckStatusPresentation.InProgress).toMatchObject({
      colorClass: 'passport-check-status__dot--color-not-checked',
      borderClass: 'passport-check-status__dot--border-no-issues'
    })
  })

  it('resolves backend status metadata by numeric value', () => {
    const statuses = [
      { value: 0, code: PassportCheckStatusCode.NotChecked, name: 'Не проверен' },
      { value: 30, code: PassportCheckStatusCode.Checked, name: 'Проверен' }
    ]

    expect(resolvePassportCheckStatus(statuses, '30')).toEqual(statuses[1])
    expect(resolvePassportCheckStatus(statuses, 'missing')).toBeNull()
    expect(resolvePassportCheckStatus(null, 30)).toBeNull()
  })

  it('builds selector options from backend localized names', () => {
    const statuses = [
      { value: 0, code: PassportCheckStatusCode.NotChecked, name: 'Не проверен' },
      { value: 30, code: PassportCheckStatusCode.Checked, name: 'Проверен' }
    ]

    expect(createPassportCheckStatusOptions(statuses)).toEqual([
      { value: null, title: 'Все' },
      { value: 0, title: 'Не проверен' },
      { value: 30, title: 'Проверен' }
    ])
    expect(createPassportCheckStatusOptions(null)).toEqual([{ value: null, title: 'Все' }])
  })
})
