// Copyright (C) 2026 Maxim [maxirmx] Samsonov (http://www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, defineComponent, provide, reactive, ref } from 'vue'
import { createPinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import LocalLabelPrinting from '@/components/LocalLabelPrinting.vue'
import BoxStickerPrintButton from '@/components/BoxStickerPrintButton.vue'
import { PRINTER_STORAGE_KEY } from '@/services/qz.printing.js'
import { useLabelPrintingStore, PRINT_MODE_STORAGE_KEY } from '@/stores/label.printing.store.js'
import MonitorLabelActions from '@/components/MonitorLabelActions.vue'
import ActionButton from '@/components/ActionButton.vue'
import PageAlertRegion from '@/components/PageAlertRegion.vue'
import ScanjobMonitorSummary from '@/components/ScanjobMonitorSummary.vue'
import { useAlertStore } from '@/stores/alert.store.js'
import { LABEL_PRINTING_KEY } from '@/helpers/label.printing.helpers.js'
import { automaticPrintHistory } from '@/services/label.printing.coordinator.js'
import { roleAdmin, roleWhManager, roleWhOperator } from '@/helpers/user.roles.js'
const env = vi.hoisted(() => ({}))
vi.mock('@/stores/auth.store.js', () => ({ useAuthStore: () => env.auth }))
vi.mock('@/composables/useAppConfirm.js', () => ({ useAppConfirm: () => env.confirm }))
vi.mock('@/services/qz.printing.js', async (original) => ({ ...await original(), createQzPrinting: () => env.qz }))
vi.mock('@/services/printing.ownership.js', () => ({ createPrintingOwnership: () => env.ownership }))
vi.mock('@/services/printing.api.js', () => ({ printingApi: { label: (...args) => env.label(...args) }, createPrintChannel: (event, error) => { env.event = event; env.failure = error; return env.channel } }))

const stubs = {
  'font-awesome-icon': { props: ['icon'], template: '<i :data-icon="icon" />' },
  'v-tooltip': { inheritAttrs: false, template: '<div><slot name="activator" :props="{}" /></div>' },
  'v-btn': { props: ['disabled', 'loading'], template: '<button :disabled="disabled || loading"><slot /></button>' },
  'v-select': { props: ['modelValue', 'items', 'disabled', 'label'], emits: ['update:modelValue'], template: '<label>{{ label }}<select :value="modelValue" :disabled="disabled" @change="$emit(\'update:modelValue\', $event.target.value)"><option value=""></option><option v-for="item in items" :key="item.value || item" :value="item.value || item" :disabled="item.props?.disabled">{{ item.title || item }}</option></select></label>' },
  'v-dialog': { props: ['modelValue'], template: '<div v-if="modelValue" role="dialog"><slot /></div>' },
  'v-card': { template: '<div><slot /></div>' }, 'v-card-title': { template: '<div><slot /></div>' }, 'v-card-text': { template: '<div><slot /></div>' }, 'v-card-actions': { template: '<div><slot /></div>' }
}
const host = defineComponent({
  components: { LocalLabelPrinting, PageAlertRegion, ScanjobMonitorSummary, BoxStickerPrintButton, MonitorLabelActions },
  template: `<div><hr class="hr" /><PageAlertRegion /><LocalLabelPrinting ref="printing" :scan-job-id="job" :user-id="user" :active="active" />
    <ScanjobMonitorSummary :print-queue="printing?.queueStatus" /><BoxStickerPrintButton :box="box" /><MonitorLabelActions :item="parcel" /></div>`,
  setup() {
    const printing = ref(null)
    provide(LABEL_PRINTING_KEY, {
      busy: computed(() => printing.value?.busy ?? true),
      print: (target) => printing.value?.printParcel(target)
    })
    return { printing, job: ref(42), user: ref(9), active: ref(true),
      box: { id: 17, companyId: 2, boxSticker: '$1:1:17:362877', printableTemplates: ['WBR_BOX'] },
      parcel: reactive({ id: 7, printableTemplates: ['WBRN', 'OZON'] }) }
  }
})
let wrapper, alerts, errorSpy, store, pinia
function mountHost() {
  pinia = createPinia()
  alerts = useAlertStore(pinia)
  errorSpy = vi.spyOn(alerts, 'error')
  wrapper = mount(host, { global: { plugins: [pinia], stubs } })
  store = useLabelPrintingStore(pinia)
}
beforeEach(() => {
  localStorage.clear()
  localStorage.setItem(PRINTER_STORAGE_KEY, 'TSC TE200')
  automaticPrintHistory.clear()
  env.auth = reactive({ user: { token: 'token', id: 100 } })
  env.confirm = vi.fn().mockResolvedValue(true)
  env.label = vi.fn().mockResolvedValue({ revision: 'r1', language: 'TSPL' })
  env.channel = { resume: vi.fn().mockResolvedValue(true), start: vi.fn().mockResolvedValue(), stop: vi.fn().mockResolvedValue() }
  env.ownership = { acquire: vi.fn().mockResolvedValue(true), release: vi.fn().mockResolvedValue() }
  const state = reactive({ printer: 'TSC TE200', printers: ['Office', 'TSC TE200'], connected: true })
  env.qz = { state, restoreSelection: vi.fn(() => { state.printer = localStorage.getItem(PRINTER_STORAGE_KEY) || '' }),
    connect: vi.fn().mockImplementation(async () => { state.connected = true; return state.printers }),
    ready: vi.fn().mockResolvedValue(), select: vi.fn((name) => { localStorage.setItem(PRINTER_STORAGE_KEY, name); state.printer = name }),
    clearSelection: vi.fn(() => { localStorage.removeItem(PRINTER_STORAGE_KEY); state.printer = '' }),
    submit: vi.fn().mockResolvedValue(), disconnect: vi.fn().mockResolvedValue(), onDisconnect: vi.fn() }
  mountHost()
})
afterEach(async () => { wrapper?.unmount(); await store.shutdown(); await flushPromises(); vi.restoreAllMocks() })
const panel = () => wrapper.getComponent(LocalLabelPrinting)
const target = { parcelId: 7, template: 'WBRN' }
const scan = (id = 8, template = 'KGT') => ({ scanJobId: 42, userId: 9, printCandidates: [{ scanJobId: 42, scanCodeId: id, parcelId: 7, template, revision: 'r1' }] })
const printButtons = () => wrapper.findAll('[data-testid="box-print-label"], [data-testid="monitor-print-label"]')
async function arm(mode = 'KGT') { await flushPromises(); await store.saveSettings({ printer: 'TSC TE200', mode }); await flushPromises() }

it.each(['KGT', 'TJ'])('shows the armed %s mode before any label is printed, then pause and Off', async (mode) => {
  await arm(mode)
  const status = () => wrapper.get('[data-testid="auto-print-status"]').text()
  expect(status()).toContain(mode === 'KGT' ? 'КГТ' : 'Таджикистан')
  expect(status()).not.toContain('приостановлена')
  expect(env.qz.submit).not.toHaveBeenCalled()
  env.failure(new Error('scanner disconnected')); await flushPromises()
  expect(status()).toContain('приостановлена')
  await store.saveSettings({ printer: 'TSC TE200', mode: 'Off' }); await flushPromises()
  expect(status()).toContain('отключена')
})
it.each(['NoPrinters', 'PrinterMissing', 'QzTrustRejected', 'QzUnavailable'])('does not publish stale %s discovery on the destination page', async (code) => {
  await flushPromises()
  env.qz.state.connected = false
  let rejectDiscovery
  env.qz.connect.mockReturnValueOnce(new Promise((resolve, reject) => { rejectDiscovery = reject }))
  wrapper.vm.job = 43; await flushPromises()
  wrapper.unmount()
  const destination = mount(PageAlertRegion, { global: { plugins: [pinia], stubs } })
  const report = vi.spyOn(console, 'error').mockImplementation(() => {})
  const failure = { code }
  rejectDiscovery(failure); await flushPromises()
  expect(destination.find('[role="alert"]').exists()).toBe(false)
  expect(errorSpy).not.toHaveBeenCalled()
  if (code === 'QzUnavailable') expect(report).not.toHaveBeenCalled()
  else expect(report).toHaveBeenCalledWith('[stale printing discovery]', failure)
  destination.unmount()
})
it('reports discovery for the current scope once and restores the selected mode on retry', async () => {
  await arm()
  env.qz.state.connected = false
  env.qz.connect.mockRejectedValueOnce({ code: 'NoPrinters' })
  wrapper.vm.job = 43; await flushPromises()
  expect(wrapper.get('[role="alert"]').text()).toContain('В Windows не найдены принтеры')
  expect(errorSpy).toHaveBeenCalledOnce()
  wrapper.vm.job = 44; await flushPromises()
  expect(store.state.mode).toBe('KGT')
  expect(env.channel.start).toHaveBeenLastCalledWith(44, 9)
})
it('shares pending discovery with a replacement scope and reports only to the live owner', async () => {
  await flushPromises()
  env.qz.state.connected = false
  let rejectDiscovery
  env.qz.connect.mockReturnValueOnce(new Promise((resolve, reject) => { rejectDiscovery = reject }))
  const report = vi.spyOn(console, 'error').mockImplementation(() => {})
  wrapper.vm.job = 43; await flushPromises()
  wrapper.vm.job = 44; await flushPromises()
  rejectDiscovery({ code: 'QzTrustRejected' }); await flushPromises()
  expect(env.qz.connect).toHaveBeenCalledOnce()
  expect(errorSpy).toHaveBeenCalledOnce()
  expect(wrapper.get('[role="alert"]').text()).toContain('QZ Tray отклонил доверие')
  expect(report).toHaveBeenCalledOnce()
})
it('shows failed and overflow scan identities on the monitor and retains them when leaving', async () => {
  await arm()
  env.qz.submit.mockRejectedValueOnce({ code: 'SubmissionFailed' })
  env.event(scan(8)); await flushPromises()
  const failed = wrapper.get('[data-testid="failed-print"]').text()
  expect(failed).toContain('скан 8 (KGT), задание 42')
  env.event({ ...scan(), printCandidates: Array.from({ length: 51 }, (_, i) => ({ ...scan(i + 20).printCandidates[0] })) })
  await flushPromises()
  expect(wrapper.get('[data-testid="print-overflow"]').text()).toContain('скана 70 (KGT), задание 42')
  wrapper.unmount(); await flushPromises()
  expect(store.state.failed).toBeNull()
  expect(store.state.overflow).toBeNull()
  expect(store.recovery).toMatchObject({ failed: { scanCodeId: 8 }, overflow: { scanCodeId: 70 } })
})

it.each(['failed', 'overflow'].flatMap((reason) => ['KGT', 'TJ'].map((mode) => ({ reason, mode }))))(
  'keeps $mode paused after $reason across navigation and settings changes until Off is saved', async ({ reason, mode }) => {
    await arm(mode)
    const template = mode === 'TJ' ? 'TJ_EXPORT' : 'KGT'
    if (reason === 'failed') {
      env.qz.submit.mockRejectedValueOnce({ code: 'SubmissionFailed' })
      env.event(scan(8, template))
    } else {
      env.event({ ...scan(), printCandidates: Array.from({ length: 51 }, (_, i) => scan(i, template).printCandidates[0]) })
    }
    await flushPromises()
    const retained = { ...store.state[reason] }
    wrapper.unmount(); await flushPromises()
    wrapper = mount(host, { global: { plugins: [pinia], stubs } })
    await flushPromises()
    const assertPaused = async () => {
      expect(store.state.mode).toBe('Off')
      expect(store.recovery[reason]).toEqual(retained)
      expect(wrapper.get('[data-testid="auto-print-status"]').text()).toContain('приостановлена')
      const details = wrapper.get('[data-testid="print-recovery-details"]').text()
      expect(details).toContain(`(${template}), задание 42`)
      expect(details).toContain('сохраните режим «Отключён»')
      env.event(scan(200, template)); await flushPromises()
      expect(env.qz.submit).toHaveBeenCalledTimes(reason === 'failed' ? 1 : 0)
      expect(env.channel.start).toHaveBeenCalledOnce()
    }
    await assertPaused()
    await store.syncSettings(new window.StorageEvent('storage', { key: PRINT_MODE_STORAGE_KEY }))
    await assertPaused()
    await store.saveSettings({ printer: 'TSC TE200', mode })
    await assertPaused()
    const failure = new Error('cannot stop')
    env.channel.stop.mockRejectedValueOnce(failure)
    await expect(store.saveSettings({ printer: 'TSC TE200', mode: 'Off' })).rejects.toBe(failure)
    await assertPaused()
    await store.saveSettings({ printer: 'TSC TE200', mode: 'Off' }); await flushPromises()
    expect(store.recovery).toBeNull()
    expect(wrapper.find('[data-testid="print-recovery-details"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="auto-print-status"]').text()).toContain('отключена')
    await arm(mode)
    env.event(scan(201, template)); await flushPromises()
    expect(env.label).toHaveBeenLastCalledWith(scan(201, template).printCandidates[0])
    expect(env.qz.submit).toHaveBeenCalledTimes(reason === 'failed' ? 2 : 1)
  }
)

it.each(['printParcel', 'reprint'].flatMap((method) => ['label', 'submit'].map((source) => ({ method, source }))))(
  'rejects a $source failure from store.$method without publishing an alert and permits retry', async ({ method, source }) => {
    await flushPromises()
    if (method === 'reprint') {
      await arm()
      env.event(scan()); await flushPromises()
    }
    const failure = new Error(`${source} unavailable`)
    const operation = source === 'label' ? env.label : env.qz.submit
    operation.mockRejectedValueOnce(failure)
    errorSpy.mockClear()
    await expect(store[method](target)).rejects.toBe(failure)
    expect(errorSpy).not.toHaveBeenCalled()
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(store.state.busy).toBe(false)
    await expect(store[method](target)).resolves.toBe(true)
  }
)
it.each(['label', 'submit'])('presents a manual %s failure once from the UI and permits retry', async (source) => {
  await flushPromises()
  const operation = source === 'label' ? env.label : env.qz.submit
  operation.mockRejectedValueOnce({ code: 'SubmissionFailed' })
  const action = wrapper.get('[data-testid="box-print-label"]')
  await action.trigger('click'); await flushPromises()
  expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
  expect(wrapper.get('[role="alert"]').text()).toContain('дубликат')
  expect(errorSpy).toHaveBeenCalledOnce()
  expect(action.element.disabled).toBe(false)
  await action.trigger('click'); await flushPromises()
  expect(env.label).toHaveBeenLastCalledWith({ boxId: 17, template: 'WBR_BOX', scanJobId: 42 })
  expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  expect(wrapper.get('[role="status"]').text()).toContain('Этикетка отправлена в очередь принтера')
})
it.each(['label', 'submit'])('presents a reprint %s failure once from the UI and permits retry', async (source) => {
  await arm()
  env.event(scan()); await flushPromises()
  const operation = source === 'label' ? env.label : env.qz.submit
  operation.mockRejectedValueOnce(new Error(`${source} unavailable`))
  const action = wrapper.get('[data-testid="reprint-label"]')
  await action.trigger('click'); await flushPromises()
  expect(wrapper.get('[role="alert"]').text()).toContain(`${source} unavailable`)
  expect(errorSpy).toHaveBeenCalledOnce()
  expect(action.element.disabled).toBe(false)
  await action.trigger('click'); await flushPromises()
  expect(env.label).toHaveBeenLastCalledWith(scan().printCandidates[0])
  expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  expect(wrapper.get('[role="status"]').text()).toContain('Этикетка отправлена в очередь принтера')
})
it('observes an in-flight manual failure after unmount without publishing on the next page', async () => {
  await flushPromises()
  let rejectLabel
  env.label.mockImplementationOnce(() => new Promise((resolve, reject) => { rejectLabel = reject }))
  const pending = panel().vm.printParcel(target)
  await flushPromises()
  wrapper.unmount()
  rejectLabel(new Error('late label failure'))
  await expect(pending).resolves.toBe(false)
  expect(errorSpy).not.toHaveBeenCalled()
})

it('prints each manual label with fresh data and reports a rejection once before a successful retry', async () => {
  for (const item of [target, { parcelId: 8, template: 'OZON' }, { boxId: 17, template: 'WBR_BOX' }]) {
    await panel().vm.printParcel(item)
    expect(env.label).toHaveBeenLastCalledWith({ ...item, scanJobId: 42 })
  }
  env.label.mockRejectedValueOnce(new Error('Label offline'))
  await panel().vm.printParcel(target)
  await flushPromises()
  expect(wrapper.get('[role="alert"]').text()).toContain('Label offline')
  expect(errorSpy).toHaveBeenCalledOnce()
  expect(printButtons().every((button) => !button.element.disabled)).toBe(true)
  await panel().vm.printParcel(target)
  expect(env.qz.submit).toHaveBeenCalledTimes(4)
})
it('prints from a parcel list without a scan job and shows a failed request once before retrying', async () => {
  wrapper.vm.job = null; wrapper.vm.active = false; await flushPromises()
  env.label.mockRejectedValueOnce(new Error('parcel label unavailable'))
  const action = wrapper.findAll('button[data-testid="monitor-print-label"]')[0]
  await action.trigger('click'); await flushPromises()
  expect(env.label).toHaveBeenCalledWith({ parcelId: 7, template: 'WBRN', scanJobId: null })
  expect(wrapper.get('[role="alert"]').text()).toContain('parcel label unavailable')
  expect(errorSpy).toHaveBeenCalledOnce()
  expect(env.qz.submit).not.toHaveBeenCalled()
  await action.trigger('click'); await flushPromises()
  expect(env.qz.submit).toHaveBeenCalledOnce()
  expect(env.channel.start).not.toHaveBeenCalled()
})
it.each([42, null].flatMap((job) => ['label', 'submit'].map((source) => ({ job, source }))))(
  'prints invoices with job $job and presents a $source rejection once before retry', async ({ job, source }) => {
    wrapper.vm.job = job
    wrapper.vm.parcel.printableTemplates = ['WBRN', 'TJ_EXPORT']
    await flushPromises()
    const operation = source === 'label' ? env.label : env.qz.submit
    operation.mockRejectedValueOnce(new Error('Не удалось напечатать инвойс'))
    const action = wrapper.get('button[data-testid="monitor-print-invoice"]')
    expect(action.get('i').attributes('data-icon')).toBe('fa-solid fa-file-invoice')
    expect(action.attributes('aria-label')).toBe('Печать инвойса')
    await action.trigger('click'); await flushPromises()
    expect(env.label).toHaveBeenLastCalledWith({ parcelId: 7, template: 'TJ_EXPORT', scanJobId: job })
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.get('[role="alert"]').text()).toContain('Не удалось напечатать инвойс')
    expect(errorSpy).toHaveBeenCalledOnce()
    expect(action.element.disabled).toBe(false)
    await action.trigger('click'); await flushPromises()
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper.get('[role="status"]').text()).toContain('Этикетка отправлена')
    expect(env.label).toHaveBeenCalledTimes(2)
    expect(env.qz.submit).toHaveBeenLastCalledWith({ revision: 'r1', language: 'TSPL' })
  }
)
it.each([roleAdmin, roleWhManager, roleWhOperator].flatMap((role) => ['KGT', 'TJ'].map((mode) => ({ role, mode }))))(
  'prints $mode scans only for the selected scanner operator with $role', async ({ role, mode }) => {
    env.auth.user = { token: 'token', id: 100, roles: [role] }
    await arm(mode)
    expect(env.channel.start).toHaveBeenCalledWith(42, 9)
    const event = scan(8, mode === 'TJ' ? 'TJ_EXPORT' : 'KGT')
    env.event({ ...event, userId: 100 }); await flushPromises()
    expect(env.label).not.toHaveBeenCalled()
    env.event(event); await flushPromises()
    expect(env.label).toHaveBeenCalledWith(event.printCandidates[0])
    expect(env.qz.submit).toHaveBeenCalledOnce()
    expect(wrapper.get('[role="status"]').text()).toContain('Этикетка отправлена в очередь принтера')
  }
)
it.each(['candidate', 'endpoint'])('presents detailed label validation once from %s and retains the failed scan', async (source) => {
  await arm('TJ')
  const message = 'Не удалось напечатать стикер. Не указаны данные: дата общей накладной.'
  const event = scan(8, 'TJ_EXPORT')
  if (source === 'candidate') Object.assign(event.printCandidates[0], { errorCode: 'InvalidData', errorMessage: message, revision: null })
  else env.label.mockRejectedValueOnce({ data: { code: 'InvalidData', msg: message } })
  env.event(event); await flushPromises()
  expect(wrapper.get('[role="alert"]').text()).toContain(message)
  expect(errorSpy).toHaveBeenCalledOnce()
  expect(store.state.failed.scanCodeId).toBe(8)
  expect(store.queueStatus.paused).toBe(true)
  expect(env.qz.submit).not.toHaveBeenCalled()
})
it('confirms an uncertain retry, supports cancellation, and repeats the last label explicitly', async () => {
  await arm()
  env.qz.submit.mockRejectedValueOnce({ code: 'SubmissionFailed' })
  env.event(scan()); await flushPromises()
  expect(wrapper.get('[role="alert"]').text()).toContain('дубликат')
  env.confirm.mockResolvedValueOnce(false)
  await wrapper.get('[data-testid="retry-print"]').trigger('click'); await flushPromises()
  expect(env.qz.submit).toHaveBeenCalledOnce()
  env.confirm.mockRejectedValueOnce(new Error('confirmation failed'))
  await wrapper.get('[data-testid="retry-print"]').trigger('click'); await flushPromises()
  expect(wrapper.get('[role="alert"]').text()).toContain('confirmation failed')
  await wrapper.get('[data-testid="retry-print"]').trigger('click'); await flushPromises()
  await wrapper.get('[data-testid="reprint-label"]').trigger('click'); await flushPromises()
  expect(env.qz.submit).toHaveBeenCalledTimes(3)
  expect(env.label).toHaveBeenCalledTimes(3)
})
it('retains a connection pause until the scanner subscription can be resumed', async () => {
  await arm()
  env.failure(new Error('scanner disconnected')); await flushPromises()
  env.channel.resume.mockRejectedValueOnce(new Error('subscribe failed'))
  await wrapper.get('[data-testid="retry-print"]').trigger('click'); await flushPromises()
  expect(wrapper.get('[role="alert"]').text()).toContain('subscribe failed')
  expect(store.state.paused).toBe(true)
  await store.retry(env.confirm); await flushPromises()
  expect(store.state.paused).toBe(false)
})
it.each(['confirmation', 'readiness', 'resumption'])('rejects %s retry failures without a store alert and presents one error from the monitor', async (source) => {
  await arm()
  env.qz.submit.mockRejectedValueOnce({ code: 'SubmissionFailed' })
  env.event(scan()); await flushPromises()
  alerts.clear(); errorSpy.mockClear()
  const operation = source === 'confirmation' ? env.confirm : source === 'readiness' ? env.qz.ready : env.channel.resume
  const failure = new Error(`${source} failed`)
  operation.mockRejectedValueOnce(failure)
  await expect(store.retry(env.confirm)).rejects.toBe(failure)
  expect(errorSpy).not.toHaveBeenCalled()
  expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  operation.mockRejectedValueOnce(failure)
  await wrapper.get('[data-testid="retry-print"]').trigger('click'); await flushPromises()
  expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
  expect(wrapper.get('[role="alert"]').text()).toContain(failure.message)
  expect(errorSpy).toHaveBeenCalledOnce()
  expect(store.controlBusy).toBe(false)
  await wrapper.get('[data-testid="retry-print"]').trigger('click'); await flushPromises()
  expect(env.qz.submit).toHaveBeenCalledTimes(2)
  expect(store.state.paused).toBe(false)
})
it.each(['confirmation', 'readiness', 'resumption'])('does not publish a late %s retry failure on the destination page', async (source) => {
  await arm()
  env.qz.submit.mockRejectedValueOnce({ code: 'SubmissionFailed' })
  env.event(scan()); await flushPromises()
  alerts.clear(); errorSpy.mockClear()
  let rejectRetry
  const failure = new Error(`${source} failed after leaving`)
  const report = vi.spyOn(console, 'error').mockImplementation(() => {})
  const operation = source === 'confirmation' ? env.confirm : source === 'readiness' ? env.qz.ready : env.channel.resume
  operation.mockImplementationOnce(() => new Promise((resolve, reject) => { rejectRetry = reject }))
  await wrapper.get('[data-testid="retry-print"]').trigger('click'); await flushPromises()
  wrapper.unmount()
  const destination = mount(PageAlertRegion, { global: { plugins: [pinia], stubs } })
  rejectRetry(failure); await flushPromises()
  expect(destination.find('[role="alert"]').exists()).toBe(false)
  expect(errorSpy).not.toHaveBeenCalled()
  expect(report).toHaveBeenCalledWith('[local printing after unmount]', failure)
  destination.unmount()
})
it('keeps QZ retry failures silent and disables printing until discovery succeeds', async () => {
  await arm()
  env.failure(new Error('scanner disconnected')); await flushPromises()
  alerts.clear(); errorSpy.mockClear()
  env.qz.ready.mockRejectedValueOnce({ code: 'QzUnavailable' })
  await wrapper.get('[data-testid="retry-print"]').trigger('click'); await flushPromises()
  expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  expect(errorSpy).not.toHaveBeenCalled()
  expect(wrapper.get('[data-testid="retry-print"]').element.disabled).toBe(true)
  await wrapper.get('[data-testid="reconnect-print"]').trigger('click'); await flushPromises()
  expect(store.state.paused).toBe(true)
  expect(env.channel.resume).not.toHaveBeenCalled()
  await wrapper.get('[data-testid="retry-print"]').trigger('click'); await flushPromises()
  expect(store.state.paused).toBe(false)
})
it('reconnects in place without losing the failed scan or replaying it before a confirmed retry', async () => {
  await arm()
  expect(wrapper.find('[data-testid="reconnect-print"]').exists()).toBe(false)
  env.qz.submit.mockRejectedValueOnce({ code: 'QzUnavailable' })
  env.event(scan()); await flushPromises()
  expect(wrapper.get('[data-testid="failed-print"]').text()).toContain('скан 8 (KGT), задание 42')
  expect(wrapper.get('[data-testid="retry-print"]').element.disabled).toBe(true)
  let finishConnect
  env.qz.connect.mockImplementationOnce(() => new Promise((resolve) => {
    finishConnect = () => { env.qz.state.connected = true; resolve(env.qz.state.printers) }
  }))
  const reconnect = wrapper.get('[data-testid="reconnect-print"]')
  expect(reconnect.attributes('aria-label')).toBe('Восстановить подключение к QZ Tray')
  await reconnect.trigger('click'); await flushPromises()
  expect(reconnect.element.disabled).toBe(true)
  await reconnect.trigger('click')
  expect(env.qz.connect).toHaveBeenCalledOnce()
  env.event(scan(9)); await flushPromises()
  finishConnect(); await flushPromises()
  expect(wrapper.find('[data-testid="reconnect-print"]').exists()).toBe(false)
  expect(wrapper.get('[data-testid="retry-print"]').element.disabled).toBe(false)
  expect(store.state.failed).toEqual(scan().printCandidates[0])
  expect(store.state.paused).toBe(true)
  expect(store.state.queued).toBe(1)
  expect(store.recovery).toBeNull()
  expect(store.scope.scanJobId).toBe(42)
  expect(env.channel.start).toHaveBeenCalledOnce()
  expect(env.channel.stop).toHaveBeenCalledTimes(3)
  expect(env.channel.resume).not.toHaveBeenCalled()
  expect(env.qz.submit).toHaveBeenCalledOnce()
  expect(env.confirm).not.toHaveBeenCalled()
  env.confirm.mockResolvedValueOnce(false)
  await wrapper.get('[data-testid="retry-print"]').trigger('click'); await flushPromises()
  expect(env.qz.submit).toHaveBeenCalledOnce()
  expect(store.state.failed.scanCodeId).toBe(8)
  await wrapper.get('[data-testid="retry-print"]').trigger('click'); await flushPromises()
  expect(env.confirm).toHaveBeenLastCalledWith(expect.objectContaining({ content: expect.stringContaining('дубликат') }))
  expect(env.label.mock.calls.map(([target]) => target.scanCodeId)).toEqual([8, 8, 9])
  expect(env.qz.submit).toHaveBeenCalledTimes(3)
  expect(store.state.paused).toBe(false)
  expect(store.state.failed).toBeNull()
})
it.each(['QzUnavailable', 'QzTrustRejected'])('handles %s during in-place reconnect and allows another attempt', async (code) => {
  await arm()
  env.qz.submit.mockRejectedValueOnce({ code: 'QzUnavailable' })
  env.event(scan()); await flushPromises()
  const report = vi.spyOn(console, 'error').mockImplementation(() => {})
  env.qz.connect.mockRejectedValueOnce({ code })
  await wrapper.get('[data-testid="reconnect-print"]').trigger('click'); await flushPromises()
  expect(store.state.failed.scanCodeId).toBe(8)
  expect(store.state.paused).toBe(true)
  expect(wrapper.get('[data-testid="reconnect-print"]').element.disabled).toBe(false)
  expect(env.qz.submit).toHaveBeenCalledOnce()
  expect(report).not.toHaveBeenCalled()
  if (code === 'QzUnavailable') {
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(errorSpy).not.toHaveBeenCalled()
  } else {
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.get('[role="alert"]').text()).toContain('QZ Tray отклонил доверие')
    expect(errorSpy).toHaveBeenCalledOnce()
  }
  await wrapper.get('[data-testid="reconnect-print"]').trigger('click'); await flushPromises()
  expect(env.qz.connect).toHaveBeenCalledTimes(2)
  expect(wrapper.get('[data-testid="retry-print"]').element.disabled).toBe(false)
  expect(env.qz.submit).toHaveBeenCalledOnce()
})
it.each(['QzUnavailable', 'QzTrustRejected'])('does not present a late %s reconnect failure after leaving the monitor', async (code) => {
  await arm()
  env.qz.state.connected = false
  env.qz.onDisconnect.mock.calls[0][0]({ code: 'QzUnavailable' }); await flushPromises()
  let rejectConnect
  env.qz.connect.mockReturnValueOnce(new Promise((resolve, reject) => { rejectConnect = reject }))
  const report = vi.spyOn(console, 'error').mockImplementation(() => {})
  await wrapper.get('[data-testid="reconnect-print"]').trigger('click'); await flushPromises()
  wrapper.unmount()
  const destination = mount(PageAlertRegion, { global: { plugins: [pinia], stubs } })
  const failure = { code }
  rejectConnect(failure); await flushPromises()
  expect(destination.find('[role="alert"]').exists()).toBe(false)
  expect(errorSpy).not.toHaveBeenCalled()
  if (code === 'QzUnavailable') expect(report).not.toHaveBeenCalled()
  else expect(report).toHaveBeenCalledExactlyOnceWith('[local printing after unmount]', failure)
  destination.unmount()
})
it('reports background scope restoration failures once after a saved mode is restored', async () => {
  await arm()
  env.channel.start.mockRejectedValueOnce(new Error('cannot restore subscription'))
  wrapper.vm.user = 10; await flushPromises()
  expect(wrapper.get('[role="alert"]').text()).toContain('cannot restore subscription')
  expect(errorSpy).toHaveBeenCalledOnce()
})
it.each([{ code: 'QzUnavailable' }, { code: 'SubmissionFailed', cause: { data: { code: 'QzUnavailable' } } }])(
  'silently disables all manual labels after QZ loss (%j) and reconnects without replay', async (failure) => {
    env.qz.ready.mockRejectedValueOnce(failure)
    await panel().vm.printParcel(target); await flushPromises()
    expect(printButtons()).toHaveLength(3)
    expect(printButtons().every((button) => button.element.disabled)).toBe(true)
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(errorSpy).not.toHaveBeenCalled()
    await panel().vm.printParcel(target)
    expect(env.label).not.toHaveBeenCalled()
    await store.refreshPrinters()
    expect(printButtons().every((button) => !button.element.disabled)).toBe(true)
    expect(env.qz.submit).not.toHaveBeenCalled()
    await panel().vm.printParcel(target)
    expect(env.qz.submit).toHaveBeenCalledOnce()
  }
)
it('silently disables startup printing without QZ or a saved printer', async () => {
  wrapper.unmount(); await store.shutdown(); await flushPromises()
  env.qz.state.connected = false
  env.qz.connect.mockRejectedValueOnce({ code: 'QzUnavailable' })
  localStorage.setItem(PRINT_MODE_STORAGE_KEY, 'KGT')
  mountHost(); await flushPromises()
  expect(printButtons().every((button) => button.element.disabled)).toBe(true)
  expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  expect(env.channel.start).not.toHaveBeenCalled()
  await store.refreshPrinters()
  env.qz.state.printer = ''
  await flushPromises()
  expect(printButtons().every((button) => button.element.disabled)).toBe(true)
})
it('disables repeat and retry after QZ disconnect and leaves existing form messages intact', async () => {
  await arm(); env.event(scan()); await flushPromises()
  alerts.error('Existing error'); errorSpy.mockClear()
  env.qz.state.connected = false
  env.qz.onDisconnect.mock.calls[0][0]({ code: 'QzUnavailable' }); await flushPromises()
  expect(wrapper.get('[role="alert"]').text()).toContain('Existing error')
  expect(wrapper.get('[data-testid="retry-print"]').element.disabled).toBe(true)
  expect(wrapper.get('[data-testid="reprint-label"]').element.disabled).toBe(true)
  await store.retry(env.confirm)
  expect(env.channel.resume).not.toHaveBeenCalled()
  expect(errorSpy).not.toHaveBeenCalled()
})
it('stops automatic printing on operator, job, active-state and authentication changes', async () => {
  await arm()
  wrapper.vm.user = 10; await flushPromises()
  env.event(scan()); await flushPromises(); expect(env.label).not.toHaveBeenCalled()
  wrapper.vm.active = false; await flushPromises()
  env.event(scan()); await flushPromises(); expect(env.label).not.toHaveBeenCalled()
  wrapper.vm.user = 9; wrapper.vm.active = true; await flushPromises()
  env.auth.user = null; await flushPromises()
  env.event(scan()); await flushPromises(); expect(env.label).not.toHaveBeenCalled()
  expect(store.state.mode).toBe('Off')
})
it('restores saved settings in a new application and only accepts new live scans', async () => {
  await arm(); env.event(scan()); await flushPromises()
  wrapper.unmount(); await store.shutdown(); await flushPromises()
  mountHost(); await flushPromises()
  expect(store.preferredMode).toBe('KGT')
  expect(env.qz.submit).toHaveBeenCalledOnce()
  env.event(scan(9)); await flushPromises()
  expect(env.qz.submit).toHaveBeenCalledTimes(2)
})
it('applies cross-window settings, ignores unrelated storage, and stops on clearing storage', async () => {
  await arm()
  localStorage.setItem(PRINTER_STORAGE_KEY, 'Office'); localStorage.setItem(PRINT_MODE_STORAGE_KEY, 'TJ')
  await store.syncSettings(new window.StorageEvent('storage', { key: PRINT_MODE_STORAGE_KEY, storageArea: localStorage }))
  expect(store.qzState.printer).toBe('Office'); expect(store.state.mode).toBe('TJ')
  env.event(scan(8, 'TJ_EXPORT')); await flushPromises()
  expect(env.qz.submit).toHaveBeenCalledOnce()
  const stops = env.channel.stop.mock.calls.length
  await store.syncSettings(new window.StorageEvent('storage', { key: 'unrelated' }))
  await store.syncSettings(new window.StorageEvent('storage', { key: PRINT_MODE_STORAGE_KEY, storageArea: sessionStorage }))
  expect(env.channel.stop).toHaveBeenCalledTimes(stops)
  localStorage.clear()
  await store.syncSettings(new window.StorageEvent('storage', { key: null, storageArea: localStorage }))
  expect(store.preferredMode).toBe('Off'); expect(store.qzState.printer).toBe('')
})
it('reports synchronization errors once and applies the same settings on retry', async () => {
  env.channel.stop.mockRejectedValueOnce(new Error('cannot sync'))
  await store.syncSettings(new window.StorageEvent('storage', { key: PRINT_MODE_STORAGE_KEY }))
  await flushPromises(); expect(wrapper.get('[role="alert"]').text()).toContain('cannot sync')
  expect(errorSpy).toHaveBeenCalledOnce()
  await store.syncSettings(new window.StorageEvent('storage', { key: PRINT_MODE_STORAGE_KEY }))
})
it('keeps only the newest form in control and reports teardown failures technically', async () => {
  await arm()
  const old = Symbol('old'), current = Symbol('current')
  store.bindScope(old, 43, 9, true); store.bindScope(current, 44, 10, true); store.unbindScope(old)
  await flushPromises(); expect(env.channel.start).toHaveBeenLastCalledWith(44, 10)
  const report = vi.spyOn(console, 'error').mockImplementation(() => {})
  env.channel.stop.mockRejectedValueOnce(new Error('teardown failed'))
  store.unbindScope(current); await flushPromises()
  expect(report).toHaveBeenCalledWith('[local printing teardown]', expect.any(Error))
  env.qz.disconnect.mockRejectedValueOnce(new Error('disconnect failed'))
  await store.shutdown()
  expect(report).toHaveBeenCalledWith('[local printing disconnect]', expect.any(Error))
})
it('stops missing-printer marking and clears overflowing queues through saved Off mode', async () => {
  await arm()
  env.event({ ...scan(), printCandidates: Array.from({ length: 51 }, (_, i) => ({ ...scan().printCandidates[0], scanCodeId: i })) })
  await flushPromises(); expect(wrapper.get('[role="alert"]').text()).toContain('переполнена')
  expect(store.state.overflow).not.toBeNull()
  await store.saveSettings({ printer: 'TSC TE200', mode: 'Off' })
  expect(store.state.queued).toBe(0); expect(store.state.overflow).toBeNull()
  await arm()
  env.qz.ready.mockImplementationOnce(async () => { env.qz.state.printer = ''; throw { code: 'PrinterMissing' } })
  env.event(scan(200)); await flushPromises()
  expect(store.state.mode).toBe('Off')
  expect(wrapper.get('[role="alert"]').text()).toContain('отсутствует')
})

describe('server-advertised monitor actions', () => {
  it('keeps invoice and sticker actions independent and respects disabled and busy states', async () => {
    const print = vi.fn(), busy = ref(false)
    const actions = mount(MonitorLabelActions, { props: {
      item: { parcelId: 8, printableTemplates: ['WBRN', 'TJ_EXPORT'] }, template: 'WBRN'
    }, global: { provide: { [LABEL_PRINTING_KEY]: { print, busy } }, stubs } })
    const invoice = () => actions.get('button[data-testid="monitor-print-invoice"]')
    expect(actions.findAll('button').map((button) => button.attributes('aria-label'))).toEqual(['Печать стикера', 'Печать инвойса'])
    await invoice().trigger('click')
    expect(print).toHaveBeenLastCalledWith({ parcelId: 8, template: 'TJ_EXPORT' })
    await actions.setProps({ disabled: true })
    expect(invoice().element.disabled).toBe(true)
    await invoice().trigger('click')
    expect(print).toHaveBeenCalledOnce()
    await actions.setProps({ disabled: false })
    busy.value = true; await flushPromises()
    expect(invoice().element.disabled).toBe(true)
    busy.value = false
    await actions.setProps({ item: { id: 9, printableTemplates: ['TJ_EXPORT'] } })
    expect(actions.get('button[data-testid="monitor-print-label"]').element.disabled).toBe(true)
    await invoice().trigger('click')
    expect(print).toHaveBeenLastCalledWith({ parcelId: 9, template: 'TJ_EXPORT' })
    await actions.setProps({ item: { id: 9 } })
    expect(actions.find('[data-testid="monitor-print-invoice"]').exists()).toBe(false)
    actions.unmount()
  })
  it('shows only manual capabilities, honors busy state and emits captured identity', async () => {
    const print = vi.fn(), busy = ref(false)
    const actions = mount(MonitorLabelActions, { props: { item: { id: 7, printableTemplates: ['WBRN', 'OZON', 'KGT'] } }, global: {
      provide: { [LABEL_PRINTING_KEY]: { print, busy: computed(() => busy.value) } },
      stubs: { ...stubs, 'v-tooltip': { inheritAttrs: false, template: '<div><slot name="activator" :props="{}" /><slot /></div>' } }
    } })
    expect(actions.findAll('button')).toHaveLength(2)
    expect(actions.findAll('button').map((button) => button.attributes('aria-label'))).toEqual([
      'Печать стикера', 'Печать стикера'
    ])
    expect(actions.findAllComponents(ActionButton).map((button) => button.props('tooltipText'))).toEqual([
      'Печать стикера', 'Печать стикера'
    ])
    await actions.findAll('button')[0].trigger('click')
    expect(print).toHaveBeenCalledWith({ parcelId: 7, template: 'WBRN' })
    await actions.findAll('button')[1].trigger('click')
    expect(print).toHaveBeenLastCalledWith({ parcelId: 7, template: 'OZON' })
    busy.value = true; await flushPromises()
    expect(actions.get('button').element.disabled).toBe(true)
    await actions.setProps({ item: { parcelId: 8 } })
    expect(actions.findAll('button')).toHaveLength(0)
    actions.unmount()
    const unprovided = mount(MonitorLabelActions, { props: { item: {} }, global: { stubs } })
    expect(unprovided.findAll('button')).toHaveLength(0)
    unprovided.unmount()
  })
})
