// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks UI application

import { describe, expect, it } from 'vitest'
import { OP_MODE_PAPERWORK, OP_MODE_WAREHOUSE } from '@/helpers/op.mode.js'
import {
  buildParcelEditLocation,
  buildParcelListLocation,
  buildParcelNavigationQuery,
  getCurrentInternalRoute,
  normalizeInternalReturnUrl,
  normalizeParcelBoxCode,
  normalizeParcelBoxId,
  normalizeParcelNavigationMode,
  resolveParcelReturnLocation
} from '@/helpers/parcel.navigation.helpers.js'

describe('parcel navigation helpers', () => {
  it('accepts known modes and defaults invalid values to paperwork', () => {
    expect(normalizeParcelNavigationMode(OP_MODE_WAREHOUSE)).toBe(OP_MODE_WAREHOUSE)
    expect(normalizeParcelNavigationMode(OP_MODE_PAPERWORK)).toBe(OP_MODE_PAPERWORK)
    expect(normalizeParcelNavigationMode('warehouse')).toBe(OP_MODE_PAPERWORK)
    expect(normalizeParcelNavigationMode(undefined)).toBe(OP_MODE_PAPERWORK)
  })

  it('accepts only safe internal return URLs', () => {
    expect(normalizeInternalReturnUrl('/scanjobs/42/monitor/boxes/7?follow=17')).toBe(
      '/scanjobs/42/monitor/boxes/7?follow=17'
    )
    expect(normalizeInternalReturnUrl('//example.com/phishing')).toBeNull()
    expect(normalizeInternalReturnUrl('/\\example.com/phishing')).toBeNull()
    expect(normalizeInternalReturnUrl('https://example.com/phishing')).toBeNull()
    expect(normalizeInternalReturnUrl(['/registers'])).toBeNull()
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
