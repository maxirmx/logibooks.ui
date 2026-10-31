// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, defineComponent, reactive, ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import RegisterHeaderActionsBar from '@/components/RegisterHeaderActionsBar.vue'
import RegisterWhHeaderActionBar from '@/components/RegisterWhHeaderActionBar.vue'
import RegisterTotalsRefreshButton from '@/components/RegisterTotalsRefreshButton.vue'
import CorrectedWeightDisplay from '@/components/CorrectedWeightDisplay.vue'
import PageAlertRegion from '@/components/PageAlertRegion.vue'
import { useRegistersStore } from '@/stores/registers.store.js'
import { useParcelsStore } from '@/stores/parcels.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'

const router = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock('@/router', () => ({ default: router }))
vi.mock('vue-router', () => ({ useRouter: () => router }))
vi.mock('vuetify-use-dialog', () => ({ useConfirm: () => vi.fn().mockResolvedValue(true) }))
vi.mock('@/helpers/config.js', () => ({ apiUrl: '/api' }))
vi.mock('@/helpers/fetch.wrapper.js', () => ({ fetchWrapper: { get: vi.fn(), post: vi.fn() } }))

const wrappers = []
let registers, parcels, alerts, serverRegister, serverParcel
const refreshButton = wrapper => wrapper.get('button[aria-label="Обновить итоги"]')
const exportButton = wrapper => wrapper.get('button[aria-label="Экспортировать реестр"]')
const totalsGroup = wrapper => wrapper.find('[data-testid="register-totals-actions"]')

function deferred() {
  let resolve, reject
  const promise = new Promise((done, fail) => { resolve = done; reject = fail })
  return { promise, resolve, reject }
}

function open(warehouse) {
  const wrapper = mount(defineComponent({
    components: { RegisterActions: warehouse ? RegisterWhHeaderActionBar : RegisterHeaderActionsBar, PageAlertRegion, CorrectedWeightDisplay },
    setup() {
      const controls = reactive({ disabled: false, loading: false })
      const headerProps = computed(() => ({ [warehouse ? 'register' : 'item']: registers.item, ...controls }))
      return { headerProps, controls, parcels, draft: ref('Исходный фильтр') }
    },
    template: '<div><h1>Посылки</h1><hr class="hr"><PageAlertRegion /><input aria-label="Фильтр" v-model="draft"><RegisterActions v-bind="headerProps" /><CorrectedWeightDisplay v-for="parcel in parcels.items" :key="parcel.id" :weight="parcel.weightKg" :adjusted-weight="parcel.adjustedWeightKg" :derived-totals-pending="parcel.derivedTotalsPending" /></div>'
  }), {
    global: { stubs: {
      'font-awesome-icon': true,
      ActionButton: {
        props: ['tooltipText', 'disabled'], emits: ['click'],
        template: '<button type="button" :aria-label="tooltipText" :disabled="disabled" @click="$emit(\'click\')" />'
      },
      ActionButton2L: {
        props: ['tooltipText', 'disabled', 'options'],
        template: '<div><button :aria-label="tooltipText" :disabled="disabled" /><button v-for="option in options" :key="option.label" :aria-label="option.label" :disabled="disabled || option.disabled" /></div>'
      }
    } }
  })
  wrappers.push(wrapper)
  return wrapper
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  setActivePinia(createPinia())
  useAuthStore().user = { roles: ['administrator'] }
  registers = useRegistersStore()
  parcels = useParcelsStore()
  alerts = useAlertStore()
  serverRegister = { id: 12, customsProcedureCode: 10, derivedTotalsPending: false }
  serverParcel = { id: 1, registerId: 12, statusId: 1, weightKg: 1, adjustedWeightKg: 1 }
  registers.item = { ...serverRegister }
  registers.items = [{ ...serverRegister }]
  fetchWrapper.get.mockImplementation(async url => {
    if (url === '/api/registers/12') return { ...serverRegister }
    if (url.includes('/parcels?') || url.includes('/parcels/a?')) {
      return { items: [{ ...serverParcel, derivedTotalsPending: serverRegister.derivedTotalsPending }], pagination: {} }
    }
    throw new Error(`Unexpected GET ${url}`)
  })
  fetchWrapper.post.mockImplementation(async () => {
    serverParcel.statusId = 2
    serverRegister.derivedTotalsPending = true
    return { updatedCount: 1, skippedCount: 0 }
  })
})
afterEach(() => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  vi.restoreAllMocks()
})

describe.each([false, true])('register totals refresh in warehouse mode %s', warehouse => {
  it.each([
    [false, false],
    [true, false],
    [false, true],
    [true, true]
  ])('groups loading=%s and pending totals=%s at the left without an empty group', async (loading, pending) => {
    registers.item.derivedTotalsPending = pending
    const wrapper = open(warehouse)
    wrapper.vm.controls.loading = loading
    await flushPromises()

    expect(totalsGroup(wrapper).exists()).toBe(loading || pending)
    expect(wrapper.findAll('.spinner-border')).toHaveLength(loading ? 1 : 0)
    expect(wrapper.findAll('button[aria-label="Обновить итоги"]')).toHaveLength(pending ? 1 : 0)
    if (loading || pending) {
      const group = totalsGroup(wrapper)
      expect(group.isVisible()).toBe(true)
      expect(wrapper.get('.header-actions-bar').element.firstElementChild).toBe(group.element)
      expect(group.classes()).toEqual(expect.arrayContaining(['header-actions', 'header-actions-group']))
      expect(group.findAll('.spinner-border')).toHaveLength(loading ? 1 : 0)
      expect(group.findAll('button')).toHaveLength(pending ? 1 : 0)
      if (pending) expect(refreshButton(wrapper).element.disabled).toBe(loading)
    }

    wrapper.vm.controls.loading = false
    registers.item.derivedTotalsPending = false
    await flushPromises()
    expect(totalsGroup(wrapper).exists()).toBe(false)
  })

  it.each([0, .625])('recovers exports and visible adjusted weights (%s) after a bulk status change', async adjustedWeightKg => {
    const auth = useAuthStore()
    if (warehouse) auth.parcels_wh_page = 3
    else auth.parcels_page = 3
    await parcels.getAll(12, { showMarkedByPartner: warehouse, boxId: 17 })
    const wrapper = open(warehouse)
    expect(wrapper.find('button[aria-label="Обновить итоги"]').exists()).toBe(false)
    await wrapper.get('input').setValue('Фильтр после изменения статусов')
    await expect(parcels.updateStatusSelection(12, 2, [1])).resolves.toEqual({ updatedCount: 1, skippedCount: 0 })
    await flushPromises()
    expect(parcels.items[0].statusId).toBe(2)
    expect(wrapper.get('.corrected-weight-display').text()).toContain('пересчёт')
    expect(exportButton(wrapper).element.disabled).toBe(true)
    expect(refreshButton(wrapper).element.disabled).toBe(false)
    await refreshButton(wrapper).trigger('click')
    await flushPromises()
    expect(exportButton(wrapper).element.disabled).toBe(true)
    expect(refreshButton(wrapper).exists()).toBe(true)
    serverRegister.derivedTotalsPending = false
    serverParcel.adjustedWeightKg = adjustedWeightKg
    await refreshButton(wrapper).trigger('click')
    await flushPromises()
    expect(exportButton(wrapper).element.disabled).toBe(false)
    expect(parcels.items[0]).toMatchObject({ derivedTotalsPending: false, adjustedWeightKg })
    expect(wrapper.get('.corrected-weight-display').text()).toContain(adjustedWeightKg.toFixed(3))
    expect(wrapper.get('.corrected-weight-display').text()).not.toContain('пересчёт')
    expect(wrapper.find('button[aria-label="Обновить итоги"]').exists()).toBe(false)
    if (!warehouse) expect(wrapper.get('button[aria-label="инвойс-манифест (все)"]').element.disabled).toBe(false)
    expect(wrapper.get('input').element.value).toBe('Фильтр после изменения статусов')
    expect(fetchWrapper.post).toHaveBeenCalledExactlyOnceWith('/api/parcels/status-selection/update', {
      registerId: 12, statusId: 2, parcelIds: [1]
    })
    expect(router.push).not.toHaveBeenCalled()
    const listUrl = fetchWrapper.get.mock.calls.filter(([url]) => url.includes('/parcels?') || url.includes('/parcels/a?')).at(-1)[0]
    expect(listUrl).toContain('page=3')
    expect(listUrl).toContain('boxId=17')
  })

  it('allows only one refresh in flight and keeps recovery available if totals remain pending', async () => {
    registers.invalidateDerived(12)
    const wrapper = open(warehouse)
    const pending = deferred()
    fetchWrapper.get.mockReturnValueOnce(pending.promise)
    const refresh = wrapper.getComponent(RegisterTotalsRefreshButton).vm.$.setupState.refresh
    await refreshButton(wrapper).trigger('click')
    await flushPromises()
    expect(refreshButton(wrapper).element.disabled).toBe(true)
    expect(totalsGroup(wrapper).get('.spinner-border').isVisible()).toBe(true)
    expect(await refresh()).toBe(false)
    expect(fetchWrapper.get).toHaveBeenCalledTimes(1)
    pending.resolve({ ...serverRegister, derivedTotalsPending: true })
    await flushPromises()
    expect(refreshButton(wrapper).element.disabled).toBe(false)
    expect(totalsGroup(wrapper).find('.spinner-border').exists()).toBe(false)
    await refreshButton(wrapper).trigger('click')
    await flushPromises()
    expect(exportButton(wrapper).element.disabled).toBe(false)
    expect(await refresh()).toBe(false)
    expect(fetchWrapper.get).toHaveBeenCalledTimes(2)
    expect(totalsGroup(wrapper).exists()).toBe(false)
  })

  it('shows a refresh failure once in Russian and retries without repeating the mutation', async () => {
    const wrapper = open(warehouse)
    await wrapper.get('input').setValue('Сохранённый фильтр')
    await parcels.updateStatusSelection(12, 2, [1])
    const failure = new Error('Unexpected projection failure')
    fetchWrapper.get.mockRejectedValueOnce(failure)
    const report = vi.spyOn(alerts, 'error')
    const refresh = wrapper.getComponent(RegisterTotalsRefreshButton).vm.$.setupState.refresh
    await expect(refresh()).resolves.toBe(false)
    await flushPromises()
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.get('[role="alert"]').text()).toContain('Не удалось обновить итоги реестра')
    expect(wrapper.text()).not.toContain('Unexpected projection failure')
    expect(report).toHaveBeenCalledTimes(1)
    expect(console.error).toHaveBeenCalledWith('[register totals refresh]', failure)
    expect(exportButton(wrapper).element.disabled).toBe(true)
    expect(refreshButton(wrapper).element.disabled).toBe(false)
    expect(wrapper.get('input').element.value).toBe('Сохранённый фильтр')
    serverRegister.derivedTotalsPending = false
    await refreshButton(wrapper).trigger('click')
    await flushPromises()
    expect(exportButton(wrapper).element.disabled).toBe(false)
    expect(fetchWrapper.post).toHaveBeenCalledTimes(1)
    expect(router.push).not.toHaveBeenCalled()
  })

  it('keeps refresh available when totals are ready but the parcel reload fails', async () => {
    await parcels.getAll(12, { showMarkedByPartner: warehouse })
    const wrapper = open(warehouse)
    await wrapper.get('input').setValue('Фильтр при ошибке обновления посылок')
    await parcels.updateStatusSelection(12, 2, [1])
    const pending = deferred()
    const get = fetchWrapper.get.getMockImplementation()
    let delayList = true
    fetchWrapper.get.mockImplementation(url => (url.includes('/parcels?') || url.includes('/parcels/a?')) && delayList
      ? pending.promise : get(url))
    const storeRefresh = vi.spyOn(registers, 'refreshDerived')
    const report = vi.spyOn(alerts, 'error')
    const refresh = wrapper.getComponent(RegisterTotalsRefreshButton).vm.$.setupState.refresh
    serverRegister.derivedTotalsPending = false
    const running = refresh()
    await flushPromises()
    expect(registers.item.derivedTotalsPending).toBe(false)
    expect(registers.isRefreshingDerived(12)).toBe(true)
    expect(refreshButton(wrapper).element.disabled).toBe(true)
    expect(totalsGroup(wrapper).get('.spinner-border').isVisible()).toBe(true)
    expect(await refresh()).toBe(false)
    expect(wrapper.get('.corrected-weight-display').text()).toContain('пересчёт')
    const failure = new Error('Unexpected parcel projection failure')
    pending.reject(failure)
    await expect(running).resolves.toBe(false)
    await expect(storeRefresh.mock.results[0].value).rejects.toBe(failure)
    await flushPromises()
    expect(registers.isRefreshingDerived(12)).toBe(false)
    expect(registers.item.derivedTotalsPending).toBe(false)
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(report).toHaveBeenCalledTimes(1)
    expect(wrapper.get('[role="alert"]').text()).toContain('Не удалось обновить итоги реестра')
    expect(wrapper.text()).not.toContain(failure.message)
    expect(refreshButton(wrapper).element.disabled).toBe(false)
    expect(totalsGroup(wrapper).isVisible()).toBe(true)
    expect(totalsGroup(wrapper).find('.spinner-border').exists()).toBe(false)
    expect(wrapper.get('.header-actions-bar').element.firstElementChild).toBe(totalsGroup(wrapper).element)
    delayList = false
    serverParcel.adjustedWeightKg = .75
    await refreshButton(wrapper).trigger('click')
    await flushPromises()
    expect(parcels.items[0]).toMatchObject({ derivedTotalsPending: false, adjustedWeightKg: .75 })
    expect(wrapper.get('.corrected-weight-display').text()).toContain('0.750')
    expect(wrapper.get('.corrected-weight-display').text()).not.toContain('пересчёт')
    expect(wrapper.find('button[aria-label="Обновить итоги"]').exists()).toBe(false)
    expect(totalsGroup(wrapper).exists()).toBe(false)
    expect(wrapper.get('input').element.value).toBe('Фильтр при ошибке обновления посылок')
    expect(fetchWrapper.post).toHaveBeenCalledTimes(1)
    expect(router.push).not.toHaveBeenCalled()
    storeRefresh.mockRestore()
  })

  it('clears a failed refresh retry when the header changes to another register', async () => {
    registers.invalidateDerived(12)
    const wrapper = open(warehouse)
    fetchWrapper.get.mockRejectedValueOnce(new Error('Unexpected projection failure'))
    await wrapper.getComponent(RegisterTotalsRefreshButton).vm.$.setupState.refresh()
    registers.item = { id: 99, derivedTotalsPending: false }
    await flushPromises()
    expect(wrapper.find('button[aria-label="Обновить итоги"]').exists()).toBe(false)
    expect(totalsGroup(wrapper).exists()).toBe(false)
  })

  it.each(['disabled', 'loading'])('disables refresh when the header is %s', async flag => {
    registers.invalidateDerived(12)
    const wrapper = open(warehouse)
    wrapper.vm.controls[flag] = true
    await flushPromises()
    expect(refreshButton(wrapper).element.disabled).toBe(true)
    expect(await wrapper.getComponent(RegisterTotalsRefreshButton).vm.$.setupState.refresh()).toBe(false)
    expect(fetchWrapper.get).not.toHaveBeenCalled()
  })

  it('supports read-only registers and prevents refreshing without an identifier', async () => {
    registers.item = { ...serverRegister, readOnly: true, derivedTotalsPending: true }
    const wrapper = open(warehouse)
    expect(refreshButton(wrapper).element.disabled).toBe(false)
    registers.item = { derivedTotalsPending: true }
    await flushPromises()
    expect(refreshButton(wrapper).element.disabled).toBe(true)
    expect(await wrapper.getComponent(RegisterTotalsRefreshButton).vm.$.setupState.refresh()).toBe(false)
    expect(fetchWrapper.get).not.toHaveBeenCalled()
  })

  it('consumes a late refresh failure after page exit without replacing another page message', async () => {
    registers.invalidateDerived(12)
    const wrapper = open(warehouse)
    const pending = deferred()
    fetchWrapper.get.mockReturnValueOnce(pending.promise)
    const refresh = wrapper.getComponent(RegisterTotalsRefreshButton).vm.$.setupState.refresh
    const running = refresh()
    await flushPromises()
    wrapper.unmount()
    alerts.info('Сообщение другой страницы', { timeout: null })
    const failure = new Error('Late totals failure')
    pending.reject(failure)
    await expect(running).resolves.toBe(false)
    expect(alerts.alert.message).toBe('Сообщение другой страницы')
    expect(console.error).toHaveBeenCalledWith('[document totals refresh after teardown]', failure)
    expect(await refresh()).toBe(false)
    expect(fetchWrapper.get).toHaveBeenCalledTimes(1)
  })
})
