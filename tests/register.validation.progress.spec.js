// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { onBeforeUnmount } from 'vue'
import { createVuetify } from 'vuetify'
import { calculateValidationProgress, createRegisterActionHandlers } from '@/helpers/register.actions.js'
import { useRegistersStore } from '@/stores/registers.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import * as errorHelpers from '@/helpers/error.helpers.js'
import RegisterActionsDialogs from '@/l2/RegisterActionsDialogs.vue'
import PageAlertRegion from '@/components/PageAlertRegion.vue'
import { vuetifyStubs } from './helpers/test-utils.js'

vi.mock('@/helpers/config.js', () => ({ apiUrl: '/api' }))
vi.mock('@/helpers/fetch.wrapper.js', () => ({ fetchWrapper: { get: vi.fn(), post: vi.fn(), delete: vi.fn() } }))
vi.mock('@/stores/auth.store.js', () => ({ useAuthStore: () => ({ registers_page: 1, registers_per_page: 25 }) }))

function deferred() {
  let resolve, reject
  const promise = new Promise((done, fail) => { resolve = done; reject = fail })
  return { promise, resolve, reject }
}
let wrappers, progress, progressRequests, gates, diagnostics
const register = () => ({ id: 1, derivedTotalsPending: false })
const listReads = () => fetchWrapper.get.mock.calls.filter(([url]) => url.startsWith('/api/registers?'))
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] })
  setActivePinia(createPinia())
  vi.resetAllMocks()
  wrappers = []
  progress = { total: 10, processed: 2, finished: false }
  progressRequests = []
  gates = {}
  diagnostics = vi.spyOn(errorHelpers, 'reportError').mockImplementation(() => {})
  useRegistersStore().item = register()
  useRegistersStore().items = [register()]
  fetchWrapper.post.mockResolvedValue({ id: 'operation' })
  fetchWrapper.delete.mockResolvedValue(undefined)
  fetchWrapper.get.mockImplementation(async url => {
    if (/\/(validate|lookup-feacn-codes)\/operation$/.test(url)) return progressRequests.shift()?.promise ?? { ...progress }
    if (url === '/api/registers/ops') return { customsProcedures: [], transportationTypes: [], incoterms: [{ value: 2 }] }
    if (url.startsWith('/api/registers?')) return gates.list?.promise ?? { items: [register()], pagination: {} }
    if (url === '/api/registers/1') return gates.totals?.promise ?? register()
    throw new Error('Unexpected request: ' + url)
  })
})
afterEach(async () => {
  wrappers.forEach(wrapper => wrapper.unmount())
  await flushPromises()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function open(kind, { retainClosingDialog = false } = {}) {
  let actions
  const wrapper = mount({
    components: { RegisterActionsDialogs, PageAlertRegion },
    setup() {
      actions = createRegisterActionHandlers(useRegistersStore(), useAlertStore())
      onBeforeUnmount(actions.stopPolling)
      const start = () => kind === 'validation'
        ? actions.validateRegisterSw({ id: 1 }) : actions.lookupFeacnCodes({ id: 1 })
      return { ...actions, start }
    },
    template: `<div><h1>Реестр</h1><hr class="hr"><PageAlertRegion />
      <button data-start @click="start">Начать</button>
      <RegisterActionsDialogs :validation-state="validationState" :progress-percent="progressPercent"
        :cancel-validation="cancelValidation" :action-dialog="{ show: false }" />
    </div>`
  }, { global: { stubs: {
    ...vuetifyStubs,
    // A dialog remains rendered during its leave transition after modelValue becomes false.
    'v-dialog': { props: ['modelValue', 'persistent'], template: `<section v-if="modelValue || ${retainClosingDialog}" role="dialog" :data-persistent="String(persistent)"><slot /></section>` },
    'v-progress-circular': { props: ['modelValue', 'indeterminate'], template: '<div role="progressbar" :data-indeterminate="String(indeterminate)" :aria-valuenow="indeterminate ? undefined : modelValue"><slot /></div>' },
    'v-btn': { props: ['disabled'], template: '<button data-cancel :disabled="disabled"><slot /></button>' }
  } } })
  wrappers.push(wrapper)
  return { wrapper, actions }
}
const title = wrapper => wrapper.get('.app-dialog-frame__title-text').text()
const busy = wrapper => {
  expect(wrapper.get('[role="progressbar"]').attributes('data-indeterminate')).toBe('disable-shrink')
  expect(wrapper.get('[role="progressbar"]').attributes('aria-valuenow')).toBeUndefined()
  expect(wrapper.get('[role="progressbar"]').text()).not.toContain('%')
  expect(wrapper.get('[role="progressbar"]').classes()).toContain('register-progress--spinning')
}

describe.each(['validation', 'lookup'])('%s progress and totals refresh', kind => {
  it.each([0, -1, 10])('uses a constant arc spinner while refreshing completed total=%s', async total => {
    const { wrapper, actions } = open(kind)
    await wrapper.get('[data-start]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[role="progressbar"]').text()).toBe('20%')
    expect(title(wrapper)).toBe(kind === 'validation' ? 'Проверка реестра' : 'Подбор кодов ТН ВЭД')
    progress = { total, processed: total, finished: true }
    gates.list = deferred()
    gates.totals = deferred()
    await vi.advanceTimersByTimeAsync(1000)
    await flushPromises()
    expect(title(wrapper)).toBe('Пересчёт итогов')
    busy(wrapper)
    expect(wrapper.get('[data-cancel]').element.disabled).toBe(true)
    expect(wrapper.get('[role="dialog"]').attributes('data-persistent')).toBe('true')
    expect(await actions.cancelValidation()).toBe(false)
    expect(fetchWrapper.delete).not.toHaveBeenCalled()
    gates.list.resolve({ items: [register()], pagination: {} })
    await flushPromises()
    expect(title(wrapper)).toBe('Пересчёт итогов')
    busy(wrapper)
    gates.totals.resolve(register())
    await flushPromises()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(actions.validationState.phase).toBe('refreshing-totals')
    expect(useAlertStore().alert).toBeNull()
  })

  it.each([0, 10])('shows a constant arc spinner once all total=%s items are processed on the server', async total => {
    progress = { total, processed: total, finished: false }
    const { wrapper } = open(kind)
    await wrapper.get('[data-start]').trigger('click')
    await flushPromises()
    expect(title(wrapper)).toBe('Завершение обработки')
    busy(wrapper)
    expect(wrapper.get('[data-cancel]').element.disabled).toBe(false)
    expect(listReads()).toHaveLength(0)
  })

  it.each(['resolve', 'reject'])('keeps the spinner and totals title throughout closing after the final list read ends with %s', async outcome => {
    const { wrapper, actions } = open(kind, { retainClosingDialog: true })
    await wrapper.get('[data-start]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[role="progressbar"]').classes()).not.toContain('register-progress--spinning')
    progress = { total: 10, processed: 10, finished: true }
    gates.list = deferred()
    await vi.advanceTimersByTimeAsync(1000)
    await flushPromises()
    expect(title(wrapper)).toBe('Пересчёт итогов')
    busy(wrapper)
    const indicator = wrapper.get('[role="progressbar"]').element
    gates.list[outcome](outcome === 'resolve'
      ? { items: [register()], pagination: {} } : new Error('Не удалось обновить список реестров'))
    await flushPromises()
    expect(actions.validationState.show).toBe(false)
    expect(actions.validationState.handleId).toBeNull()
    expect(wrapper.get('[role="progressbar"]').element).toBe(indicator)
    expect(title(wrapper)).toBe('Пересчёт итогов')
    busy(wrapper)
    if (outcome === 'reject') expect(wrapper.get('[role="alert"]').text()).toContain('Не удалось обновить список реестров')
    gates.list = null
    progress = { total: 10, processed: 2, finished: false }
    await wrapper.get('[data-start]').trigger('click')
    await flushPromises()
    expect(actions.validationState.show).toBe(true)
    expect(title(wrapper)).toBe(kind === 'validation' ? 'Проверка реестра' : 'Подбор кодов ТН ВЭД')
    expect(wrapper.get('[role="progressbar"]').text()).toBe('20%')
    expect(wrapper.get('[role="progressbar"]').classes()).not.toContain('register-progress--spinning')
  })

  it.each(['resolve', 'reject'])('keeps the totals stage when an older progress request ends with %s', async outcome => {
    const { wrapper } = open(kind)
    await wrapper.get('[data-start]').trigger('click')
    await flushPromises()
    const stale = deferred()
    progressRequests.push(stale, { promise: Promise.resolve({ total: 0, processed: 0, finished: true }) })
    gates.list = deferred()
    await vi.advanceTimersByTimeAsync(2000)
    await flushPromises()
    expect(title(wrapper)).toBe('Пересчёт итогов')
    stale[outcome](outcome === 'resolve' ? { total: 10, processed: 0, finished: false } : new Error('Ошибка старого запроса прогресса'))
    await flushPromises()
    expect(title(wrapper)).toBe('Пересчёт итогов')
    busy(wrapper)
    expect(listReads()).toHaveLength(1)
    expect(useAlertStore().alert).toBeNull()
    expect(diagnostics).toHaveBeenCalledTimes(outcome === 'reject' ? 1 : 0)
    gates.list.resolve({ items: [register()], pagination: {} })
    await flushPromises()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })

  it.each([
    ['resolve', 'resolve'], ['resolve', 'reject'], ['reject', 'resolve'], ['reject', 'reject']
  ])('ignores old progress after the final list read ends with %s and the old request ends with %s', async (completion, outcome) => {
    const { wrapper, actions } = open(kind)
    const presentation = vi.spyOn(useAlertStore(), 'error')
    await wrapper.get('[data-start]').trigger('click')
    await flushPromises()
    const stale = deferred()
    progressRequests.push(stale, { promise: Promise.resolve({ total: 0, processed: 0, finished: true }) })
    gates.list = deferred()
    await vi.advanceTimersByTimeAsync(2000)
    gates.list[completion](completion === 'resolve'
      ? { items: [register()], pagination: {} } : new Error('Ошибка обновления списка реестров'))
    await flushPromises()
    expect(actions.validationState.handleId).toBeNull()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    stale[outcome](outcome === 'resolve'
      ? { total: 0, processed: 0, finished: true } : new Error('Ошибка старого запроса прогресса'))
    await flushPromises()
    expect(listReads()).toHaveLength(1)
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(presentation).toHaveBeenCalledTimes(completion === 'reject' ? 1 : 0)
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(completion === 'reject' ? 1 : 0)
    if (completion === 'reject') expect(wrapper.get('[role="alert"]').text()).toContain('Ошибка обновления списка реестров')
    expect(diagnostics).toHaveBeenCalledTimes(outcome === 'reject' ? 1 : 0)
  })

  it('presents a rejected final list refresh once, closes the progress dialog and allows a new attempt', async () => {
    const { wrapper, actions } = open(kind)
    const presentation = vi.spyOn(useAlertStore(), 'error')
    await wrapper.get('[data-start]').trigger('click')
    await flushPromises()
    progress = { total: 0, processed: 0, finished: true }
    gates.list = deferred()
    const read = vi.spyOn(useRegistersStore(), 'getAll')
    await vi.advanceTimersByTimeAsync(1000)
    const failure = new Error('Не удалось обновить список реестров')
    gates.list.reject(failure)
    await flushPromises()
    await expect(read.mock.results[0].value).rejects.toBe(failure)
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(actions.validationState.phase).toBe('refreshing-totals')
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.get('[role="alert"]').text()).toContain(failure.message)
    expect(presentation).toHaveBeenCalledOnce()
    expect(listReads()).toHaveLength(1)
    gates.list = null
    await wrapper.get('[data-start]').trigger('click')
    await flushPromises()
    expect(fetchWrapper.post).toHaveBeenCalledTimes(2)
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(presentation).toHaveBeenCalledOnce()
  })

  it('observes a rejected totals read, displays it once and retries the read without restarting processing', async () => {
    const { wrapper } = open(kind)
    const presentation = vi.spyOn(useAlertStore(), 'error')
    await wrapper.get('[data-start]').trigger('click')
    await flushPromises()
    progress = { total: 0, processed: 0, finished: true }
    gates.totals = deferred()
    const read = vi.spyOn(useRegistersStore(), 'refreshDerived')
    await vi.advanceTimersByTimeAsync(1000)
    const failure = new Error('Не удалось обновить итоги реестра')
    gates.totals.reject(failure)
    await flushPromises()
    await expect(read.mock.results[0].value).rejects.toBe(failure)
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(wrapper.get('[role="alert"]').text()).toContain(failure.message)
    expect(presentation).toHaveBeenCalledOnce()
    expect(diagnostics).toHaveBeenCalledExactlyOnceWith(failure, { context: 'register totals recovery' })
    gates.totals = null
    await vi.advanceTimersByTimeAsync(1000)
    await flushPromises()
    expect(read).toHaveBeenCalledTimes(2)
    expect(fetchWrapper.post).toHaveBeenCalledOnce()
    expect(presentation).toHaveBeenCalledOnce()
  })

  it('reports a late failure after teardown without notifying the next page', async () => {
    const { wrapper } = open(kind)
    await wrapper.get('[data-start]').trigger('click')
    await flushPromises()
    progress = { total: 0, processed: 0, finished: true }
    gates.list = deferred()
    await vi.advanceTimersByTimeAsync(1000)
    wrapper.unmount()
    useAlertStore().info('Сообщение новой страницы')
    const failure = new Error('Ошибка устаревшего запроса')
    gates.list.reject(failure)
    await flushPromises()
    expect(useAlertStore().alert.message).toBe('Сообщение новой страницы')
    expect(diagnostics).toHaveBeenCalledOnce()
    expect(diagnostics.mock.calls[0][0]).toBe(failure)
  })
})

it('keeps the same constant arc Vuetify spinner throughout totals refresh and the closing transition', async () => {
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} })
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
  const wrapper = mount(RegisterActionsDialogs, {
    props: { validationState: { show: true, phase: 'refreshing-totals' }, progressPercent: 0,
      cancelValidation: vi.fn(), actionDialog: { show: false } },
    global: { plugins: [createVuetify()], stubs: {
      ...vuetifyStubs, 'v-progress-circular': false,
      'v-dialog': { props: ['modelValue'], template: '<section><slot /></section>' }
    } }
  })
  wrappers.push(wrapper)
  await flushPromises()
  expect(title(wrapper)).toBe('Пересчёт итогов')
  expect(wrapper.get('[role="progressbar"]').classes()).toContain('v-progress-circular--indeterminate')
  expect(wrapper.get('[role="progressbar"]').classes()).toContain('v-progress-circular--disable-shrink')
  expect(wrapper.get('[role="progressbar"]').classes()).toContain('register-progress--spinning')
  expect(wrapper.get('[role="progressbar"]').attributes('aria-valuenow')).toBeUndefined()
  expect(wrapper.get('[role="progressbar"]').text()).not.toContain('%')
  const svg = wrapper.get('svg').element
  const circle = wrapper.get('.v-progress-circular__overlay').element
  await wrapper.setProps({ validationState: { show: false, phase: 'refreshing-totals' } })
  expect(title(wrapper)).toBe('Пересчёт итогов')
  expect(wrapper.get('[role="progressbar"]').attributes('aria-valuenow')).toBeUndefined()
  expect(wrapper.get('[role="progressbar"]').classes()).toContain('v-progress-circular--indeterminate')
  expect(wrapper.get('[role="progressbar"]').classes()).toContain('v-progress-circular--disable-shrink')
  expect(wrapper.get('svg').element).toBe(svg)
  expect(wrapper.get('.v-progress-circular__overlay').element).toBe(circle)
})

it.each([
  [{ total: 0, processed: 0 }, null],
  [{ total: -1, processed: -1 }, null],
  [{ total: 10, processed: -1 }, null],
  [{ total: 10, processed: undefined }, null],
  [{ total: 10, processed: 0 }, 0],
  [{ total: 10, processed: 3 }, 30],
  [{ total: 10, processed: 20 }, 100],
  [{ total: 10, processed: 10, phase: 'finalizing' }, null],
  [{ total: 10, processed: 0, phase: 'refreshing-totals' }, null]
])('normalizes the visible percentage for %j', (state, expected) => {
  expect(calculateValidationProgress(state)).toBe(expected)
})
