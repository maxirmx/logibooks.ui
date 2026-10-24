// Copyright (C) 2026 Maxim [maxirmx] Samsonov (http://www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

/* @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useRegisterDownloadFlow } from '@/composables/useRegisterDownloadFlow.js'
import { useAlertStore } from '@/stores/alert.store.js'
import PageAlertRegion from '@/components/PageAlertRegion.vue'
import { GTC_COMPANY_ID, OZON_COMPANY_ID, WBRN_REGISTER_ID } from '@/helpers/company.constants.js'

const flush = async () => { await Promise.resolve(); await Promise.resolve(); await nextTick() }
const register = (registerType, id = 10) => ({ id, registerType, fileName: 'r.xlsx' })

let registersStore
let alertStore
function mountFlow(store = alertStore) {
  let flow
  const wrapper = mount(defineComponent({
    setup() { flow = useRegisterDownloadFlow(registersStore, store); return () => null }
  }))
  return { wrapper, flow }
}

describe('shared register download flow', () => {
  afterEach(() => vi.restoreAllMocks())
  beforeEach(() => {
    registersStore = { getDownloadFormats: vi.fn(), download: vi.fn().mockResolvedValue(true) }
    alertStore = { error: vi.fn() }
  })

  it.each(['resolve', 'reject'])('preserves the next page on late download %s and still cleans up', async outcome => {
    let resolve, reject
    registersStore.download.mockReturnValueOnce(new Promise((res, rej) => { resolve = res; reject = rej }))
    const diagnostic = vi.spyOn(console, 'error').mockImplementation(() => {})
    const pinia = createPinia()
    setActivePinia(pinia)
    const alerts = useAlertStore()
    const visible = ref(true)
    let flow
    const child = defineComponent({ setup() {
      flow = useRegisterDownloadFlow(registersStore, alerts)
      return () => null
    } })
    const wrapper = mount(defineComponent({ setup: () => () => h('div', [
      h(PageAlertRegion), visible.value ? h(child) : null
    ]) }), { global: { plugins: [pinia] } })
    const onDownloadStart = vi.fn(), onDownloadEnd = vi.fn()
    const pending = flow.download({ register: register(WBRN_REGISTER_ID), onDownloadStart, onDownloadEnd })
    visible.value = false
    await nextTick()
    alerts.info('Next page')
    if (outcome === 'resolve') resolve(true)
    else reject(new Error('late download'))
    expect(await pending).toBe(false)
    await flush()
    expect(wrapper.text()).toContain('Next page')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(onDownloadStart).toHaveBeenCalledTimes(1)
    expect(onDownloadEnd).toHaveBeenCalledTimes(1)
    expect(flow.pending.value).toBe(false)
    expect(diagnostic).toHaveBeenCalledTimes(outcome === 'reject' ? 1 : 0)
    expect(await flow.download({ register: register(WBRN_REGISTER_ID), onDownloadStart })).toBe(false)
    expect(registersStore.download).toHaveBeenCalledTimes(1)
    expect(onDownloadStart).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })

  it.each(['download', 'getDownloadFormats'])('reports a %s failure without alert callback metadata', async method => {
    registersStore[method].mockRejectedValueOnce(new Error('failed'))
    const { flow, wrapper } = mountFlow()
    if (method === 'download') await flow.download({ register: register(WBRN_REGISTER_ID) })
    else await flow.loadFormats(register(WBRN_REGISTER_ID))
    expect(alertStore.error).toHaveBeenCalledTimes(1)
    expect(wrapper.find('.page-alert-region__action').exists()).toBe(false)
    wrapper.unmount()
  })

  it.each([WBRN_REGISTER_ID, OZON_COMPANY_ID, GTC_COMPANY_ID])(
    'loads a usable company format for supported type %i and sends the chosen format', async (registerType) => {
      registersStore.getDownloadFormats.mockResolvedValue({ company: { available: true, name: 'Company format — Получатель' } })
      const { flow, wrapper } = mountFlow()
      await flow.loadFormats(register(registerType))
      expect(flow.companyFormatName.value).toBe('Получатель')
      expect(registersStore.getDownloadFormats).toHaveBeenCalledWith(10)
      expect(await flow.download({ register: register(registerType), format: 'company' })).toBe(true)
      expect(registersStore.download).toHaveBeenCalledWith(10, 'r.xlsx', null, undefined, false, 'company')
      expect(alertStore.error).not.toHaveBeenCalled()
      wrapper.unmount()
  }
  )

  it.each([undefined, 0])('uses companyId when registerType is %s', async (registerType) => {
    registersStore.getDownloadFormats.mockResolvedValue({ company: { available: true, name: 'Получатель' } })
    const { flow, wrapper } = mountFlow()
    const item = { id: 10, registerType, companyId: OZON_COMPANY_ID }
    await flow.loadFormats(item)
    expect(flow.companyFormatName.value).toBe('Получатель')
    expect(await flow.download({ register: item, format: 'generic' })).toBe(true)
    expect(registersStore.download).toHaveBeenCalledWith(10, undefined, null, undefined, false, 'generic')
    wrapper.unmount()
  })

  it.each([2])('keeps unsupported type %i on the original path', async (registerType) => {
    const { flow, wrapper } = mountFlow()
    await flow.loadFormats(register(registerType, 8))
    expect(registersStore.getDownloadFormats).not.toHaveBeenCalled()
    expect(await flow.download({ register: register(registerType, 8) })).toBe(true)
    expect(registersStore.download).toHaveBeenCalledWith(8, 'r.xlsx', null, undefined)
    expect(await flow.download({ register: register(registerType, 8), format: 'company' })).toBe(false)
    wrapper.unmount()
  })

  it('prevents simultaneous requests and ignores missing registers', async () => {
    let release
    registersStore.download.mockReturnValueOnce(new Promise(resolve => { release = resolve }))
    const { flow, wrapper } = mountFlow()
    const first = flow.download({ register: register(WBRN_REGISTER_ID) })
    expect(await flow.download({ register: register(WBRN_REGISTER_ID) })).toBe(false)
    expect(await flow.download({ register: {} })).toBe(false)
    release(true)
    expect(await first).toBe(true)
    wrapper.unmount()
  })

  it('does not expose a stale format after switching registers', async () => {
    let resolveFirst
    registersStore.getDownloadFormats.mockReturnValueOnce(new Promise(resolve => { resolveFirst = resolve }))
      .mockResolvedValueOnce({ company: { available: false } })
    const { flow, wrapper } = mountFlow()
    const first = flow.loadFormats(register(WBRN_REGISTER_ID, 11))
    await flow.loadFormats(register(WBRN_REGISTER_ID, 12))
    resolveFirst({ company: { available: true, name: 'Old' } })
    await first
    expect(flow.companyFormatName.value).toBe('')
    wrapper.unmount()
  })

  it('shows one visible discovery error without alert callbacks', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const pageAlerts = useAlertStore()
    registersStore.getDownloadFormats.mockRejectedValueOnce(new Error('Нет подключения'))
      .mockResolvedValueOnce({ company: { available: true, name: 'Receiver' } })
    let flow
    const wrapper = mount(defineComponent({
      setup() {
        flow = useRegisterDownloadFlow(registersStore, pageAlerts)
        return () => h(PageAlertRegion)
      }
    }), { global: { plugins: [pinia] } })
    await flow.loadFormats(register(GTC_COMPANY_ID, 17))
    await flush()
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.get('[role="alert"]').text()).toContain('Нет подключения')
    expect(wrapper.find('.page-alert-region__action').exists()).toBe(false)
    wrapper.unmount()
  })
})
