/* @vitest-environment jsdom */

import { describe, it, expect, vi } from 'vitest'
import {
  chooseOutputWeightCorrection,
  confirmOutputWeightCorrection,
  getCorrectedWeight,
  WEIGHT_CORRECTION_CHOICE
} from '@/helpers/weight.correction.helpers.js'

describe('weight correction helpers', () => {
  it('calculates corrected parcel weight only when register correction is possible', () => {
    expect(getCorrectedWeight(2.4, { realWeightKg: 5, totalWeightKgToRelease: 10 })).toBe(1.2)
    expect(getCorrectedWeight(2.4, { realWeightKg: null, totalWeightKgToRelease: 10 })).toBeNull()
    expect(getCorrectedWeight(2.4, { realWeightKg: 0, totalWeightKgToRelease: 10 })).toBeNull()
    expect(getCorrectedWeight(2.4, { realWeightKg: -1, totalWeightKgToRelease: 10 })).toBeNull()
    expect(getCorrectedWeight(2.4, { realWeightKg: 5, totalWeightKgToRelease: 0 })).toBeNull()
    expect(getCorrectedWeight(null, { realWeightKg: 5, totalWeightKgToRelease: 10 })).toBeNull()
  })

  it('opens shared confirm dialog with standard confirmation color', async () => {
    const confirm = vi.fn().mockResolvedValue(false)

    const choice = await chooseOutputWeightCorrection(confirm, {
      realWeightKg: 5,
      totalWeightKgToRelease: 10
    })

    expect(choice).toBe(WEIGHT_CORRECTION_CHOICE.Skip)
    expect(confirm).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Подтверждение',
      confirmationText: 'Да',
      cancellationText: 'Нет',
      dialogProps: {
        width: '30%',
        minWidth: '250px'
      },
      confirmationButtonProps: {
        color: 'orange-darken-3'
      },
      content: 'Применить поправочный коэффициент 0,500 для веса посылок?'
    }))
  })

  it('returns true when shared correction confirm is accepted', async () => {
    const confirm = vi.fn().mockResolvedValue(true)

    await expect(confirmOutputWeightCorrection(confirm, {
      realWeightKg: 5,
      totalWeightKgToRelease: 10
    })).resolves.toBe(true)
  })
})
