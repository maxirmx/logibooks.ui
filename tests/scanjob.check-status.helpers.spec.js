// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks UI application

import { describe, expect, it } from 'vitest'
import {
  getScanjobCheckStatusClass,
  scanjobCheckStatusProjectionKind,
  scanjobCheckStatusReason,
  scanjobCheckStatusText
} from '@/helpers/scanjob.check-status.helpers.js'

describe('scanjob.check-status.helpers', () => {
  it('maps projected statuses to scan-job classes', () => {
    expect(getScanjobCheckStatusClass({ kind: scanjobCheckStatusProjectionKind.NotChecked })).toBe('not-checked')
    expect(getScanjobCheckStatusClass({ kind: scanjobCheckStatusProjectionKind.Restriction })).toBe('has-issues')
    expect(getScanjobCheckStatusClass({ kind: scanjobCheckStatusProjectionKind.Checked })).toBe('no-issues')
    expect(getScanjobCheckStatusClass(null)).toBe('')
  })

  it('renders title and restriction reason from backend projection', () => {
    const restriction = {
      kind: scanjobCheckStatusProjectionKind.Restriction,
      title: 'Запрет',
      restrictionReason: 'Стоп-слово'
    }

    expect(scanjobCheckStatusText(restriction)).toBe('Запрет')
    expect(scanjobCheckStatusReason(restriction)).toBe('Стоп-слово')
    expect(scanjobCheckStatusText(null)).toBe('-')
    expect(scanjobCheckStatusReason({ kind: scanjobCheckStatusProjectionKind.Checked, restrictionReason: 'ignored' })).toBe('')
  })
})
