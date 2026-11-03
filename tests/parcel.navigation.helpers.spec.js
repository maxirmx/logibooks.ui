// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks UI application

import { describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { OP_MODE_WAREHOUSE } from '@/helpers/op.mode.js'
import { navigateParcel, buildParcelListLocation, normalizeParcelBoxCode, normalizeParcelBoxId, resolveParcelReturnLocation } from '@/helpers/parcel.navigation.helpers.js'

describe('parcel navigation helpers', () => {
  it('rejects a resolved navigation failure returned by a real router guard', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', component: {} }, { path: '/parcels', component: {} }]
    })
    await router.push('/')
    router.beforeEach(() => false)
    await expect(navigateParcel(router, '/parcels')).rejects.toThrow('Не удалось перейти со страницы посылки')
    expect(router.currentRoute.value.path).toBe('/')
  })
  it('normalizes positive box ids and display codes', () => {
    expect(normalizeParcelBoxId('17')).toBe(17)
    expect(normalizeParcelBoxId(['18', '19'])).toBe(18)
    expect(normalizeParcelBoxId(0)).toBeNull()
    expect(normalizeParcelBoxId('-1')).toBeNull()
    expect(normalizeParcelBoxId('1.5')).toBeNull()
    expect(normalizeParcelBoxId('box')).toBeNull()
    expect(normalizeParcelBoxCode(' BOX-17 ')).toBe('BOX-17')
    expect(normalizeParcelBoxCode(['BOX-18'])).toBe('BOX-18')
    expect(normalizeParcelBoxCode('   ')).toBeNull()
  })

  it('returns to a safe source before using the mode-correct parcel-list fallback', () => {
    expect(
      resolveParcelReturnLocation({
        returnUrl: '/customs-reports/5/rows',
        registerId: 12,
        parcelId: 4,
        mode: OP_MODE_WAREHOUSE,
        boxId: 17
      })
    ).toBe('/customs-reports/5/rows')

    expect(
      resolveParcelReturnLocation({
        returnUrl: '//example.com/phishing',
        registerId: 12,
        parcelId: 4,
        mode: OP_MODE_WAREHOUSE,
        boxId: 17
      })
    ).toEqual(
      buildParcelListLocation({
        registerId: 12,
        parcelId: 4,
        mode: OP_MODE_WAREHOUSE,
        boxId: 17
      })
    )
  })
})
