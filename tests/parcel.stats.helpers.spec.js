// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, expect, it } from 'vitest'
import {
  formatParcelsByCheckStatusProjectionTooltip,
  formatParcelsByCheckStatusTooltip
} from '@/helpers/parcel.stats.helpers.js'
import { CheckStatusCode, FCCheckStatus, SWCheckStatus } from '@/helpers/check.status.code.js'
import { scanjobCheckStatusProjectionKind } from '@/helpers/scanjob.check-status.helpers.js'

describe('parcel.stats.helpers', () => {
  it('formats check status tooltip from raw check statuses', () => {
    const status = CheckStatusCode.fromParts(FCCheckStatus.NoIssues, SWCheckStatus.Approved).value

    expect(formatParcelsByCheckStatusTooltip({
      parcelsByCheckStatus: {
        [status]: 12
      }
    })).toBe('Согласовано, Ок ТН ВЭД: 12')
  })

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

  it('skips zero, missing, and unknown projection counts', () => {
    const tooltip = formatParcelsByCheckStatusProjectionTooltip({
      parcelsByCheckStatusProjection: {
        [scanjobCheckStatusProjectionKind.Defect]: 0,
        [scanjobCheckStatusProjectionKind.Restriction]: null,
        [scanjobCheckStatusProjectionKind.Checked]: 5,
        999: 100
      }
    })

    expect(tooltip).toBe('Проверено: 5')
  })

  it('returns empty tooltip for missing or empty projection data', () => {
    expect(formatParcelsByCheckStatusProjectionTooltip(null)).toBe('')
    expect(formatParcelsByCheckStatusProjectionTooltip({})).toBe('')
    expect(formatParcelsByCheckStatusProjectionTooltip({
      parcelsByCheckStatusProjection: {}
    })).toBe('')
  })
})
