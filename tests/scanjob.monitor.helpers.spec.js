// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks UI application

import { describe, expect, it } from 'vitest'
import {
  compareScanjobCheckStatusProjection,
  formatBoxDimensions,
  formatBoxWeight,
  isPhysicalMonitorBox,
  scanjobBoxHeaders
} from '@/helpers/scanjob.monitor.helpers.js'

describe('scanjob.monitor.helpers', () => {
  it('sorts check status projections by their visible title', () => {
    expect(
      compareScanjobCheckStatusProjection({ title: 'Проверено' }, { title: 'Не проверено' })
    ).toBeGreaterThan(0)

    expect(
      compareScanjobCheckStatusProjection({ title: 'Запрет' }, { title: 'Проверено' })
    ).toBeLessThan(0)
  })

  it('falls back to the rendered placeholder for missing projections', () => {
    expect(compareScanjobCheckStatusProjection(null, { title: 'Запрет' })).toBeLessThan(0)
    expect(compareScanjobCheckStatusProjection(null, null)).toBe(0)
  })

  it('formats complete box dimensions and treats incomplete dimensions as not set', () => {
    expect(formatBoxDimensions({ lengthCm: 10.5, widthCm: 20, heightCm: 30.25 }))
      .toBe('10,5 × 20 × 30,25 см')
    expect(formatBoxDimensions({ lengthCm: 10, widthCm: null, heightCm: 30 }))
      .toBe('не задано')
    expect(formatBoxDimensions({})).toBe('не задано')
  })

  it('formats box weight with three digits and a unit', () => {
    expect(formatBoxWeight(4.125)).toBe('4,125 кг')
    expect(formatBoxWeight(null)).toBe('не задано')
    expect(formatBoxWeight(undefined)).toBe('не задано')
  })

  it('includes dimensions and weight columns in the box list', () => {
    expect(scanjobBoxHeaders.map(({ key, title }) => ({ key, title }))).toEqual(
      expect.arrayContaining([
        { key: 'dimensions', title: 'Габариты' },
        { key: 'weightKg', title: 'Вес, кг' }
      ])
    )
  })

  it('adds metric cards only for physical boxes', () => {
    expect(isPhysicalMonitorBox({ area: 1, boxId: 7 })).toBe(true)
    expect(isPhysicalMonitorBox({ area: 2, boxId: null, bucketIndex: 0 })).toBe(false)
    expect(isPhysicalMonitorBox({ area: 3, boxId: null })).toBe(false)
  })
})
