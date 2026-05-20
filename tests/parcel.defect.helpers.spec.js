// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks UI application

import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import { scanjobCheckStatusProjectionKind } from '@/helpers/scanjob.check-status.helpers.js'
import {
  canClearParcelDefect,
  canSetParcelDefect,
  getClearParcelDefectErrorMessage,
  getSetParcelDefectErrorMessage,
  isParcelDefect,
  isParcelDuplicate,
  isParcelMarkedByPartner
} from '@/helpers/parcel.defect.helpers.js'

describe('parcel defect helpers', () => {
  it('detects special statuses from projection only', () => {
    expect(isParcelDefect({ checkStatusProjection: { kind: scanjobCheckStatusProjectionKind.Defect, title: 'Брак' } })).toBe(true)
    expect(isParcelDuplicate({ checkStatusProjection: { restrictionReason: 'Дубликат' } })).toBe(true)
    expect(isParcelMarkedByPartner({ checkStatusProjection: { title: 'Исключено партнёром' } })).toBe(true)
  })

  it('handles case-insensitive projection text and partner spelling variants', () => {
    expect(isParcelDefect({ checkStatusProjection: { title: 'бРаК' } })).toBe(true)
    expect(isParcelDuplicate({ checkStatusProjection: { restrictionReason: 'дУбЛиКаТ' } })).toBe(true)
    expect(isParcelMarkedByPartner({ checkStatusProjection: { title: 'Исключено партнером' } })).toBe(true)
  })

  it('returns false for unrelated projections', () => {
    expect(isParcelDefect({ checkStatusProjection: { title: 'Не проверено' } })).toBe(false)
    expect(isParcelDuplicate({ checkStatusProjection: { title: 'Проверено' } })).toBe(false)
    expect(isParcelMarkedByPartner({ checkStatusProjection: { restrictionReason: 'Нет ограничений' } })).toBe(false)
  })

  it('allows setting defect only for administrator or warehouse manager on regular parcels', () => {
    const parcel = {
      checkStatusProjection: {
        kind: scanjobCheckStatusProjectionKind.NotChecked,
        title: 'Не проверено'
      }
    }

    expect(canSetParcelDefect(parcel, { isAdmin: true, isWhManager: false })).toBe(true)
    expect(canSetParcelDefect(parcel, { isAdmin: ref(false), isWhManager: ref(true) })).toBe(true)
    expect(canSetParcelDefect(parcel, { isAdmin: false, isWhManager: false })).toBe(false)
    expect(canSetParcelDefect({}, { isAdmin: true })).toBe(false)
    expect(canSetParcelDefect({ checkStatusProjection: { kind: scanjobCheckStatusProjectionKind.Defect, title: 'Брак' } }, { isAdmin: true })).toBe(false)
    expect(canSetParcelDefect({ checkStatusProjection: { title: 'Дубликат' } }, { isAdmin: true })).toBe(false)
    expect(canSetParcelDefect({ checkStatusProjection: { title: 'Исключено партнёром' } }, { isAdmin: true })).toBe(false)
  })

  it('allows clearing defect only for administrator or shift lead on defect parcels', () => {
    const parcel = {
      checkStatusProjection: {
        kind: scanjobCheckStatusProjectionKind.Defect,
        title: 'Брак'
      }
    }

    expect(canClearParcelDefect(parcel, { isAdmin: ref(true), isShiftLead: ref(false) })).toBe(true)
    expect(canClearParcelDefect(parcel, { isAdmin: ref(false), isShiftLead: ref(true) })).toBe(true)
    expect(canClearParcelDefect(parcel, { isAdmin: ref(false), isShiftLead: ref(false) })).toBe(false)
    expect(canClearParcelDefect({ checkStatusProjection: { title: 'Не проверено' } }, { isAdmin: true })).toBe(false)
    expect(canClearParcelDefect({ checkStatusProjection: { title: 'Брак' } }, { isShiftLead: true })).toBe(true)
  })

  it('returns expected error messages for defect actions', () => {
    expect(getSetParcelDefectErrorMessage(new Error('403 forbidden'))).toBe('Нет прав для отметки посылки как брак')
    expect(getSetParcelDefectErrorMessage('404')).toBe('Посылка не найдена')
    expect(getSetParcelDefectErrorMessage(new Error('409 conflict'))).toBe('Нельзя отметить эту посылку как брак')
    expect(getSetParcelDefectErrorMessage({ status: 403 })).toBe('Нет прав для отметки посылки как брак')
    expect(getSetParcelDefectErrorMessage({ status: 404, message: '403 forbidden' })).toBe('Посылка не найдена')
    expect(getSetParcelDefectErrorMessage({ response: { status: 409 } })).toBe('Нельзя отметить эту посылку как брак')
    expect(getSetParcelDefectErrorMessage(new Error('500'))).toBe('Ошибка при отметке посылки как брак')

    expect(getClearParcelDefectErrorMessage(new Error('403 forbidden'))).toBe('Нет прав для отмены брака')
    expect(getClearParcelDefectErrorMessage({ status: 403 })).toBe('Нет прав для отмены брака')
    expect(getClearParcelDefectErrorMessage('404')).toBe('Посылка не найдена')
    expect(getClearParcelDefectErrorMessage({ response: { status: 404 } })).toBe('Посылка не найдена')
    expect(getClearParcelDefectErrorMessage(new Error('500'))).toBe('Ошибка при отмене брака')
  })
})
