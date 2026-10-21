// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'
import { createPinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import PrinterSettings from '@/views/Printer_SettingsView.vue'
import ActionButton from '@/components/ActionButton.vue'
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
  it('renders a normal page with header actions, one alert region and compact ungrouped printer controls', async () => {
    await mountSettings()
    expect(wrapper.get('h1').text()).toBe('Настройки печати')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="printer-status"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="close-print-settings"]').exists()).toBe(false)
    for (const [id, caption] of [['label-printer', 'Принтер этикеток:'], ['auto-print-mode', 'Режим автомаркировки:']]) {
      const label = wrapper.get(`label[for="${id}"]`)
      expect(label.text()).toBe(caption)
      expect(label.classes()).toContain('label')
      expect(label.element.closest('.form-group').querySelector(`select#${id}`)).not.toBeNull()
    }
    for (const select of wrapper.findAllComponents({ name: 'v-select' })) expect(select.props('label')).toBeUndefined()
    alerts.error('Example form failure'); await flushPromises()
    expect(wrapper.findAllComponents(PageAlertRegion)).toHaveLength(1)
    expect(wrapper.get('hr').element.nextElementSibling).toBe(wrapper.getComponent(PageAlertRegion).element)
    for (const id of ['save-print-settings', 'cancel-print-settings']) expect(wrapper.get(`[data-testid="${id}"]`).element.closest('.header-actions-bar')).not.toBeNull()
    for (const id of ['clear-printer', 'refresh-printers']) {
      const action = wrapper.findAllComponents(ActionButton).find((item) => item.vm.$attrs['data-testid'] === id)
      expect(action.props('iconSize')).toBe('1x')
      expect(wrapper.get(`[data-testid="${id}"]`).element.closest('.header-actions')).toBeNull()
    }
    const printers = wrapper.get('[data-testid="printer-selection-inline"] select').findAll('option').map((item) => item.text())
    expect(printers).toEqual(['', 'TSC TE200', 'Office'])
  })
  it('keeps printer and marking choices as a draft until Save and returns to the source form', async () => {
    await mountSettings()
    await selectPrinter('Office'); await selectMode('TJ')
    expect(localStorage.getItem(PRINTER_STORAGE_KEY)).toBe('TSC TE200')
    expect(localStorage.getItem(PRINT_MODE_STORAGE_KEY)).toBeNull()
    expect(env.channel.start).not.toHaveBeenCalled()
    await save()
    expect(localStorage.getItem(PRINTER_STORAGE_KEY)).toBe('Office')
    expect(localStorage.getItem(PRINT_MODE_STORAGE_KEY)).toBe('TJ')
    expect(store.preferredMode).toBe('TJ')
    expect(router.currentRoute.value.path).toBe('/boxes')
    expect(store.settingsActive).toBe(false)
    expect(env.channel.start).not.toHaveBeenCalled()
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
  it('shows QZ failure once on this page, clears it on refresh, and removes it on Cancel', async () => {
    env.qz.connect.mockRejectedValueOnce({ code: 'QzUnavailable' })
    await mountSettings()
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.get('[role="alert"] .page-alert-region__content').text()).toBe('QZ Tray недоступен.')
    expect(wrapper.text()).not.toContain('QZ Tray отключён')
    expect(errorSpy).toHaveBeenCalledOnce()
    await wrapper.get('[data-testid="refresh-printers"]').trigger('click'); await flushPromises()
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    env.qz.connect.mockRejectedValueOnce({ code: 'QzUnavailable' })
    await wrapper.get('[data-testid="refresh-printers"]').trigger('click'); await flushPromises()
    await cancel()
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })
  it('retains drafts through refresh failures and retries discovery without saving changes', async () => {
    await mountSettings()
    await selectPrinter('Office'); await selectMode('TJ')
    env.qz.connect.mockRejectedValueOnce(new Error('discovery failed'))
    await wrapper.get('[data-testid="refresh-printers"]').trigger('click'); await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('discovery failed')
    expect(wrapper.get('[data-testid="printer-selection-inline"] select').element.value).toBe('Office')
    expect(localStorage.getItem(PRINTER_STORAGE_KEY)).toBe('TSC TE200')
    await wrapper.get('[data-testid="refresh-printers"]').trigger('click'); await flushPromises()
    expect(env.qz.connect).toHaveBeenCalledTimes(3)
    expect(errorSpy).toHaveBeenCalledOnce()
  })
  it('keeps a failed save open, rolls back both settings and retries the same draft', async () => {
    await mountSettings()
    await selectPrinter('Office'); await selectMode('TJ')
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => { throw new Error('cannot save preferences') })
    await save()
    expect(router.currentRoute.value.path).toBe('/printing/settings')
    expect(wrapper.get('[role="alert"]').text()).toContain('cannot save preferences')
    expect(errorSpy).toHaveBeenCalledOnce()
    expect(wrapper.get('[data-testid="printer-selection-inline"] select').element.value).toBe('Office')
    expect(wrapper.get('[data-testid="auto-print-mode"] select').element.value).toBe('TJ')
    expect(localStorage.getItem(PRINTER_STORAGE_KEY)).toBe('TSC TE200')
    expect(localStorage.getItem(PRINT_MODE_STORAGE_KEY)).toBeNull()
    write.mockRestore()
    await save()
    expect(router.currentRoute.value.path).toBe('/boxes')
    expect(localStorage.getItem(PRINTER_STORAGE_KEY)).toBe('Office')
    expect(localStorage.getItem(PRINT_MODE_STORAGE_KEY)).toBe('TJ')
  })
  it('rolls back a partial write when saving the marking mode fails', async () => {
    localStorage.setItem(PRINT_MODE_STORAGE_KEY, 'KGT')
    await mountSettings(); await selectPrinter('Office'); await selectMode('TJ')
    const original = Storage.prototype.setItem
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(function (key, value) { return original.call(this, key, value) })
      .mockImplementationOnce(() => { throw new Error('mode write failed') })
    await save()
    expect(localStorage.getItem(PRINTER_STORAGE_KEY)).toBe('TSC TE200')
    expect(localStorage.getItem(PRINT_MODE_STORAGE_KEY)).toBe('KGT')
    expect(store.qzState.printer).toBe('TSC TE200')
    expect(store.preferredMode).toBe('KGT')
    expect(errorSpy).toHaveBeenCalledOnce()
    write.mockRestore(); await save()
    expect(router.currentRoute.value.path).toBe('/boxes')
  })
  it('handles a save rejection without navigating and preserves input for retry', async () => {
    await mountSettings(); await selectPrinter('Office')
    const saving = vi.spyOn(store, 'saveSettings').mockRejectedValueOnce(new Error('unexpected save failure'))
    await save()
    expect(wrapper.get('[role="alert"]').text()).toContain('unexpected save failure')
    expect(wrapper.get('[data-testid="printer-selection-inline"] select').element.value).toBe('Office')
    expect(router.currentRoute.value.path).toBe('/printing/settings')
    expect(errorSpy).toHaveBeenCalledOnce()
    saving.mockRestore(); await save()
    expect(router.currentRoute.value.path).toBe('/boxes')
  })
  it('uses a header spinner throughout saving and prevents repeated submissions', async () => {
    await mountSettings()
    let finish
    env.channel.stop.mockReturnValueOnce(new Promise((resolve) => { finish = resolve }))
    await wrapper.get('[data-testid="save-print-settings"]').trigger('click'); await flushPromises()
    expect(wrapper.get('[data-testid="print-settings-loading"]').isVisible()).toBe(true)
    expect(wrapper.get('[data-testid="save-print-settings"]').element.disabled).toBe(true)
    expect(wrapper.get('[data-testid="cancel-print-settings"]').element.disabled).toBe(true)
    await wrapper.get('[data-testid="save-print-settings"]').trigger('click')
    expect(env.channel.stop).toHaveBeenCalledOnce()
    finish(); await flushPromises()
    expect(router.currentRoute.value.path).toBe('/boxes')
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
  it.each(['https://evil.example', '//evil.example', '/printing/settings', '/printing/settings/', '/PRINTING/SETTINGS', '/printing/settings/?tab=printer#top', undefined])('uses the scanning list for an unsafe or self return route %s', async (returnUrl) => {
    await mountSettings('/printing/settings' + (returnUrl ? '?returnUrl=' + encodeURIComponent(returnUrl) : ''))
    await cancel()
    expect(router.currentRoute.value.path).toBe('/scanjobs')
  })
  it('returns to scanning after saving with a trailing-slash self return URL', async () => {
    await mountSettings('/printing/settings?returnUrl=/printing/settings/')
    await save()
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
  it.each(['disarm', 'persistence', 'rearm'])('rejects %s save failures without store notifications, preserves the draft and retries', async (source) => {
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
    expect(wrapper.get('[role="alert"]').text()).toContain(failure.message)
    expect(errorSpy).toHaveBeenCalledOnce()
    expect(wrapper.get('[data-testid="printer-selection-inline"] select').element.value).toBe('Office')
    expect(wrapper.get('[data-testid="auto-print-mode"] select').element.value).toBe('TJ')
    await save()
    expect(router.currentRoute.value.path).toBe('/boxes')
    expect(store.state.mode).toBe('TJ')
    expect(localStorage.getItem(PRINTER_STORAGE_KEY)).toBe('Office')
  })
  it.each([false, true])('waits for an in-flight submission before discovery (failure: %s)', async (fails) => {
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
  it('cancels deferred discovery when settings is left before the worker finishes', async () => {
    await mountSettings(undefined, (printing) => { printing.state.busy = true })
    await cancel()
    store.state.busy = false; await flushPromises()
    expect(env.qz.connect).not.toHaveBeenCalled()
    expect(router.currentRoute.value.path).toBe('/boxes')
  })
  it('presents a rejected discovery once and permits a retry', async () => {
    await mountSettings()
    vi.spyOn(store, 'refreshPrinters').mockRejectedValueOnce(new Error('discovery rejected'))
    await wrapper.get('[data-testid="refresh-printers"]').trigger('click'); await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('discovery rejected')
    expect(errorSpy).toHaveBeenCalledOnce()
    await wrapper.get('[data-testid="refresh-printers"]').trigger('click'); await flushPromises()
    expect(env.qz.connect).toHaveBeenCalledTimes(2)
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
  it('preserves another operation error when leaving after a QZ diagnostic', async () => {
    env.qz.connect.mockRejectedValueOnce({ code: 'QzUnavailable' })
    await mountSettings()
    alerts.error('Another operation failed')
    await cancel()
    expect(wrapper.get('[role="alert"]').text()).toContain('Another operation failed')
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
  it('restores saved draft defaults in a fresh application instance', async () => {
    await mountSettings(); await selectPrinter('Office'); await selectMode('TJ'); await save()
    wrapper.unmount(); await store.shutdown()
    await mountSettings()
    expect(wrapper.get('[data-testid="printer-selection-inline"] select').element.value).toBe('Office')
    expect(wrapper.get('[data-testid="auto-print-mode"] select').element.value).toBe('TJ')
  })
})
