// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks UI application

import { describe, expect, it } from 'vitest'
import {
  compareScanjobCheckStatusProjection,
  scanjobMonitorTargetKind
} from '@/helpers/scanjob.monitor.helpers.js'

describe('scanjob.monitor.helpers', () => {
  it('sorts check status projections by their visible title', () => {
    expect(compareScanjobCheckStatusProjection(
      { title: 'Проверено' },
      { title: 'Не проверено' }
    )).toBeGreaterThan(0)

    expect(compareScanjobCheckStatusProjection(
      { title: 'Запрет' },
      { title: 'Проверено' }
    )).toBeLessThan(0)
  })

  it('falls back to the rendered placeholder for missing projections', () => {
    expect(compareScanjobCheckStatusProjection(null, { title: 'Запрет' })).toBeLessThan(0)
    expect(compareScanjobCheckStatusProjection(null, null)).toBe(0)
  })

  it('exports scanjobMonitorTargetKind with expected numeric values', () => {
    expect(scanjobMonitorTargetKind.None).toBe(0)
    expect(scanjobMonitorTargetKind.Box).toBe(1)
    expect(scanjobMonitorTargetKind.Parcel).toBe(2)
  })
})
