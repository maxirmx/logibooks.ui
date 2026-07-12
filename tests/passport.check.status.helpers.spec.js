// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, expect, it } from 'vitest'
import {
  createPassportCheckStatusOptions,
  getPassportCheckStatusPresentation,
  PassportCheckStatusCode,
  PassportCheckStatusFilterValue,
  PassportCheckStatusPresentation,
  hasPassportIdentityChanged,
  isPassportCheckInProgress,
  resolveEffectivePassportCheckStatus,
  resolvePassportCheckStatus,
  resolvePassportCheckStatusByCode
} from '@/helpers/passport.check.status.helpers.js'

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

  it('maps backend status codes to requested Font Awesome icons and icon color classes', () => {
    expect(PassportCheckStatusPresentation.NotChecked).toMatchObject({
      icon: 'fa-solid fa-circle-question',
      colorClass: 'passport-check-status__icon--color-not-checked'
    })
    expect(PassportCheckStatusPresentation.CheckError).toMatchObject({
      icon: 'fa-solid fa-triangle-exclamation',
      colorClass: 'passport-check-status__icon--color-has-issues'
    })
    expect(PassportCheckStatusPresentation.InProgress).toMatchObject({
      icon: 'fa-solid fa-arrow-rotate-left',
      colorClass: 'passport-check-status__icon--color-not-checked'
    })
    expect(PassportCheckStatusPresentation.Checked).toMatchObject({
      icon: 'fa-solid fa-circle-check',
      colorClass: 'passport-check-status__icon--color-no-issues'
    })
    expect(PassportCheckStatusPresentation.Invalid).toMatchObject({
      icon: 'fa-solid fa-circle-exclamation',
      colorClass: 'passport-check-status__icon--color-has-issues'
    })
    expect(PassportCheckStatusPresentation.NotExists).toMatchObject({
      icon: 'fa-solid fa-circle-xmark',
      colorClass: 'passport-check-status__icon--color-has-issues'
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
      { value: PassportCheckStatusFilterValue.Problems, title: 'С проблемами' },
      { value: 0, title: 'Не проверен' },
      { value: 30, title: 'Проверен' }
    ])
    expect(createPassportCheckStatusOptions(null)).toEqual([
      { value: null, title: 'Все' },
      { value: PassportCheckStatusFilterValue.Problems, title: 'С проблемами' }
    ])
  })

  it('resolves workflow states by backend code without numeric assumptions', () => {
    const statuses = [
      { value: 73, code: PassportCheckStatusCode.NotChecked, name: 'Не проверен' },
      { value: 91, code: PassportCheckStatusCode.InProgress, name: 'В процессе' }
    ]

    expect(resolvePassportCheckStatusByCode(statuses, PassportCheckStatusCode.NotChecked)).toBe(statuses[0])
    expect(isPassportCheckInProgress(statuses, 91)).toBe(true)
    expect(isPassportCheckInProgress(statuses, 73)).toBe(false)
  })

  it('treats trimmed identity values as unchanged and real edits as changed', () => {
    const initial = { firstName: ' Anna ', lastName: 'Ivanova', patronymic: 'Petrovna' }

    expect(hasPassportIdentityChanged(
      initial,
      { firstName: 'Anna', lastName: 'Ivanova', patronymic: 'Changed' },
      ['firstName', 'lastName']
    )).toBe(false)
    expect(hasPassportIdentityChanged(
      initial,
      { firstName: 'Maria', lastName: 'Ivanova' },
      ['firstName', 'lastName']
    )).toBe(true)
  })

  it('uses a local NotChecked status when an identity field changes', () => {
    const statuses = [
      { value: 0, code: PassportCheckStatusCode.NotChecked, name: 'Не проверен' },
      { value: 30, code: PassportCheckStatusCode.Checked, name: 'Проверен' }
    ]

    expect(resolveEffectivePassportCheckStatus(
      statuses,
      30,
      { passportNumber: '123456' },
      { passportNumber: '654321' },
      ['passportNumber']
    )).toBe(statuses[0])
    expect(resolveEffectivePassportCheckStatus(
      statuses,
      30,
      { passportNumber: '123456' },
      { passportNumber: ' 123456 ' },
      ['passportNumber']
    )).toBe(statuses[1])
  })
})
