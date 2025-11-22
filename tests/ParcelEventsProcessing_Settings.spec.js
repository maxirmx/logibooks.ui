/* @vitest-environment jsdom */
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import ParcelEventsProcessingSettings from '@/dialogs/ParcelEventsProcessing_Settings.vue'
import { resolveAll } from './helpers/test-utils'

const mockEvents = ref([
  { id: 1, eventId: 'Created', eventName: 'Создана', parcelStatusId: null },
  { id: 2, eventId: 'Processing', eventName: 'В обработке', parcelStatusId: 3 }
])

const mockStatuses = ref([
  { id: 1, title: 'Новый' },
  { id: 3, title: 'В пути' }
])

const ensureLoaded = vi.hoisted(() => vi.fn())
const getAll = vi.hoisted(() => vi.fn())
const updateMany = vi.hoisted(() => vi.fn())
const routerBack = vi.hoisted(() => vi.fn())

vi.mock('@/stores/parcel.processing.events.store.js', () => ({
  useParcelProcessingEventsStore: () => ({
    events: mockEvents,
    loading: ref(false),
    getAll,
    updateMany
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

const mountComponent = () =>
  mount(ParcelEventsProcessingSettings, {
    global: {
      stubs: {
        'font-awesome-icon': true
      }
    }
  })

describe('ParcelEventsProcessing_Settings.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEvents.value = [
      { id: 1, eventId: 'Created', eventName: 'Создана', parcelStatusId: null },
      { id: 2, eventId: 'Processing', eventName: 'В обработке', parcelStatusId: 3 }
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

    const rows = wrapper.findAll('[data-testid="parcel-event-row"]')
    expect(rows.length).toBe(2)
    expect(wrapper.find('[data-testid="event-title-1"]').text()).toBe('Создана')

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
      { id: 1, parcelStatusId: 1 },
      { id: 2, parcelStatusId: 3 }
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
})
