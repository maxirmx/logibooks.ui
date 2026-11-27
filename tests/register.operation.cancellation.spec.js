// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, onUnmounted, reactive, ref } from 'vue'
import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useRegisterSplit } from '@/composables/useRegisterSplit.js'
import { useRegisterReconciliation } from '@/composables/useRegisterReconciliation.js'
import { useAlertStore } from '@/stores/alert.store.js'
import PageAlertRegion from '@/components/PageAlertRegion.vue'
import RegisterSplitDialogs from '@/l2/RegisterSplitDialogs.vue'
import RegisterReconciliationDialogs from '@/l2/RegisterReconciliationDialogs.vue'
import ActionDialog from '@/l2/ActionDialog.vue'
import { WBRN_REGISTER_ID } from '@/helpers/company.constants.js'
import { reportError } from '@/helpers/error.helpers.js'
import { vuetifyStubs } from './helpers/test-utils.js'

vi.mock('@/composables/useAppConfirm.js', () => ({ useAppConfirm: () => vi.fn().mockResolvedValue(false) }))
vi.mock('@/helpers/error.helpers.js', async original => ({ ...await original(), reportError: vi.fn() }))
const pending = { phase: 'copying', percent: 25, finished: false }
const cancelled = { phase: 'cancelled', finished: true, cancellationRequested: true }
const stubs = { ...vuetifyStubs, RouterLink: RouterLinkStub,
  'v-dialog': { props: ['modelValue', 'persistent'], template: '<section v-if="modelValue" role="dialog"><slot /></section>' },
  'v-btn': { props: ['disabled', 'to'], template: '<button :disabled="disabled"><slot /></button>' },
  'v-progress-circular': { template: '<div><slot /></div>' }
}
let wrappers
function harness(kind) {
  const split = kind === 'split'
  const start = vi.fn().mockResolvedValue({ id: 'op' })
  const get = vi.fn().mockResolvedValue(pending)
  const cancel = vi.fn().mockResolvedValue(cancelled)
  const store = split ? { startSplit: start, getSplit: get, cancelSplit: cancel }
    : { startReconciliation: start, getReconciliation: get, cancelReconciliation: cancel }
  const register = reactive({ id: 7, registerType: WBRN_REGISTER_ID, theOtherCountryCode: 762, hasReconciliationBatch: true })
  const alertStore = useAlertStore()
  const notify = vi.spyOn(alertStore, 'error')
  const refresh = vi.fn().mockResolvedValue(true)
  const running = ref(false)
  let flow
  const component = defineComponent({ components: { PageAlertRegion, OperationDialogs: split ? RegisterSplitDialogs : RegisterReconciliationDialogs },
    setup() {
      flow = (split ? useRegisterSplit : useRegisterReconciliation)({ store, register: () => register,
        authStore: { user: { id: 42 }, isSrLogistPlus: true }, alertStore, busy: () => false,
        runningAction: running, mounted: ref(true), refreshSnapshot: refresh, makeId: () => 'op' })
      onUnmounted(flow.stop)
      return { flow }
    }, template: '<main><hr><PageAlertRegion/><OperationDialogs :state="flow.state" @cancel="flow.cancel" /></main>' })
  const wrapper = mount(component, { global: { stubs } })
  wrappers.push(wrapper)
  return { flow, wrapper, notify, start, get, cancel, refresh, running, register,
    begin: () => split ? flow.start() : flow.selectFiles({ target: { value: 'chosen', files: [new File(['manifest'], 'm.xlsx')] } }),
    completed: { finished: true, phase: 'completed', percent: 100, result: split
      ? { outputs: [{ id: 8, kind: 'ordinary', name: 'Основной', count: 1, available: true }, { id: 9, kind: 'dangerous', name: 'Опасник', count: 1, available: true }], sourceOnlyCount: 0 }
      : { registerId: 7, dangerousGoodsCount: 1, markedCount: 0, newlyMarkedCount: 0, excludedCount: 0, registerOnlyCount: 0, manifestOnlyCount: 0 } }
  }
}
beforeEach(() => {
  setActivePinia(createPinia()); sessionStorage.clear(); wrappers = []
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
})
afterEach(() => { wrappers.forEach(wrapper => wrapper.unmount()); vi.useRealTimers(); vi.restoreAllMocks() })

describe.each(['split', 'reconciliation'])('%s cancellation', kind => {
  it('keeps progress and the mutation lock while the server is cancelling', async () => {
    const h = harness(kind)
    await h.begin()
    h.cancel.mockResolvedValueOnce({ ...pending, cancellationRequested: true })
    h.get.mockResolvedValue({ ...pending, cancellationRequested: true })
    expect(h.wrapper.get('[data-testid="operation-cancel"]').classes()).toContain('text-white')
    await h.wrapper.get('[data-testid="operation-cancel"]').trigger('click'); await flushPromises()
    expect(h.flow.state.progress.show).toBe(true)
    expect(h.running.value).toBe(true)
    expect(h.wrapper.get('[data-testid="operation-cancel"]').text()).toBe('Отмена…')
    expect(h.wrapper.get('[data-testid="operation-cancel"]').attributes('disabled')).toBeDefined()
    expect(await h.flow.cancel()).toBe(false)
    expect(h.cancel).toHaveBeenCalledOnce()
    h.get.mockResolvedValue(cancelled)
    await vi.advanceTimersByTimeAsync(1000)
    expect(h.running.value).toBe(false)
    expect(h.flow.state.progress.show).toBe(false)
  })

  it.each(['cancelled', 'failed'])('reloads the committed snapshot once after terminal %s and holds the lock during reload', async outcome => {
    const h = harness(kind)
    let finishReload
    h.refresh.mockImplementationOnce(() => new Promise(resolve => { finishReload = resolve }))
    let work
    if (outcome === 'cancelled') {
      await h.begin()
      work = h.flow.cancel()
    } else {
      const code = kind === 'split' ? 'RegisterSplitConflict' : 'ReconciliationFailed'
      h.get.mockRejectedValueOnce(Object.assign(new Error('Обработка завершилась ошибкой'), {
        status: 409, data: { code, msg: 'Обработка завершилась ошибкой', details: { finished: true } }
      }))
      work = h.begin()
    }
    await flushPromises()
    expect(h.refresh).toHaveBeenCalledExactlyOnceWith(7)
    expect(h.running.value).toBe(true)
    expect(h.flow.state.canCancel).toBe(false)
    if (outcome === 'failed') {
      expect(h.notify).toHaveBeenCalledOnce()
      expect(h.wrapper.get('[data-testid="page-alert-region"]').text()).toContain('Обработка завершилась ошибкой')
    } else expect(h.notify).not.toHaveBeenCalled()
    finishReload()
    await work
    expect(h.running.value).toBe(false)
    expect(h.flow.state.progress.show).toBe(false)
  })

  it('presents cancellation transport failure once and recovers without replaying the operation', async () => {
    const h = harness(kind)
    await h.begin()
    h.cancel.mockRejectedValueOnce(new Error('Technical transport diagnostic'))
    await h.flow.cancel(); await flushPromises()
    expect(h.flow.state.progress.show).toBe(false)
    expect(h.running.value).toBe(true)
    expect(h.notify).toHaveBeenCalledOnce()
    const alert = h.wrapper.get('[data-testid="page-alert-region"]')
    expect(alert.text()).toContain('Не удалось отменить')
    expect(alert.text()).not.toContain('Technical')
    expect(alert.findAll('button')).toHaveLength(1)
    await h.flow.retry()
    await h.flow.cancel()
    expect(h.cancel).toHaveBeenCalledTimes(2)
    expect(h.start).toHaveBeenCalledOnce()
    expect(h.flow.state.phase).toBe('idle')
  })

  it('reports a terminal reload failure after navigation without a stale alert', async () => {
    const h = harness(kind)
    await h.begin()
    let rejectReload
    h.refresh.mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectReload = reject }))
    const work = h.flow.cancel()
    await flushPromises()
    h.register.id = 8
    const error = new Error('Old snapshot failed')
    rejectReload(error)
    await work
    expect(h.notify).not.toHaveBeenCalled()
    expect(reportError).toHaveBeenCalledWith(error, { context: expect.stringContaining('refresh after') })
  })

  it.each(['resolve', 'reject'])('handles a cancellation response that %ss after navigation', async outcome => {
    const h = harness(kind)
    await h.begin()
    let settle
    h.cancel.mockImplementationOnce(() => new Promise((resolve, reject) => { settle = outcome === 'resolve' ? resolve : reject }))
    const work = h.flow.cancel(); await flushPromises()
    h.wrapper.unmount()
    settle(outcome === 'resolve' ? cancelled : new Error('Cancellation acknowledgement lost'))
    await work
    expect(h.notify).not.toHaveBeenCalled()
    expect(h.flow.state.summaryVisible).toBe(false)
    if (outcome === 'reject') expect(reportError).toHaveBeenCalled()
  })
})

it('keeps other shared progress dialogs without cancel controls unless enabled', () => {
  const wrapper = mount(ActionDialog, { props: { actionDialog: { show: true } }, global: { stubs } })
  wrappers.push(wrapper)
  expect(wrapper.find('[data-testid="operation-cancel"]').exists()).toBe(false)
})
