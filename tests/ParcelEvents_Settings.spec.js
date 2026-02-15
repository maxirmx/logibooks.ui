/* @vitest-environment jsdom */
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
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

const mockEvents = ref([
  { id: 1, eventId: 'Created', eventName: 'Создана', parcelStatusId: null, zone: null, extData: '' },
  { id: 2, eventId: 'Processing', eventName: 'В обработке', parcelStatusId: 3, zone: 1, extData: 'voice tip' }
])

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

const ensureLoaded = vi.hoisted(() => vi.fn())
const ensureOpsLoaded = vi.hoisted(() => vi.fn())
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
    ensureOpsLoaded
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
        }
      }
    }
  })

describe('ParcelEvents_Settings.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEvents.value = [
      { id: 1, eventId: 'Created', eventName: 'Создана', parcelStatusId: null, zone: null, extData: '' },
      { id: 2, eventId: 'Processing', eventName: 'В обработке', parcelStatusId: 3, zone: 1, extData: 'voice tip' }
    ]
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
    ensureLoaded.mockResolvedValue()
    ensureOpsLoaded.mockResolvedValue()
    getAll.mockImplementation(async () => {
      mockEvents.value = [...mockEvents.value]
    })
    updateMany.mockResolvedValue()
  })

  it('renders event rows with selectors', async () => {
    const wrapper = mountComponent()
    await resolveAll()

    expect(ensureLoaded).toHaveBeenCalled()
    expect(ensureOpsLoaded).toHaveBeenCalled()
    expect(getAll).toHaveBeenCalled()

    // Use selects count to represent rows since v-data-table structure differs
    const statusSelects = wrapper.findAll('select[id^="status-select-"]')
    expect(statusSelects.length).toBe(2)
    const zoneSelects = wrapper.findAll('select[id^="zone-select-"]')
    expect(zoneSelects.length).toBe(2)
    expect(wrapper.find('[data-testid="parcel-event-row-1"]').text()).toBe('Создана')

    // extData inputs present
    const extInput1 = wrapper.find('#extdata-input-1')
    expect(extInput1.exists()).toBe(true)
    expect(extInput1.element.value).toBe('')
    const extInput2 = wrapper.find('#extdata-input-2')
    expect(extInput2.exists()).toBe(true)
    expect(extInput2.element.value).toBe('voice tip')

    const statusOptions = wrapper.find('#status-select-1').findAll('option')
    const statusOptionTexts = statusOptions.map((o) => o.text())
    expect(statusOptionTexts).toContain('Новый')
    expect(statusOptionTexts).toContain('В пути')

    const zoneOptions = wrapper.find('#zone-select-1').findAll('option')
    const zoneOptionTexts = zoneOptions.map((o) => o.text())
    expect(zoneOptionTexts).toContain('Не менять')
    expect(zoneOptionTexts).toContain('Зона 1')
    expect(zoneOptionTexts).toContain('')
  })

  it('updates selections and saves changes', async () => {
    const wrapper = mountComponent()
    await resolveAll()

    const statusSelect = wrapper.find('#status-select-1')
    await statusSelect.setValue('1')
    const zoneSelect = wrapper.find('#zone-select-1')
    await zoneSelect.setValue('2')
    await wrapper.find('[data-testid="save-button"]').trigger('click')
    await resolveAll()

    expect(updateMany).toHaveBeenCalledWith([
      { id: 1, parcelStatusId: 1, zone: 2, extData: '' },
      { id: 2, parcelStatusId: 3, zone: 1, extData: 'voice tip' }
    ])
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

    // Event 1 has null parcelStatusId by default
    const select1 = wrapper.find('#status-select-1')
    expect(select1.exists()).toBe(true)
    expect(select1.element.value).toBe('0')

    const optionTexts1 = select1.findAll('option').map(o => o.text())
    expect(optionTexts1).toContain('Не менять')

    // Change second event's status to empty
    const select2 = wrapper.find('#status-select-2')
    expect(select2.exists()).toBe(true)
    expect(select2.element.value).toBe('3') // initial selected value
    await select2.setValue('')

    // Save changes
    await wrapper.find('[data-testid="save-button"]').trigger('click')
    await resolveAll()

    expect(updateMany).toHaveBeenCalledWith([
      { id: 1, parcelStatusId: null, zone: null, extData: '' }, // unchanged null from initial data
      { id: 2, parcelStatusId: 0, zone: 1, extData: 'voice tip' } // cleared selection saved as 0 sentinel
    ])
  })

  it('handles empty ("Не менять") zone selection as 0', async () => {
    const wrapper = mountComponent()
    await resolveAll()

    // Event 1 has null zone by default
    const zoneSelect1 = wrapper.find('#zone-select-1')
    expect(zoneSelect1.exists()).toBe(true)
    expect(zoneSelect1.element.value).toBe('0')

    const zoneOptionTexts = zoneSelect1.findAll('option').map(o => o.text())
    expect(zoneOptionTexts).toContain('Не менять')

    // Change second event's zone to empty
    const zoneSelect2 = wrapper.find('#zone-select-2')
    expect(zoneSelect2.exists()).toBe(true)
    expect(zoneSelect2.element.value).toBe('1') // initial selected value
    await zoneSelect2.setValue('')

    // Save changes
    await wrapper.find('[data-testid="save-button"]').trigger('click')
    await resolveAll()

    expect(updateMany).toHaveBeenCalledWith([
      { id: 1, parcelStatusId: null, zone: null, extData: '' },
      { id: 2, parcelStatusId: 3, zone: 0, extData: 'voice tip' } // cleared zone saved as 0
    ])
  })
})