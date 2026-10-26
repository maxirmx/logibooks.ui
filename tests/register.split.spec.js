// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, onUnmounted, reactive, ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import ActionButton from '@/components/ActionButton.vue'
import { useRegisterSplit } from '@/composables/useRegisterSplit.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { WBRN_REGISTER_ID } from '@/helpers/company.constants.js'
import PageAlertRegion from '@/components/PageAlertRegion.vue'
import RegisterSplitDialogs from '@/l2/RegisterSplitDialogs.vue'
import ActionDialog from '@/l2/ActionDialog.vue'
import RegisterSplitRecovery from '@/l2/RegisterSplitRecovery.vue'
import { useAuthStore } from '@/stores/auth.store.js'
import { useRegistersStore } from '@/stores/registers.store.js'
import { reportError } from '@/helpers/error.helpers.js'
import { vuetifyStubs } from './helpers/test-utils.js'

vi.mock('@/composables/useAppConfirm.js', () => ({ useAppConfirm: () => vi.fn().mockResolvedValue(false) }))
vi.mock('@/helpers/error.helpers.js', async original => ({ ...await original(), reportError: vi.fn() }))
const result = { ordinary: { id: 8, name: 'Latin основной', count: 2, available: true }, dangerous: { id: 9, name: 'Latin опасник', count: 4, available: true } }
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
    { path: '/registers/:id/parcels', component: { template: '<div />' } }
  ] })
}
let wrappers
function harness(options = {}) {
  const store = { startSplit: vi.fn().mockResolvedValue({ id: 'operation' }), getSplit: vi.fn().mockResolvedValue(globalThis.structuredClone(complete)) }
  const authStore = reactive({ user: { id: 42 }, isSrLogistPlus: true, isShiftLeadPlus: false })
  const register = reactive({ id: 7, registerType: WBRN_REGISTER_ID, theOtherCountryCode: 762, dangerousGoodsCount: 4, parcelsTotal: 6, readOnly: false })
  const registerId = ref(7)
  const runningAction = ref(false)
  const mounted = ref(true)
  const alertStore = useAlertStore()
  const refreshRegister = vi.fn().mockResolvedValue(undefined)
  const notify = vi.spyOn(alertStore, 'error')
  const confirm = vi.fn().mockResolvedValue(false)
  let flow
  const component = defineComponent({ components: { PageAlertRegion, RegisterSplitDialogs }, setup() {
    flow = useRegisterSplit({ store, authStore, alertStore, register: () => register, busy: () => false,
      registerId: () => registerId.value, runningAction, mounted, refreshRegister, makeId: () => 'operation', confirm, ...options })
    onUnmounted(flow.stop)
    return { flow }
  }, template: '<main><hr><PageAlertRegion/><RegisterSplitDialogs :state="flow.state" @retry="flow.retry" @acknowledge="flow.acknowledgeUnknown" @refresh="flow.refresh" @close="flow.state.summaryVisible = false" /></main>' })
  const router = makeRouter()
  const wrapper = mount(component, { global: { stubs, plugins: [router] } })
  wrappers.push(wrapper)
  return { flow, store, wrapper, router, authStore, register, registerId, runningAction, mounted, alertStore, refreshRegister, notify, confirm }
}
beforeEach(() => { setActivePinia(createPinia()); sessionStorage.clear(); wrappers = [] })
afterEach(() => { wrappers.forEach(wrapper => wrapper.unmount()); vi.useRealTimers(); vi.restoreAllMocks() })

describe('register splitting', () => {
  it('allows senior logist and displays both committed outputs without automatic navigation', async () => {
    const h = harness()
    await h.flow.start()
    await flushPromises()
    expect(h.store.startSplit).toHaveBeenCalledWith(7, 'operation')
    expect(h.flow.state.progress.show).toBe(false)
    expect(h.runningAction.value).toBe(false)
    const report = h.wrapper.get('[data-testid="split-results"]')
    expect(report.element.tagName).toBe('DIV')
    expect(report.classes()).toContain('form-compact')
    expect(report.findAll('[data-testid^="split-result-"]')).toHaveLength(2)
    for (const [kind, name, count] of [['ordinary', 'Latin основной', 2], ['dangerous', 'Latin опасник', 4]]) {
      const row = report.get(`[data-testid="split-result-${kind}"]`)
      expect(row.get(`[data-testid="split-name-${kind}"]`).text()).toBe(name)
      expect(row.text()).toContain(`${count} посылок`)
    }
    expect(report.text()).not.toContain('Основной реестр:')
    expect(report.text()).not.toContain('Посылок в реестре')
    expect(report.get('[data-testid="split-name-ordinary"]').text()).toBe('Latin основной')
    expect(report.get('[data-testid="split-count-ordinary"]').text()).toBe('2')
    expect(report.get('[data-testid="split-count-dangerous"]').text()).toBe('4')
    const buttons = report.findAllComponents(ActionButton)
    expect(buttons).toHaveLength(2)
    expect(buttons.map(button => button.props('icon'))).toEqual(['fa-solid fa-list', 'fa-solid fa-list'])
    expect(buttons.map(button => button.props('tooltipText'))).toEqual(['Список посылок', 'Список посылок'])
    expect(h.router.currentRoute.value.path).toBe('/')
    for (const [kind, id] of [['ordinary', 8], ['dangerous', 9]]) {
      await report.get(`[data-testid="split-open-${kind}"]`).trigger('click')
      await flushPromises()
      expect(h.router.currentRoute.value.path).toBe(`/registers/${id}/parcels`)
      expect(h.router.currentRoute.value.query.mode).toBe('modePaperwork')
    }
    expect(sessionStorage.getItem('register-split:42:7')).toBeNull()
    const close = h.wrapper.findAll('button').find(button => button.text() === 'Закрыть')
    await close.trigger('click')
    expect(h.flow.state.summaryVisible).toBe(false)
  })
  it('uses only the existing circle and keeps incomplete progress below 100', async () => {
    vi.useFakeTimers()
    const h = harness()
    h.store.getSplit.mockResolvedValueOnce({ finished: false, phase: 'copying', percent: 100 }).mockResolvedValueOnce({ finished: false, percent: null }).mockResolvedValue(complete)
    await h.flow.start()
    expect(h.wrapper.findComponent(ActionDialog).props('actionDialog').percent).toBe(99)
    expect(h.runningAction.value).toBe(true)
    expect(await h.flow.start()).toBe(false)
    await vi.advanceTimersByTimeAsync(1000)
    expect(h.flow.state.progress.percent).toBeNull()
    await vi.advanceTimersByTimeAsync(1000)
    expect(h.flow.state.result).toEqual(result)
    expect(h.store.startSplit).toHaveBeenCalledOnce()
  })
  it.each(['role', 'country', 'format', 'count', 'no-dangerous', 'all-dangerous', 'empty', 'total-unavailable', 'readOnly', 'other-register', 'busy'])('guards split for %s', async condition => {
    const h = harness({ busy: () => condition === 'busy' })
    if (condition === 'role') h.authStore.isSrLogistPlus = false
    if (condition === 'country') h.register.theOtherCountryCode = 860
    if (condition === 'format') h.register.registerType = 1
    if (condition === 'count') h.register.dangerousGoodsCount = undefined
    if (condition === 'no-dangerous') h.register.dangerousGoodsCount = 0
    if (condition === 'all-dangerous') h.register.dangerousGoodsCount = h.register.parcelsTotal
    if (condition === 'empty') { h.register.dangerousGoodsCount = 0; h.register.parcelsTotal = 0 }
    if (condition === 'total-unavailable') h.register.parcelsTotal = undefined
    if (condition === 'readOnly') h.register.readOnly = true
    if (condition === 'other-register') h.register.id = 99
    expect(await h.flow.start()).toBe(false)
    expect(h.store.startSplit).not.toHaveBeenCalled()
  })
  it('keeps the operation identity after a lost POST and presents one visible error', async () => {
    const h = harness()
    h.store.startSplit.mockRejectedValueOnce(failure())
    await h.flow.start()
    await flushPromises()
    expect(h.flow.state.phase).toBe('recovery')
    expect(h.notify).toHaveBeenCalledOnce()
    expect(h.wrapper.get('[data-testid="page-alert-region"]').text()).toContain('Не удалось выполнить разделение')
    expect(h.wrapper.get('[data-testid="page-alert-region"]').findAll('button')).toHaveLength(1)
    await h.wrapper.get('[data-testid="split-retry"]').trigger('click')
    await flushPromises()
    expect(h.flow.state.result).toEqual(result)
    expect(h.store.startSplit).toHaveBeenCalledOnce()
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
  it.each(['start', 'poll'])('unlocks after a confirmed %s failure', async phase => {
    const h = harness()
    if (phase === 'start') h.store.startSplit.mockRejectedValue(failure(409, 'RegisterSplitNoOrdinaryParcels'))
    else h.store.getSplit.mockRejectedValue(failure(409, 'RegisterSplitConflict', { finished: true }))
    await h.flow.start()
    expect(h.flow.state.phase).toBe('idle')
    expect(h.runningAction.value).toBe(false)
    expect(sessionStorage.getItem('register-split:42:7')).toBeNull()
    expect(h.notify).toHaveBeenCalledOnce()
  })
  it('retains completion when source refresh fails, and retries refresh without replay', async () => {
    const h = harness()
    h.refreshRegister.mockRejectedValueOnce(failure(404))
    await h.flow.start()
    expect(h.flow.state.result).toEqual(result)
    expect(h.flow.state.refreshFailed).toBe(true)
    await h.wrapper.get('[data-testid="split-refresh"]').trigger('click')
    await flushPromises()
    expect(h.flow.state.refreshFailed).toBe(false)
    expect(h.store.startSplit).toHaveBeenCalledOnce()
  })
  it('resumes from storage even before source data loads and marks deleted outputs unavailable', async () => {
    sessionStorage.setItem('register-split:42:7', JSON.stringify({ id: 'operation', registerId: 7, userId: 42 }))
    const h = harness()
    await flushPromises()
    expect(h.store.getSplit).toHaveBeenCalledWith(7, 'operation')
    expect(h.store.startSplit).not.toHaveBeenCalled()
    h.flow.state.result.dangerous.available = false
    await flushPromises()
    expect(h.wrapper.find('[data-testid="split-open-dangerous"]').exists()).toBe(false)
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
    expect(wrapper.get('[data-testid="split-results"]').text()).toContain('Latin основной')
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