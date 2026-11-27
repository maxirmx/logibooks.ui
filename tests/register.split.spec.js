// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, onUnmounted, reactive, ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useRegisterSplit } from '@/composables/useRegisterSplit.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { WBRN_REGISTER_ID } from '@/helpers/company.constants.js'
import PageAlertRegion from '@/components/PageAlertRegion.vue'
import RegisterSplitDialogs from '@/l2/RegisterSplitDialogs.vue'
import RegisterSplitRecovery from '@/l2/RegisterSplitRecovery.vue'
import { useAuthStore } from '@/stores/auth.store.js'
import { useRegistersStore } from '@/stores/registers.store.js'
import { reportError } from '@/helpers/error.helpers.js'
import { vuetifyStubs } from './helpers/test-utils.js'

vi.mock('@/composables/useAppConfirm.js', () => ({ useAppConfirm: () => vi.fn().mockResolvedValue(false) }))
vi.mock('@/helpers/error.helpers.js', async original => ({ ...await original(), reportError: vi.fn() }))
const result = { outputs: [
  { id: 8, kind: 'ordinary', name: 'Latin основной 1', count: 2, available: true, manifestFileName: 'A.xlsx', manifestPosition: 1 },
  { id: 10, kind: 'ordinary', name: 'Latin основной 3', count: 1, available: true, manifestFileName: 'C.xls', manifestPosition: 3 },
  { id: 9, kind: 'dangerous', name: 'Latin опасник', count: 4, available: true }
], sourceOnlyCount: 2 }
const complete = { finished: true, percent: 100, result }
const failure = (status = 503, code = 'Network', details = {}) => Object.assign(new Error('Не удалось выполнить разделение'), {
  status, data: { msg: 'Не удалось выполнить разделение', code, details, errors: {} }
})
const stubs = { ...vuetifyStubs,
  'v-dialog': { props: ['modelValue', 'persistent'], template: '<section v-if="modelValue" role="dialog"><slot /></section>' },
  'v-btn': { props: ['to'], template: '<button :data-to="JSON.stringify(to)"><slot /></button>' },
  'v-progress-circular': { props: ['modelValue', 'indeterminate'], template: '<div data-testid="progress" :data-indeterminate="indeterminate"><slot /></div>' }
}
function makeRouter() {
  return createRouter({ history: createMemoryHistory(), routes: [
    { path: '/', component: { template: '<div />' } },
    { path: '/login', component: { template: '<div />' } },
    { path: '/registers/:id/parcels', component: { template: '<div />' } }
  ] })
}
let wrappers
function harness(options = {}) {
  const store = { startSplit: vi.fn().mockResolvedValue({ id: 'operation' }), getSplit: vi.fn().mockResolvedValue(globalThis.structuredClone(complete)) }
  const authStore = reactive({ user: { id: 42 }, isSrLogistPlus: true, isShiftLeadPlus: false })
  const register = reactive({ id: 7, registerType: WBRN_REGISTER_ID, theOtherCountryCode: 762, hasReconciliationBatch: true, readOnly: false })
  const registerId = ref(7)
  const runningAction = ref(false)
  const mounted = ref(true)
  const alertStore = useAlertStore()
  const refreshRegister = vi.fn().mockResolvedValue(undefined)
  const notify = vi.spyOn(alertStore, 'error')
  const confirm = vi.fn().mockResolvedValue(false)
  const router = makeRouter()
  let flow
  const component = defineComponent({ components: { PageAlertRegion, RegisterSplitDialogs }, setup() {
    flow = useRegisterSplit({ store, authStore, alertStore, router, register: () => register, busy: () => false,
      registerId: () => registerId.value, runningAction, mounted, refreshSnapshot: refreshRegister, makeId: () => 'operation', confirm, ...options })
    onUnmounted(flow.stop)
    return { flow }
  }, template: '<main><hr><PageAlertRegion/><RegisterSplitDialogs :state="flow.state" @retry="flow.retry" @acknowledge="flow.acknowledgeUnknown" @close="flow.state.summaryVisible = false" /></main>' })
  const wrapper = mount(component, { global: { stubs, plugins: [router] } })
  wrappers.push(wrapper)
  return { flow, store, wrapper, router, authStore, register, registerId, runningAction, mounted, alertStore, refreshRegister, notify, confirm }
}
beforeEach(() => { setActivePinia(createPinia()); sessionStorage.clear(); wrappers = [] })
afterEach(() => { wrappers.forEach(wrapper => wrapper.unmount()); vi.useRealTimers(); vi.restoreAllMocks() })

describe('register splitting', () => {
  it.each([
    'role', 'country', 'format', 'no-batch', 'readOnly', 'other-register', 'busy'
  ])('guards split for %s', async condition => {
    const h = harness({ busy: () => condition === 'busy' })
    if (condition === 'role') h.authStore.isSrLogistPlus = false
    if (condition === 'country') h.register.theOtherCountryCode = 860
    if (condition === 'format') h.register.registerType = 1
    if (condition === 'no-batch') h.register.hasReconciliationBatch = false
    if (condition === 'readOnly') h.register.readOnly = true
    if (condition === 'other-register') h.register.id = 99
    expect(await h.flow.start()).toBe(false)
    expect(h.store.startSplit).not.toHaveBeenCalled()
  })
  it('requires manual checking after operation state is lost and never replays its POST', async () => {
    const h = harness()
    h.store.startSplit.mockRejectedValueOnce(failure())
    await h.flow.start()
    h.store.getSplit.mockRejectedValueOnce(failure(404, 'RegisterSplitOperationUnavailable'))
    await h.flow.retry()
    expect(h.flow.state.phase).toBe('unknown')
    expect(h.store.startSplit).toHaveBeenCalledOnce()
    expect(h.wrapper.get('[data-testid="split-register-list"]').text()).toBe('Список реестров')
    await h.flow.acknowledgeUnknown()
    expect(h.flow.state.phase).toBe('unknown')
    h.confirm.mockResolvedValueOnce(true)
    await h.wrapper.get('[data-testid="split-allow-new"]').trigger('click')
    await flushPromises()
    expect(h.flow.state.phase).toBe('idle')
    expect(sessionStorage.getItem('register-split:42:7')).toBeNull()
    expect(h.store.startSplit).toHaveBeenCalledOnce()
  })
  it.each([
    'start'
  ])('unlocks after a confirmed %s failure', async phase => {
    const h = harness()
    if (phase === 'start') h.store.startSplit.mockRejectedValue(failure(409, 'RegisterSplitMissingReconciliation'))
    else h.store.getSplit.mockRejectedValue(failure(409, 'RegisterSplitConflict', { finished: true }))
    await h.flow.start()
    expect(h.flow.state.phase).toBe('idle')
    expect(h.runningAction.value).toBe(false)
    expect(sessionStorage.getItem('register-split:42:7')).toBeNull()
    expect(h.notify).toHaveBeenCalledOnce()
  })
  it('redirects after a failed source refresh without replaying the split', async () => {
    const h = harness()
    await h.router.push('/registers/7/parcels?mode=modePaperwork')
    h.refreshRegister.mockRejectedValueOnce(new Error('Invalid refresh'))
    await h.flow.start()
    expect(h.flow.state.result).toEqual(result)
    expect(h.router.currentRoute.value.path).toBe('/login')
    expect(useAuthStore().returnUrl).toBe('/registers/7/parcels?mode=modePaperwork')
    expect(h.wrapper.get('[role="alert"]').text()).toContain('Разделение выполнено, но не удалось обновить данные реестра')
    expect(h.wrapper.find('[data-testid="split-refresh"]').exists()).toBe(false)
    expect(h.store.startSplit).toHaveBeenCalledOnce()
    expect(h.refreshRegister).toHaveBeenCalledOnce()
  })
  it('resumes from storage even before source data loads and marks deleted outputs unavailable', async () => {
    sessionStorage.setItem('register-split:42:7', JSON.stringify({ id: 'operation', registerId: 7, userId: 42 }))
    const h = harness()
    await flushPromises()
    expect(h.store.getSplit).toHaveBeenCalledWith(7, 'operation')
    expect(h.store.startSplit).not.toHaveBeenCalled()
    h.flow.state.result.outputs[2].available = false
    await flushPromises()
    expect(h.wrapper.find('[data-testid="split-open-9"]').exists()).toBe(false)
    expect(h.wrapper.text()).toContain('Реестр недоступен')
  })
  it('ignores late responses after route change and teardown without clearing recoverable work', async () => {
    let finish
    const h = harness()
    h.store.getSplit.mockReturnValue(new Promise(resolve => { finish = resolve }))
    const pending = h.flow.start()
    await flushPromises()
    h.registerId.value = 99
    finish(complete)
    await pending
    expect(h.flow.state.result).toBeNull()
    expect(sessionStorage.getItem('register-split:42:7')).not.toBeNull()
    h.flow.stop()
    await h.flow.retry()
    expect(h.store.startSplit).toHaveBeenCalledOnce()
  })
  it('keeps receipt controls mounted when the source itself is unavailable', async () => {
    useAuthStore().user = { id: 42 }
    const store = useRegistersStore()
    vi.spyOn(store, 'getSplit').mockRejectedValueOnce(failure()).mockResolvedValue(complete)
    sessionStorage.setItem('register-split:42:7', JSON.stringify({ id: 'operation', registerId: 7, userId: 42 }))
    const wrapper = mount(RegisterSplitRecovery, { props: { registerId: 7 }, global: { stubs, plugins: [makeRouter()] } })
    wrappers.push(wrapper)
    await flushPromises()
    await wrapper.get('[data-testid="split-retry"]').trigger('click')
    await flushPromises()
    const receipt = wrapper.get('[data-testid="split-results"]')
    expect(receipt.findAll('[data-testid="split-output"]').map(row => row.text())).toEqual([
      expect.stringContaining('Манифест № 1 · A.xlsx'),
      expect.stringContaining('Манифест № 3 · C.xls'),
      expect.stringContaining('Latin опасник')
    ])
    expect(receipt.get('[data-testid="split-source-only"]').text()).toContain('2 посылок')
    await wrapper.findAll('button').find(button => button.text() === 'Закрыть').trigger('click')
    expect(wrapper.find('[data-testid="split-results"]').exists()).toBe(false)
  })
  it('reports confirmation failure and never clears work belonging to another route', async () => {
    const h = harness()
    h.store.getSplit.mockRejectedValue(failure(404, 'RegisterSplitOperationUnavailable'))
    await h.flow.start()
    h.confirm.mockRejectedValueOnce(new Error('Подтверждение недоступно'))
    await h.flow.acknowledgeUnknown()
    expect(h.wrapper.get('[data-testid="page-alert-region"]').text()).toContain('Подтверждение недоступно')
    let finish
    h.confirm.mockReturnValueOnce(new Promise(resolve => { finish = resolve }))
    const confirming = h.flow.acknowledgeUnknown()
    h.registerId.value = 99
    finish(true)
    await confirming
    expect(sessionStorage.getItem('register-split:42:7')).not.toBeNull()
    expect(h.flow.state.result).toBeNull()
  })
  it('keeps successful split usable when browser recovery storage is unavailable', async () => {
    const storage = { getItem() { throw new Error('storage unavailable') }, setItem() { throw new Error('storage unavailable') }, removeItem() { throw new Error('storage unavailable') } }
    const h = harness({ storage })
    await h.flow.start()
    expect(h.flow.state.summaryVisible).toBe(true)
    expect(h.notify).not.toHaveBeenCalled()
    expect(reportError).toHaveBeenCalled()
  })
  it('consumes expected navigation aborts and diagnoses unexpected late rejections', async () => {
    for (const name of ['AbortError', 'Error']) {
      sessionStorage.clear()
      let reject
      const h = harness()
      h.store.getSplit.mockImplementationOnce(() => new Promise((_resolve, rejection) => { reject = rejection }))
      const pending = h.flow.start()
      await flushPromises()
      h.flow.stop()
      const error = Object.assign(new Error('late failure'), { name })
      reject(error)
      await pending
      expect(h.notify).not.toHaveBeenCalled()
      if (name === 'Error') expect(reportError).toHaveBeenCalledWith(error, { context: 'split after navigation' })
    }
  })})
