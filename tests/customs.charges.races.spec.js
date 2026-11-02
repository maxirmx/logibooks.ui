// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { Form, Field } from 'vee-validate'
import { useParcelsStore } from '@/stores/parcels.store.js'
import { useRegistersStore } from '@/stores/registers.store.js'
import { useBoxesStore } from '@/stores/boxes.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { useParcelEditorState } from '@/composables/useParcelEditorState.js'
import { useRegisterTotalsRefresh } from '@/composables/useRegisterTotalsRefresh.js'
import { createRegisterActionHandlers } from '@/helpers/register.actions.js'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import * as errorHelpers from '@/helpers/error.helpers.js'
import DTagSection from '@/components/DTagSection.vue'
import PageAlertRegion from '@/components/PageAlertRegion.vue'
import { vuetifyStubs } from './helpers/test-utils.js'

vi.mock('@/helpers/config.js', () => ({ apiUrl: '/api' }))
vi.mock('@/helpers/fetch.wrapper.js', () => ({ fetchWrapper: {
  get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn()
} }))
vi.mock('@/stores/auth.store.js', () => ({ useAuthStore: () => ({
  parcels_page: 1, parcels_per_page: 25
}) }))
vi.mock('@/stores/parcel.views.store.js', () => ({ useParcelViewsStore: () => ({
  add: vi.fn().mockResolvedValue(undefined)
}) }))

const parcel = (extra = {}) => ({
  id: 2, registerId: 1, productName: 'Посылка A', weightKg: 1, adjustedWeightKg: 1.25,
  derivedTotalsPending: false, passportCheckStatus: 10, customsFee: 0, customsDuty: 0,
  customsChargeGroup: { customsFee: 1231, customsDuty: 0 }, ...extra
})
function deferred() {
  let resolve, reject
  const promise = new Promise((done, fail) => { resolve = done; reject = fail })
  return { promise, resolve, reject }
}
let wrappers, serverParcel, serverRegister, serverBox
function mountEditor() {
  const wrapper = mount({
    components: { Form, Field, DTagSection, PageAlertRegion },
    setup() {
      const formRef = ref(null)
      const state = useParcelEditorState({
        parcelId: ref(3), formRef, loadDependencies: async () => {}, onReady: vi.fn()
      })
      return { formRef, ...state, parcels: useParcelsStore() }
    },
    template: `<Form ref="formRef"><hr class="hr" /><PageAlertRegion />
      <Field v-if="ready" name="productName" />
      <span data-detail>{{ parcels.item.id }}</span><DTagSection :item="parcels.item" />
    </Form>`
  }, { global: { stubs: { 'font-awesome-icon': true, 'v-tooltip': vuetifyStubs['v-tooltip'] } } })
  wrappers.push(wrapper)
  return wrapper
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.resetAllMocks()
  wrappers = []
  serverParcel = parcel()
  serverRegister = { id: 1, customsFee: 1231, customsDuty: 0, totalWeightKgToRelease: 3, derivedTotalsPending: false }
  serverBox = { id: 5, registerId: 1, weightKg: 3, derivedTotalsPending: false }
  const parcels = useParcelsStore(), registers = useRegistersStore()
  parcels.item = parcel()
  parcels.items = [parcel()]
  registers.item = { ...serverRegister }
  registers.items = [{ ...serverRegister }]
  fetchWrapper.get.mockImplementation(async url => {
    if (url.endsWith('/registers/ops')) return { customsProcedures: [], transportationTypes: [], incoterms: [{ value: 2 }] }
    if (url.endsWith('/registers/1')) return { ...serverRegister }
    if (url.endsWith('/parcels/a/2')) return { ...serverParcel }
    if (url.includes('/parcels?')) return { items: [{ ...serverParcel }], pagination: { totalCount: 1 } }
    if (url.includes('/boxes?')) return [{ ...serverBox }]
    throw new Error('Unexpected request: ' + url)
  })
  fetchWrapper.post.mockResolvedValue({ registerId: 1, customsFee: 689, customsDuty: 0 })
})
afterEach(async () => {
  wrappers.forEach(wrapper => wrapper.unmount())
  await flushPromises()
  vi.restoreAllMocks()
})

describe('customs detail refresh during parcel navigation', () => {
  it.each(['refresh', 'navigation'])('keeps the real form and shared detail on B when %s finishes first', async first => {
    const loadingB = deferred(), refreshingA = deferred()
    fetchWrapper.get.mockImplementation(url => url.endsWith('/parcels/a/3') ? loadingB.promise : refreshingA.promise)
    const wrapper = mountEditor()
    await flushPromises()
    const calculation = useRegistersStore().calculateCustomsCharges(1)
    await flushPromises()
    const destination = parcel({ id: 3, productName: 'Посылка B' })
    if (first === 'refresh') {
      refreshingA.resolve(parcel())
      await calculation
      expect(useParcelsStore().itemLoading).toBe(true)
      loadingB.resolve(destination)
    } else {
      loadingB.resolve(destination)
      await flushPromises()
      refreshingA.resolve(parcel())
      await calculation
    }
    await flushPromises()
    expect(wrapper.get('input').element.value).toBe('Посылка B')
    expect(wrapper.getComponent(Form).vm.$.exposed.getValues().id).toBe(3)
    expect(wrapper.get('[data-detail]').text()).toBe('3')
    expect(useParcelsStore().itemLoading).toBe(false)
    expect(useAlertStore().alert).toBeNull()
  })

  it('does not overwrite a newer navigation started after the refresh', async () => {
    const parcels = useParcelsStore(), delayed = deferred()
    fetchWrapper.get.mockReturnValueOnce(delayed.promise)
    const refreshing = parcels.refreshCustomsChargeDetail(1)
    fetchWrapper.get.mockResolvedValueOnce(parcel({ id: 3, productName: 'Посылка B' }))
    await parcels.getById(3)
    delayed.resolve(parcel())
    await refreshing
    expect(parcels.item).toMatchObject({ id: 3, productName: 'Посылка B' })
  })

  it('propagates a charge refresh failure to one visible error without disrupting navigation or the retry', async () => {
    const parcels = useParcelsStore(), registers = useRegistersStore(), alerts = useAlertStore()
    const loadingB = deferred(), refreshingA = deferred()
    const destination = parcel({ id: 3, productName: 'Посылка B' })
    const failure = new Error('Не удалось обновить платежи посылки')
    fetchWrapper.get.mockImplementation(url => url.endsWith('/parcels/a/3') ? loadingB.promise : refreshingA.promise)
    const storeCalculation = vi.spyOn(registers, 'calculateCustomsCharges')
    const reloadRegisters = vi.spyOn(registers, 'getAll').mockResolvedValue(undefined)
    const presentation = vi.spyOn(alerts, 'error')
    const handlers = createRegisterActionHandlers(registers, alerts)
    const wrapper = mountEditor()
    await flushPromises()
    const calculation = handlers.calculateCustomsCharges({ id: 1 })
    await flushPromises()
    refreshingA.reject(failure)
    await calculation
    await expect(storeCalculation.mock.results[0].value).rejects.toBe(failure)
    expect(reloadRegisters).toHaveBeenCalledOnce()
    expect(parcels.itemLoading).toBe(true)
    expect(parcels.itemError).toBeNull()
    loadingB.resolve(destination)
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain(failure.message)
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(presentation).toHaveBeenCalledOnce()
    expect(wrapper.get('input').element.value).toBe('Посылка B')
    await wrapper.get('input').setValue('Введённые данные B')
    fetchWrapper.get.mockResolvedValueOnce(destination)
    await handlers.calculateCustomsCharges({ id: 1 })
    await flushPromises()
    expect(storeCalculation).toHaveBeenCalledTimes(2)
    expect(reloadRegisters).toHaveBeenCalledTimes(2)
    expect(wrapper.get('input').element.value).toBe('Введённые данные B')
    expect(wrapper.get('[data-detail]').text()).toBe('3')
    expect(presentation).toHaveBeenCalledOnce()
    handlers.stopPolling()
  })

  it.each([parcel({ id: 9 }), parcel({ registerId: 2 })])('does not overwrite a replaced cached parcel ($id, $registerId)', async replacement => {
    const parcels = useParcelsStore(), delayed = deferred()
    fetchWrapper.get.mockReturnValueOnce(delayed.promise)
    const refreshing = parcels.refreshCustomsChargeDetail(1)
    parcels.item = replacement
    delayed.resolve(parcel())
    await refreshing
    expect(parcels.item).toEqual(replacement)
  })

  it.each([{}, parcel({ id: 0 }), parcel({ registerId: 2 })])('skips an absent or unrelated cached detail ($id, $registerId)', async cached => {
    useParcelsStore().item = cached
    await useParcelsStore().refreshCustomsChargeDetail(1)
    expect(fetchWrapper.get).not.toHaveBeenCalled()
  })

  it.each(['invalidateCustomsCharges', 'invalidateDerived'])('merges live statuses and respects %s during the refresh', async invalidate => {
    const parcels = useParcelsStore(), delayed = deferred()
    fetchWrapper.get.mockReturnValueOnce(delayed.promise)
    const refreshing = parcels.refreshCustomsChargeDetail(1)
    parcels.applyParcelCheckStatusChanges({ registerId: 1, updates: [{ parcelId: 2, checkCode: 'passport', status: 30, revision: 1 }] })
    parcels[invalidate](1)
    delayed.resolve(parcel())
    await refreshing
    expect(parcels.item).toMatchObject({
      passportCheckStatus: 30, customsFee: null, customsChargeGroup: null,
      adjustedWeightKg: invalidate === 'invalidateDerived' ? null : 1.25,
      derivedTotalsPending: invalidate === 'invalidateDerived'
    })
  })
})

describe('register responses after charge-only invalidation', () => {
  it.each(['parcel', 'register'])('keeps a new %s weight projection after an earlier weight invalidation and a later charge invalidation', async kind => {
    const parcels = useParcelsStore(), registers = useRegistersStore()
    await registers.ensureOpsLoaded()
    parcels.invalidateDerived(1)
    const delayed = deferred()
    fetchWrapper.get.mockReturnValueOnce(delayed.promise)
    const loading = kind === 'parcel' ? parcels.getById(2) : registers.getById(1)
    await flushPromises()
    parcels.invalidateCustomsCharges(1)
    delayed.resolve(kind === 'parcel' ? parcel() : { ...serverRegister })
    const result = await loading
    expect(result).toMatchObject({ customsFee: null, customsDuty: null, derivedTotalsPending: false })
    expect(kind === 'parcel' ? result.adjustedWeightKg : result.totalWeightKgToRelease).toBe(kind === 'parcel' ? 1.25 : 3)
  })

  it('keeps final mutation weights ready when only charges change during its detail request', async () => {
    const parcels = useParcelsStore(), delayed = deferred()
    fetchWrapper.put.mockResolvedValueOnce(undefined)
    const originalGet = fetchWrapper.get.getMockImplementation()
    fetchWrapper.get.mockImplementation(url => url.endsWith('/parcels/a/2') ? delayed.promise : originalGet(url))
    const saving = parcels.update(2, { quantity: 2 })
    await flushPromises()
    parcels.invalidateCustomsCharges(1)
    delayed.resolve(parcel({ quantity: 2 }))
    await saving
    expect(parcels.item).toMatchObject({
      quantity: 2, adjustedWeightKg: 1.25, derivedTotalsPending: false,
      customsFee: null, customsChargeGroup: null
    })
  })

  it.each(['list', 'registers'])('keeps weight totals ready in an uncached %s response', async kind => {
    const registers = useRegistersStore()
    await registers.ensureOpsLoaded()
    registers.items = []
    registers.item = {}
    const delayed = deferred()
    fetchWrapper.get.mockReturnValueOnce(delayed.promise)
    const loading = kind === 'list' ? registers.getAll() : registers.getRegisters()
    await flushPromises()
    useParcelsStore().invalidateCustomsCharges(1)
    delayed.resolve(kind === 'list' ? { items: [{ ...serverRegister }], pagination: {} } : [{ ...serverRegister }])
    const response = await loading
    expect(kind === 'list' ? registers.items[0] : response[0]).toMatchObject({
      customsFee: null, customsDuty: null, totalWeightKgToRelease: 3, derivedTotalsPending: false
    })
  })
})

describe('calculation during an authoritative totals refresh', () => {
  async function prepareRefresh() {
    const parcels = useParcelsStore(), boxes = useBoxesStore()
    await parcels.getAll(1)
    await boxes.getAll(1)
    parcels.invalidateDerived(1)
    serverRegister = { ...serverRegister, totalWeightKgToRelease: 11, customsFee: 689 }
    serverParcel = parcel({ adjustedWeightKg: 11, customsChargeGroup: { customsFee: 689, customsDuty: 0 } })
    serverBox = { ...serverBox, weightKg: 11 }
    const delayed = deferred()
    fetchWrapper.get.mockReturnValueOnce(delayed.promise)
    return delayed
  }

  it('retries the register read and completes boxes and visible parcels without another caller', async () => {
    const delayed = await prepareRefresh()
    const registers = useRegistersStore()
    const refreshing = registers.refreshDerived(1)
    await flushPromises()
    await registers.calculateCustomsCharges(1)
    delayed.resolve({ ...serverRegister, totalWeightKgToRelease: 3 })
    await refreshing
    expect(registers.item).toMatchObject({ totalWeightKgToRelease: 11, derivedTotalsPending: false, customsFee: 689 })
    expect(registers.items[0]).toMatchObject({ totalWeightKgToRelease: 11, derivedTotalsPending: false })
    expect(useBoxesStore().boxes[0]).toMatchObject({ weightKg: 11, derivedTotalsPending: false })
    expect(useParcelsStore().items[0]).toMatchObject({ adjustedWeightKg: 11, derivedTotalsPending: false })
    expect(registers.isRefreshingDerived(1)).toBe(false)
    expect(fetchWrapper.get.mock.calls.filter(([url]) => url === '/api/registers/1')).toHaveLength(2)
  })

  it.each(['/registers/1', '/boxes?', '/parcels?'])('propagates a failed follow-up %s request, displays it once and retries the refresh', async endpoint => {
    const delayed = await prepareRefresh()
    const registers = useRegistersStore(), alerts = useAlertStore()
    const storeRefresh = vi.spyOn(registers, 'refreshDerived')
    const presentation = vi.spyOn(alerts, 'error')
    const diagnostics = vi.spyOn(errorHelpers, 'reportError').mockImplementation(() => {})
    const failure = new Error('Не удалось обновить итоги реестра')
    const wrapper = mount({
      components: { PageAlertRegion },
      setup: () => ({ draft: ref('Введённые данные'), ...useRegisterTotalsRefresh(1) }),
      template: '<div><hr class="hr" /><PageAlertRegion /><input v-model="draft"><button data-refresh :disabled="refreshingTotals" @click="refreshTotals">Обновить итоги</button></div>'
    })
    wrappers.push(wrapper)
    await wrapper.get('[data-refresh]').trigger('click')
    await flushPromises()
    const originalGet = fetchWrapper.get.getMockImplementation()
    let failNext = true
    fetchWrapper.get.mockImplementation(url => {
      if (url.includes(endpoint) && failNext) {
        failNext = false
        return Promise.reject(failure)
      }
      return originalGet(url)
    })
    await registers.calculateCustomsCharges(1)
    delayed.resolve({ ...serverRegister, totalWeightKgToRelease: 3 })
    await flushPromises()
    await expect(storeRefresh.mock.results[0].value).rejects.toBe(failure)
    expect(registers.isRefreshingDerived(1)).toBe(false)
    expect(presentation).toHaveBeenCalledOnce()
    expect(diagnostics).toHaveBeenCalledOnce()
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.get('[role="alert"]').text()).toContain(failure.message)
    expect(wrapper.get('input').element.value).toBe('Введённые данные')
    expect(useParcelsStore().items[0].derivedTotalsPending).toBe(true)
    await wrapper.get('[data-refresh]').trigger('click')
    await flushPromises()
    expect(storeRefresh).toHaveBeenCalledTimes(2)
    expect(registers.item.totalWeightKgToRelease).toBe(11)
    expect(useBoxesStore().boxes[0]).toMatchObject({ weightKg: 11, derivedTotalsPending: false })
    expect(useParcelsStore().items[0]).toMatchObject({ adjustedWeightKg: 11, derivedTotalsPending: false })
    expect(wrapper.get('input').element.value).toBe('Введённые данные')
    expect(presentation).toHaveBeenCalledOnce()
  })
})
