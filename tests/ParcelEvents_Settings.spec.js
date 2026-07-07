/* @vitest-environment jsdom */
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import { ref } from 'vue'
import ParcelEventsProcessingSettings from '@/dialogs/ParcelEvents_Settings.vue'
import { resolveAll } from './helpers/test-utils'

// Polyfill ResizeObserver for Vuetify components in jsdom
if (!global.ResizeObserver) {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

function createMockEvents() {
  return [
    { id: 1001, eventId: 'Created', eventName: 'Создана', customsProcedureCode: 1, parcelStatusId: null, zone: null, extData: '' },
    { id: 2001, eventId: 'Processing', eventName: 'В обработке', customsProcedureCode: 1, parcelStatusId: 3, zone: 1, extData: 'return tip' },
    { id: 1, eventId: 'Created', eventName: 'Создана', customsProcedureCode: 10, parcelStatusId: null, zone: null, extData: 'export created' },
    { id: 2, eventId: 'Processing', eventName: 'В обработке', customsProcedureCode: 10, parcelStatusId: 3, zone: 1, extData: 'voice tip' }
  ]
}

function createRegisterOps() {
  return {
    customsProcedures: [
      { value: 1, charCode: '01', name: 'Возврат' },
      { value: 10, charCode: 'ЭК 10', name: 'Экспорт' },
      { value: 31, charCode: 'ЭК 31', name: 'Реэкспорт' },
      { value: 40, charCode: 'ИМ 40', name: 'Импорт' },
      { value: 60, charCode: 'ИМ 60', name: 'Реимпорт' }
    ],
    transportationTypes: []
  }
}

const mockEvents = ref(createMockEvents())

const mockStatuses = ref([
  { id: 1, title: 'Новый' },
  { id: 3, title: 'В пути' }
])

const mockOps = ref({
  types: [],
  zones: [
    { value: 1, name: 'Зона 1' },
    { value: 2, name: '' }
  ]
})
const mockRegisterOps = ref(createRegisterOps())

const ensureLoaded = vi.hoisted(() => vi.fn())
const ensureWarehouseOpsLoaded = vi.hoisted(() => vi.fn())
const ensureRegisterOpsLoaded = vi.hoisted(() => vi.fn())
const getAll = vi.hoisted(() => vi.fn())
const updateMany = vi.hoisted(() => vi.fn())
const routerBack = vi.hoisted(() => vi.fn())

const mockAuthStore = {
  parcelevents_per_page: ref(50),
  parcelevents_page: ref(1)
}

vi.mock('@/stores/events.store.js', () => ({
  useEventsStore: () => ({
    parcelEvents: mockEvents,
    parcelLoading: ref(false),
    parcelGetAll: getAll,
    parcelUpdateMany: updateMany
  })
}))

vi.mock('@/stores/parcel.statuses.store.js', () => ({
  useParcelStatusesStore: () => ({
    parcelStatuses: mockStatuses,
    ensureLoaded
  })
}))

vi.mock('@/stores/warehouses.store.js', () => ({
  useWarehousesStore: () => ({
    ops: mockOps,
    ensureOpsLoaded: ensureWarehouseOpsLoaded
  })
}))

vi.mock('@/stores/registers.store.js', () => ({
  useRegistersStore: () => ({
    ops: mockRegisterOps,
    ensureOpsLoaded: ensureRegisterOpsLoaded
  })
}))

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => mockAuthStore
}))

vi.mock('@/helpers/items.per.page.js', () => ({
  itemsPerPageOptions: [{ value: 10, title: '10' }, { value: 25, title: '25' }, { value: 50, title: '50' }]
}))

vi.mock('@/router', () => ({
  default: {
    back: routerBack
  }
}))

vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  return {
    ...actual,
    storeToRefs: (store) => ({ ...store })
  }
})

const vuetify = createVuetify()

const mountComponent = () =>
  mount(ParcelEventsProcessingSettings, {
    global: {
      plugins: [vuetify],
      stubs: {
        'font-awesome-icon': true,
        ActionButton: {
          template: '<button :data-testid="$attrs[`data-testid`]" :disabled="disabled" @click="$emit(`click`)"><slot /></button>',
          props: ['item', 'icon', 'iconSize', 'tooltipText', 'disabled']
        },
        'v-select': {
          name: 'v-select',
          props: {
            modelValue: [Number, String],
            items: { type: Array, default: () => [] },
            label: String,
            variant: String,
            hideDetails: Boolean,
            loading: Boolean,
            disabled: Boolean
          },
          emits: ['update:modelValue'],
          template: `
            <select
              v-bind="$attrs"
              data-testid="customs-procedure-select"
              :value="modelValue"
              :data-label="label"
              :data-variant="variant"
              :data-hide-details="String(hideDetails)"
              :disabled="disabled"
              @change="$emit('update:modelValue', Number($event.target.value))"
            >
              <option v-for="item in items" :key="item.value" :value="item.value">{{ item.title }}</option>
            </select>
          `
        }
      }
    }
  })

describe('ParcelEvents_Settings.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEvents.value = createMockEvents()
    mockStatuses.value = [
      { id: 1, title: 'Новый' },
      { id: 3, title: 'В пути' }
    ]
    mockOps.value = {
      types: [],
      zones: [
        { value: 1, name: 'Зона 1' },
        { value: 2, name: '' }
      ]
    }
    mockRegisterOps.value = createRegisterOps()
    mockAuthStore.parcelevents_per_page.value = 50
    mockAuthStore.parcelevents_page.value = 1
    ensureLoaded.mockResolvedValue()
    ensureWarehouseOpsLoaded.mockResolvedValue()
    ensureRegisterOpsLoaded.mockResolvedValue()
    getAll.mockImplementation(async () => {
      mockEvents.value = [...mockEvents.value]
    })
    updateMany.mockResolvedValue()
  })

  it('renders event rows with selectors', async () => {
    const wrapper = mountComponent()
    await resolveAll()

    expect(ensureLoaded).toHaveBeenCalled()
    expect(ensureWarehouseOpsLoaded).toHaveBeenCalled()
    expect(ensureRegisterOpsLoaded).toHaveBeenCalled()
    expect(getAll).toHaveBeenCalled()

    const procedureSelect = wrapper.find('[data-testid="customs-procedure-select"]')
    expect(procedureSelect.exists()).toBe(true)
    expect(procedureSelect.element.value).toBe('1')
    expect(procedureSelect.attributes('data-label')).toBe('Таможенная процедура')
    expect(procedureSelect.attributes('data-variant')).toBe('solo')
    expect(procedureSelect.attributes('data-hide-details')).toBe('true')
    expect(procedureSelect.classes()).toContain('procedure-filter')
    expect(procedureSelect.findAll('option').map((o) => o.text())).toEqual([
      '01 Возврат',
      'ЭК 10 Экспорт',
      'ЭК 31 Реэкспорт',
      'ИМ 40 Импорт',
      'ИМ 60 Реимпорт'
    ])

    // Use selects count to represent rows since v-data-table structure differs
    const statusSelects = wrapper.findAll('select[id^="status-select-"]')
    expect(statusSelects.length).toBe(2)
    const zoneSelects = wrapper.findAll('select[id^="zone-select-"]')
    expect(zoneSelects.length).toBe(2)
    expect(wrapper.find('[data-testid="parcel-event-row-1001"]').text()).toBe('Создана')
    expect(wrapper.find('[data-testid="parcel-event-row-1"]').exists()).toBe(false)

    // extData inputs present
    const extInput1 = wrapper.find('#extdata-input-1001')
    expect(extInput1.exists()).toBe(true)
    expect(extInput1.element.value).toBe('')
    const extInput2 = wrapper.find('#extdata-input-2001')
    expect(extInput2.exists()).toBe(true)
    expect(extInput2.element.value).toBe('return tip')

    const statusOptions = wrapper.find('#status-select-1001').findAll('option')
    const statusOptionTexts = statusOptions.map((o) => o.text())
    expect(statusOptionTexts).toContain('Новый')
    expect(statusOptionTexts).toContain('В пути')

    const zoneOptions = wrapper.find('#zone-select-1001').findAll('option')
    const zoneOptionTexts = zoneOptions.map((o) => o.text())
    expect(zoneOptionTexts).toContain('Не менять')
    expect(zoneOptionTexts).toContain('Зона 1')
    expect(zoneOptionTexts).toContain('')
  })

  it('uses customs procedure order from register ops', async () => {
    mockRegisterOps.value = {
      customsProcedures: [
        { value: 10, charCode: 'ЭК 10', name: 'Экспорт' },
        { value: 1, charCode: '01', name: 'Возврат' },
        { value: 60, charCode: 'ИМ 60', name: 'Реимпорт' },
        { value: 40, charCode: 'ИМ 40', name: 'Импорт' },
        { value: 31, charCode: 'ЭК 31', name: 'Реэкспорт' }
      ],
      transportationTypes: []
    }

    const wrapper = mountComponent()
    await resolveAll()

    const procedureSelect = wrapper.find('[data-testid="customs-procedure-select"]')
    expect(procedureSelect.element.value).toBe('10')
    expect(procedureSelect.findAll('option').map((o) => o.text())).toEqual([
      'ЭК 10 Экспорт',
      '01 Возврат',
      'ИМ 60 Реимпорт',
      'ИМ 40 Импорт',
      'ЭК 31 Реэкспорт'
    ])
    expect(wrapper.find('[data-testid="parcel-event-row-1"]').text()).toBe('Создана')
    expect(wrapper.find('[data-testid="parcel-event-row-1001"]').exists()).toBe(false)
  })

  it('updates selections and saves changes', async () => {
    const wrapper = mountComponent()
    await resolveAll()

    const statusSelect = wrapper.find('#status-select-1001')
    await statusSelect.setValue('1')
    const zoneSelect = wrapper.find('#zone-select-1001')
    await zoneSelect.setValue('2')
    await wrapper.find('[data-testid="customs-procedure-select"]').setValue('10')
    await resolveAll()
    await wrapper.find('#extdata-input-1').setValue('export changed')
    await wrapper.find('[data-testid="save-button"]').trigger('click')
    await resolveAll()

    expect(updateMany).toHaveBeenCalledWith([
      { id: 1001, parcelStatusId: 1, zone: 2, extData: '' },
      { id: 2001, parcelStatusId: 3, zone: 1, extData: 'return tip' },
      { id: 1, parcelStatusId: null, zone: null, extData: 'export changed' },
      { id: 2, parcelStatusId: 3, zone: 1, extData: 'voice tip' }
    ])
    expect(updateMany.mock.calls[0][0][0]).not.toHaveProperty('eventId')
    expect(updateMany.mock.calls[0][0][0]).not.toHaveProperty('customsProcedureCode')
  })

  it('switches procedure selector and resets the shared page', async () => {
    mockAuthStore.parcelevents_page.value = 3

    const wrapper = mountComponent()
    await resolveAll()

    expect(mockAuthStore.parcelevents_page.value).toBe(1)
    mockAuthStore.parcelevents_page.value = 4

    await wrapper.find('[data-testid="customs-procedure-select"]').setValue('10')
    await resolveAll()

    expect(mockAuthStore.parcelevents_page.value).toBe(1)
    expect(wrapper.find('[data-testid="parcel-event-row-1"]').text()).toBe('Создана')
    expect(wrapper.find('[data-testid="parcel-event-row-1001"]').exists()).toBe(false)
  })

  it('shows empty list for procedures without returned rows', async () => {
    const wrapper = mountComponent()
    await resolveAll()

    await wrapper.find('[data-testid="customs-procedure-select"]').setValue('60')
    await resolveAll()

    expect(wrapper.findAll('select[id^="status-select-"]').length).toBe(0)
    expect(wrapper.text()).toContain('Список событий пуст')
  })

  it('shows error message when save fails', async () => {
    updateMany.mockRejectedValue(new Error('Save failed'))

    const wrapper = mountComponent()
    await resolveAll()

    await wrapper.find('[data-testid="save-button"]').trigger('click')
    await resolveAll()

    expect(wrapper.text()).toContain('Save failed')
  })

  it('handles empty ("Не менять") status selection as 0', async () => {
    const wrapper = mountComponent()
    await resolveAll()

    // Event 1001 has null parcelStatusId by default
    const select1 = wrapper.find('#status-select-1001')
    expect(select1.exists()).toBe(true)
    expect(select1.element.value).toBe('0')

    const optionTexts1 = select1.findAll('option').map(o => o.text())
    expect(optionTexts1).toContain('Не менять')

    // Change second Return event's status to empty
    const select2 = wrapper.find('#status-select-2001')
    expect(select2.exists()).toBe(true)
    expect(select2.element.value).toBe('3') // initial selected value
    await select2.setValue('')

    // Save changes
    await wrapper.find('[data-testid="save-button"]').trigger('click')
    await resolveAll()

    expect(updateMany).toHaveBeenCalledWith([
      { id: 1001, parcelStatusId: null, zone: null, extData: '' }, // unchanged null from initial data
      { id: 2001, parcelStatusId: 0, zone: 1, extData: 'return tip' }, // cleared selection saved as 0 sentinel
      { id: 1, parcelStatusId: null, zone: null, extData: 'export created' },
      { id: 2, parcelStatusId: 3, zone: 1, extData: 'voice tip' }
    ])
  })

  it('handles empty ("Не менять") zone selection as 0', async () => {
    const wrapper = mountComponent()
    await resolveAll()

    // Event 1001 has null zone by default
    const zoneSelect1 = wrapper.find('#zone-select-1001')
    expect(zoneSelect1.exists()).toBe(true)
    expect(zoneSelect1.element.value).toBe('0')

    const zoneOptionTexts = zoneSelect1.findAll('option').map(o => o.text())
    expect(zoneOptionTexts).toContain('Не менять')

    // Change second Return event's zone to empty
    const zoneSelect2 = wrapper.find('#zone-select-2001')
    expect(zoneSelect2.exists()).toBe(true)
    expect(zoneSelect2.element.value).toBe('1') // initial selected value
    await zoneSelect2.setValue('')

    // Save changes
    await wrapper.find('[data-testid="save-button"]').trigger('click')
    await resolveAll()

    expect(updateMany).toHaveBeenCalledWith([
      { id: 1001, parcelStatusId: null, zone: null, extData: '' },
      { id: 2001, parcelStatusId: 3, zone: 0, extData: 'return tip' }, // cleared zone saved as 0
      { id: 1, parcelStatusId: null, zone: null, extData: 'export created' },
      { id: 2, parcelStatusId: 3, zone: 1, extData: 'voice tip' }
    ])
  })

  it('shows global load error when procedure metadata is unavailable', async () => {
    mockRegisterOps.value = {
      customsProcedures: [{ value: 1, charCode: '01', name: 'Возврат' }],
      transportationTypes: []
    }

    const wrapper = mountComponent()
    await resolveAll()

    expect(wrapper.text()).toContain('Не удалось загрузить таможенные процедуры')
    expect(getAll).not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="customs-procedure-select"]').exists()).toBe(false)
  })
})
