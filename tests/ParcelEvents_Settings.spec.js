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
  { id: 1, eventId: 'Created', eventName: 'Создана', parcelStatusId: null, extData: '' },
  { id: 2, eventId: 'Processing', eventName: 'В обработке', parcelStatusId: 3, extData: 'voice tip' }
])

const mockStatuses = ref([
  { id: 1, title: 'Новый' },
  { id: 3, title: 'В пути' }
])

const ensureLoaded = vi.hoisted(() => vi.fn())
const getAll = vi.hoisted(() => vi.fn())
const updateMany = vi.hoisted(() => vi.fn())
const routerBack = vi.hoisted(() => vi.fn())

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
        'font-awesome-icon': true
      }
    }
  })

describe('ParcelEvents_Settings.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEvents.value = [
      { id: 1, eventId: 'Created', eventName: 'Создана', parcelStatusId: null, extData: '' },
      { id: 2, eventId: 'Processing', eventName: 'В обработке', parcelStatusId: 3, extData: 'voice tip' }
    ]
    mockStatuses.value = [
      { id: 1, title: 'Новый' },
      { id: 3, title: 'В пути' }
    ]
    ensureLoaded.mockResolvedValue()
    getAll.mockImplementation(async () => {
      mockEvents.value = [...mockEvents.value]
    })
    updateMany.mockResolvedValue()
  })

  it('renders event rows with selectors', async () => {
    const wrapper = mountComponent()
    await resolveAll()

    expect(ensureLoaded).toHaveBeenCalled()
    expect(getAll).toHaveBeenCalled()

    // Use selects count to represent rows since v-data-table structure differs
    const selects = wrapper.findAll('select[id^="status-select-"]')
    expect(selects.length).toBe(2)
    expect(wrapper.find('[data-testid="parcel-event-row-1"]').text()).toBe('Создана')

    // extData inputs present
    const extInput1 = wrapper.find('#extdata-input-1')
    expect(extInput1.exists()).toBe(true)
    expect(extInput1.element.value).toBe('')
    const extInput2 = wrapper.find('#extdata-input-2')
    expect(extInput2.exists()).toBe(true)
    expect(extInput2.element.value).toBe('voice tip')

    const options = wrapper.find('#status-select-1').findAll('option')
    const optionTexts = options.map((o) => o.text())
    expect(optionTexts).toContain('Новый')
    expect(optionTexts).toContain('В пути')
  })

  it('updates selections and saves changes', async () => {
    const wrapper = mountComponent()
    await resolveAll()

    const select = wrapper.find('#status-select-1')
    await select.setValue('1')
    await wrapper.find('button.button.primary').trigger('click')
    await resolveAll()

    expect(updateMany).toHaveBeenCalledWith([
      { id: 1, parcelStatusId: 1, extData: '' },
      { id: 2, parcelStatusId: 3, extData: 'voice tip' }
    ])
  })

  it('shows error message when save fails', async () => {
    updateMany.mockRejectedValue(new Error('Save failed'))

    const wrapper = mountComponent()
    await resolveAll()

    await wrapper.find('button.button.primary').trigger('click')
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
    await wrapper.find('button.button.primary').trigger('click')
    await resolveAll()

    expect(updateMany).toHaveBeenCalledWith([
      { id: 1, parcelStatusId: null, extData: '' }, // unchanged null from initial data
      { id: 2, parcelStatusId: 0, extData: 'voice tip' } // cleared selection saved as 0 sentinel
    ])
  })
})