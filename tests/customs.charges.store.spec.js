/* @vitest-environment jsdom */
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount, flushPromises } from '@vue/test-utils'
import { useParcelsStore } from '@/stores/parcels.store.js'
import { useRegistersStore } from '@/stores/registers.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import CorrectedWeightDisplay from '@/components/CorrectedWeightDisplay.vue'

vi.mock('@/helpers/config.js', () => ({ apiUrl: 'http://localhost/api' }))
vi.mock('@/helpers/fetch.wrapper.js', () => ({ fetchWrapper: {
  get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn()
} }))
vi.mock('@/stores/boxes.store.js', () => ({ useBoxesStore: () => ({
  invalidateDerived: vi.fn(), refreshDerived: vi.fn().mockResolvedValue()
}) }))
vi.mock('@/stores/auth.store.js', () => ({ useAuthStore: () => ({
  parcels_page: 1, parcels_per_page: 25, parcels_sort_by: [{ key: 'id', order: 'asc' }]
}) }))

const group = { customsFee: 1231, customsDuty: 0 }
const row = () => ({
  id: 2, registerId: 1, customsFee: 0, customsDuty: 0, customsChargeGroup: group,
  weightKg: 1, adjustedWeightKg: 1.25, derivedTotalsPending: false
})
const deferred = () => {
  let resolve
  const promise = new Promise(done => { resolve = done })
  return { promise, resolve }
}

describe('customs charge cache consistency', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    const parcels = useParcelsStore()
    const registers = useRegistersStore()
    parcels.items = [row(), { ...row(), id: 3, registerId: 2 }]
    parcels.item = row()
    registers.item = { id: 1, customsFee: 1231, customsDuty: 0 }
    registers.items = [{ ...registers.item }]
    fetchWrapper.get.mockImplementation(async url => {
      if (url.endsWith('/registers/ops')) return {
        customsProcedures: [], transportationTypes: [], incoterms: [{ value: 2 }]
      }
      if (url.endsWith('/registers/1')) return { id: 1, customsFee: null, customsDuty: null }
      if (url.endsWith('/parcels/a/2')) return row()
      return { items: [row()], pagination: { totalCount: 1 } }
    })
  })

  it('invalidates the complete cached group and register totals, leaving other registers intact', () => {
    const parcels = useParcelsStore()
    parcels.invalidateCustomsCharges(0)
    parcels.invalidateCustomsCharges(1)
    expect(parcels.items[0].customsChargeGroup).toBeNull()
    expect(parcels.items[0].customsFee).toBeNull()
    expect(parcels.item.customsDuty).toBeNull()
    expect(parcels.items[1].customsChargeGroup).toEqual(group)
    expect(useRegistersStore().item.customsFee).toBeNull()
    expect(useRegistersStore().items[0].customsDuty).toBeNull()
  })

  it.each(['list', 'detail', 'detachedList'])('rejects stale %s charge fields after invalidation', async kind => {
    const parcels = useParcelsStore()
    const delayed = deferred()
    fetchWrapper.get.mockReturnValueOnce(delayed.promise)
    const pending = kind === 'detail' ? parcels.getById(2) : parcels.getAll(1, { updateStore: kind !== 'detachedList' })
    parcels.invalidateCustomsCharges(1)
    delayed.resolve(kind === 'detail' ? row() : { items: [row()], pagination: { totalCount: 1 } })
    const result = await pending
    if (kind === 'detachedList') parcels.updateItems(result)
    const displayed = kind === 'detail' ? parcels.item : parcels.items[0]
    expect(displayed.customsChargeGroup).toBeNull()
    expect(displayed.customsFee).toBeNull()
    expect(displayed.customsDuty).toBeNull()
    expect(displayed).toMatchObject({ adjustedWeightKg: 1.25, derivedTotalsPending: false })
    const wrapper = mount(CorrectedWeightDisplay, {
      props: { weight: displayed.weightKg, adjustedWeight: displayed.adjustedWeightKg, derivedTotalsPending: displayed.derivedTotalsPending },
      global: { stubs: { 'font-awesome-icon': true } }
    })
    expect(wrapper.text()).toContain('1.250')
    expect(wrapper.text()).not.toContain('пересчёт')
    wrapper.unmount()
  })

  it('rechecks a detached response when it is applied after invalidation', async () => {
    const parcels = useParcelsStore()
    const result = await parcels.getAll(1, { updateStore: false })
    parcels.invalidateCustomsCharges(1)
    parcels.updateItems(result)
    expect(parcels.items[0].customsChargeGroup).toBeNull()
    expect(parcels.items[0]).toMatchObject({ adjustedWeightKg: 1.25, derivedTotalsPending: false })
  })

  it('keeps old register detail responses from restoring charges', async () => {
    const registers = useRegistersStore()
    await registers.ensureOpsLoaded()
    const delayed = deferred()
    fetchWrapper.get.mockReturnValueOnce(delayed.promise)
    const pending = registers.getById(1)
    await flushPromises()
    useParcelsStore().invalidateCustomsCharges(1)
    delayed.resolve({ id: 1, customsFee: 1231, customsDuty: 0, totalWeightKgToRelease: 1.25, derivedTotalsPending: false })
    await pending
    expect(registers.item.customsFee).toBeNull()
    expect(registers.item.customsDuty).toBeNull()
    expect(registers.item).toMatchObject({ totalWeightKgToRelease: 1.25, derivedTotalsPending: false })
  })

  it('refreshes cached detail after calculation and reloads the group on the visible page', async () => {
    const parcels = useParcelsStore()
    const registers = useRegistersStore()
    const newGroup = { customsFee: 689, customsDuty: 1500 }
    const updated = { ...row(), customsChargeGroup: newGroup }
    fetchWrapper.get.mockImplementation(async url => url.endsWith('/parcels/a/2')
      ? updated : { items: [updated], pagination: { totalCount: 1 } })
    fetchWrapper.post.mockResolvedValueOnce({ registerId: 1, ...newGroup })
    await registers.calculateCustomsCharges(1)
    expect(registers.item.customsFee).toBe(689)
    expect(parcels.items[0].customsChargeGroup).toBeNull()
    expect(parcels.item.customsChargeGroup).toEqual(newGroup)
    await parcels.getAll(1)
    expect(parcels.items[0].customsChargeGroup).toEqual(newGroup)
  })

  it('propagates a failed detail refresh after calculation without restoring stale money', async () => {
    const parcels = useParcelsStore()
    fetchWrapper.post.mockResolvedValueOnce({ registerId: 1, customsFee: 689, customsDuty: 1500 })
    fetchWrapper.get.mockRejectedValueOnce(new Error('Не удалось обновить платежи посылки'))
    await expect(useRegistersStore().calculateCustomsCharges(1)).rejects.toThrow('Не удалось обновить платежи посылки')
    expect(parcels.item.customsFee).toBeNull()
    expect(parcels.item.customsChargeGroup).toBeNull()
  })

  it('does not apply a calculation response superseded by a source mutation', async () => {
    const registers = useRegistersStore()
    const delayed = deferred()
    fetchWrapper.post.mockReturnValueOnce(delayed.promise)
    const pending = registers.calculateCustomsCharges(1)
    useParcelsStore().invalidateCustomsCharges(1)
    delayed.resolve({ registerId: 1, customsFee: 1231, customsDuty: 0 })
    await pending
    expect(registers.item.customsFee).toBeNull()
  })

  it('rejects a failed price-edit refresh without restoring stale charges or presenting an alert', async () => {
    const parcels = useParcelsStore()
    const alerts = useAlertStore()
    const error = new Error('Не удалось обновить таможенные платежи')
    fetchWrapper.put.mockResolvedValueOnce()
    fetchWrapper.get.mockRejectedValueOnce(error)
    await expect(parcels.update(2, { id: 2, registerId: 1, unitPrice: 1, currency: 'RUB' })).rejects.toBe(error)
    expect(fetchWrapper.put).toHaveBeenCalledWith('http://localhost/api/parcels/2', {
      id: 2, registerId: 1, unitPrice: 1, currency: 'RUB'
    })
    expect(parcels.item.customsChargeGroup).toBeNull()
    expect(parcels.item.customsFee).toBeNull()
    expect(parcels.items[0].customsChargeGroup).toBeNull()
    expect(useRegistersStore().item.customsFee).toBeNull()
    expect(alerts.alert).toBeNull()
  })
})
