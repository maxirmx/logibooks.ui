/* @vitest-environment jsdom */
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import AirportsList from '@/lists/Airports_List.vue'
import { defaultGlobalStubs } from './helpers/test-utils.js'

const mockAirports = ref([
  { id: 1, name: 'Sheremetyevo', codeIata: 'SVO', codeIcao: 'UUEE', country: 'Russia' },
  { id: 2, name: 'Domodedovo', codeIata: 'DME', codeIcao: 'UUDD', country: 'Russia' }
])

const getAllAirports = vi.hoisted(() => vi.fn().mockResolvedValue())
const removeAirport = vi.hoisted(() => vi.fn().mockResolvedValue())
const alertError = vi.hoisted(() => vi.fn())
const alertClear = vi.hoisted(() => vi.fn())
const confirmMock = vi.hoisted(() => vi.fn().mockResolvedValue(true))
const mockPush = vi.hoisted(() => vi.fn())

const loadingRef = ref(false)
const alertRef = ref(null)

const mockAirportsStore = {
  airports: mockAirports,
  loading: loadingRef,
  getAll: getAllAirports,
  remove: removeAirport
}

const mockAlertStore = {
  alert: alertRef,
  error: alertError,
  clear: alertClear
}

const mockAuthStore = {
  isAdminOrSrLogist: true,
  airports_per_page: ref(10),
  airports_search: ref(''),
  airports_sort_by: ref(['id']),
  airports_page: ref(1)
}

vi.mock('pinia', () => ({
  storeToRefs: (store) => {
    if (store === mockAirportsStore) {
      return { airports: mockAirportsStore.airports, loading: mockAirportsStore.loading }
    }
    if (store === mockAlertStore) {
      return { alert: mockAlertStore.alert }
    }
    return {}
  }
}))

vi.mock('@/stores/airports.store.js', () => ({
  useAirportsStore: () => mockAirportsStore
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => mockAlertStore
}))

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => mockAuthStore
}))

vi.mock('vuetify-use-dialog', () => ({
  useConfirm: () => confirmMock
}))

vi.mock('@/router', () => ({
  default: { push: mockPush }
}))

vi.mock('@mdi/js', () => ({
  mdiMagnify: 'mdi-magnify'
}))

vi.mock('@/helpers/items.per.page.js', () => ({
  itemsPerPageOptions: [10, 25, 50]
}))

vi.mock('@/components/ActionButton.vue', () => ({
  default: {
    name: 'ActionButton',
    props: ['item', 'icon', 'tooltipText', 'disabled'],
    emits: ['click'],
    template: '<button data-testid="action-button" @click="$emit(\'click\', item)"></button>'
  }
}))

const testStubs = {
  ...defaultGlobalStubs,
  'router-link': {
    template: '<a data-testid="router-link"><slot></slot></a>',
    props: ['to']
  }
}

beforeEach(() => {
  mockAirports.value = [
    { id: 1, name: 'Sheremetyevo', codeIata: 'SVO', codeIcao: 'UUEE', country: 'Russia' },
    { id: 2, name: 'Domodedovo', codeIata: 'DME', codeIcao: 'UUDD', country: 'Russia' }
  ]
  alertRef.value = null
  loadingRef.value = false
  vi.clearAllMocks()
})

describe('Airports_List.vue', () => {
  it('calls getAll on mount', async () => {
    const wrapper = mount(AirportsList, {
      global: {
        stubs: testStubs
      }
    })

    await wrapper.vm.$nextTick()

    expect(getAllAirports).toHaveBeenCalled()
    expect(wrapper.exists()).toBe(true)
  })

  it('navigates to create view via exposed method', async () => {
    const wrapper = mount(AirportsList, {
      global: {
        stubs: testStubs
      }
    })

    await wrapper.vm.$nextTick()

    wrapper.vm.openCreateDialog()
    expect(mockPush).toHaveBeenCalledWith('/airport/create')
  })

  it('deletes airport when confirmed', async () => {
    const wrapper = mount(AirportsList, {
      global: {
        stubs: testStubs
      }
    })

    await wrapper.vm.$nextTick()

    await wrapper.vm.deleteAirport(mockAirports.value[0])

    expect(confirmMock).toHaveBeenCalled()
    expect(removeAirport).toHaveBeenCalledWith(1)
  })

  it('shows empty list message when no airports available', async () => {
    mockAirports.value = []

    const wrapper = mount(AirportsList, {
      global: {
        stubs: testStubs
      }
    })

    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Список кодов аэропортов пуст')
  })
})
