// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, expect, it } from 'vitest'
import { formatParcelsByCheckStatusProjectionTooltip } from '@/helpers/parcel.stats.helpers.js'
import { scanjobCheckStatusProjectionKind } from '@/helpers/scanjob.check-status.helpers.js'

describe('parcel.stats.helpers', () => {
  it('formats projection tooltip in warehouse severity order', () => {
    const tooltip = formatParcelsByCheckStatusProjectionTooltip({
      parcelsByCheckStatusProjection: {
        [scanjobCheckStatusProjectionKind.Checked]: 1234,
        [scanjobCheckStatusProjectionKind.NotChecked]: 2,
        [scanjobCheckStatusProjectionKind.Restriction]: 3,
        [scanjobCheckStatusProjectionKind.Defect]: 4
      }
    })

    expect(tooltip).toBe('Брак: 4\nЗапрет: 3\nНе проверено: 2\nПроверено: 1\u00A0234')
  })

  it('returns empty tooltip for missing or empty projection data', () => {
    expect(formatParcelsByCheckStatusProjectionTooltip(null)).toBe('')
    expect(formatParcelsByCheckStatusProjectionTooltip({})).toBe('')
    expect(
      formatParcelsByCheckStatusProjectionTooltip({
        parcelsByCheckStatusProjection: {}
      })
    ).toBe('')
  })
})
