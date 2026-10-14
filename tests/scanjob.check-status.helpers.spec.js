// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks UI application

import { describe, expect, it } from 'vitest'
import { scanjobCheckStatusProjectionKind, scanjobCheckStatusReason, scanjobCheckStatusText } from '@/helpers/scanjob.check-status.helpers.js'

describe('scanjob.check-status.helpers', () => {
  it('renders title and restriction reason from backend projection', () => {
    const restriction = {
      kind: scanjobCheckStatusProjectionKind.Restriction,
      title: 'Запрет',
      restrictionReason: 'Стоп-слово'
    }

    expect(scanjobCheckStatusText(restriction)).toBe('Запрет')
    expect(scanjobCheckStatusReason(restriction)).toBe('Стоп-слово')
    expect(
      scanjobCheckStatusText({ kind: scanjobCheckStatusProjectionKind.Defect, title: 'Брак' })
    ).toBe('Брак')
    expect(scanjobCheckStatusText(null)).toBe('-')
    expect(
      scanjobCheckStatusReason({
        kind: scanjobCheckStatusProjectionKind.Checked,
        restrictionReason: 'ignored'
      })
    ).toBe('')
  })
})
