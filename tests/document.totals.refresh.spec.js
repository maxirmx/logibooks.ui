// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount, flushPromises } from '@vue/test-utils'
import InvoiceSettings from '@/dialogs/Invoice_Settings.vue'
import CmrSettings from '@/dialogs/Cmr_Settings.vue'
import { useRegistersStore } from '@/stores/registers.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import router from '@/router'

vi.mock('@/helpers/config.js', () => ({ apiUrl: '/api' }))
vi.mock('@/helpers/fetch.wrapper.js', () => ({ fetchWrapper: { get: vi.fn() } }))
vi.mock('@/router', () => ({ default: { go: vi.fn() } }))

const views = [
  ['invoice', InvoiceSettings, { id: 77 }],
  ['do1', InvoiceSettings, { id: 77, documentType: 'do1' }],
  ['cmr', CmrSettings, { id: 77 }]
]
const wrappers = []
let serverRegister

beforeEach(() => {
  setActivePinia(createPinia())
  vi.resetAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  serverRegister = {
    id: 77, invoiceNumber: 'INV-77', invoiceDate: '2026-06-15',
    transportationTypeCode: 1, customsProcedureCode: 10, senderId: 10, recipientId: 20,
    realWeightKg: 5, totalWeightKgToRelease: 10, derivedTotalsPending: false
  }
  fetchWrapper.get.mockImplementation(async url => {
    if (url === '/api/registers/ops') return {
      customsProcedures: [{ value: 10, isExport: true }], transportationTypes: [1], incoterms: [1]
    }
    if (url === '/api/registers/77') return { ...serverRegister }
    return []
  })
})
afterEach(() => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  vi.restoreAllMocks()
})

function open(component, props) {
  const wrapper = mount(component, {
    props,
    global: { stubs: {
      Form: { template: '<form><slot /></form>' },
      ActionDialog: true,
      ActionButton: {
        props: ['tooltipText', 'disabled'], emits: ['click'],
        template: '<button type="button" :disabled="disabled" :aria-label="tooltipText" @click="$emit(\'click\')">{{ tooltipText }}</button>'
      }
    } }
  })
  wrappers.push(wrapper)
  return wrapper
}
const refreshButton = wrapper => wrapper.get('button[aria-label="Обновить итоги"]')
const generateButton = wrapper => wrapper.get('button[aria-label="Сформировать"]')
const totalsGroup = wrapper => wrapper.find('[data-testid="register-totals-actions"]')

async function enterSettings(wrapper, kind) {
  if (kind === 'cmr') {
    await wrapper.get('#vehicleRegistrationNumber').setValue('А123ВС')
    await wrapper.get('#vehicleMakeModel').setValue('Volvo / Schmitz')
    await wrapper.get('#documentDate').setValue('2026-10-30')
  } else {
    await wrapper.get('.optional-columns-group input').setChecked(true)
    await wrapper.get('.weight-correction-checkbox input').setChecked(false)
  }
}
function assertSettings(wrapper, kind) {
  if (kind === 'cmr') {
    expect(wrapper.get('#vehicleRegistrationNumber').element.value).toBe('А123ВС')
    expect(wrapper.get('#vehicleMakeModel').element.value).toBe('Volvo / Schmitz')
    expect(wrapper.get('#documentDate').element.value).toBe('2026-10-30')
  } else {
    expect(wrapper.get('.optional-columns-group input').element.checked).toBe(true)
    expect(wrapper.get('.weight-correction-checkbox input').element.checked).toBe(false)
  }
}

describe.each(views)('%s document totals refresh', (kind, component, props) => {
  it.each([
    [false, false],
    [true, false],
    [false, true],
    [true, true]
  ])('groups loading=%s and pending totals=%s at the left without an empty group', async (loading, pending) => {
    const wrapper = open(component, props)
    await flushPromises()
    const registers = useRegistersStore()
    registers.loading = loading
    registers.item.derivedTotalsPending = pending
    await flushPromises()

    expect(totalsGroup(wrapper).exists()).toBe(loading || pending)
    expect(wrapper.findAll('.spinner-border')).toHaveLength(loading ? 1 : 0)
    expect(wrapper.findAll('button[aria-label="Обновить итоги"]')).toHaveLength(pending ? 1 : 0)
    if (loading || pending) {
      const group = totalsGroup(wrapper)
      expect(group.isVisible()).toBe(true)
      expect(group.classes()).toEqual(expect.arrayContaining(['header-actions', 'header-actions-group']))
      expect(wrapper.get('.header-actions-bar').element.firstElementChild).toBe(group.element)
      expect(group.findAll('.spinner-border')).toHaveLength(loading ? 1 : 0)
      expect(group.findAll('button')).toHaveLength(pending ? 1 : 0)
      expect(group.find('button[aria-label="Сформировать"]').exists()).toBe(false)
    }

    registers.loading = false
    registers.item.derivedTotalsPending = false
    await flushPromises()
    expect(totalsGroup(wrapper).exists()).toBe(false)
  })

  it('keeps generation usable without the totals group and preserves settings for a failed-generation retry', async () => {
    const wrapper = open(component, props)
    await flushPromises()
    await enterSettings(wrapper, kind)
    const registers = useRegistersStore()
    const operation = kind === 'cmr' ? 'downloadCmrFile' : kind === 'do1' ? 'downloadDo1File' : 'downloadInvoiceFile'
    const download = vi.spyOn(registers, operation)
      .mockRejectedValueOnce(new Error('Ошибка формирования документа'))
      .mockResolvedValueOnce(undefined)
    const report = vi.spyOn(useAlertStore(), 'error')
    expect(totalsGroup(wrapper).exists()).toBe(false)
    expect(generateButton(wrapper).element.parentElement).toBe(wrapper.get('button[aria-label="Отменить"]').element.parentElement)

    await generateButton(wrapper).trigger('click')
    await flushPromises()
    expect(download).toHaveBeenCalledOnce()
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.get('[role="alert"]').text()).toContain('Ошибка формирования документа')
    expect(report).toHaveBeenCalledOnce()
    expect(router.go).not.toHaveBeenCalled()
    expect(generateButton(wrapper).element.disabled).toBe(false)
    assertSettings(wrapper, kind)

    await generateButton(wrapper).trigger('click')
    await flushPromises()
    expect(download).toHaveBeenCalledTimes(2)
    expect(download).toHaveBeenNthCalledWith(2, ...download.mock.calls[0])
    expect(router.go).toHaveBeenCalledExactlyOnceWith(-1)
    expect(report).toHaveBeenCalledOnce()
  })

  it('keeps cancel separate from the visible totals group and does not refresh on exit', async () => {
    serverRegister.derivedTotalsPending = true
    const wrapper = open(component, props)
    await flushPromises()
    const cancel = wrapper.get('button[aria-label="Отменить"]')
    expect(totalsGroup(wrapper).isVisible()).toBe(true)
    expect(totalsGroup(wrapper).element.contains(cancel.element)).toBe(false)
    fetchWrapper.get.mockClear()

    await cancel.trigger('click')
    expect(router.go).toHaveBeenCalledExactlyOnceWith(-1)
    expect(fetchWrapper.get).not.toHaveBeenCalled()
  })

  it('recovers an initially pending register without reloading or leaving the page', async () => {
    serverRegister.derivedTotalsPending = true
    const wrapper = open(component, props)
    await flushPromises()
    expect(wrapper.text()).toContain('итоги пересчитываются')
    expect(generateButton(wrapper).element.disabled).toBe(true)
    serverRegister.derivedTotalsPending = false
    await refreshButton(wrapper).trigger('click')
    await flushPromises()
    expect(generateButton(wrapper).element.disabled).toBe(false)
    expect(wrapper.text()).not.toContain('итоги пересчитываются')
    expect(wrapper.find('button[aria-label="Обновить итоги"]').exists()).toBe(false)
    expect(totalsGroup(wrapper).exists()).toBe(false)
    expect(router.go).not.toHaveBeenCalled()
  })

  it('preserves settings across pending refreshes and keeps a single in-flight request', async () => {
    const wrapper = open(component, props)
    await flushPromises()
    await enterSettings(wrapper, kind)
    useRegistersStore().invalidateDerived(77)
    await flushPromises()
    let finish
    fetchWrapper.get.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    await refreshButton(wrapper).trigger('click')
    await flushPromises()
    expect(refreshButton(wrapper).element.disabled).toBe(true)
    expect(totalsGroup(wrapper).get('.spinner-border').isVisible()).toBe(true)
    expect(generateButton(wrapper).element.disabled).toBe(true)
    expect(await wrapper.vm.$.setupState.refreshTotals()).toBe(false)
    finish({ ...serverRegister, derivedTotalsPending: true })
    await flushPromises()
    expect(refreshButton(wrapper).element.disabled).toBe(false)
    expect(totalsGroup(wrapper).find('.spinner-border').exists()).toBe(false)
    expect(generateButton(wrapper).element.disabled).toBe(true)
    await refreshButton(wrapper).trigger('click')
    await flushPromises()
    assertSettings(wrapper, kind)
    expect(generateButton(wrapper).element.disabled).toBe(false)
    expect(totalsGroup(wrapper).exists()).toBe(false)
  })

  it('shows one Russian refresh failure, preserves settings and permits retry', async () => {
    const wrapper = open(component, props)
    await flushPromises()
    await enterSettings(wrapper, kind)
    const registers = useRegistersStore()
    const alerts = useAlertStore()
    const report = vi.spyOn(alerts, 'error')
    registers.invalidateDerived(77)
    await flushPromises()
    const failure = new Error('Network Error')
    fetchWrapper.get.mockRejectedValueOnce(failure)
    await refreshButton(wrapper).trigger('click')
    await flushPromises()
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.get('[role="alert"]').text()).toContain('Не удалось соединиться с сервером')
    expect(wrapper.text()).not.toContain('Network Error')
    expect(report).toHaveBeenCalledOnce()
    expect(console.error).toHaveBeenCalledWith('[register totals refresh]', failure)
    expect(generateButton(wrapper).element.disabled).toBe(true)
    expect(refreshButton(wrapper).element.disabled).toBe(false)
    expect(totalsGroup(wrapper).isVisible()).toBe(true)
    expect(totalsGroup(wrapper).find('.spinner-border').exists()).toBe(false)
    expect(router.go).not.toHaveBeenCalled()
    await refreshButton(wrapper).trigger('click')
    await flushPromises()
    assertSettings(wrapper, kind)
    expect(generateButton(wrapper).element.disabled).toBe(false)
    expect(totalsGroup(wrapper).exists()).toBe(false)
  })
})

it('does not publish a late refresh failure on the next page', async () => {
  const wrapper = open(InvoiceSettings, { id: 77 })
  await flushPromises()
  const diagnostics = vi.spyOn(console, 'error').mockImplementation(() => {})
  const alerts = useAlertStore()
  let reject
  fetchWrapper.get.mockImplementationOnce(() => new Promise((_, fail) => { reject = fail }))
  const refresh = wrapper.vm.$.setupState.refreshTotals
  const running = refresh()
  await flushPromises()
  wrapper.unmount()
  const error = new Error('Network Error')
  reject(error)
  expect(await running).toBe(false)
  expect(alerts.alert).toBeNull()
  expect(diagnostics).toHaveBeenCalledWith('[document totals refresh after teardown]', error)
  expect(await refresh()).toBe(false)
})
