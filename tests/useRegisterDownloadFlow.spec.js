/* @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useRegisterDownloadFlow } from '@/composables/useRegisterDownloadFlow.js'
import { useAlertStore } from '@/stores/alert.store.js'
import PageAlertRegion from '@/components/PageAlertRegion.vue'
import { GTC_COMPANY_ID, OZON_COMPANY_ID, WBR2_REGISTER_ID, WBRN_REGISTER_ID } from '@/helpers/company.constants.js'

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
  beforeEach(() => {
    registersStore = { getDownloadFormats: vi.fn(), download: vi.fn().mockResolvedValue(true) }
    alertStore = { error: vi.fn() }
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

  it('keeps only generic download when company output is unavailable', async () => {
    registersStore.getDownloadFormats.mockResolvedValue({ company: { available: false, reason: 'Формат несовместим' } })
    const { flow, wrapper } = mountFlow()
    await flow.loadFormats(register(GTC_COMPANY_ID, 7))
    expect(flow.companyFormatName.value).toBe('')
    expect(await flow.download({ register: register(GTC_COMPANY_ID, 7), format: 'company' })).toBe(false)
    expect(await flow.download({ register: register(GTC_COMPANY_ID, 7) })).toBe(true)
    expect(registersStore.download).toHaveBeenCalledTimes(1)
    expect(registersStore.download).toHaveBeenCalledWith(7, 'r.xlsx', null, undefined, false, 'generic')
    wrapper.unmount()
  })

  it.each([2, WBR2_REGISTER_ID])('keeps unsupported type %i on the original path', async (registerType) => {
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

  it('reports availability failure and retries the captured register', async () => {
    registersStore.getDownloadFormats.mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ company: { available: true, name: 'Receiver' } })
    const { flow, wrapper } = mountFlow()
    await flow.loadFormats(register(WBRN_REGISTER_ID, 11))
    expect(alertStore.error).toHaveBeenCalledTimes(1)
    await alertStore.error.mock.calls[0][1].action.handler()
    expect(registersStore.getDownloadFormats).toHaveBeenNthCalledWith(2, 11)
    expect(flow.companyFormatName.value).toBe('Receiver')
    wrapper.unmount()
  })

  it('retries a failed download with the same format, zone and weight choices', async () => {
    registersStore.getDownloadFormats.mockResolvedValue({ company: { available: true, name: 'Receiver' } })
    registersStore.download.mockRejectedValueOnce(new Error('download failed')).mockResolvedValueOnce(true)
    const onDownloadStart = vi.fn()
    const onDownloadEnd = vi.fn()
    const { flow, wrapper } = mountFlow()
    await flow.loadFormats(register(GTC_COMPANY_ID, 12))
    const request = { register: register(GTC_COMPANY_ID, 12), format: 'company', forZone: 3,
      zoneLabel: 'Zone 3', applyWeightCorrection: true, onDownloadStart, onDownloadEnd }
    expect(await flow.download(request)).toBe(false)
    expect(alertStore.error).toHaveBeenCalledTimes(1)
    expect(await alertStore.error.mock.calls[0][1].action.handler()).toBe(true)
    expect(registersStore.download).toHaveBeenNthCalledWith(2, 12, 'r.xlsx', 3, 'Zone 3', true, 'company')
    expect(onDownloadStart).toHaveBeenCalledTimes(2)
    expect(onDownloadEnd).toHaveBeenCalledTimes(2)
    wrapper.unmount()
  })

  it('shows one visible page error and retries discovery', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const pageAlerts = useAlertStore()
    registersStore.getDownloadFormats.mockRejectedValueOnce(new Error('offline'))
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
    expect(wrapper.get('[role="alert"]').text()).toContain('offline')
    await wrapper.get('.page-alert-region__action').trigger('click')
    await flush()
    expect(flow.companyFormatName.value).toBe('Receiver')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    wrapper.unmount()
  })
})
