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
import RegisterTotalsRefreshButton from '@/components/RegisterTotalsRefreshButton.vue'

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
    components: { PageAlertRegion, RegisterHeaderActionsBar },
    setup() {
      const actions = useRegisterHeaderActions({ registersStore: registers, alertStore: alerts })
      Object.assign(actions.validationState, { operation, registerId: 12, handleId: 'handle', show: true })
      onUnmounted(actions.stop)
      return { actions, register: computed(() => registers.item) }
    },
    template: `<div>
      <h1>Реестр</h1><hr class="hr"><PageAlertRegion />
      <RegisterHeaderActionsBar :item="register" :disabled="actions.generalActionsDisabled.value" />
      <button aria-label="Отменить проверку" @click="actions.cancelValidation">Отменить</button>
    </div>`
  }), {
    global: { stubs: {
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

describe.each(operationCases)('%s successful completion totals recovery', (operation, progressMethod) => {
  const action = operation === 'validation' ? 'validateRegisterSw' : 'lookupFeacnCodes'
  const startMethod = operation === 'validation' ? 'validate' : 'lookupFeacnCodes'

  async function run(wrapper) {
    wrapper.vm.actions.validationState.show = false
    await wrapper.vm.actions[action]()
    await flushPromises()
  }

  beforeEach(() => {
    registers[startMethod] = vi.fn().mockResolvedValue({ id: 'handle' })
    registers[progressMethod] = vi.fn().mockResolvedValue({ total: 10, processed: 10, finished: true })
  })

  it.each(['initial', 'polled'])('recovers pending totals after %s completion and re-enables exports and documents', async phase => {
    serverRegister.derivedTotalsPending = true
    registers.item = { ...serverRegister }
    const parcels = useParcelsStore()
    const get = fetchWrapper.get.getMockImplementation()
    fetchWrapper.get.mockImplementation(async url => url.includes('/parcels?')
      ? { items: [{ id: 1, registerId: 12, derivedTotalsPending: serverRegister.derivedTotalsPending, adjustedWeightKg: serverRegister.derivedTotalsPending ? null : .625 }], pagination: {} }
      : get(url))
    await parcels.getAll(12)
    const wrapper = open(operation)
    if (phase === 'polled') {
      registers[progressMethod].mockResolvedValueOnce({ total: 10, processed: 5, finished: false })
    }
    await run(wrapper)
    if (phase === 'polled') {
      expect(wrapper.vm.actions.validationState.show).toBe(true)
      await vi.advanceTimersByTimeAsync(POLLING_INTERVAL_MS)
    }
    expect(wrapper.vm.actions.validationState.show).toBe(false)
    expect(exportButton(wrapper).element.disabled).toBe(true)
    expect(parcels.items[0].derivedTotalsPending).toBe(true)
    expect(wrapper.get('button[aria-label="инвойс-манифест (все)"]').element.disabled).toBe(true)
    const progressRequests = registers[progressMethod].mock.calls.length
    await vi.advanceTimersByTimeAsync(POLLING_INTERVAL_MS)
    expect(exportButton(wrapper).element.disabled).toBe(true)
    serverRegister.derivedTotalsPending = false
    await vi.advanceTimersByTimeAsync(POLLING_INTERVAL_MS)
    expect(exportButton(wrapper).element.disabled).toBe(false)
    expect(wrapper.get('button[aria-label="инвойс-манифест (все)"]').element.disabled).toBe(false)
    expect(registers.items[0].derivedTotalsPending).toBe(false)
    expect(parcels.items[0]).toMatchObject({ derivedTotalsPending: false, adjustedWeightKg: .625 })
    expect(registers[progressMethod]).toHaveBeenCalledTimes(progressRequests)
    expect(registers[startMethod]).toHaveBeenCalledTimes(1)
    expect(fetchWrapper.delete).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('shows the initial totals-refresh rejection once and retries without restarting the operation', async () => {
    const failure = new Error('Unexpected totals failure')
    const get = fetchWrapper.get.getMockImplementation()
    let failures = 2
    fetchWrapper.get.mockImplementation(async url => {
      if (url === '/api/registers/12' && failures-- > 0) throw failure
      return get(url)
    })
    const report = vi.spyOn(alerts, 'error')
    const wrapper = open(operation)
    await run(wrapper)
    expect(wrapper.vm.actions.validationState.show).toBe(false)
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.get('[role="alert"]').text()).toContain('Не удалось обновить итоги реестра после проверки')
    expect(wrapper.text()).not.toContain('Unexpected totals failure')
    expect(exportButton(wrapper).element.disabled).toBe(true)
    await vi.advanceTimersByTimeAsync(POLLING_INTERVAL_MS)
    expect(report).toHaveBeenCalledTimes(1)
    expect(console.error).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(POLLING_INTERVAL_MS)
    expect(exportButton(wrapper).element.disabled).toBe(false)
    expect(registers[startMethod]).toHaveBeenCalledTimes(1)
    expect(registers[progressMethod]).toHaveBeenCalledTimes(1)
    expect(fetchWrapper.delete).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('does not schedule recovery when the first totals response is ready', async () => {
    const wrapper = open(operation)
    await run(wrapper)
    expect(exportButton(wrapper).element.disabled).toBe(false)
    const requests = fetchWrapper.get.mock.calls.length
    await vi.advanceTimersByTimeAsync(POLLING_INTERVAL_MS * 2)
    expect(fetchWrapper.get).toHaveBeenCalledTimes(requests)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('stops pending totals recovery on page exit', async () => {
    serverRegister.derivedTotalsPending = true
    const wrapper = open(operation)
    await run(wrapper)
    expect(vi.getTimerCount()).toBe(1)
    wrapper.unmount()
    const requests = fetchWrapper.get.mock.calls.length
    await vi.advanceTimersByTimeAsync(POLLING_INTERVAL_MS * 2)
    expect(fetchWrapper.get).toHaveBeenCalledTimes(requests)
    expect(vi.getTimerCount()).toBe(0)
  })

  it.each([
    ['progress', 'success'], ['progress', 'failure'],
    ['list', 'success'], ['list', 'failure'],
    ['totals', 'success'], ['totals', 'failure']
  ])('ignores a late %s %s after page exit', async (stage, outcome) => {
    serverRegister.derivedTotalsPending = true
    const pending = deferred()
    const get = fetchWrapper.get.getMockImplementation()
    if (stage === 'progress') registers[progressMethod].mockReturnValueOnce(pending.promise)
    else fetchWrapper.get.mockImplementation(url =>
      (stage === 'list' ? url.startsWith('/api/registers?') : url === '/api/registers/12')
        ? pending.promise : get(url))
    const wrapper = open(operation)
    const running = run(wrapper)
    await flushPromises()
    wrapper.unmount()
    alerts.info('Сообщение другой страницы', { timeout: null })
    const requests = fetchWrapper.get.mock.calls.length
    if (outcome === 'failure') pending.reject(new Error('Late operation failure'))
    else if (stage === 'progress') pending.resolve({ total: 10, processed: 10, finished: true })
    else if (stage === 'list') pending.resolve({ items: [{ ...serverRegister }], pagination: {} })
    else pending.resolve({ ...serverRegister })
    await running
    await vi.advanceTimersByTimeAsync(POLLING_INTERVAL_MS * 2)
    expect(alerts.alert.message).toBe('Сообщение другой страницы')
    expect(fetchWrapper.get).toHaveBeenCalledTimes(requests)
    expect(console.error).toHaveBeenCalledTimes(outcome === 'failure' ? 1 : 0)
    expect(vi.getTimerCount()).toBe(0)
  })
})

describe.each(operationCases)('%s cancellation totals recovery', (operation, progressMethod, cancelUrl) => {
  it('waits for cancellation, then recovers pending register, documents and boxes', async () => {
    const cancellation = deferred()
    fetchWrapper.delete.mockReturnValueOnce(cancellation.promise)
    const boxes = useBoxesStore()
    await boxes.getAll(12)
    const wrapper = open(operation)
    await wrapper.get('button[aria-label="Отменить проверку"]').trigger('click')
    expect(fetchWrapper.delete).toHaveBeenCalledExactlyOnceWith(cancelUrl)
    expect(registers.item.derivedTotalsPending).toBe(true)
    expect(boxes.boxes[0].derivedTotalsPending).toBe(true)
    expect(exportButton(wrapper).element.disabled).toBe(true)
    expect(fetchWrapper.get.mock.calls.some(([url]) => url === '/api/registers/12')).toBe(false)
    // A second dialog-close event must not issue another cancellation.
    expect(await wrapper.vm.actions.cancelValidation()).toBe(false)
    serverRegister.derivedTotalsPending = true
    cancellation.resolve()
    await flushPromises()
    expect(exportButton(wrapper).element.disabled).toBe(true)
    expect(wrapper.get('button[aria-label="инвойс-манифест (все)"]').element.disabled).toBe(true)
    await vi.advanceTimersByTimeAsync(POLLING_INTERVAL_MS)
    expect(exportButton(wrapper).element.disabled).toBe(true)
    serverRegister.derivedTotalsPending = false
    await vi.advanceTimersByTimeAsync(POLLING_INTERVAL_MS)
    expect(exportButton(wrapper).element.disabled).toBe(false)
    expect(wrapper.get('button[aria-label="инвойс-манифест (все)"]').element.disabled).toBe(false)
    expect(registers.items[0].derivedTotalsPending).toBe(false)
    expect(boxes.boxes[0].weightKg).toBe(2)
    expect(boxes.boxes[0].derivedTotalsPending).not.toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('shows cancellation rejection once and still reconciles the invalidated totals', async () => {
    const failure = new Error('Unexpected transport failure')
    fetchWrapper.delete.mockRejectedValueOnce(failure)
    const report = vi.spyOn(alerts, 'error')
    const wrapper = open(operation)
    expect(await wrapper.vm.actions.cancelValidation()).toBe(false)
    await flushPromises()
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.get('[role="alert"]').text()).toContain('Не удалось отменить проверку реестра')
    expect(wrapper.text()).not.toContain('Unexpected transport failure')
    expect(report).toHaveBeenCalledTimes(1)
    expect(console.error).toHaveBeenCalledWith('[register totals recovery]', failure)
    expect(registers.item.derivedTotalsPending).toBe(false)
    expect(exportButton(wrapper).element.disabled).toBe(false)
  })

  it('shows refresh rejection once and retries totals refresh without repeating cancellation', async () => {
    const failure = new Error('Unexpected projection failure')
    fetchWrapper.get.mockRejectedValueOnce(failure).mockRejectedValueOnce(failure)
    const report = vi.spyOn(alerts, 'error')
    const wrapper = open(operation)
    expect(await wrapper.vm.actions.cancelValidation()).toBe(false)
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('Не удалось обновить итоги реестра после отмены проверки')
    expect(exportButton(wrapper).element.disabled).toBe(true)
    await vi.advanceTimersByTimeAsync(POLLING_INTERVAL_MS)
    expect(report).toHaveBeenCalledTimes(1)
    expect(console.error).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(POLLING_INTERVAL_MS)
    expect(exportButton(wrapper).element.disabled).toBe(false)
    expect(fetchWrapper.delete).toHaveBeenCalledTimes(1)
    expect(fetchWrapper.get).toHaveBeenCalledTimes(3)
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(vi.getTimerCount()).toBe(0)
  })

  it.each(['success', 'failure'])('ignores a late %s progress response after cancellation', async outcome => {
    const progress = deferred()
    const started = operation === 'validation' ? 'validateRegisterSw' : 'lookupFeacnCodes'
    const startMethod = operation === 'validation' ? 'validate' : 'lookupFeacnCodes'
    registers[startMethod] = vi.fn().mockResolvedValue({ id: 'handle' })
    registers[progressMethod] = vi.fn().mockReturnValue(progress.promise)
    const getAll = vi.spyOn(registers, 'getAll')
    const wrapper = open(operation)
    // The harness starts with a dialog open; close it before starting a real operation.
    wrapper.vm.actions.validationState.show = false
    const running = wrapper.vm.actions[started]()
    await flushPromises()
    await wrapper.vm.actions.cancelValidation()
    if (outcome === 'success') progress.resolve({ total: 10, processed: 10, finished: true })
    else progress.reject(new Error('Late progress failure'))
    await running
    expect(getAll).not.toHaveBeenCalled()
    expect(alerts.alert).toBe(null)
    expect(vi.getTimerCount()).toBe(0)
  })
})

it('stops scheduled recovery on teardown', async () => {
  serverRegister.derivedTotalsPending = true
  const wrapper = open()
  await wrapper.vm.actions.cancelValidation()
  expect(vi.getTimerCount()).toBe(1)
  wrapper.unmount()
  await vi.advanceTimersByTimeAsync(POLLING_INTERVAL_MS * 2)
  expect(fetchWrapper.get).toHaveBeenCalledTimes(1)
  expect(vi.getTimerCount()).toBe(0)
})

it.each(['cancellation', 'refresh'])('consumes an in-flight %s rejection after teardown without a stale alert', async stage => {
  const pending = deferred()
  if (stage === 'cancellation') fetchWrapper.delete.mockReturnValueOnce(pending.promise)
  else fetchWrapper.get.mockReturnValueOnce(pending.promise)
  const wrapper = open()
  const cancelling = wrapper.vm.actions.cancelValidation()
  await flushPromises()
  wrapper.unmount()
  alerts.info('Сообщение другой страницы', { timeout: null })
  pending.reject(new Error('Late failure'))
  expect(await cancelling).toBe(false)
  expect(alerts.alert.message).toBe('Сообщение другой страницы')
  expect(console.error).toHaveBeenCalledTimes(1)
  expect(vi.getTimerCount()).toBe(0)
  expect(fetchWrapper.get).toHaveBeenCalledTimes(stage === 'cancellation' ? 0 : 1)
})

it('replaces an older recovery for the same register without leaving an extra timer', async () => {
  serverRegister.derivedTotalsPending = true
  const wrapper = open()
  await wrapper.vm.actions.cancelValidation()
  Object.assign(wrapper.vm.actions.validationState, { handleId: 'second-handle', show: true })
  await wrapper.vm.actions.cancelValidation()
  expect(vi.getTimerCount()).toBe(1)
  serverRegister.derivedTotalsPending = false
  await vi.advanceTimersByTimeAsync(POLLING_INTERVAL_MS)
  expect(exportButton(wrapper).element.disabled).toBe(false)
  expect(vi.getTimerCount()).toBe(0)
})

it.each(['automatic', 'manual'])('presents one failure when %s totals refresh starts first', async first => {
  serverRegister.derivedTotalsPending = true
  const wrapper = open()
  await wrapper.vm.actions.cancelValidation()
  const pending = deferred()
  fetchWrapper.get.mockReturnValueOnce(pending.promise)
  const refresh = wrapper.getComponent(RegisterTotalsRefreshButton).vm.$.setupState.refresh
  const presentation = vi.spyOn(alerts, 'error')
  if (first === 'automatic') {
    await vi.advanceTimersByTimeAsync(POLLING_INTERVAL_MS)
    expect(wrapper.get('button[aria-label="Обновить итоги"]').element.disabled).toBe(true)
    expect(await refresh()).toBe(false)
  } else {
    await wrapper.get('button[aria-label="Обновить итоги"]').trigger('click')
    await flushPromises()
    await vi.advanceTimersByTimeAsync(POLLING_INTERVAL_MS)
  }
  expect(fetchWrapper.get).toHaveBeenCalledTimes(2)
  const failure = new Error('Unexpected shared refresh failure')
  pending.reject(failure)
  await flushPromises()
  expect(presentation).toHaveBeenCalledTimes(1)
  expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
  expect(wrapper.get('[role="alert"]').text()).not.toContain(failure.message)
  expect(console.error).toHaveBeenCalledTimes(1)
  expect(registers.isRefreshingDerived(12)).toBe(false)
  serverRegister.derivedTotalsPending = false
  await vi.advanceTimersByTimeAsync(POLLING_INTERVAL_MS)
  expect(exportButton(wrapper).element.disabled).toBe(false)
  expect(presentation).toHaveBeenCalledTimes(1)
  expect(vi.getTimerCount()).toBe(0)
})
