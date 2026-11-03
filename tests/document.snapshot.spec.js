// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount, flushPromises } from '@vue/test-utils'
import InvoiceSettings from '@/dialogs/Invoice_Settings.vue'
import CmrSettings from '@/dialogs/Cmr_Settings.vue'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import router from '@/router'

vi.mock('@/helpers/config.js', () => ({ apiUrl: '/api' }))
vi.mock('@/helpers/fetch.wrapper.js', () => ({ fetchWrapper: { get: vi.fn(), downloadFile: vi.fn() } }))
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
describe.each(views)('%s document saved snapshot', (kind, component, props) => {
  it('preserves settings after generation failure and retries the requested document', async () => {
    const wrapper = open(component, props)
    await flushPromises()
    if (kind === 'cmr') {
      await wrapper.get('#vehicleRegistrationNumber').setValue('А123ВС')
      await wrapper.get('#vehicleMakeModel').setValue('Volvo / Schmitz')
      await wrapper.get('#documentDate').setValue('2026-11-02')
    } else {
      await wrapper.get('.optional-columns-group input').setChecked(true)
    }
    await wrapper.get('.weight-correction-checkbox input').setChecked(false)
    fetchWrapper.downloadFile.mockRejectedValueOnce(new Error('Technical document failure')).mockResolvedValueOnce(undefined)
    const generate = wrapper.get('button[aria-label="Сформировать"]')
    await generate.trigger('click')
    await flushPromises()
    expect(router.go).not.toHaveBeenCalled()
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.text()).not.toContain('Technical document failure')
    expect(wrapper.get('.weight-correction-checkbox input').element.checked).toBe(false)
    if (kind === 'cmr') expect(wrapper.get('#vehicleRegistrationNumber').element.value).toBe('А123ВС')
    else expect(wrapper.get('.optional-columns-group input').element.checked).toBe(true)
    await generate.trigger('click')
    await flushPromises()
    expect(fetchWrapper.downloadFile).toHaveBeenCalledTimes(2)
    expect(router.go).toHaveBeenCalledExactlyOnceWith(-1)
  })
})
