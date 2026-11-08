// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'
import { createPinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import PrinterSettings from '@/views/Printer_SettingsView.vue'
import PageAlertRegion from '@/components/PageAlertRegion.vue'
import { useLabelPrintingStore, PRINT_MODE_STORAGE_KEY } from '@/stores/label.printing.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { PRINTER_STORAGE_KEY } from '@/services/qz.printing.js'
const env = vi.hoisted(() => ({}))
vi.mock('@/services/qz.printing.js', async (original) => ({ ...await original(), createQzPrinting: () => env.qz }))
vi.mock('@/services/printing.ownership.js', () => ({ createPrintingOwnership: () => env.ownership }))
vi.mock('@/services/printing.api.js', () => ({ printingApi: { label: vi.fn() }, createPrintChannel: () => env.channel }))
const stubs = {
  'font-awesome-icon': { props: ['icon'], template: '<i :data-icon="icon" />' },
  'v-tooltip': { inheritAttrs: false, template: '<div><slot name="activator" :props="{}" /></div>' },
  'v-btn': { props: ['disabled', 'loading'], template: '<button :disabled="disabled || loading"><slot /></button>' },
  'v-select': { props: ['id', 'modelValue', 'items', 'disabled', 'label'], emits: ['update:modelValue'], template: '<div><select :id="id" :value="modelValue" :disabled="disabled" @change="$emit(\'update:modelValue\', $event.target.value)"><option value=""></option><option v-for="item in items" :key="item.value || item" :value="item.value || item" :disabled="item.props?.disabled">{{ item.title || item }}</option></select></div>' },
  'v-dialog': { props: ['modelValue'], template: '<div v-if="modelValue" role="dialog"><slot /></div>' },
  'v-card': { template: '<div><slot /></div>' }, 'v-card-title': { template: '<div><slot /></div>' }, 'v-card-text': { template: '<div><slot /></div>' }, 'v-card-actions': { template: '<div><slot /></div>' }
}

let wrapper, router, store, alerts, errorSpy
async function mountSettings(url = '/printing/settings?returnUrl=/boxes', beforeMount = () => {}) {
  const pinia = createPinia()
  alerts = useAlertStore(pinia)
  errorSpy = vi.spyOn(alerts, 'error')
  store = useLabelPrintingStore(pinia)
  await beforeMount(store)
  router = createRouter({ history: createMemoryHistory(), routes: [
    { path: '/printing/settings', component: PrinterSettings },
    { path: '/boxes', component: { components: { PageAlertRegion }, template: '<div>Boxes<hr class="hr" /><PageAlertRegion /></div>' } },
    { path: '/scanjobs', component: { template: '<div>Scans</div>' } }
  ] })
  await router.push(url)
  await router.isReady()
  wrapper = mount({ template: '<RouterView />' }, { global: { plugins: [pinia, router], stubs } })
  await flushPromises()
}
beforeEach(() => {
  localStorage.clear()
  localStorage.setItem(PRINTER_STORAGE_KEY, 'TSC TE200')
  const state = reactive({ printer: '', printers: ['Office', 'TSC TE200'], connected: true })
  env.qz = { state, restoreSelection: vi.fn(() => { state.printer = localStorage.getItem(PRINTER_STORAGE_KEY) || '' }),
    connect: vi.fn().mockImplementation(async () => { state.connected = true; return state.printers }),
    select: vi.fn((name) => { localStorage.setItem(PRINTER_STORAGE_KEY, name); state.printer = name }),
    clearSelection: vi.fn(() => { localStorage.removeItem(PRINTER_STORAGE_KEY); state.printer = '' }),
    ready: vi.fn().mockResolvedValue(), submit: vi.fn().mockResolvedValue(), disconnect: vi.fn().mockResolvedValue(), onDisconnect: vi.fn() }
  env.channel = { stop: vi.fn().mockResolvedValue(), start: vi.fn().mockResolvedValue() }
  env.ownership = { release: vi.fn().mockResolvedValue(), acquire: vi.fn().mockResolvedValue(true) }
})
afterEach(async () => { wrapper?.unmount(); await store?.shutdown(); vi.restoreAllMocks() })
const selectPrinter = (name) => wrapper.get('[data-testid="printer-selection-inline"] select').setValue(name)
const selectMode = (name) => wrapper.get('[data-testid="auto-print-mode"] select').setValue(name)
async function save() { await wrapper.get('[data-testid="save-print-settings"]').trigger('click'); await flushPromises() }
async function cancel() { await wrapper.get('[data-testid="cancel-print-settings"]').trigger('click'); await flushPromises() }

describe('routed print settings', () => {
  it.each([
    'overflow'
  ])('does not resume retained %s recovery when settings are cancelled', async (reason) => {
    localStorage.setItem(PRINT_MODE_STORAGE_KEY, 'KGT')
    await mountSettings(undefined, async (printing) => {
      const owner = Symbol('departing monitor')
      printing.bindScope(owner, 42, 9, true); await flushPromises()
      printing.state[reason] = { scanJobId: 42, scanCodeId: 8, template: 'KGT' }
      printing.unbindScope(owner); await flushPromises()
    })
    expect(wrapper.get('[data-testid="print-recovery-details"]').text()).toContain('сохраните режим «Отключён»')
    await cancel()
    expect(router.currentRoute.value.path).toBe('/boxes')
    store.bindScope(Symbol('returning monitor'), 42, 9, true); await flushPromises()
    expect(store.state.mode).toBe('Off')
    expect(store.queueStatus.paused).toBe(true)
    expect(store.recovery[reason].scanCodeId).toBe(8)
    expect(env.channel.start).toHaveBeenCalledOnce()
  })
  it.each([
    false
  ])('reports an idle QZ disconnect once and clears it after reconnecting (armed: %s)', async (armed) => {
    await mountSettings()
    if (armed) {
      store.bindScope(Symbol('monitor'), 42, 9, true); await flushPromises()
      await store.saveSettings({ printer: 'TSC TE200', mode: 'TJ' }); await flushPromises()
    }
    env.qz.state.connected = false
    env.qz.state.printers = []
    env.qz.onDisconnect.mock.calls[0][0]({ code: 'QzUnavailable' })
    await flushPromises()
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.get('[role="alert"]').text()).toContain('QZ Tray недоступен.')
    expect(errorSpy).toHaveBeenCalledOnce()
    expect(router.currentRoute.value.path).toBe('/printing/settings')
    env.qz.onDisconnect.mock.calls[0][0]({ code: 'QzUnavailable' }); await flushPromises()
    expect(errorSpy).toHaveBeenCalledOnce()
    await wrapper.get('[data-testid="refresh-printers"]').trigger('click'); await flushPromises()
    expect(env.qz.connect).toHaveBeenCalledTimes(2)
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(store.qzState.connected).toBe(true)
  })
  it('discards edits and clearing on Cancel, and only clears the persisted choice on Save', async () => {
    await mountSettings()
    await selectPrinter('Office'); await selectMode('KGT')
    await wrapper.get('[data-testid="clear-printer"]').trigger('click')
    expect(wrapper.get('[data-testid="auto-print-mode"] select').element.value).toBe('Off')
    expect(localStorage.getItem(PRINTER_STORAGE_KEY)).toBe('TSC TE200')
    await cancel()
    expect(router.currentRoute.value.path).toBe('/boxes')
    expect(localStorage.getItem(PRINTER_STORAGE_KEY)).toBe('TSC TE200')
    await router.push('/printing/settings?returnUrl=/boxes'); await flushPromises()
    await wrapper.get('[data-testid="clear-printer"]').trigger('click')
    await save()
    expect(localStorage.getItem(PRINTER_STORAGE_KEY)).toBeNull()
    expect(localStorage.getItem(PRINT_MODE_STORAGE_KEY)).toBe('Off')
  })
  it('shows the header spinner during a long initial discovery and permits cancelling immediately', async () => {
    let rejectConnection
    env.qz.state.connected = false
    env.qz.connect.mockReturnValueOnce(new Promise((resolve, reject) => { rejectConnection = reject }))
    await mountSettings()
    expect(wrapper.get('[data-testid="print-settings-loading"]').isVisible()).toBe(true)
    expect(wrapper.get('[data-testid="save-print-settings"]').element.disabled).toBe(true)
    expect(wrapper.get('[data-testid="cancel-print-settings"]').element.disabled).toBe(false)
    await cancel()
    rejectConnection({ code: 'QzUnavailable' }); await flushPromises()
    expect(router.currentRoute.value.path).toBe('/boxes')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(errorSpy).not.toHaveBeenCalled()
  })
  it('retains drafts through refresh failures and retries discovery without saving changes', async () => {
    await mountSettings()
    await selectPrinter('Office'); await selectMode('TJ')
    env.qz.connect.mockRejectedValueOnce(new Error('discovery failed'))
    await wrapper.get('[data-testid="refresh-printers"]').trigger('click'); await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('Ошибка локальной печати')
    expect(wrapper.get('[data-testid="printer-selection-inline"] select').element.value).toBe('Office')
    expect(localStorage.getItem(PRINTER_STORAGE_KEY)).toBe('TSC TE200')
    await wrapper.get('[data-testid="refresh-printers"]').trigger('click'); await flushPromises()
    expect(env.qz.connect).toHaveBeenCalledTimes(3)
    expect(errorSpy).toHaveBeenCalledOnce()
  })
  it('reports an aborted return once and retries navigation with the draft intact', async () => {
    await mountSettings(); await selectPrinter('Office')
    const removeGuard = router.beforeEach(() => false)
    await save()
    expect(router.currentRoute.value.path).toBe('/printing/settings')
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(errorSpy).toHaveBeenCalledOnce()
    expect(wrapper.get('[data-testid="printer-selection-inline"] select').element.value).toBe('Office')
    removeGuard(); await save()
    expect(router.currentRoute.value.path).toBe('/boxes')
  })
  it.each([
    'https://evil.example'
  ])('uses the scanning list for an unsafe or self return route %s', async (returnUrl) => {
    await mountSettings('/printing/settings' + (returnUrl ? '?returnUrl=' + encodeURIComponent(returnUrl) : ''))
    await cancel()
    expect(router.currentRoute.value.path).toBe('/scanjobs')
  })
  it('preserves localized QZ errors when a save fails and allows saving again', async () => {
    await mountSettings()
    store.bindScope(Symbol('monitor'), 42, 9, true); await flushPromises()
    await selectMode('TJ')
    env.qz.ready.mockRejectedValueOnce({ code: 'QzUnavailable' })
    await save()
    expect(store.qzState.connected).toBe(false)
    expect(wrapper.get('[role="alert"]').text()).toContain('QZ Tray недоступен.')
    expect(errorSpy).toHaveBeenCalledOnce()
    expect(router.currentRoute.value.path).toBe('/printing/settings')
    await wrapper.get('[data-testid="refresh-printers"]').trigger('click'); await flushPromises()
    await save()
    expect(router.currentRoute.value.path).toBe('/boxes')
  })
  it.each([
    'disarm'
  ])('rejects %s save failures without store notifications, preserves the draft and retries', async (source) => {
    await mountSettings()
    store.bindScope(Symbol('monitor'), 42, 9, true)
    await flushPromises()
    await selectPrinter('Office'); await selectMode('TJ')
    const failure = new Error(`${source} failed`)
    const failNext = () => {
      if (source === 'disarm') env.channel.stop.mockRejectedValueOnce(failure)
      else if (source === 'rearm') env.channel.start.mockRejectedValueOnce(failure)
      else vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => { throw failure })
    }
    failNext()
    await expect(store.saveSettings({ printer: 'Office', mode: 'TJ' })).rejects.toBe(failure)
    expect(errorSpy).not.toHaveBeenCalled()
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(localStorage.getItem(PRINTER_STORAGE_KEY)).toBe('TSC TE200')
    expect(localStorage.getItem(PRINT_MODE_STORAGE_KEY)).toBeNull()
    failNext()
    await save()
    expect(router.currentRoute.value.path).toBe('/printing/settings')
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.get('[role="alert"]').text()).toContain('Ошибка локальной печати')
    expect(wrapper.get('[role="alert"]').text()).not.toContain(failure.message)
    expect(errorSpy).toHaveBeenCalledOnce()
    expect(wrapper.get('[data-testid="printer-selection-inline"] select').element.value).toBe('Office')
    expect(wrapper.get('[data-testid="auto-print-mode"] select').element.value).toBe('TJ')
    await save()
    expect(router.currentRoute.value.path).toBe('/boxes')
    expect(store.state.mode).toBe('TJ')
    expect(localStorage.getItem(PRINTER_STORAGE_KEY)).toBe('Office')
  })
  it.each([
    true
  ])('waits for an in-flight submission before discovery (failure: %s)', async (fails) => {
    let settlePrint, pendingPrint, finishDiscovery
    env.qz.submit.mockImplementationOnce(() => new Promise((resolve, reject) => {
      settlePrint = () => fails ? reject(new Error('submission failed')) : resolve()
    }))
    env.qz.connect.mockImplementationOnce(() => new Promise((resolve) => { finishDiscovery = resolve }))
    await mountSettings(undefined, async (printing) => {
      // Observe the original caller's rejection while it leaves the page.
      pendingPrint = printing.printParcel({ parcelId: 7, template: 'WBRN' }).catch((error) => error)
      await flushPromises()
    })
    expect(env.qz.submit).toHaveBeenCalledOnce()
    expect(env.qz.connect).not.toHaveBeenCalled()
    expect(wrapper.get('[data-testid="save-print-settings"]').element.disabled).toBe(true)
    expect(wrapper.get('[data-testid="print-settings-loading"]').isVisible()).toBe(true)
    await save()
    expect(env.channel.stop).not.toHaveBeenCalled()
    settlePrint(); await pendingPrint; await flushPromises()
    expect(env.qz.connect).toHaveBeenCalledOnce()
    expect(wrapper.get('[data-testid="save-print-settings"]').element.disabled).toBe(true)
    finishDiscovery(); await flushPromises()
    expect(wrapper.get('[data-testid="save-print-settings"]').element.disabled).toBe(false)
    await save()
    expect(router.currentRoute.value.path).toBe('/boxes')
  })
  it('reports an unexpected discovery rejection technically after leaving', async () => {
    await mountSettings()
    let rejectDiscovery
    const failure = new Error('late discovery rejection')
    const report = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(store, 'refreshPrinters').mockImplementationOnce(() => new Promise((resolve, reject) => { rejectDiscovery = reject }))
    await wrapper.get('[data-testid="refresh-printers"]').trigger('click')
    await cancel()
    rejectDiscovery(failure); await flushPromises()
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(errorSpy).not.toHaveBeenCalled()
    expect(report).toHaveBeenCalledWith('[printing settings discovery after unmount]', failure)
  })
  it('validates an unavailable draft beside the printer field', async () => {
    await mountSettings()
    wrapper.getComponent('[data-testid="printer-selection-inline"]').vm.$emit('update:modelValue', 'Missing')
    await flushPromises(); await save()
    const error = wrapper.get('[role="alert"]')
    expect(error.text()).toBe('Выберите доступный принтер')
    expect(error.element.previousElementSibling.classList.contains('printer-configuration-row')).toBe(true)
    expect(router.currentRoute.value.path).toBe('/printing/settings')
    expect(env.qz.select).not.toHaveBeenCalled()
  })
  it('saves unchanged printer preferences while QZ is offline', async () => {
    env.qz.connect.mockRejectedValueOnce({ code: 'QzUnavailable' })
    await mountSettings()
    await save()
    expect(router.currentRoute.value.path).toBe('/boxes')
    expect(localStorage.getItem(PRINTER_STORAGE_KEY)).toBe('TSC TE200')
    expect(localStorage.getItem(PRINT_MODE_STORAGE_KEY)).toBe('Off')
    expect(env.qz.select).not.toHaveBeenCalled()
  })
})
