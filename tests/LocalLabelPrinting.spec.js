// Copyright (C) 2026 Maxim [maxirmx] Samsonov (http://www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { computed, defineComponent, provide, reactive, ref } from 'vue'
import { createPinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import LocalLabelPrinting from '@/components/LocalLabelPrinting.vue'
import BoxScanAction from '@/components/BoxScanAction.vue'
import ParcelScanAction from '@/components/ParcelScanAction.vue'
import { useManualBoxScan } from '@/composables/useManualBoxScan.js'
import { useManualParcelScan } from '@/composables/useManualParcelScan.js'
import BoxStickerPrintButton from '@/components/BoxStickerPrintButton.vue'
import { PRINTER_STORAGE_KEY } from '@/services/qz.printing.js'
import { useLabelPrintingStore, PRINT_MODE_STORAGE_KEY } from '@/stores/label.printing.store.js'
import MonitorLabelActions from '@/components/MonitorLabelActions.vue'
import PageAlertRegion from '@/components/PageAlertRegion.vue'
import ScanjobMonitorSummary from '@/components/ScanjobMonitorSummary.vue'
import { useAlertStore } from '@/stores/alert.store.js'
import { LABEL_PRINTING_KEY } from '@/helpers/label.printing.helpers.js'
import { automaticPrintHistory } from '@/services/label.printing.coordinator.js'
const env = vi.hoisted(() => ({}))
vi.mock('@/stores/auth.store.js', () => ({ useAuthStore: () => env.auth }))
vi.mock('@/stores/scanjobs.store.js', () => ({ useScanjobsStore: () => env.scanStore }))
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
  template: `<div><hr class="hr" /><PageAlertRegion /><LocalLabelPrinting ref="printing" :scan-job-id="job" :user-id="user" :active="active" :disabled="disabled" />
    <ScanjobMonitorSummary :print-queue="printing?.queueStatus" /><BoxStickerPrintButton :box="box" /><MonitorLabelActions :item="parcel" /></div>`,
  setup() {
    const printing = ref(null)
    provide(LABEL_PRINTING_KEY, {
      busy: computed(() => printing.value?.busy ?? true),
      print: (target) => printing.value?.printParcel(target)
    })
    return { printing, job: ref(42), user: ref(9), active: ref(true), disabled: ref(false),
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

it.each(['parcel', 'box'].flatMap(kind => [false, true].map(fails => ({ kind, fails }))))(
  'keeps $kind manual scanning and shared printing together when scan failure is $fails', async ({ kind, fails }) => {
    wrapper.unmount(); await flushPromises()
    env.auth.isAdmin = true
    const scanRequest = vi.fn()
    env.scanStore = {
      ops: { constants: { inProgressStatus: 15, parcelOnlyType: 10, boxOnlyType: 20, lookupOperation: 30 } },
      ensureOpsLoaded: vi.fn().mockResolvedValue(true),
      scanParcel: scanRequest, scanBox: scanRequest
    }
    let manual, accept, finish, reject
    const entity = { id: 7, boxId: 17, printableTemplates: ['WBRN'], companyId: 2, boxSticker: 'BOX-STICKER' }
    const job = ref({ id: 42, registerId: 1, status: 15, type: 30, operation: 10 })
    const useScan = kind === 'box' ? useManualBoxScan : useManualParcelScan
    const refresh = vi.fn().mockResolvedValue(true)
    wrapper = mount(defineComponent({
      components: { LocalLabelPrinting, PageAlertRegion, BoxScanAction, ParcelScanAction, MonitorLabelActions },
      setup() {
        manual = useScan({ registerId: ref(1), job, refresh })
        const printing = ref(null)
        provide(LABEL_PRINTING_KEY, {
          busy: computed(() => printing.value?.busy ?? true),
          print: target => printing.value?.printParcel(target)
        })
        return { printing, locked: manual.locked, entity, kind }
      },
      template: `<div><hr class="hr"/><PageAlertRegion/>
        <LocalLabelPrinting ref="printing" :scan-job-id="42" :user-id="9" active :disabled="locked"/>
        <BoxScanAction v-if="kind === 'box'" :boxes="[entity]"/>
        <ParcelScanAction v-else :parcels="[entity]"/>
        <MonitorLabelActions :item="entity"/>
      </div>`
    }), { global: { plugins: [pinia], stubs } })
    await arm()
    env.event(scan()); await flushPromises()
    expect(env.qz.submit).toHaveBeenCalledOnce()
    env.confirm.mockImplementationOnce(() => new Promise(resolve => { accept = resolve }))
    scanRequest.mockImplementationOnce(() => new Promise((resolve, rejectRequest) => { finish = resolve; reject = rejectRequest }))
    const pending = manual.run([entity], 42, true)
    await flushPromises()
    expect(wrapper.get(`[data-testid="manual-${kind}-scan"]`).element.disabled).toBe(true)
    expect(wrapper.get('[data-testid="monitor-print-label"]').element.disabled).toBe(true)
    expect(await panel().vm.printParcel(target)).toBe(false)
    expect(scanRequest).not.toHaveBeenCalled()
    accept(true); await flushPromises()
    expect(scanRequest).toHaveBeenCalledWith(42, kind === 'box' ? 17 : 7)
    expect(wrapper.get('[data-testid="monitor-print-label"]').element.disabled).toBe(true)
    if (fails) reject(Object.assign(new Error('Не удалось отметить сканирование'), { status: 400 }))
    else finish({ count: 1, parcelCount: 1, boxCount: 1 })
    expect(await pending).toBe(!fails)
    await flushPromises()
    expect(refresh).toHaveBeenCalledOnce()
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(fails ? 1 : 0)
    if (fails) {
      expect(wrapper.get('[role="alert"]').text()).toContain('Не удалось отметить сканирование')
      expect(errorSpy).toHaveBeenCalledOnce()
    }
    expect(wrapper.get('[data-testid="monitor-print-label"]').element.disabled).toBe(false)
    expect(wrapper.get(`[data-testid="manual-${kind}-scan"]`).element.disabled).toBe(false)
    expect(store.state.mode).toBe('KGT')
    if (fails) {
      scanRequest.mockResolvedValueOnce({ count: 1, parcelCount: 1, boxCount: 1 })
      await wrapper.get(`[data-testid="manual-${kind}-scan"]`).trigger('click'); await flushPromises()
      expect(scanRequest).toHaveBeenCalledTimes(2)
      expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    }
    await wrapper.get('[data-testid="monitor-print-label"]').trigger('click'); await flushPromises()
    expect(env.label).toHaveBeenLastCalledWith({ parcelId: 7, template: 'WBRN', scanJobId: 42 })
    env.event(scan(99)); await flushPromises()
    expect(env.qz.submit).toHaveBeenCalledTimes(3)
    expect(store.state.mode).toBe('KGT')
  }
)

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
  expect(wrapper.get('[role="alert"]').text()).toContain('Ошибка локальной печати')
  await wrapper.get('[data-testid="retry-print"]').trigger('click'); await flushPromises()
  await wrapper.get('[data-testid="reprint-label"]').trigger('click'); await flushPromises()
  expect(env.qz.submit).toHaveBeenCalledTimes(3)
  expect(env.label).toHaveBeenCalledTimes(3)
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
it('reports background scope restoration failures once after a saved mode is restored', async () => {
  await arm()
  env.channel.start.mockRejectedValueOnce(new Error('cannot restore subscription'))
  wrapper.vm.user = 10; await flushPromises()
  expect(wrapper.get('[role="alert"]').text()).toContain('Ошибка локальной печати')
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
it('disables repeat and retry after QZ disconnect and leaves existing form messages intact', async () => {
  await arm(); env.event(scan()); await flushPromises()
  alerts.error('Ошибка загрузки посылки'); errorSpy.mockClear()
  env.qz.state.connected = false
  env.qz.onDisconnect.mock.calls[0][0]({ code: 'QzUnavailable' }); await flushPromises()
  expect(wrapper.get('[role="alert"]').text()).toContain('Ошибка загрузки посылки')
  expect(wrapper.get('[data-testid="retry-print"]').element.disabled).toBe(true)
  expect(wrapper.get('[data-testid="reprint-label"]').element.disabled).toBe(true)
  await store.retry(env.confirm)
  expect(env.channel.resume).not.toHaveBeenCalled()
  expect(errorSpy).not.toHaveBeenCalled()
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
  await flushPromises(); expect(wrapper.get('[role="alert"]').text()).toContain('Ошибка локальной печати')
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
