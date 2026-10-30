// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount, flushPromises } from '@vue/test-utils'
import { useParcelsStore } from '@/stores/parcels.store.js'
import { useRegistersStore } from '@/stores/registers.store.js'
import { useBoxesStore } from '@/stores/boxes.store.js'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { rawWeightPayload } from '@/helpers/derived.weights.helpers.js'
import { createValidationState, pollValidation, createRegisterActionHandlers } from '@/helpers/register.actions.js'
import CorrectedWeightDisplay from '@/components/CorrectedWeightDisplay.vue'

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
  it('does not infer allocation readiness or refetch on passport-only notifications', async () => {
    const parcels = useParcelsStore(), registers = useRegistersStore()
    parcels.item = parcel()
    registers.item = { ...register }
    parcels.applyParcelCheckStatusChanges({ registerId: 12, updates: [{ parcelId: 1, checkCode: 'passport', status: 4, revision: 1 }] })
    await flushPromises()
    expect(parcels.item).toMatchObject({ adjustedWeightKg: .001, derivedTotalsPending: false, passportCheckStatus: 4 })
    expect(registers.item.derivedTotalsPending).toBe(false)
    expect(fetchWrapper.get).not.toHaveBeenCalled()
  })
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

  it('refreshes FEACN completion and presents a refresh failure once', async () => {
    const registers = useRegistersStore()
    registers.item = { ...register, derivedTotalsPending: true }
    registers.lookupFeacnCodes = vi.fn().mockResolvedValue({ id: 'operation' })
    registers.getLookupFeacnCodesProgress = vi.fn().mockResolvedValue({ total: 1, processed: 1, finished: true })
    registers.getAll = vi.fn().mockResolvedValue(undefined)
    const alerts = { error: vi.fn() }
    const handlers = createRegisterActionHandlers(registers, alerts)
    await handlers.lookupFeacnCodes(registers.item)
    expect(registers.item.derivedTotalsPending).toBe(false)
    fail = new Error('Не удалось обновить итоги')
    await handlers.lookupFeacnCodes(registers.item)
    handlers.stopPolling()
    expect(alerts.error).toHaveBeenCalledTimes(1)
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
  it('strips read-only fields and keeps raw weight, quantity and Ozon metadata', () => {
    expect(rawWeightPayload({ weightKg: null, quantity: 3, shipmentWeightKg: 8, adjustedWeightKg: .333, reconciliationParcelId: 1, derivedTotalsPending: true, weightCorrectionEligible: true }))
      .toEqual({ weightKg: null, quantity: 3, shipmentWeightKg: 8 })
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

  it('uses final detail values after quantity edits, including adjusted zero', async () => {
    const parcels = useParcelsStore()
    parcels.item = parcel({ weightKg: 1, adjustedWeightKg: 4 })
    parcels.items = [parcels.item, { id: 9, registerId: 99 }]
    row = parcel({ weightKg: 1, quantity: 2, adjustedWeightKg: 0 })
    await parcels.update(1, { weightKg: 1, quantity: 2, adjustedWeightKg: 55 })
    expect(fetchWrapper.put).toHaveBeenCalledWith('/api/parcels/1', { weightKg: 1, quantity: 2 })
    expect(parcels.item).toMatchObject({ quantity: 2, adjustedWeightKg: 0, derivedTotalsPending: false })
    expect(parcels.items[1]).toEqual({ id: 9, registerId: 99 })
  })

  it.each([
    [false, 0], [false, .002], [true, 0], [true, .002]
  ])('keeps the ready projection when recalculation finishes during save (warehouse %s, weight %s)', async (warehouse, adjustedWeightKg) => {
    const parcels = useParcelsStore(), registers = useRegistersStore()
    parcels.item = parcel({ productName: 'Полное описание посылки' })
    registers.item = { ...register }
    await parcels.getAll(12, { showMarkedByPartner: warehouse })
    const wrapper = mount({
      components: { CorrectedWeightDisplay },
      setup: () => ({ parcels }),
      template: `<div>
        <CorrectedWeightDisplay :weight="parcels.item.weightKg" :adjusted-weight="parcels.item.adjustedWeightKg" :derived-totals-pending="parcels.item.derivedTotalsPending" />
        <CorrectedWeightDisplay :weight="parcels.items[0].weightKg" :adjusted-weight="parcels.items[0].adjustedWeightKg" :derived-totals-pending="parcels.items[0].derivedTotalsPending" />
      </div>`
    }, { global: { stubs: { 'font-awesome-icon': true } } })
    let recalculated = false
    fetchWrapper.get.mockImplementation(async url => {
      if (url.includes('/parcels?') || url.includes('/parcels/a?')) {
        recalculated = true
        return { items: [parcel({ quantity: 2, adjustedWeightKg })], pagination: {} }
      }
      if (url === '/api/parcels/a/1') return parcel({
        quantity: 2, productName: 'Полное описание посылки',
        adjustedWeightKg: recalculated ? adjustedWeightKg : null,
        derivedTotalsPending: !recalculated
      })
      return { ...register }
    })
    await parcels.update(1, { quantity: 2 })
    await flushPromises()
    expect(parcels.item).toMatchObject({ quantity: 2, adjustedWeightKg, derivedTotalsPending: false, productName: 'Полное описание посылки' })
    expect(parcels.items[0]).toMatchObject({ quantity: 2, adjustedWeightKg, derivedTotalsPending: false })
    for (const display of wrapper.findAll('.corrected-weight-display')) {
      expect(display.text()).toContain(adjustedWeightKg.toFixed(3))
      expect(display.text()).not.toContain('пересчёт')
    }
    expect(fetchWrapper.get.mock.calls.filter(([url]) => url === '/api/parcels/a/1')).toHaveLength(1)
    wrapper.unmount()
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

  it('coalesces register refreshes through the visible parcel page', async () => {
    const registers = useRegistersStore(), parcels = useParcelsStore()
    registers.item = { ...register }
    await parcels.getAll(12)
    row = parcel({ adjustedWeightKg: .002 })
    fetchWrapper.get.mockClear()
    await Promise.all([registers.refreshDerived(12), registers.refreshDerived(12)])
    expect(fetchWrapper.get).toHaveBeenCalledTimes(2)
    expect(parcels.items[0].adjustedWeightKg).toBe(.002)
  })

  it('refreshes the parcel page without a cached register and propagates a failed reload', async () => {
    const registers = useRegistersStore(), parcels = useParcelsStore()
    await parcels.getAll(12)
    row = parcel({ adjustedWeightKg: .002 })
    fetchWrapper.get.mockClear()
    await parcels.refreshDerived(12)
    expect(fetchWrapper.get).toHaveBeenCalledTimes(1)
    expect(fetchWrapper.get.mock.calls[0][0]).toContain('/api/parcels?')
    expect(parcels.items[0].adjustedWeightKg).toBe(.002)
    parcels.invalidateDerived(12)
    fail = new Error('Не удалось обновить список посылок')
    await expect(registers.refreshDerived(12)).rejects.toBe(fail)
    expect(registers.isRefreshingDerived(12)).toBe(false)
    expect(parcels.items[0].derivedTotalsPending).toBe(true)
  })

  it('does not reload a parcel page belonging to another register', async () => {
    const registers = useRegistersStore(), parcels = useParcelsStore()
    registers.item = { ...register }
    row = parcel({ id: 9, registerId: 99 })
    await parcels.getAll(99)
    fetchWrapper.get.mockClear()
    await registers.refreshDerived(12)
    expect(fetchWrapper.get).toHaveBeenCalledExactlyOnceWith('/api/registers/12')
    expect(parcels.items[0]).toMatchObject({ id: 9, registerId: 99 })
  })

  it('repeats a coalesced parcel-only refresh after a new invalidation', async () => {
    const registers = useRegistersStore(), parcels = useParcelsStore()
    await parcels.getAll(12)
    let finish
    fetchWrapper.get.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    const refreshing = registers.refreshDerived(12)
    await flushPromises()
    parcels.invalidateDerived(12)
    row = parcel({ adjustedWeightKg: .002 })
    const repeated = registers.refreshDerived(12)
    finish({ items: [parcel({ adjustedWeightKg: .001 })], pagination: {} })
    await Promise.all([refreshing, repeated])
    expect(parcels.items[0]).toMatchObject({ adjustedWeightKg: .002, derivedTotalsPending: false })
    expect(registers.isRefreshingDerived(12)).toBe(false)
  })

  it('keeps failed submissions unchanged and propagates an adjustment conflict', async () => {
    const parcels = useParcelsStore()
    parcels.item = parcel()
    const error = { status: 409, data: { msg: 'Сначала снимите корректировку веса', code: 'ParcelWeightAdjustmentActive', errors: {} } }
    fetchWrapper.put.mockRejectedValue(error)
    await expect(parcels.update(1, { weightKg: 3 })).rejects.toBe(error)
    expect(parcels.item).toEqual(parcel())
  })

  it('renders server authority, null raw and pending-to-ready transitions visibly', async () => {
    const wrapper = mount(CorrectedWeightDisplay, { props: { weight: null, adjustedWeight: .001 }, global: { stubs: { 'font-awesome-icon': true } } })
    expect(wrapper.text()).toContain('0.001')
    await wrapper.setProps({ derivedTotalsPending: true })
    expect(wrapper.text()).toContain('пересчёт')
    expect(wrapper.text()).not.toContain('0.001')
    await wrapper.setProps({ derivedTotalsPending: false, adjustedWeight: 0 })
    expect(wrapper.text()).toContain('0.000')
    wrapper.unmount()
    await flushPromises()
  })
})
