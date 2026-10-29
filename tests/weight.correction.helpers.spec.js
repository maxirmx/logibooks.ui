// Copyright (C) 2026 Maxim [maxirmx] Samsonov (http://www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

/* @vitest-environment jsdom */

import { describe, it, expect, vi } from 'vitest'
import { confirmOutputWeightCorrection, getWeightCorrection, canChangeParcelWeights } from '@/helpers/weight.correction.helpers.js'

describe('weight correction helpers', () => {
  it('allows parcel weight changes only when no manual final register weight is set', () => {
    expect(canChangeParcelWeights({ realWeightKg: 5 })).toBe(false)
    expect(canChangeParcelWeights({ realWeightKg: ' 5,25 ' })).toBe(false)
    expect(canChangeParcelWeights({ realWeightKg: null })).toBe(true)
    expect(canChangeParcelWeights({ realWeightKg: 0 })).toBe(true)
    expect(canChangeParcelWeights({ realWeightKg: -1 })).toBe(true)
  })

  it('does not offer corrected exports while derived totals are pending', () => {
    const register = { realWeightKg: 5, totalWeightKgToRelease: 10, derivedTotalsPending: true }
    expect(getWeightCorrection(register).canCorrect).toBe(false)
    expect(canChangeParcelWeights(register)).toBe(false)
  })

  it('returns true when shared correction confirm is accepted', async () => {
    const confirm = vi.fn().mockResolvedValue(true)

    await expect(
      confirmOutputWeightCorrection(confirm, {
        realWeightKg: 5,
        totalWeightKgToRelease: 10
      })
    ).resolves.toBe(true)
  })
})
