/* @vitest-environment jsdom */
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import UnregisteredParcelsList from '@/lists/UnregisteredParcels_List.vue'
import { resolveAll, vuetifyStubs } from './helpers/test-utils.js'

const mockItems = ref([])
const mockLoading = ref(false)
const mockError = ref(null)
const getAll = vi.fn()
const alertError = vi.fn()
const ensureLoaded = vi.fn().mockResolvedValue()
const getStatusTitle = vi.fn((id) => `Status ${id}`)
const ensureOpsLoaded = vi.fn().mockResolvedValue()
const getOpsLabel = vi.fn((list, value) => {
  const match = list?.find((item) => Number(item.value) === Number(value))
  return match ? match.name : String(value)
})

vi.mock('@/stores/unregistered.parcels.store.js', () => ({
  useUnregisteredParcelsStore: () => ({
    items: mockItems,
    loading: mockLoading,
    error: mockError,
    getAll
  })
}))

vi.mock('@/stores/parcel.statuses.store.js', () => ({
  useParcelStatusesStore: () => ({
    ensureLoaded,
    getStatusTitle
  })
}))

vi.mock('@/stores/warehouses.store.js', () => ({
  useWarehousesStore: () => ({
    ops: ref({ zones: [{ value: 1, name: 'Зона 1' }] }),
    ensureOpsLoaded,
    getOpsLabel
  })
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => ({
    error: alertError
  })
}))

describe('UnregisteredParcels_List.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockItems.value = []
    mockLoading.value = false
    mockError.value = null
  })

  it('loads rows on mount with register id', async () => {
    getAll.mockResolvedValue([])

    mount(UnregisteredParcelsList, {
      props: { registerId: 5 },
      global: { stubs: vuetifyStubs }
    })

    await resolveAll()

    expect(getAll).toHaveBeenCalledWith(5)
  })

  it('renders projected status and zone text instead of raw ids', async () => {
    getAll.mockResolvedValue([])
    mockItems.value = [
      { id: 1, registerId: 5, statusId: 7, zone: 1 }
    ]

    const wrapper = mount(UnregisteredParcelsList, {
      props: { registerId: 5 },
      global: { stubs: vuetifyStubs }
    })

    await resolveAll()

    expect(wrapper.text()).toContain('Status 7')
    expect(wrapper.text()).toContain('Зона 1')
    expect(getStatusTitle).toHaveBeenCalledWith(7)
    expect(getOpsLabel).toHaveBeenCalledWith([{ value: 1, name: 'Зона 1' }], 1)
  })

  it('reports invalid register id', () => {
    mount(UnregisteredParcelsList, {
      props: { registerId: 0 },
      global: { stubs: vuetifyStubs }
    })

    expect(getAll).not.toHaveBeenCalled()
    expect(alertError).toHaveBeenCalledWith('Некорректный идентификатор реестра')
    expect(ensureLoaded).not.toHaveBeenCalled()
    expect(ensureOpsLoaded).not.toHaveBeenCalled()
  })

  it('reports store loading error when load fails', async () => {
    getAll.mockResolvedValue([])
    mockError.value = new Error('load error')

    mount(UnregisteredParcelsList, {
      props: { registerId: 12 },
      global: { stubs: vuetifyStubs }
    })

    await resolveAll()
    expect(alertError).toHaveBeenCalledWith('Ошибка при загрузке незарегистрированных посылок')
  })

  it('loads projection dictionaries before loading rows', async () => {
    getAll.mockResolvedValue([])

    mount(UnregisteredParcelsList, {
      props: { registerId: 12 },
      global: { stubs: vuetifyStubs }
    })

    await resolveAll()

    expect(ensureLoaded).toHaveBeenCalled()
    expect(ensureOpsLoaded).toHaveBeenCalled()
    expect(getAll).toHaveBeenCalledWith(12)
  })
})
