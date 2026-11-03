// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises } from '@vue/test-utils'
import { useParcelsStore } from '@/stores/parcels.store.js'
import { useRegistersStore } from '@/stores/registers.store.js'
import { useBoxesStore } from '@/stores/boxes.store.js'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { createValidationState, pollValidation } from '@/helpers/register.actions.js'
afterEach(() => {
  vi.restoreAllMocks()
})

vi.mock('@/helpers/fetch.wrapper.js', () => ({ fetchWrapper: { get: vi.fn(), put: vi.fn(), post: vi.fn() } }))
vi.mock('@/helpers/config.js', () => ({ apiUrl: '/api' }))
vi.mock('@/stores/auth.store.js', () => ({ useAuthStore: () => ({ parcels_page: 1, parcels_per_page: 10, parcels_wh_page: 1, parcels_wh_per_page: 10 }) }))
const parcel = (extra = {}) => ({ id: 1, registerId: 12, weightKg: null, quantity: 1, adjustedWeightKg: .001, derivedTotalsPending: false, ...extra })
let register, row, box, fail
beforeEach(() => {
  setActivePinia(createPinia())
  vi.resetAllMocks()
  register = { id: 12, realWeightKg: 1, totalWeightKgToRelease: 3, derivedTotalsPending: false }
  row = parcel()
  box = { id: 5, registerId: 12, weightKg: 1, derivedTotalsPending: false }
  fail = null
  fetchWrapper.get.mockImplementation(async url => {
    if (fail) throw fail
    if (url.includes('/parcels/a/')) return { ...row }
    if (url.includes('/parcels?') || url.includes('/parcels/a?')) return { items: [{ ...row }], pagination: {} }
    if (url.includes('/boxes?')) return [{ ...box }]
    return { ...register }
  })
  fetchWrapper.put.mockResolvedValue(undefined)
  fetchWrapper.post.mockResolvedValue(undefined)
})

describe('server-owned derived weight projections', () => {
  it('cannot restore old register totals from a late list response', async () => {
    const registers = useRegistersStore()
    registers.items = [{ ...register }]
    registers.item = { ...register }
    fetchWrapper.get.mockResolvedValueOnce({ customsProcedures: [1], transportationTypes: [1], incoterms: [1] })
    await registers.getOps()
    let resolveList
    fetchWrapper.get.mockImplementationOnce(() => new Promise(resolve => { resolveList = resolve }))
    const loading = registers.getAll()
    await flushPromises()
    registers.invalidateDerived(12)
    register = { ...register, realWeightKg: 2 }
    await registers.refreshDerived(12)
    resolveList({ items: [{ id: 12, realWeightKg: 1, derivedTotalsPending: false }], pagination: {} })
    await loading
    expect(registers.items[0].realWeightKg).toBe(2)
    expect(registers.items[0].derivedTotalsPending).toBe(false)
  })

  it('recovers the current detail when its older read fails before the terminal reload finishes', async () => {
    const registers = useRegistersStore()
    fetchWrapper.get.mockResolvedValueOnce({ customsProcedures: [1], transportationTypes: [1], incoterms: [1] })
    await registers.getOps()
    let failDetail, finishRefresh
    fetchWrapper.get.mockReturnValueOnce(new Promise((resolve, reject) => { failDetail = reject }))
    const failure = new Error('Не удалось загрузить реестр 12')
    const oldDetail = expect(registers.getById(12)).rejects.toBe(failure)
    await flushPromises()
    fetchWrapper.get.mockReturnValueOnce(new Promise(resolve => { finishRefresh = resolve }))
    const refresh = registers.refreshDerived(12)
    await flushPromises()
    failDetail(failure)
    await oldDetail
    expect(registers.item.error).toBe(failure)
    finishRefresh({ ...register, realWeightKg: 2 })
    await refresh
    expect(registers.item).toMatchObject({ id: 12, realWeightKg: 2 })
    expect(registers.item.error).toBeUndefined()
  })

  it('leaves a newer list load in charge of its filters and pagination', async () => {
    const registers = useRegistersStore()
    registers.item = { ...register }
    registers.items = [{ ...register }]
    fetchWrapper.get.mockResolvedValueOnce({ customsProcedures: [1], transportationTypes: [1], incoterms: [1] })
    await registers.getOps()
    let finishRefresh, finishList
    fetchWrapper.get.mockReturnValueOnce(new Promise(resolve => { finishRefresh = resolve }))
    const refresh = registers.refreshDerived(12)
    await flushPromises()
    fetchWrapper.get.mockReturnValueOnce(new Promise(resolve => { finishList = resolve }))
    const newList = registers.getAll({ mode: 'modeWarehouse' })
    await flushPromises()
    finishRefresh({ ...register, realWeightKg: 2 })
    await refresh
    finishList({ items: [{ id: 99, realWeightKg: 3 }], pagination: { totalCount: 1, hasPreviousPage: true } })
    await newList
    expect(registers.items).toEqual([expect.objectContaining({ id: 99, realWeightKg: 3 })])
    expect(registers.hasPreviousPage).toBe(true)
  })

  it('keeps a delayed box detail unavailable after invalidation', async () => {
    const boxes = useBoxesStore()
    let resolve
    fetchWrapper.get.mockImplementationOnce(() => new Promise(done => { resolve = done }))
    const loading = boxes.getById(5)
    boxes.invalidateDerived(12)
    resolve({ ...box, weightKg: 999 })
    await loading
    expect(boxes.box).toMatchObject({ weightKg: null, derivedTotalsPending: true })
  })

  it('does not overwrite invalidation during a mutation detail refresh', async () => {
    const parcels = useParcelsStore()
    parcels.item = parcel()
    let resolve
    const get = fetchWrapper.get.getMockImplementation()
    fetchWrapper.get.mockImplementation(url => url === '/api/parcels/a/1'
      ? new Promise(done => { resolve = done }) : get(url))
    const saving = parcels.update(1, { quantity: 2 })
    await Promise.resolve()
    await Promise.resolve()
    await flushPromises()
    parcels.invalidateDerived(12)
    resolve(parcel({ quantity: 2, adjustedWeightKg: 999 }))
    await saving
    expect(parcels.item).toMatchObject({ quantity: 2, adjustedWeightKg: null, derivedTotalsPending: true })
  })
  it('refreshes current register and visible boxes at outer validation completion', async () => {
    const registers = useRegistersStore(), boxes = useBoxesStore()
    registers.item = { ...register, derivedTotalsPending: true }
    await boxes.getAll(12)
    registers.getValidationProgress = vi.fn().mockResolvedValue({ total: 2, processed: 2, finished: true })
    registers.getAll = vi.fn().mockResolvedValue(undefined)
    const state = { ...createValidationState(), registerId: 12, handleId: 'operation', show: true }
    const alerts = { error: vi.fn() }
    await pollValidation(state, registers, alerts, vi.fn())
    expect(registers.item.derivedTotalsPending).toBe(false)
    expect(boxes.boxes[0].derivedTotalsPending).toBe(false)
    expect(state.show).toBe(false)
    expect(alerts.error).not.toHaveBeenCalled()
  })

  it('retains the warehouse request context when its DTO omits registerId', async () => {
    const parcels = useParcelsStore(), registers = useRegistersStore()
    registers.item = { ...register }
    const { registerId: omitted, ...warehouseRow } = row
    expect(omitted).toBe(12)
    row = warehouseRow
    await parcels.getAll(12, { showMarkedByPartner: true })
    expect(parcels.items[0].registerId).toBe(12)
    fetchWrapper.get.mockClear()
    await parcels.setDefect(1)
    expect(fetchWrapper.get.mock.calls.some(([url]) => url === '/api/registers/12')).toBe(true)
  })

  it('does not mark another register pending when an earlier register is invalidated', async () => {
    const parcels = useParcelsStore(), registers = useRegistersStore()
    let resolveParcel, resolveRegister
    fetchWrapper.get.mockImplementationOnce(() => new Promise(resolve => { resolveParcel = resolve }))
    const loadingParcel = parcels.getById(2)
    parcels.invalidateDerived(12)
    resolveParcel(parcel({ id: 2, registerId: 99 }))
    await loadingParcel
    expect(parcels.item.derivedTotalsPending).toBe(false)
    registers.ensureOpsLoaded = vi.fn()
    registers.items = [{ id: 99 }]
    fetchWrapper.get.mockImplementationOnce(() => new Promise(resolve => { resolveRegister = resolve }))
    const loadingRegister = registers.refreshDerived(99)
    await Promise.resolve()
    registers.invalidateDerived(12)
    resolveRegister({ id: 99, derivedTotalsPending: false })
    await loadingRegister
    expect(registers.items[0].derivedTotalsPending).toBe(false)
  })
  it('refreshes register, visible page and boxes once after a target change', async () => {
    const parcels = useParcelsStore(), registers = useRegistersStore(), boxes = useBoxesStore()
    registers.item = { ...register }
    await parcels.getAll(12, { updateStore: false }).then(parcels.updateItems)
    await boxes.getAll(12)
    registers.items = [{ ...register }, { id: 99 }]
    register = { ...register, realWeightKg: 2 }
    row = parcel({ adjustedWeightKg: .002 })
    box = { ...box, weightKg: 2 }
    fetchWrapper.get.mockClear()
    await registers.update(12, { realWeightKg: 2, adjustedWeightKg: 8, reconciliationParcelId: 123, derivedTotalsPending: false })
    expect(fetchWrapper.put).toHaveBeenCalledWith('/api/registers/12', { realWeightKg: 2 })
    expect(fetchWrapper.get).toHaveBeenCalledTimes(3)
    expect(registers.item.derivedTotalsPending).toBe(false)
    expect(registers.items[0].realWeightKg).toBe(2)
    expect(registers.items[1]).toEqual({ id: 99 })
    expect(parcels.items[0].adjustedWeightKg).toBe(.002)
    expect(boxes.boxes[0].weightKg).toBe(2)
  })

  it('rejects a failed final detail request without overwriting the refreshed list', async () => {
    const parcels = useParcelsStore(), registers = useRegistersStore()
    parcels.item = parcel()
    registers.item = { ...register }
    await parcels.getAll(12)
    const failure = new Error('Не удалось обновить данные посылки после сохранения')
    fetchWrapper.get.mockImplementation(async url => {
      if (url.includes('/parcels?')) return { items: [parcel({ quantity: 2, adjustedWeightKg: .002 })], pagination: {} }
      if (url === '/api/parcels/a/1') throw failure
      return { ...register }
    })
    await expect(parcels.update(1, { quantity: 2 })).rejects.toBe(failure)
    expect(parcels.items[0]).toMatchObject({ quantity: 2, adjustedWeightKg: .002, derivedTotalsPending: false })
    expect(parcels.item).toMatchObject({ quantity: 1, adjustedWeightKg: null, derivedTotalsPending: true })
  })

  it('never restores an old allocation from delayed detail or staged page reads', async () => {
    const parcels = useParcelsStore()
    parcels.item = parcel()
    let resolveDetail, resolvePage
    fetchWrapper.get.mockImplementationOnce(() => new Promise(resolve => { resolveDetail = resolve }))
      .mockImplementationOnce(() => new Promise(resolve => { resolvePage = resolve }))
    const detail = parcels.getById(1)
    const page = parcels.getAll(12, { updateStore: false })
    parcels.invalidateDerived(12)
    resolveDetail(parcel({ adjustedWeightKg: 999 }))
    resolvePage({ items: [parcel({ adjustedWeightKg: 999 })], pagination: {} })
    await detail
    parcels.updateItems(await page)
    expect(parcels.item.adjustedWeightKg).toBeNull()
    expect(parcels.items[0]).toMatchObject({ adjustedWeightKg: null, derivedTotalsPending: true })
  })

  it('coalesces register refresh bursts and rejects failures while keeping projections unavailable', async () => {
    const registers = useRegistersStore(), parcels = useParcelsStore()
    registers.item = { ...register }
    parcels.item = parcel()
    await Promise.all([registers.refreshDerived(12), registers.refreshDerived(12)])
    expect(fetchWrapper.get).toHaveBeenCalledTimes(1)
    parcels.invalidateDerived(12)
    fail = new Error('Не удалось обновить итоги')
    await expect(registers.refreshDerived(12)).rejects.toBe(fail)
    expect(registers.item.derivedTotalsPending).toBe(true)
    expect(parcels.item.adjustedWeightKg).toBeNull()
  })

  it('keeps failed submissions unchanged and propagates an adjustment conflict', async () => {
    const parcels = useParcelsStore()
    parcels.item = parcel()
    const error = { status: 409, data: { msg: 'Сначала снимите корректировку веса', code: 'ParcelWeightAdjustmentActive', errors: {} } }
    fetchWrapper.put.mockRejectedValue(error)
    await expect(parcels.update(1, { weightKg: 3 })).rejects.toBe(error)
    expect(parcels.item).toEqual(parcel())
  })

})
