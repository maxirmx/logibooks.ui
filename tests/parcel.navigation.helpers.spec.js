// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks UI application

import { describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { OP_MODE_PAPERWORK, OP_MODE_WAREHOUSE } from '@/helpers/op.mode.js'
import { navigateParcel, buildParcelEditLocation, buildParcelListLocation, buildParcelNavigationQuery, getCurrentInternalRoute, normalizeParcelBoxCode, normalizeParcelBoxId, resolveParcelReturnLocation } from '@/helpers/parcel.navigation.helpers.js'

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

  it('reads the current full route only when it is safe', () => {
    expect(
      getCurrentInternalRoute({ currentRoute: { value: { fullPath: '/parcels/by-number' } } })
    ).toBe('/parcels/by-number')
    expect(
      getCurrentInternalRoute({ currentRoute: { value: { fullPath: '//example.com' } } })
    ).toBeNull()
    expect(getCurrentInternalRoute({})).toBeNull()
  })

  it('builds edit and adjacent-parcel locations with normalized context', () => {
    expect(
      buildParcelEditLocation({
        registerId: 12,
        parcelId: 4,
        mode: OP_MODE_WAREHOUSE,
        returnUrl: '/scanjobs/42/monitor/boxes/7',
        boxId: 17,
        query: { tab: 'details' }
      })
    ).toEqual({
      name: 'Редактирование посылки',
      params: { id: 4, registerId: 12 },
      query: {
        tab: 'details',
        mode: OP_MODE_WAREHOUSE,
        returnUrl: '/scanjobs/42/monitor/boxes/7',
        boxId: '17'
      }
    })

    expect(buildParcelNavigationQuery({ mode: 'invalid', returnUrl: '//example.com' })).toEqual({
      mode: OP_MODE_PAPERWORK
    })
  })

  it('builds an exact box list location only for a valid box id', () => {
    expect(
      buildParcelListLocation({
        registerId: 12,
        mode: OP_MODE_WAREHOUSE,
        boxId: 17,
        boxCode: ' BOX-17 ',
        returnUrl: '/registers/12/boxes'
      })
    ).toEqual({
      path: '/registers/12/parcels',
      query: {
        mode: OP_MODE_WAREHOUSE,
        returnUrl: '/registers/12/boxes',
        boxId: '17',
        boxCode: 'BOX-17'
      }
    })

    expect(
      buildParcelListLocation({ registerId: 12, boxId: 0, boxCode: 'IGNORED' }).query
    ).toEqual({ mode: OP_MODE_PAPERWORK })
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
