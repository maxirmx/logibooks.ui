// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { h } from 'vue'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import PageAlertRegion from '@/components/PageAlertRegion.vue'
import { useAlertStore } from '@/stores/alert.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { roleAdmin, roleShiftLead, roleSrLogist } from '@/helpers/user.roles.js'
import { CUSTOMS_PROCEDURE } from '@/helpers/customs.procedure.helpers.js'
import ParcelStatusEditView from '@/views/ParcelStatus_EditView.vue'
import RegisterStatusEditView from '@/views/RegisterStatus_EditView.vue'
import HotKeyActionSchemeEditView from '@/views/HotKeyActionScheme_EditView.vue'
import ParcelStatusesList from '@/lists/ParcelStatuses_List.vue'
import RegisterStatusesList from '@/lists/RegisterStatuses_List.vue'
import HotKeyActionSchemesList from '@/lists/HotKeyActionSchemes_List.vue'
import ParcelEventsSettings from '@/dialogs/ParcelEvents_Settings.vue'
import RegisterEventsSettings from '@/dialogs/RegisterEvents_Settings.vue'
import { defaultGlobalStubs, resolveAll } from './helpers/test-utils.js'

const transport = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), post: vi.fn(), delete: vi.fn() }))
const push = vi.hoisted(() => vi.fn())
const confirm = vi.hoisted(() => vi.fn())
vi.mock('@/helpers/fetch.wrapper.js', () => ({ fetchWrapper: transport }))
vi.mock('@/router', () => ({ default: { push, back: vi.fn() } }))
vi.mock('@/composables/useAppConfirm.js', () => ({ useAppConfirm: () => confirm }))

const parcelStatus = {
  id: 1, title: 'Досмотр', useAtCustomsProcessing: true,
  inspection: true, bkColor: '#123456', restrictionReason: 'Уточнить код'
}
const registerStatus = {
  id: 1, title: 'Готова', readOnly: true, transit: true, exportTo1C: true,
  icon: 'svg:registered', bkColor: '#112233', fgColor: '#ffffff'
}
const scheme = {
  id: 1,
  name: 'Основная',
  actions: [{ id: 1, action: 1, keyCode: 'F3', ctrl: true, shift: false, alt: false }]
}
const parcelEvent = {
  id: 1, eventName: 'Посылка принята', customsProcedureCode: CUSTOMS_PROCEDURE.Return,
  parcelStatusId: 1, zone: 2, extData: 'В зону приёмки'
}
const registerEvent = {
  id: 1, eventName: 'Партия принята', customsProcedureCode: CUSTOMS_PROCEDURE.Return,
  registerStatusId: 1
}
const responses = {
  '/parcelstatuses': [parcelStatus],
  '/parcelstatuses/1': parcelStatus,
  '/registerstatuses': [registerStatus],
  '/registerstatuses/1': registerStatus,
  '/hotkeyactionschemes': [scheme],
  '/hotkeyactionschemes/1': scheme,
  '/hotkeyactionschemes/ops': { actions: [{ value: 1, name: 'Принять' }] },
  '/registers/ops': {
    customsProcedures: Object.values(CUSTOMS_PROCEDURE).map(value => ({ value, name: 'Процедура' })),
    transportationTypes: [],
    incoterms: [{ value: 1 }]
  },
  '/warehouses/ops': { zones: [{ value: 2, name: 'Приёмка' }] },
  '/events/parcels': [parcelEvent, {
    ...parcelEvent, id: 2, eventName: 'Посылка вывезена', customsProcedureCode: CUSTOMS_PROCEDURE.Export
  }],
  '/events/registers': [registerEvent, {
    ...registerEvent, id: 2, eventName: 'Партия вывезена', customsProcedureCode: CUSTOMS_PROCEDURE.Export
  }]
}
const formCases = [
  {
    name: 'parcel status', view: ParcelStatusEditView, list: '/parcelstatuses',
    field: '#title', value: parcelStatus.title, change: 'Новый статус',
    payload: { title: 'Новый статус' }, loadError: 'Не удалось загрузить статус посылки'
  },
  {
    name: 'register status', view: RegisterStatusEditView, list: '/registerstatuses',
    field: '#readOnly', value: true, change: false,
    payload: { readOnly: false }, loadError: 'Не удалось загрузить статус партии'
  },
  {
    name: 'keyboard scheme', view: HotKeyActionSchemeEditView, list: '/hotkeyactionschemes',
    field: '#name', value: scheme.name, change: 'Другая схема',
    payload: { name: 'Другая схема' }, loadError: 'Не удалось загрузить схему настройки клавиатуры'
  }
]
const eventCases = [
  {
    name: 'parcel events', view: ParcelEventsSettings, endpoint: '/events/parcels',
    alternateEvent: 'Посылка вывезена', rowControls: ['status-select-1', 'zone-select-1', 'extdata-input-1'],
    field: 'extdata-input-1', change: 'На досмотр', payload: { id: 1, extData: 'На досмотр' }
  },
  {
    name: 'register events', view: RegisterEventsSettings, endpoint: '/events/registers',
    alternateEvent: 'Партия вывезена', rowControls: ['status-select-1'],
    field: 'status-select-1', change: '0', payload: { id: 1, registerStatusId: 0 }
  }
]
const SelectStub = {
  props: ['items', 'modelValue', 'disabled', 'itemTitle', 'itemValue'],
  emits: ['update:modelValue'],
  template: `
    <select :value="modelValue" :disabled="disabled" @change="$emit('update:modelValue', $event.target.value)">
      <option v-for="option in items" :key="option[itemValue || 'value']" :value="option[itemValue || 'value']">
        {{ option[itemTitle || 'title'] }}
      </option>
    </select>
  `
}

let pinia
let auth
let wrappers
beforeEach(() => {
  vi.resetAllMocks()
  localStorage.clear()
  pinia = createPinia()
  setActivePinia(pinia)
  auth = useAuthStore()
  wrappers = []
  transport.get.mockImplementation(async (url) => {
    const path = new URL(url, 'http://localhost').pathname.replace(/^\/api/, '')
    if (!(path in responses)) throw new Error(`Unexpected request ${path}`)
    return globalThis.structuredClone(responses[path])
  })
  transport.put.mockResolvedValue(undefined)
})
afterEach(() => {
  for (const wrapper of wrappers) wrapper.unmount()
  vi.restoreAllMocks()
})

function open(component, roles, props = {}, plugins = []) {
  auth.user = { id: 1, roles }
  const wrapper = mount({ render: () => h(component, props) }, {
    global: {
      plugins: [pinia, ...plugins],
      stubs: { ...defaultGlobalStubs, 'v-select': SelectStub, 'font-awesome-icon': true }
    }
  })
  wrappers.push(wrapper)
  return wrapper
}

async function openEditorRoute(view) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/edit/:id', component: view, props: route => ({ id: Number(route.params.id) }) },
      {
        path: '/',
        component: { render: () => h('section', [h('hr', { class: 'hr' }), h(PageAlertRegion)]) }
      }
    ]
  })
  await router.push('/edit/1')
  return { router, wrapper: open(RouterView, [], {}, [router]) }
}

function expectAlert(wrapper, message) {
  expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
  expect(wrapper.get('hr.hr + [data-testid="page-alert-region"]').text()).toContain(message)
}

function readField(wrapper, selector, example) {
  const { element } = wrapper.get(selector)
  return typeof example === 'boolean' ? element.checked : element.value
}

function getAction(wrapper, tooltip) {
  return wrapper.findAllComponents({ name: 'ActionButton' })
    .find(button => button.props('tooltipText') === tooltip)?.get('button')
}

describe.each(formCases)('$name detail', ({ view, list, field, value, change, payload, loadError }) => {
  it('shows saved values to a roleless user and blocks form submission', async () => {
    const wrapper = open(view, [], { id: 1 })
    await resolveAll()

    expect(wrapper.get('h1').text()).toContain('Просмотр')
    expect(readField(wrapper, field, value)).toBe(value)
    expect(wrapper.get(field).element.matches(':disabled')).toBe(true)
    expect(getAction(wrapper, 'Сохранить')).toBeUndefined()
    await wrapper.get('form').trigger('submit')
    await resolveAll()
    expect(transport.put).not.toHaveBeenCalled()

    const close = getAction(wrapper, 'Закрыть')
    await vi.waitFor(() => expect(close.element.disabled).toBe(false))
    await close.trigger('click')
    expect(push).toHaveBeenCalledExactlyOnceWith(list)
  })

  it('hides stale fields and shows a single alert after a failed detail read', async () => {
    transport.get.mockRejectedValueOnce(new Error('SQL diagnostic'))
    const wrapper = open(view, [], { id: 1 })
    await resolveAll()
    expectAlert(wrapper, view === HotKeyActionSchemeEditView ? 'Не удалось загрузить список действий' : loadError)
    expect(wrapper.find(field).exists()).toBe(false)
    expect(wrapper.text()).not.toContain('SQL diagnostic')
  })

  it.each(['success', 'failure'])('keeps the current record and alert after a late %s', async (outcome) => {
    const record = responses[`${list}/1`]
    const load = transport.get.getMockImplementation()
    const first = Promise.withResolvers()
    const error = new Error('Late detail diagnostic')
    const diagnostic = vi.spyOn(console, 'error').mockImplementation(() => {})
    transport.get.mockImplementation(async url => {
      if (url.endsWith(`${list}/1`)) return first.promise
      if (url.endsWith(`${list}/2`)) return { ...record, id: 2, ...payload }
      return load(url)
    })
    const { router, wrapper } = await openEditorRoute(view)
    await vi.waitFor(() => expect(transport.get).toHaveBeenCalledWith(expect.stringContaining(`${list}/1`)))
    await router.push('/edit/2')
    await vi.waitFor(() => expect(readField(wrapper, field, change)).toBe(change))

    useAlertStore().error('Ошибка текущей страницы')
    if (outcome === 'failure') {
      first.reject(error)
    } else {
      first.resolve(record)
    }
    await resolveAll()
    expect(readField(wrapper, field, change)).toBe(change)
    expectAlert(wrapper, 'Ошибка текущей страницы')
    if (outcome === 'failure') {
      expect(diagnostic).toHaveBeenCalledExactlyOnceWith(`[${loadError}]`, error)
    } else {
      expect(diagnostic).not.toHaveBeenCalled()
    }
  })

  it('shows one Russian alert when the close navigation fails', async () => {
    const wrapper = open(view, [], { id: 1 })
    await resolveAll()
    push.mockRejectedValueOnce(new Error('Internal navigation diagnostic'))
    await getAction(wrapper, 'Закрыть').trigger('click')
    await resolveAll()
    expectAlert(wrapper, 'Не удалось открыть список')
    expect(readField(wrapper, field, value)).toBe(value)
  })

  it.each([roleAdmin, roleShiftLead])('keeps the edit and retries the same write for %s', async (role) => {
    const wrapper = open(view, [role], { id: 1 })
    await resolveAll()

    const alert = vi.spyOn(useAlertStore(), 'error')
    transport.put.mockRejectedValueOnce(new Error('Не удалось сохранить настройки'))
    expect(wrapper.get(field).element.matches(':disabled')).toBe(false)
    await wrapper.get(field).setValue(change)
    const save = getAction(wrapper, 'Сохранить')
    await save.trigger('click')
    await vi.waitFor(() => expectAlert(wrapper, 'Не удалось сохранить настройки'))
    expect(alert).toHaveBeenCalledTimes(1)
    expect(push).not.toHaveBeenCalled()
    expect(readField(wrapper, field, change)).toBe(change)
    expect(transport.put).toHaveBeenCalledExactlyOnceWith(
      expect.stringContaining(`${list}/1`), expect.objectContaining(payload)
    )

    await vi.waitFor(() => expect(save.element.disabled).toBe(false))
    await save.trigger('click')
    await vi.waitFor(() => expect(push).toHaveBeenCalledExactlyOnceWith(list))
    expect(transport.put).toHaveBeenCalledTimes(2)
    expect(transport.put.mock.calls[1]).toEqual(transport.put.mock.calls[0])
  })
})

it('shows the saved keyboard binding and modifiers without key capture', async () => {
  const wrapper = open(HotKeyActionSchemeEditView, [roleSrLogist], { id: 1 })
  await resolveAll()
  expect(wrapper.get('.key-input').element.value).toBe('F3')
  expect(wrapper.get('.key-input').element.disabled).toBe(true)
  expect(wrapper.get('#ctrl-0').element.checked).toBe(true)
  expect(wrapper.find('.clear-button').exists()).toBe(false)
})

it('saves the keyboard shortcut a shift lead captures with its modifiers', async () => {
  const wrapper = open(HotKeyActionSchemeEditView, [roleShiftLead], { id: 1 })
  await resolveAll()
  await wrapper.get('.key-input').trigger('keydown', { key: 'F5', code: 'F5' })
  await wrapper.get('#shift-0').setValue(true)
  await wrapper.get('#ctrl-0').setValue(false)
  await wrapper.get('#alt-0').setValue(true)
  await getAction(wrapper, 'Сохранить').trigger('click')

  await vi.waitFor(() => expect(transport.put).toHaveBeenCalledExactlyOnceWith(
    expect.stringContaining('/hotkeyactionschemes/1'),
    expect.objectContaining({ actions: [expect.objectContaining({
      keyCode: 'F5', shift: true, ctrl: false, alt: true
    })] })
  ))
})

it('updates the parcel status color preview and saves the new color', async () => {
  const wrapper = open(ParcelStatusEditView, [roleShiftLead], { id: 1 })
  await resolveAll()
  await wrapper.get('#bkColor').setValue('#223344')
  expect(wrapper.get('.status-color-value').text()).toBe('#223344')
  await getAction(wrapper, 'Сохранить').trigger('click')
  await vi.waitFor(() => expect(transport.put).toHaveBeenCalledExactlyOnceWith(
    expect.stringContaining('/parcelstatuses/1'), expect.objectContaining({ bkColor: '#223344' })
  ))
})

it('shows a keyboard detail read failure after the lookup succeeds', async () => {
  transport.get.mockResolvedValueOnce(responses['/hotkeyactionschemes/ops'])
    .mockRejectedValueOnce(new Error('Database diagnostic'))
  const wrapper = open(HotKeyActionSchemeEditView, [roleShiftLead], { id: 1 })
  await resolveAll()
  expectAlert(wrapper, 'Не удалось загрузить схему настройки клавиатуры')
  expect(wrapper.find('#name').exists()).toBe(false)
})

it.each(['success', 'failure'])('ignores a late keyboard lookup %s after leaving the editor', async (outcome) => {
  const lookup = Promise.withResolvers()
  const error = new Error('Late lookup diagnostic')
  const diagnostic = vi.spyOn(console, 'error').mockImplementation(() => {})
  transport.get.mockReturnValueOnce(lookup.promise)
  const { router, wrapper } = await openEditorRoute(HotKeyActionSchemeEditView)
  await vi.waitFor(() => expect(transport.get).toHaveBeenCalledTimes(1))
  await router.push('/')
  useAlertStore().error('Ошибка текущей страницы')

  if (outcome === 'failure') {
    lookup.reject(error)
  } else {
    lookup.resolve(responses['/hotkeyactionschemes/ops'])
  }
  await resolveAll()
  expectAlert(wrapper, 'Ошибка текущей страницы')
  expect(transport.get).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('/hotkeyactionschemes/ops'))
  if (outcome === 'failure') {
    expect(diagnostic).toHaveBeenCalledExactlyOnceWith('[Не удалось загрузить список действий]', error)
  } else {
    expect(diagnostic).not.toHaveBeenCalled()
  }
})

it('shows a shared keyboard lookup failure once when the next editor also needs it', async () => {
  const lookup = Promise.withResolvers()
  const error = new Error('Shared lookup diagnostic')
  const diagnostic = vi.spyOn(console, 'error').mockImplementation(() => {})
  const publish = vi.spyOn(useAlertStore(), 'error')
  transport.get.mockReturnValueOnce(lookup.promise)
  const { router, wrapper } = await openEditorRoute(HotKeyActionSchemeEditView)
  await vi.waitFor(() => expect(transport.get).toHaveBeenCalledTimes(1))
  await router.push('/edit/2')
  await resolveAll()

  lookup.reject(error)
  await resolveAll()
  expectAlert(wrapper, 'Не удалось загрузить список действий')
  expect(publish).toHaveBeenCalledTimes(1)
  expect(diagnostic).toHaveBeenCalledExactlyOnceWith('[Не удалось загрузить список действий]', error)
  expect(transport.get).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('/hotkeyactionschemes/ops'))
})

describe.each(eventCases)('$name', ({ view, endpoint, alternateEvent, rowControls, field, change, payload }) => {
  it('shows one Russian alert after a rejected event list request', async () => {
    const load = transport.get.getMockImplementation()
    transport.get.mockImplementation(async url => {
      if (url.endsWith(endpoint)) throw new Error('Не удалось загрузить правила событий')
      return load(url)
    })
    const wrapper = open(view, [])
    await resolveAll()
    expectAlert(wrapper, 'Не удалось загрузить правила событий')
    expect(wrapper.find('[data-testid="customs-procedure-select"]').exists()).toBe(false)
  })

  it('lets readers use the procedure filter and inspect saved event mappings', async () => {
    const wrapper = open(view, [])
    await resolveAll()
    expect(wrapper.find('[data-testid="save-button"]').exists()).toBe(false)
    for (const id of rowControls) {
      const control = wrapper.get(`[data-testid="${id}"]`)
      expect(control.element.disabled).toBe(true)
      expect(control.element.value).toBe(String(responses[endpoint][0][{
        'status-select-1': view === ParcelEventsSettings ? 'parcelStatusId' : 'registerStatusId',
        'zone-select-1': 'zone',
        'extdata-input-1': 'extData'
      }[id]]))
    }
    await wrapper.get('[data-testid="customs-procedure-select"]').setValue(String(CUSTOMS_PROCEDURE.Export))
    expect(wrapper.text()).toContain(alternateEvent)
    const table = wrapper.getComponent('[data-testid="v-data-table"]')
    table.vm.$emit('update:itemsPerPage', 25)
    await resolveAll()
    expect(table.props('itemsPerPage')).toBe(25)
    expect(transport.put).not.toHaveBeenCalled()
  })

  it('lets a shift lead retry a rejected event update with their changes intact', async () => {
    const wrapper = open(view, [roleShiftLead])
    await resolveAll()
    transport.put.mockRejectedValueOnce(new Error('Не удалось сохранить правило'))
    const control = wrapper.get(`[data-testid="${field}"]`)
    const save = wrapper.get('[data-testid="save-button"]')
    await control.setValue(change)
    await save.trigger('click')
    await resolveAll()
    expectAlert(wrapper, 'Не удалось сохранить правило')
    expect(control.element.value).toBe(change)
    expect(transport.put).toHaveBeenCalledExactlyOnceWith(
      expect.stringContaining(endpoint), expect.arrayContaining([expect.objectContaining(payload)])
    )
    await save.trigger('click')
    await resolveAll()
    expect(transport.put).toHaveBeenCalledTimes(2)
    expect(transport.put.mock.calls[1]).toEqual(transport.put.mock.calls[0])
  })
})

describe.each([
  ['parcel statuses', ParcelStatusesList, '/parcelstatus', 'deleteParcelStatus'],
  ['register statuses', RegisterStatusesList, '/registerstatus', 'deleteRegisterStatus'],
  ['keyboard schemes', HotKeyActionSchemesList, '/hotkeyactionscheme', 'deleteHotKeyActionScheme']
])('%s list', (_name, list, route, deleteAction) => {
  it('shows the loading indicator and offers a view action to readers', async () => {
    let finishLoad
    const pending = new Promise(resolve => { finishLoad = resolve })
    const load = transport.get.getMockImplementation()
    transport.get.mockImplementationOnce(async (url) => {
      await pending
      return load(url)
    })
    const wrapper = open(list, [roleSrLogist])
    await resolveAll()
    expect(wrapper.find('.header-actions-bar .spinner-border').exists()).toBe(true)
    finishLoad()
    await resolveAll()
    expect(wrapper.find('.header-actions-bar button').exists()).toBe(false)
    expect(wrapper.findAll('.actions-container button')).toHaveLength(1)
    await wrapper.get('button[aria-label="Просмотреть"]').trigger('click')
    expect(push).toHaveBeenCalledExactlyOnceWith(`${route}/edit/1`)
  })

  it('rechecks write permission after confirmation', async () => {
    const wrapper = open(list, [roleShiftLead])
    await resolveAll()
    const page = wrapper.findComponent(list).vm
    let finishConfirmation
    confirm.mockReturnValueOnce(new Promise(resolve => { finishConfirmation = resolve }))
    const deleting = page[deleteAction]({ id: 1, title: 'Тест', name: 'Тест' })
    expect(confirm).toHaveBeenCalledTimes(1)
    auth.user = { id: 1, roles: [] }
    finishConfirmation(true)
    await deleting
    expect(transport.delete).not.toHaveBeenCalled()
    expect(wrapper.find('.header-actions-bar button').exists()).toBe(false)
  })

  it('shows one Russian alert when opening a detail fails', async () => {
    const wrapper = open(list, [])
    await resolveAll()
    push.mockRejectedValueOnce(new Error('Internal navigation diagnostic'))
    await wrapper.get('button[aria-label="Просмотреть"]').trigger('click')
    await resolveAll()
    expectAlert(wrapper, 'Не удалось открыть')
  })

  it('shows one Russian alert when opening the create form fails', async () => {
    const wrapper = open(list, [roleShiftLead])
    await resolveAll()
    push.mockRejectedValueOnce(new Error('Internal navigation diagnostic'))
    await wrapper.get('.header-actions-bar button').trigger('click')
    await resolveAll()
    expectAlert(wrapper, 'Не удалось открыть форму создания')
  })

  it('shows one Russian alert when delete confirmation fails', async () => {
    const wrapper = open(list, [roleShiftLead])
    await resolveAll()
    confirm.mockRejectedValueOnce(new Error('Internal dialog diagnostic'))
    await wrapper.findComponent(list).vm[deleteAction]({ id: 1, title: 'Тест', name: 'Тест' })
    expectAlert(wrapper, 'Не удалось открыть подтверждение удаления')
    expect(transport.delete).not.toHaveBeenCalled()
  })
})
