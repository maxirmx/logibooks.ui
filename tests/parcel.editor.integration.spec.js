// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { Form } from 'vee-validate'
import { createVuetify } from 'vuetify'
import FeacnCodeSelectorW from '@/components/FeacnCodeSelectorW.vue'
import ParcelEditView from '@/views/Parcel_EditView.vue'
import OzonEditor from '@/dialogs/OzonParcel_EditDialog.vue'
import WbrEditor from '@/dialogs/WbrParcel_EditDialog.vue'
import WbrNEditor from '@/dialogs/WbrNParcel_EditDialog.vue'
import GtcEditor from '@/dialogs/GtcParcel_EditDialog.vue'
import { useParcelsStore } from '@/stores/parcels.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { CheckStatusCode } from '@/helpers/check.status.code.js'
import { DEC_REPORT_UPLOADED_EVENT } from '@/helpers/dec.report.events.js'
import { OZON_COMPANY_ID, WBR_COMPANY_ID, WBRN_REGISTER_ID, GTC_COMPANY_ID } from '@/helpers/company.constants.js'
import { OP_MODE_WAREHOUSE } from '@/helpers/op.mode.js'
import * as errorHelpers from '@/helpers/error.helpers.js'

const transport = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), downloadFile: vi.fn() }))
const confirm = vi.hoisted(() => vi.fn())
const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }))
const signalR = vi.hoisted(() => ({ connections: [] }))
vi.mock('@/helpers/fetch.wrapper.js', () => ({ fetchWrapper: transport }))
vi.mock('@/helpers/config.js', () => ({ apiUrl: 'http://test/api' }))
vi.mock('@/router', () => ({ default: router }))
vi.mock('vuetify-use-dialog', () => ({ useConfirm: () => confirm }))
vi.mock('@microsoft/signalr', () => ({
  HubConnectionState: { Connected: 'Connected' },
  HubConnectionBuilder: class {
    withUrl() { return this }
    withAutomaticReconnect() { return this }
    build() {
      const connection = {
        state: 'Disconnected',
        handlers: {},
        async start() { this.state = 'Connected' },
        async stop() { this.state = 'Disconnected' },
        async invoke() {},
        on(name, handler) { this.handlers[name] = handler },
        onclose(handler) { this.handlers.close = handler },
        onreconnected(handler) { this.handlers.reconnected = handler }
      }
      signalR.connections.push(connection)
      return connection
    }
  }
}))

const editors = [
  ['Ozon', OzonEditor, OZON_COMPANY_ID],
  ['WBR', WbrEditor, WBR_COMPANY_ID],
  ['WBRN', WbrNEditor, WBRN_REGISTER_ID],
  ['GTC', GtcEditor, GTC_COMPANY_ID]
]
const wrappers = []
const actionStub = {
  props: ['tooltipText', 'disabled'],
  emits: ['click'],
  template: '<button type="button" :disabled="disabled" :aria-label="tooltipText" @click="$emit(\'click\')"><slot /></button>'
}
const stubs = {
  ActionButton: actionStub,
  VTooltip: { template: '<span><slot name="activator" :props="{}" /><slot /></span>' },
  'font-awesome-icon': true,
  FeacnCodeSearch: true,
  ParcelImageOverlay: true
}
function deferred() {
  let resolve, reject
  const promise = new Promise((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}
function parcel(id = 3, extra = {}) {
  return {
    dangerousGoods: false,
    id, registerId: 12, postingNumber: `OZ-${id}`, shk: `SHK-${id}`,
    productName: `Product ${id}`, description: 'Description', tnVed: '6403999300',
    weight: 1200, weightKg: 1.2, quantity: 2, unitPrice: 10,
    price: 20, statusId: 5, checkStatus: 0, passportCheckStatus: 0,
    lastName: 'Ivanov', firstName: 'Ivan', passportNumber: 'AA1234567',
    ...extra
  }
}
let pinia, registerCountry, registerType, registerWeights, requiredFailure, parcelRequests, historyRequests, neighbors, previous
function mountEditor(component = ParcelEditView, props = {}) {
  const wrapper = mount(component, {
    props: { registerId: 12, id: 3, ...props },
    global: { plugins: [pinia, createVuetify()], stubs }
  })
  wrappers.push(wrapper)
  return wrapper
}
async function settle() {
  await flushPromises()
  await nextTick()
  await flushPromises()
  await new Promise((resolve) => setTimeout(resolve, 10))
}
function input(wrapper) { return wrapper.get('[name="productName"]') }
function action(wrapper, label) { return wrapper.get(`button[aria-label="${label}"]`) }
function parcelGets() { return transport.get.mock.calls.filter(([url]) => /\/parcels\/a\//.test(url)) }

beforeEach(() => {
  vi.resetAllMocks()
  pinia = createPinia()
  setActivePinia(pinia)
  signalR.connections.length = 0
  registerCountry = 156
  registerType = OZON_COMPANY_ID
  registerWeights = null
  confirm.mockResolvedValue(true)
  requiredFailure = null
  parcelRequests = []
  historyRequests = []
  neighbors = { withoutIssues: null, withIssues: null }
  previous = null
  router.push.mockResolvedValue()
  router.replace.mockResolvedValue()
  transport.get.mockImplementation(async (url) => {
    if (/\/parcels\/a\//.test(url)) {
      const pending = parcelRequests.shift()
      return pending ? pending.promise : parcel(Number(url.split('/').at(-1)))
    }
    if (url.endsWith('/parcelstatuses')) {
      if (requiredFailure) { const error = requiredFailure; requiredFailure = null; throw error }
      return [{ id: 5, title: 'В работе', useAtCustomsProcessing: true }]
    }
    if (url.endsWith('/registers/ops')) return {
      customsProcedures: [{ code: 40, isExport: false }], transportationTypes: [], incoterms: ['CIP'],
      passportCheckStatuses: [{ value: 0, code: 'NotChecked', name: 'Не проверен' }, { value: 30, code: 'Checked', name: 'Проверен' }]
    }
    if (/\/registers\/nextparcels\//.test(url)) return neighbors
    if (/\/registers\/\d+$/.test(url)) return { id: Number(url.split('/').at(-1)), registerType, customsProcedureCode: 40, theOtherCountryCode: registerCountry, ...registerWeights }
    if (url.endsWith('/hotkeyactionschemes/ops')) return { actions: [] }
    if (url.endsWith('/countries/compact')) return [{ id: 1, isoNumeric: 156, nameRuOfficial: 'Китай' }]
    if (/\/(stopwords|keywords|feacnprefixes|feacnorders\/orders)$/.test(url)) return []
    throw new Error(`Unexpected GET ${url}`)
  })
  transport.post.mockImplementation(async (url) => {
    if (url.endsWith('/parcelviews')) return historyRequests.shift()?.promise
  })
  transport.put.mockImplementation(async (url) => url.endsWith('/parcelviews') ? previous : undefined)
})
afterEach(async () => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount())
  await settle()
})

describe.each(editors)('%s editor with real forms and stores', (_name, component, type) => {

  it('blocks pending XML export visibly and preserves the draft for a corrected retry', async () => {
    registerType = type
    registerWeights = { realWeightKg: 5, totalWeightKgToRelease: 10, derivedTotalsPending: true }
    const wrapper = mountEditor(component)
    await settle()
    await input(wrapper).setValue('Draft for XML')
    const refresh = vi.spyOn(useParcelsStore(), 'getById')
    const warning = vi.spyOn(useAlertStore(), 'warning')
    await action(wrapper, 'Сохранить и выгрузить XML накладную').trigger('click')
    await settle()
    expect(transport.downloadFile).not.toHaveBeenCalled()
    expect(confirm).not.toHaveBeenCalled()
    expect(refresh).not.toHaveBeenCalled()
    expect(warning).toHaveBeenCalledTimes(1)
    expect(wrapper.findAll('[data-testid="page-alert-region"]')).toHaveLength(1)
    expect(wrapper.get('[role="status"]').text()).toContain('Итоги реестра пересчитываются')
    expect(input(wrapper).element.value).toBe('Draft for XML')
    expect(router.push).not.toHaveBeenCalled()
    expect(router.replace).not.toHaveBeenCalled()

    registerWeights.derivedTotalsPending = false
    await action(wrapper, 'Сохранить и выгрузить XML накладную').trigger('click')
    await settle()
    expect(confirm).toHaveBeenCalledTimes(1)
    expect(transport.downloadFile).toHaveBeenCalledExactlyOnceWith(
      'http://test/api/parcels/3/generate?applyWeightCorrection=true', expect.any(String)
    )
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(input(wrapper).element.value).toBe('Draft for XML')
    expect(router.push).not.toHaveBeenCalled()
    refresh.mockRestore()
  })

  it('presents a rejected XML download once without reloading or navigating and permits retry', async () => {
    registerType = type
    const wrapper = mountEditor(component)
    await settle()
    await input(wrapper).setValue('Draft for retry')
    const failure = new Error('Unexpected XML export failure')
    const diagnostics = vi.spyOn(errorHelpers, 'reportError').mockImplementation(() => {})
    const presentation = vi.spyOn(useAlertStore(), 'error')
    const refresh = vi.spyOn(useParcelsStore(), 'getById')
    transport.downloadFile.mockRejectedValueOnce(failure)
    await action(wrapper, 'Сохранить и выгрузить XML накладную').trigger('click')
    await settle()
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.get('[role="alert"]').text()).toContain('Ошибка при генерации XML')
    expect(wrapper.text()).not.toContain('Unexpected XML export failure')
    expect(presentation).toHaveBeenCalledTimes(1)
    expect(diagnostics).toHaveBeenCalledExactlyOnceWith(failure, { context: 'parcel XML generation' })
    expect(refresh).not.toHaveBeenCalled()
    expect(input(wrapper).element.value).toBe('Draft for retry')
    expect(router.push).not.toHaveBeenCalled()
    expect(router.replace).not.toHaveBeenCalled()
    await action(wrapper, 'Сохранить и выгрузить XML накладную').trigger('click')
    await settle()
    expect(transport.downloadFile).toHaveBeenCalledTimes(2)
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(input(wrapper).element.value).toBe('Draft for retry')
    diagnostics.mockRestore()
    refresh.mockRestore()
  })

  it('preserves draft, touched state, and validation through background success and failure', async () => {
    registerType = type
    const wrapper = mountEditor(component)
    await settle()
    await input(wrapper).setValue('Unsaved product')
    await input(wrapper).trigger('blur')
    // Form returns a render function; its public methods are on the exposed instance.
    const form = wrapper.getComponent(Form).vm.$.exposed
    await form.validate()
    await settle()
    form.setFieldError('productName', 'Draft validation')
    await nextTick()
    const store = useParcelsStore()
    const refreshed = deferred()
    parcelRequests.push(refreshed)
    window.dispatchEvent(new Event(DEC_REPORT_UPLOADED_EVENT))
    expect(store.item.productName).toBe('Product 3')
    refreshed.resolve(parcel(3, { productName: 'Server product', checkStatus: CheckStatusCode.Duplicate, readOnly: true }))
    await settle()
    expect(input(wrapper).element.value).toBe('Unsaved product')
    expect(form.getErrors().productName).toBe('Draft validation')
    expect(form.getMeta().touched).toBe(true)
    expect(action(wrapper, 'Сохранить').attributes('disabled')).toBeDefined()
    const failed = deferred()
    parcelRequests.push(failed)
    window.dispatchEvent(new Event(DEC_REPORT_UPLOADED_EVENT))
    failed.reject(new Error('Ошибка фонового обновления'))
    await settle()
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.get('[role="alert"]').text()).toContain('Ошибка фонового обновления')
    expect(input(wrapper).element.value).toBe('Unsaved product')
    expect(form.getMeta().touched).toBe(true)
    expect(form.getErrors().productName).toBe('Draft validation')
    expect(store.item.readOnly).toBe(true)
  })

  it('keeps entered values and the editor open after a failed save and retries the update', async () => {
    registerType = type
    registerCountry = 762
    transport.put.mockRejectedValueOnce(new Error('Сохранение недоступно'))
    const wrapper = mountEditor(component)
    await settle()
    await input(wrapper).setValue('Unsaved product')
    await wrapper.get('[name="dangerousGoods"]').setValue(true)
    await action(wrapper, 'Сохранить').trigger('click')
    await settle()
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.get('[role="alert"]').text()).toContain('Сохранение недоступно')
    expect(input(wrapper).element.value).toBe('Unsaved product')
    expect(wrapper.get('[name="dangerousGoods"]').element.checked).toBe(true)
    expect(transport.put).toHaveBeenLastCalledWith('http://test/api/parcels/3', expect.objectContaining({ dangerousGoods: true }))
    expect(router.push).not.toHaveBeenCalled()
    await action(wrapper, 'Сохранить').trigger('click')
    await settle()
    expect(transport.put).toHaveBeenCalledTimes(2)
    expect(router.push).toHaveBeenCalledTimes(1)
  })

  it('presents a final detail refresh failure once, preserves the form and retries the save', async () => {
    registerType = type
    const wrapper = mountEditor(component)
    await settle()
    await input(wrapper).setValue('Draft after refresh failure')
    const presentation = vi.spyOn(useAlertStore(), 'error')
    const detail = deferred()
    parcelRequests.push(detail)
    await action(wrapper, 'Сохранить').trigger('click')
    await settle()
    const failure = new Error('Не удалось обновить данные посылки после сохранения')
    detail.reject(failure)
    await settle()
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.get('[role="alert"]').text()).toContain(failure.message)
    expect(presentation).toHaveBeenCalledTimes(1)
    expect(input(wrapper).element.value).toBe('Draft after refresh failure')
    expect(router.push).not.toHaveBeenCalled()
    expect(router.replace).not.toHaveBeenCalled()
    await action(wrapper, 'Сохранить').trigger('click')
    await settle()
    expect(transport.put).toHaveBeenCalledTimes(2)
    expect(transport.put.mock.calls.every(([, values]) => values.productName === 'Draft after refresh failure')).toBe(true)
    expect(router.push).toHaveBeenCalledTimes(1)
    presentation.mockRestore()
  })

  it('updates only TN VED after an intentional lookup', async () => {
    const wrapper = mountEditor(component)
    await settle()
    await input(wrapper).setValue('Unsaved product')
    const response = deferred()
    parcelRequests.push({ promise: Promise.resolve(parcel(3)) }, response)
    response.resolve(parcel(3, { productName: 'Server product', tnVed: '8471300000' }))
    await action(wrapper, 'Сохранить и подобрать код ТН ВЭД').trigger('click')
    await settle()
    expect(wrapper.get('[name="tnVed"]').element.value).toBe('8471300000')
    expect(input(wrapper).element.value).toBe('Unsaved product')
  })

  it('keeps the draft through validation and check-status actions', async () => {
    const wrapper = mountEditor(component)
    await settle()
    await input(wrapper).setValue('Draft for checks')
    for (const label of [
      'Сохранить и проверить по стоп-словам с учётом исторических данных',
      'Сохранить и проверить по кодам ТН ВЭД',
      'Очистить статус',
      'Проверить на дубликат'
    ]) {
      if (action(wrapper, label).attributes('disabled') !== undefined) {
        expect(type).toBe(GTC_COMPANY_ID)
        continue
      }
      await action(wrapper, label).trigger('click')
      await settle()
      expect(input(wrapper).element.value).toBe('Draft for checks')
    }
    expect(transport.put).toHaveBeenCalledTimes(type === GTC_COMPANY_ID ? 3 : 4)
    expect(transport.put.mock.calls.every(([, values]) => values.productName === 'Draft for checks')).toBe(true)
    expect(router.push).not.toHaveBeenCalled()
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('changes only the selected TN VED and retains the draft while its search overlay opens', async () => {
    const wrapper = mountEditor(component)
    await settle()
    await input(wrapper).setValue('Draft for selection')
    await wrapper.getComponent(FeacnCodeSelectorW).props('onSelect')('8471300000')
    await settle()
    expect(wrapper.get('[name="tnVed"]').element.value).toBe('8471300000')
    expect(useParcelsStore().item.tnVed).toBe('8471300000')
    expect(useParcelsStore().item.id).toBe(3)
    expect(input(wrapper).element.value).toBe('Draft for selection')
    await action(wrapper, 'Выбрать код').trigger('click')
    await settle()
    expect(wrapper.get('form').classes()).toContain('form-disabled')
    await action(wrapper, 'Скрыть дерево кодов').trigger('click')
    await settle()
    expect(wrapper.get('form').classes()).not.toContain('form-disabled')
    expect(input(wrapper).element.value).toBe('Draft for selection')
  })

  it.each(['close', 'next', 'previous'])('presents a rejected %s navigation and preserves the form', async (direction) => {
    neighbors = { withoutIssues: { id: 4 }, withIssues: null }
    previous = { id: 2, registerId: 12 }
    const wrapper = mountEditor(component)
    await settle()
    await input(wrapper).setValue('Draft during navigation')
    router.push.mockRejectedValueOnce(new Error('Ошибка перехода'))
    router.replace.mockRejectedValueOnce(new Error('Ошибка перехода'))
    const labels = { close: 'Отменить', next: 'Следующая посылка', previous: 'Назад' }
    await action(wrapper, labels[direction]).trigger('click')
    await settle()
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.get('[role="alert"]').text()).toContain('Ошибка перехода')
    expect(input(wrapper).element.value).toBe('Draft during navigation')
    expect(useParcelsStore().item.id).toBe(3)
  })

  it.each(['neighbors', 'report'])('reports a late %s failure without replacing the destination message', async (stage) => {
    const report = vi.spyOn(errorHelpers, 'reportError').mockImplementation(() => {})
    const pending = deferred()
    if (stage === 'neighbors') neighbors = pending.promise
    const wrapper = mountEditor(component)
    await settle()
    if (stage === 'report') {
      parcelRequests.push(pending)
      window.dispatchEvent(new Event(DEC_REPORT_UPLOADED_EVENT))
    }
    wrapper.unmount()
    useAlertStore().info('Destination message')
    pending.reject(new Error('Disposed request failed'))
    await settle()
    expect(useAlertStore().alert.message).toBe('Destination message')
    expect(report).toHaveBeenCalledTimes(1)
    report.mockRestore()
  })
})

it('presents a SignalR resync failure once while preserving the draft', async () => {
  const wrapper = mountEditor()
  useAuthStore().user = { roles: ['sr-logist'] }
  await settle()
  await input(wrapper).setValue('Live draft')
  const pending = deferred()
  parcelRequests.push(pending)
  const reconnecting = signalR.connections[0].handlers.reconnected()
  pending.reject(new Error('Синхронизация недоступна'))
  await reconnecting
  await settle()
  expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
  expect(wrapper.get('[role="alert"]').text()).toContain('Синхронизация недоступна')
  expect(wrapper.find('.page-alert-region__action').exists()).toBe(false)
})

it('does not alert a destination page when an old SignalR refresh fails', async () => {
  const report = vi.spyOn(errorHelpers, 'reportError').mockImplementation(() => {})
  const wrapper = mountEditor()
  useAuthStore().user = { roles: ['sr-logist'] }
  await settle()
  const pending = deferred()
  parcelRequests.push(pending)
  const reconnecting = signalR.connections[0].handlers.reconnected()
  await settle()
  await wrapper.setProps({ id: 4 })
  await settle()
  useAlertStore().info('Destination message')
  pending.reject(new Error('Old resync failed'))
  await reconnecting
  await settle()
  expect(input(wrapper).element.value).toBe('Product 4')
  expect(useAlertStore().alert.message).toBe('Destination message')
  expect(report).toHaveBeenCalledTimes(1)
  report.mockRestore()
})

it.each(['next', 'previous'])('loads the %s destination through normal keyed initialization', async (direction) => {
  const destination = deferred()
  const wrapper = mountEditor(ParcelEditView, { mode: OP_MODE_WAREHOUSE, returnUrl: '/scanjobs/42/monitor', boxId: 17 })
  neighbors = { withoutIssues: { id: 4, productName: 'Preview must not seed the form' }, withIssues: null }
  previous = { id: 4, registerId: 13, productName: 'History preview must not seed the form' }
  await settle()
  const oldEditor = wrapper.findComponent(OzonEditor)
  parcelRequests.push({ promise: Promise.resolve(parcel(3)) }, destination)
  router.replace.mockImplementation(async (location) => {
    expect(useParcelsStore().item.id).toBe(3)
    expect(input(wrapper).element.value).toBe('Product 3')
    await wrapper.setProps({ registerId: location.params.registerId, id: location.params.id })
  })
  await action(wrapper, direction === 'next' ? 'Следующая посылка' : 'Назад').trigger('click')
  await settle()
  expect(oldEditor.exists()).toBe(false)
  expect(wrapper.find('[name="productName"]').exists()).toBe(false)
  expect(router.replace).toHaveBeenCalledWith(expect.objectContaining({
    query: { mode: OP_MODE_WAREHOUSE, returnUrl: '/scanjobs/42/monitor', boxId: '17' }
  }))
  destination.resolve(parcel(4))
  await settle()
  expect(input(wrapper).element.value).toBe('Product 4')
  expect(parcelGets().at(-1)[0]).toBe('http://test/api/parcels/a/4')
})
