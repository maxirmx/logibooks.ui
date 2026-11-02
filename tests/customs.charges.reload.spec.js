// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { onBeforeUnmount, ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useParcelsStore } from '@/stores/parcels.store.js'
import { useRegistersStore } from '@/stores/registers.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { createRegisterActionHandlers, useRegisterHeaderActions } from '@/helpers/register.actions.js'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import * as errorHelpers from '@/helpers/error.helpers.js'
import DTagSection from '@/components/DTagSection.vue'
import PageAlertRegion from '@/components/PageAlertRegion.vue'
import { vuetifyStubs } from './helpers/test-utils.js'

vi.mock('@/helpers/config.js', () => ({ apiUrl: '/api' }))
vi.mock('@/helpers/fetch.wrapper.js', () => ({ fetchWrapper: { get: vi.fn(), post: vi.fn() } }))
vi.mock('@/stores/auth.store.js', () => ({ useAuthStore: () => ({
  parcels_page: 1, parcels_per_page: 25, registers_page: 1, registers_per_page: 25
}) }))
vi.mock('vuetify-use-dialog', () => ({ useConfirm: () => vi.fn() }))

let wrappers, faults, fee, diagnostics
const register = () => ({ id: 1, customsFee: fee, customsDuty: 0 })
const parcel = () => ({
  id: 2, registerId: 1, productName: 'Посылка A', customsFee: 0, customsDuty: 0,
  customsChargeGroup: { customsFee: fee, customsDuty: 0 }
})
beforeEach(() => {
  setActivePinia(createPinia())
  vi.resetAllMocks()
  wrappers = []
  faults = {}
  fee = 1231
  useParcelsStore().item = parcel()
  useParcelsStore().items = [parcel()]
  useRegistersStore().item = register()
  useRegistersStore().items = [register()]
  diagnostics = vi.spyOn(errorHelpers, 'reportError').mockImplementation(() => {})
  fetchWrapper.get.mockImplementation(async url => {
    if (url.endsWith('/registers/ops')) return { customsProcedures: [], transportationTypes: [], incoterms: [{ value: 2 }] }
    if (url.endsWith('/parcels/a/2')) {
      if (faults.detail) throw faults.detail
      return parcel()
    }
    if (url.endsWith('/registers/1')) {
      if (faults.register) throw faults.register
      return register()
    }
    if (url.includes('/registers?')) {
      if (faults.registerList) throw faults.registerList
      return { items: [register()], pagination: {} }
    }
    if (url.includes('/parcels?')) {
      if (faults.parcelList) throw faults.parcelList
      return { items: [parcel()], pagination: {} }
    }
    throw new Error('Unexpected request: ' + url)
  })
  fetchWrapper.post.mockImplementation(async () => {
    if (faults.post) throw faults.post
    fee = 689
    return { registerId: 1, customsFee: fee, customsDuty: 0 }
  })
})
afterEach(async () => {
  wrappers.forEach(wrapper => wrapper.unmount())
  await flushPromises()
  vi.restoreAllMocks()
})

function harness(kind, { loadParcels = () => useParcelsStore().getAll(1), mounted = ref(true) } = {}) {
  const registers = useRegistersStore(), parcels = useParcelsStore(), alerts = useAlertStore()
  const reloadRegisters = vi.spyOn(registers, 'getAll')
  const reloadRegister = vi.spyOn(registers, 'getById')
  const reloadParcels = vi.spyOn(parcels, 'getAll')
  const calculation = vi.spyOn(registers, 'calculateCustomsCharges')
  const presentation = vi.spyOn(alerts, 'error')
  const wrapper = mount({
    components: { DTagSection, PageAlertRegion },
    setup() {
      const running = ref(false)
      const result = ref(null)
      const draft = ref('Введённые данные')
      const actions = kind === 'register-list'
        ? createRegisterActionHandlers(registers, alerts)
        : useRegisterHeaderActions({
          registersStore: registers, alertStore: alerts, runningAction: running,
          tableLoading: ref(false), registerLoading: ref(false), isComponentMounted: mounted, loadParcels
        })
      const calculate = async () => {
        result.value = await (kind === 'register-list'
          ? actions.calculateCustomsCharges({ id: 1 }) : actions.calculateCustomsCharges())
      }
      onBeforeUnmount(() => {
        mounted.value = false
        if (kind === 'register-list') actions.stopPolling()
        else actions.stop()
      })
      return { calculate, result, running, draft, parcels, registers }
    },
    template: `<div><hr class="hr" /><PageAlertRegion /><input v-model="draft">
      <button data-calculate @click="calculate">Рассчитать</button>
      <span data-register-fee>{{ registers.items[0]?.customsFee }}</span>
      <DTagSection :item="parcels.items[0]" />
    </div>`
  }, { global: { stubs: { 'font-awesome-icon': true, 'v-tooltip': vuetifyStubs['v-tooltip'] } } })
  wrappers.push(wrapper)
  return { wrapper, reloadRegisters, reloadRegister, reloadParcels, calculation, presentation }
}

describe('list reloads after customs calculation failures', () => {
  it.each(['register-list', 'parcel-list'])('reloads %s after a saved calculation and failed detail read, preserving the error and draft', async kind => {
    faults.detail = new Error('Не удалось обновить платежи посылки')
    const { wrapper, reloadRegisters, reloadRegister, reloadParcels, calculation, presentation } = harness(kind)
    await wrapper.get('[data-calculate]').trigger('click')
    await flushPromises()
    await expect(calculation.mock.results[0].value).rejects.toBe(faults.detail)
    expect(wrapper.vm.result).toBe(false)
    expect(wrapper.get('[data-register-fee]').text()).toBe('689')
    expect(kind === 'register-list' ? reloadRegisters : reloadRegister).toHaveBeenCalledOnce()
    if (kind === 'parcel-list') {
      expect(reloadParcels).toHaveBeenCalledOnce()
      expect(wrapper.get('#customsFee').text()).toContain('689')
    }
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.get('[role="alert"]').text()).toContain(faults.detail.message)
    expect(presentation).toHaveBeenCalledOnce()
    expect(presentation.mock.calls[0][0].cause).toBe(faults.detail)
    expect(wrapper.get('input').element.value).toBe('Введённые данные')
    expect(wrapper.vm.running).toBe(false)
    expect(diagnostics).not.toHaveBeenCalled()
    delete faults.detail
    await wrapper.get('[data-calculate]').trigger('click')
    await flushPromises()
    expect(wrapper.vm.result).toBe(true)
    expect(calculation).toHaveBeenCalledTimes(2)
    expect(presentation).toHaveBeenCalledOnce()
    expect(wrapper.get('input').element.value).toBe('Введённые данные')
  })

  it.each(['register-list', 'parcel-list'])('observes a failed POST in %s while still attempting the independent reads', async kind => {
    faults.post = new Error('Не удалось рассчитать платежи реестра 1')
    const { wrapper, reloadRegisters, reloadRegister, reloadParcels, presentation } = harness(kind)
    await wrapper.get('[data-calculate]').trigger('click')
    await flushPromises()
    expect(wrapper.vm.result).toBe(false)
    expect(kind === 'register-list' ? reloadRegisters : reloadRegister).toHaveBeenCalledOnce()
    if (kind === 'parcel-list') expect(reloadParcels).toHaveBeenCalledOnce()
    expect(wrapper.get('[data-register-fee]').text()).toBe('1231')
    expect(wrapper.get('[role="alert"]').text()).toContain(faults.post.message)
    expect(presentation).toHaveBeenCalledOnce()
  })

  it.each(['register-list', 'parcel-list'])('keeps the detail error and reports additional refresh diagnostics once in %s', async kind => {
    faults.detail = new Error('Не удалось обновить платежи посылки')
    const additional = new Error('Не удалось обновить реестр 1')
    faults[kind === 'register-list' ? 'registerList' : 'register'] = additional
    const { wrapper, presentation, reloadParcels } = harness(kind)
    await wrapper.get('[data-calculate]').trigger('click')
    await flushPromises()
    expect(wrapper.vm.result).toBe(false)
    expect(wrapper.get('[role="alert"]').text()).toContain(faults.detail.message)
    expect(presentation).toHaveBeenCalledOnce()
    expect(diagnostics).toHaveBeenCalledExactlyOnceWith(additional, { context: 'customs charges follow-up refresh' })
    if (kind === 'parcel-list') {
      expect(reloadParcels).toHaveBeenCalledOnce()
      expect(wrapper.get('#customsFee').text()).toContain('689')
    }
  })

  it.each(['register-list', 'parcel-list'])('presents a failed list reload after successful calculation once in %s and retries it', async kind => {
    const failure = new Error('Не удалось загрузить список')
    faults[kind === 'register-list' ? 'registerList' : 'parcelList'] = failure
    const { wrapper, presentation, calculation } = harness(kind)
    await wrapper.get('[data-calculate]').trigger('click')
    await flushPromises()
    expect(wrapper.vm.result).toBe(false)
    expect(wrapper.get('[role="alert"]').text()).toContain(failure.message)
    expect(presentation).toHaveBeenCalledOnce()
    expect(diagnostics).not.toHaveBeenCalled()
    faults = {}
    await wrapper.get('[data-calculate]').trigger('click')
    await flushPromises()
    expect(wrapper.vm.result).toBe(true)
    expect(calculation).toHaveBeenCalledTimes(2)
    expect(presentation).toHaveBeenCalledOnce()
  })

  it('reloads parcels even when the register read alone fails', async () => {
    faults.register = new Error('Не удалось обновить реестр 1')
    const { wrapper, reloadParcels, presentation } = harness('parcel-list')
    await wrapper.get('[data-calculate]').trigger('click')
    await flushPromises()
    expect(wrapper.vm.result).toBe(false)
    expect(reloadParcels).toHaveBeenCalledOnce()
    expect(wrapper.get('#customsFee').text()).toContain('689')
    expect(presentation).toHaveBeenCalledOnce()
  })

  it('does not report success or duplicate an error already handled by the list loader', async () => {
    const loadParcels = vi.fn(async () => {
      useAlertStore().error('Не удалось загрузить список посылок')
      return false
    })
    const { wrapper, presentation } = harness('parcel-list', { loadParcels })
    await wrapper.get('[data-calculate]').trigger('click')
    await flushPromises()
    expect(wrapper.vm.result).toBe(false)
    expect(loadParcels).toHaveBeenCalledOnce()
    expect(wrapper.get('[role="alert"]').text()).toContain('Не удалось загрузить список посылок')
    expect(presentation).toHaveBeenCalledOnce()
  })

  it('uses a Russian fallback and retains the original technical failure', async () => {
    faults.detail = new Error('Internal database transport fault')
    const { wrapper, presentation } = harness('register-list')
    await wrapper.get('[data-calculate]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('Не удалось обновить таможенные платежи')
    expect(wrapper.text()).not.toContain(faults.detail.message)
    expect(presentation.mock.calls[0][0].cause).toBe(faults.detail)
  })

  it.each(['register-list', 'parcel-list'])('skips follow-up reads and alerts after %s teardown', async kind => {
    let finish
    fetchWrapper.post.mockReturnValueOnce(new Promise(resolve => { finish = resolve }))
    faults.detail = new Error('Не удалось обновить платежи посылки')
    const { wrapper, reloadRegisters, reloadRegister, reloadParcels, presentation } = harness(kind)
    await wrapper.get('[data-calculate]').trigger('click')
    wrapper.unmount()
    useAlertStore().info('Сообщение новой страницы')
    finish({ registerId: 1, customsFee: 689, customsDuty: 0 })
    await flushPromises()
    expect(reloadRegisters).not.toHaveBeenCalled()
    expect(reloadRegister).not.toHaveBeenCalled()
    expect(reloadParcels).not.toHaveBeenCalled()
    expect(presentation).not.toHaveBeenCalled()
    expect(useAlertStore().alert.message).toBe('Сообщение новой страницы')
    expect(diagnostics).toHaveBeenCalledOnce()
    expect(diagnostics.mock.calls[0][0].cause).toBe(faults.detail)
  })
})
