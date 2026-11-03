// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, defineComponent, onUnmounted } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { useRegistersStore } from '@/stores/registers.store.js'
import { useParcelsStore } from '@/stores/parcels.store.js'
import { useBoxesStore } from '@/stores/boxes.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { useRegisterHeaderActions, POLLING_INTERVAL_MS } from '@/helpers/register.actions.js'
import PageAlertRegion from '@/components/PageAlertRegion.vue'
import RegisterHeaderActionsBar from '@/components/RegisterHeaderActionsBar.vue'
import RegisterActionsDialogs from '@/l2/RegisterActionsDialogs.vue'
import { vuetifyStubs } from './helpers/test-utils.js'

vi.mock('@/helpers/config.js', () => ({ apiUrl: '/api' }))
vi.mock('@/helpers/fetch.wrapper.js', () => ({ fetchWrapper: { get: vi.fn(), delete: vi.fn() } }))
vi.mock('@/router', () => ({ default: {} }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('vuetify-use-dialog', () => ({ useConfirm: () => vi.fn().mockResolvedValue(true) }))

const wrappers = []
let registers, alerts, serverRegister
const operationCases = [
  ['validation', 'getValidationProgress', '/api/registers/validate/handle'],
  ['lookup-feacn-codes', 'getLookupFeacnCodesProgress', '/api/registers/lookup-feacn-codes/handle']
]
function deferred() {
  let resolve, reject
  const promise = new Promise((done, fail) => { resolve = done; reject = fail })
  return { promise, resolve, reject }
}
function open(operation = 'validation') {
  const wrapper = mount(defineComponent({
    components: { PageAlertRegion, RegisterHeaderActionsBar, RegisterActionsDialogs },
    setup() {
      const actions = useRegisterHeaderActions({ registersStore: registers, alertStore: alerts })
      actions.validationState.operation = operation
      onUnmounted(actions.stop)
      return { actions, register: computed(() => registers.item) }
    },
    template: `<div>
      <h1>Реестр</h1><hr class="hr"><PageAlertRegion />
      <RegisterHeaderActionsBar :item="register" :disabled="actions.generalActionsDisabled.value" />
      <RegisterActionsDialogs :validation-state="actions.validationState" :progress-percent="actions.progressPercent.value" :cancel-validation="actions.cancelValidation" :action-dialog="actions.actionDialog" />
    </div>`
  }), {
    global: { stubs: { ...vuetifyStubs,
      'v-dialog': { props: ['modelValue'], template: '<section v-if="modelValue" role="dialog"><slot /></section>' },
      'v-btn': { props: ['disabled'], template: '<button :disabled="disabled"><slot /></button>' },
      ActionButton: {
        props: ['tooltipText', 'disabled'], emits: ['click'],
        template: '<button :aria-label="tooltipText" :disabled="disabled" @click="$emit(\'click\')" />'
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
const exportButton = wrapper => wrapper.get('button[aria-label="Экспортировать реестр"]')

beforeEach(() => {
  vi.useFakeTimers()
  vi.resetAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  setActivePinia(createPinia())
  useAuthStore().user = { roles: ['administrator'] }
  registers = useRegistersStore()
  alerts = useAlertStore()
  serverRegister = { id: 12, customsProcedureCode: 10, derivedTotalsPending: false }
  registers.item = { ...serverRegister }
  registers.items = [{ ...serverRegister }]
  fetchWrapper.get.mockImplementation(async url => {
    if (url.includes('/parcels?')) return { items: [{ id: 1, registerId: 12, adjustedWeightKg: .625 }], pagination: {} }
    if (url.includes('/boxes?')) return [{ id: 5, registerId: 12, weightKg: 2 }]
    if (url.startsWith('/api/registers?')) return { items: [{ ...serverRegister }], pagination: {} }
    return { ...serverRegister }
  })
  fetchWrapper.delete.mockResolvedValue(undefined)
})
afterEach(() => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe.each(operationCases)('%s operation-owned totals lifecycle', (operation, progressMethod, cancelUrl) => {
  const action = operation === 'validation' ? 'validateRegisterSw' : 'lookupFeacnCodes'
  const startMethod = operation === 'validation' ? 'validate' : 'lookupFeacnCodes'
  beforeEach(() => {
    registers[startMethod] = vi.fn().mockResolvedValue({ id: 'handle' })
    registers[progressMethod] = vi.fn().mockResolvedValue({ total: 2, processed: 1, finished: false })
  })
  async function begin() {
    const wrapper = open(operation)
    await wrapper.vm.actions[action]()
    await flushPromises()
    return wrapper
  }

  it('presents startup rejection once without polling or navigating', async () => {
    registers[startMethod].mockRejectedValueOnce(new Error('Unexpected startup failure'))
    const present = vi.spyOn(alerts, 'error')
    const wrapper = await begin()
    expect(wrapper.get('[role="alert"]').text()).toContain('Не удалось запустить')
    expect(wrapper.text()).not.toContain('Unexpected startup failure')
    expect(present).toHaveBeenCalledOnce()
    expect(registers[progressMethod]).not.toHaveBeenCalled()
    expect(wrapper.vm.actions.validationState.show).toBe(false)
  })

  it('coalesces slow progress reads and ignores a queued tick after teardown', async () => {
    const scheduled = vi.spyOn(globalThis, 'setInterval')
    const wrapper = await begin()
    const pending = deferred()
    registers[progressMethod].mockReturnValueOnce(pending.promise)
    await vi.advanceTimersByTimeAsync(POLLING_INTERVAL_MS * 2)
    expect(registers[progressMethod]).toHaveBeenCalledTimes(2)
    pending.resolve({ total: 2, processed: 1, finished: false })
    await flushPromises()
    const tick = scheduled.mock.calls[0][0]
    wrapper.unmount()
    await tick()
    expect(registers[progressMethod]).toHaveBeenCalledTimes(2)
    expect(alerts.alert).toBeNull()
  })

  it.each(['pending', 'accepted', 'rejected'])('retains cancellation ownership when an old poll rejects with acknowledgement %s', async acknowledgement => {
    const wrapper = await begin()
    const pendingPoll = deferred()
    registers[progressMethod].mockReturnValueOnce(pendingPoll.promise)
    await vi.advanceTimersByTimeAsync(POLLING_INTERVAL_MS)
    const pendingCancel = deferred()
    fetchWrapper.delete.mockReturnValueOnce(pendingCancel.promise)
    const reload = vi.spyOn(registers, 'refreshDerived')
    const present = vi.spyOn(alerts, 'error')
    const cancellation = wrapper.vm.actions.cancelValidation()
    await flushPromises()
    if (acknowledgement === 'accepted') pendingCancel.resolve()
    if (acknowledgement === 'rejected') pendingCancel.reject(new Error('Unexpected operation rejection'))
    if (acknowledgement !== 'pending') await cancellation
    pendingPoll.reject(new Error('Unexpected delayed progress failure'))
    await flushPromises()
    expect(wrapper.vm.actions.validationState.handleId).toBe('handle')
    expect(wrapper.vm.actions.validationState.show).toBe(true)
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
    expect(reload).not.toHaveBeenCalled()
    expect(present).toHaveBeenCalledTimes(acknowledgement === 'rejected' ? 1 : 0)
    if (acknowledgement === 'pending') {
      pendingCancel.resolve()
      await cancellation
    }
    registers[progressMethod].mockResolvedValue({ total: 2, processed: 1, finished: true })
    await vi.advanceTimersByTimeAsync(POLLING_INTERVAL_MS)
    await flushPromises()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(reload).toHaveBeenCalledExactlyOnceWith(12)
    expect(registers[startMethod]).toHaveBeenCalledOnce()
    expect(fetchWrapper.delete).toHaveBeenCalledExactlyOnceWith(cancelUrl)
    expect(wrapper.text()).not.toContain('Unexpected delayed progress failure')
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('register operation progress or reload'), expect.any(Error))
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(acknowledgement === 'rejected' ? 1 : 0)
    if (acknowledgement === 'rejected') expect(wrapper.get('[role="alert"]').text()).toContain('Не удалось отменить')
  })

  it('ignores terminal progress fetched before cancellation until the cancellation owner polls again', async () => {
    const wrapper = await begin()
    const pendingPoll = deferred()
    registers[progressMethod].mockReturnValueOnce(pendingPoll.promise)
    await vi.advanceTimersByTimeAsync(POLLING_INTERVAL_MS)
    const reload = vi.spyOn(registers, 'refreshDerived')
    await wrapper.vm.actions.cancelValidation()
    pendingPoll.resolve({ total: 2, processed: 2, finished: true })
    await flushPromises()
    expect(wrapper.vm.actions.validationState.show).toBe(true)
    expect(reload).not.toHaveBeenCalled()
    registers[progressMethod].mockResolvedValue({ total: 2, processed: 2, finished: true })
    await vi.advanceTimersByTimeAsync(POLLING_INTERVAL_MS)
    await flushPromises()
    expect(reload).toHaveBeenCalledOnce()
    expect(wrapper.vm.actions.validationState.show).toBe(false)
  })

  it('waits for terminal cancellation then reloads the current register, boxes and parcel page once', async () => {
    await useBoxesStore().getAll(12)
    await useParcelsStore().getAll(12, { boxId: 5 })
    fetchWrapper.get.mockClear()
    const wrapper = await begin()
    const reload = vi.spyOn(registers, 'refreshDerived')
    const button = wrapper.get('[role="dialog"] button')
    await button.trigger('click'); await flushPromises()
    expect(fetchWrapper.delete).toHaveBeenCalledExactlyOnceWith(cancelUrl)
    expect(wrapper.vm.actions.validationState.show).toBe(true)
    expect(button.text()).toBe('Отмена…')
    expect(button.element.disabled).toBe(true)
    expect(await wrapper.vm.actions.cancelValidation()).toBe(false)
    expect(reload).not.toHaveBeenCalled()
    registers[progressMethod].mockResolvedValue({ total: 2, processed: 1, finished: true })
    await vi.advanceTimersByTimeAsync(POLLING_INTERVAL_MS)
    await flushPromises()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(reload).toHaveBeenCalledExactlyOnceWith(12)
    expect(fetchWrapper.get.mock.calls.map(([url]) => url).filter(url => url === '/api/registers/12')).toHaveLength(1)
    expect(useParcelsStore().items[0].adjustedWeightKg).toBe(.625)
    expect(exportButton(wrapper).element.disabled).toBe(false)
    const calls = registers[progressMethod].mock.calls.length
    await vi.advanceTimersByTimeAsync(10000)
    expect(registers[progressMethod]).toHaveBeenCalledTimes(calls)
    expect(registers[startMethod]).toHaveBeenCalledOnce()
  })
  it('does not report a second alert if terminal processing and its reload both fail', async () => {
    registers[progressMethod].mockResolvedValue({ total: 2, processed: 1, finished: true, error: 'Ошибка обработки реестра 12' })
    vi.spyOn(registers, 'refreshDerived').mockRejectedValueOnce(new Error('Technical reload failure'))
    const present = vi.spyOn(alerts, 'error')
    const wrapper = await begin()
    expect(wrapper.get('[role="alert"]').text()).toContain('Ошибка обработки реестра 12')
    expect(present).toHaveBeenCalledOnce()
  })
  it('observes late cancellation failure after navigation without replacing another page alert', async () => {
    const wrapper = await begin()
    const pending = deferred()
    fetchWrapper.delete.mockReturnValueOnce(pending.promise)
    const work = wrapper.vm.actions.cancelValidation()
    wrapper.unmount()
    alerts.info('Сообщение другой страницы')
    pending.reject(new Error('Technical late cancellation failure'))
    await work
    expect(alerts.alert.message).toBe('Сообщение другой страницы')
    expect(console.error).toHaveBeenCalled()
  })

  it.each(['resolve', 'reject'])('ignores operation startup that %ss after navigation', async outcome => {
    const pending = deferred()
    registers[startMethod].mockReturnValueOnce(pending.promise)
    const wrapper = open(operation)
    const work = wrapper.vm.actions[action]()
    await flushPromises()
    wrapper.unmount()
    alerts.info('Сообщение другой страницы')
    if (outcome === 'resolve') pending.resolve({ id: 'late-handle' })
    else pending.reject(new Error('Unexpected startup failure'))
    await work
    expect(alerts.alert.message).toBe('Сообщение другой страницы')
    expect(registers[progressMethod]).not.toHaveBeenCalled()
  })
})
