// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises } from '@vue/test-utils'
import { useRegistersStore } from '@/stores/registers.store.js'
import { useParcelsStore } from '@/stores/parcels.store.js'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'

vi.mock('@/helpers/config.js', () => ({ apiUrl: '/api' }))
vi.mock('@/helpers/fetch.wrapper.js', () => ({ fetchWrapper: { get: vi.fn(), put: vi.fn() } }))
vi.mock('@/stores/auth.store.js', () => ({ useAuthStore: () => ({ parcels_page: 1, parcels_per_page: 10 }) }))

const register = extra => ({ id: 12, derivedTotalsPending: false, hasPendingPassportChecks: false, ...extra })
const parcel = extra => ({ id: 1, registerId: 12, quantity: 1, adjustedWeightKg: 1, passportCheckStatus: 10, ...extra })
function deferred() {
  let resolve, reject
  const promise = new Promise((done, fail) => { resolve = done; reject = fail })
  return { promise, resolve, reject }
}
beforeEach(() => {
  setActivePinia(createPinia())
  vi.resetAllMocks()
  fetchWrapper.put.mockResolvedValue(undefined)
  fetchWrapper.get.mockImplementation(async url => url.includes('/parcels/a/') ? parcel({ quantity: 2 }) : register())
})

describe('passport state during derived refreshes', () => {
  it.each([false, true])('retains newer register state in item and list (initial %s)', async initial => {
    const registers = useRegistersStore()
    registers.item = register({ hasPendingPassportChecks: initial })
    registers.items = [register({ hasPendingPassportChecks: initial }), { id: 99 }]
    const pending = deferred()
    fetchWrapper.get.mockReturnValueOnce(pending.promise)
    const refresh = registers.refreshDerived(12)
    await flushPromises()
    registers.applyPassportCheckState(12, { hasPendingPassportChecks: !initial, revision: 8 })
    pending.resolve(register({ hasPendingPassportChecks: initial }))
    await refresh
    expect(registers.item.hasPendingPassportChecks).toBe(!initial)
    expect(registers.items[0].hasPendingPassportChecks).toBe(!initial)
    expect(registers.items[1]).toEqual({ id: 99 })
    expect(registers.applyPassportCheckState(12, { hasPendingPassportChecks: !initial, revision: 8 })).toBe(false)
  })

  it('uses a new watermark for every coalesced follow-up request', async () => {
    const registers = useRegistersStore()
    registers.item = register()
    registers.items = [register()]
    const first = deferred(), second = deferred()
    fetchWrapper.get.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const refresh = registers.refreshDerived(12)
    await flushPromises()
    registers.applyPassportCheckState(12, { hasPendingPassportChecks: true, revision: 1 })
    registers.invalidateDerived(12)
    const repeated = registers.refreshDerived(12)
    first.resolve(register())
    await flushPromises()
    registers.applyPassportCheckState(12, { hasPendingPassportChecks: false, revision: 2 })
    second.resolve(register({ hasPendingPassportChecks: true }))
    await Promise.all([refresh, repeated])
    expect(registers.item.hasPendingPassportChecks).toBe(false)
    expect(registers.items[0].hasPendingPassportChecks).toBe(false)
  })

  it.each(['detail', 'derived'])('retains parcel status received during the %s request', async phase => {
    const parcels = useParcelsStore(), registers = useRegistersStore()
    parcels.item = parcel()
    parcels.items = [parcel(), { id: 99, registerId: 99 }]
    registers.item = register()
    const detail = deferred(), totals = deferred()
    fetchWrapper.get.mockImplementation(url => {
      if (url === '/api/parcels/a/1') return detail.promise
      if (url === '/api/registers/12') return totals.promise
      throw new Error('Unexpected request: ' + url)
    })
    const saving = parcels.update(1, { quantity: 2 })
    await flushPromises()
    if (phase === 'derived') {
      parcels.applyParcelCheckStatusChanges({ registerId: 12, updates: [{ parcelId: 1, checkCode: 'passport', status: 30, revision: 3 }] })
    }
    totals.resolve(register())
    await flushPromises()
    if (phase === 'detail') {
      parcels.applyParcelCheckStatusChanges({ registerId: 12, updates: [{ parcelId: 1, checkCode: 'passport', status: 30, revision: 3 }] })
    }
    detail.resolve(parcel({ quantity: 2, passportCheckStatus: 10 }))
    await saving
    expect(parcels.item).toMatchObject({ quantity: 2, passportCheckStatus: 30 })
    expect(parcels.items[0]).toMatchObject({ quantity: 2, passportCheckStatus: 30 })
    expect(parcels.items[1]).toEqual({ id: 99, registerId: 99 })
    expect(parcels.applyParcelCheckStatusChanges({ registerId: 12, updates: [{ parcelId: 1, checkCode: 'passport', status: 30, revision: 3 }] })).toEqual([])
  })

  it('preserves live status when detail is unavailable and rejects refresh failures', async () => {
    const parcels = useParcelsStore(), registers = useRegistersStore()
    parcels.item = parcel()
    parcels.items = [parcel()]
    registers.item = register()
    const detail = deferred()
    fetchWrapper.get.mockImplementation(async url => url === '/api/parcels/a/1' ? detail.promise : register())
    const saving = parcels.update(1, { quantity: 2, passportCheckStatus: 10 })
    await flushPromises()
    parcels.applyParcelCheckStatusChanges({ registerId: 12, updates: [{ parcelId: 1, checkCode: 'passport', status: 30, revision: 1 }] })
    detail.resolve(null)
    await saving
    expect(parcels.item).toMatchObject({ passportCheckStatus: 30, derivedTotalsPending: true })
    const error = new Error('Не удалось обновить посылку')
    fetchWrapper.get.mockRejectedValueOnce(error)
    await expect(parcels.update(1, { quantity: 3 })).rejects.toBe(error)
    expect(parcels.item.passportCheckStatus).toBe(30)
  })
})
