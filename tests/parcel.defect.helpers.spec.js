// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks UI application

import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import { CheckStatusCode } from '@/helpers/check.status.code.js'
import {
  canClearParcelDefect,
  canSetParcelDefect,
  isParcelDefect,
  isParcelDuplicate,
  isParcelMarkedByPartner
} from '@/helpers/parcel.defect.helpers.js'

describe('parcel defect helpers', () => {
  it('detects special statuses from numeric check status', () => {
    expect(isParcelDefect({ checkStatus: CheckStatusCode.Defect.value })).toBe(true)
    expect(isParcelDuplicate({ checkStatus: CheckStatusCode.Duplicate.value })).toBe(true)
    expect(isParcelMarkedByPartner({ checkStatus: CheckStatusCode.MarkedByPartner.value })).toBe(true)
  })

  it('uses projection text when numeric check status is absent', () => {
    expect(isParcelDefect({ checkStatusProjection: { title: 'Брак' } })).toBe(true)
    expect(isParcelDuplicate({ checkStatusProjection: { restrictionReason: 'Дубликат' } })).toBe(true)
    expect(isParcelMarkedByPartner({ checkStatusProjection: { title: 'Исключено партнёром' } })).toBe(true)
  })

  it('allows setting defect only for administrator or warehouse manager on regular parcels', () => {
    const parcel = { checkStatus: CheckStatusCode.NotChecked.value }

    expect(canSetParcelDefect(parcel, { isAdmin: true, isWhManager: false })).toBe(true)
    expect(canSetParcelDefect(parcel, { isAdmin: false, isWhManager: true })).toBe(true)
    expect(canSetParcelDefect(parcel, { isAdmin: false, isWhManager: false })).toBe(false)
    expect(canSetParcelDefect({ checkStatus: CheckStatusCode.Defect.value }, { isAdmin: true })).toBe(false)
    expect(canSetParcelDefect({ checkStatus: CheckStatusCode.Duplicate.value }, { isAdmin: true })).toBe(false)
    expect(canSetParcelDefect({ checkStatus: CheckStatusCode.MarkedByPartner.value }, { isAdmin: true })).toBe(false)
  })

  it('allows clearing defect only for administrator or shift lead on defect parcels', () => {
    const parcel = { checkStatus: CheckStatusCode.Defect.value }

    expect(canClearParcelDefect(parcel, { isAdmin: ref(true), isShiftLead: ref(false) })).toBe(true)
    expect(canClearParcelDefect(parcel, { isAdmin: ref(false), isShiftLead: ref(true) })).toBe(true)
    expect(canClearParcelDefect(parcel, { isAdmin: ref(false), isShiftLead: ref(false) })).toBe(false)
    expect(canClearParcelDefect({ checkStatus: CheckStatusCode.NotChecked.value }, { isAdmin: true })).toBe(false)
  })
})
