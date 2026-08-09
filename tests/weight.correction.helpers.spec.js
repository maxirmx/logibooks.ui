/* @vitest-environment jsdom */

import { describe, it, expect, vi } from 'vitest'
import {
  chooseOutputWeightCorrection,
  confirmOutputWeightCorrection,
  getCorrectedWeight,
  canChangeParcelWeights,
  WEIGHT_CORRECTION_CHOICE
} from '@/helpers/weight.correction.helpers.js'

describe('weight correction helpers', () => {
  it('allows parcel weight changes only when no manual final register weight is set', () => {
    expect(canChangeParcelWeights({ realWeightKg: 5 })).toBe(false)
    expect(canChangeParcelWeights({ realWeightKg: ' 5,25 ' })).toBe(false)
    expect(canChangeParcelWeights({ realWeightKg: null })).toBe(true)
    expect(canChangeParcelWeights({ realWeightKg: 0 })).toBe(true)
    expect(canChangeParcelWeights({ realWeightKg: -1 })).toBe(true)
  })

  it('calculates corrected parcel weight only when register correction is possible', () => {
    expect(getCorrectedWeight(2.4, { realWeightKg: 5, totalWeightKgToRelease: 10 })).toBe(1.2)
    expect(getCorrectedWeight(2.4, { realWeightKg: null, totalWeightKgToRelease: 10 })).toBeNull()
    expect(getCorrectedWeight(2.4, { realWeightKg: 0, totalWeightKgToRelease: 10 })).toBeNull()
    expect(getCorrectedWeight(2.4, { realWeightKg: -1, totalWeightKgToRelease: 10 })).toBeNull()
    expect(getCorrectedWeight(2.4, { realWeightKg: 5, totalWeightKgToRelease: 0 })).toBeNull()
    expect(getCorrectedWeight(null, { realWeightKg: 5, totalWeightKgToRelease: 10 })).toBeNull()
  })

  it('opens the supplied confirmation dialog with the weight correction message', async () => {
    const confirm = vi.fn().mockResolvedValue(false)

    const choice = await chooseOutputWeightCorrection(confirm, {
      realWeightKg: 5,
      totalWeightKgToRelease: 10
    })

    expect(choice).toBe(WEIGHT_CORRECTION_CHOICE.Skip)
    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Подтверждение',
        confirmationText: 'Да',
        cancellationText: 'Нет',
        content: 'Применить поправочный коэффициент 0,500 для веса посылок?'
      })
    )
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
