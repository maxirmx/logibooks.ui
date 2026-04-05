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
const download = vi.fn()
const alertError = vi.fn()
const ensureLoaded = vi.fn().mockResolvedValue()
const getStatusTitle = vi.fn((id) => `Status ${id}`)
const ensureOpsLoaded = vi.fn().mockResolvedValue()
const getOpsLabel = vi.fn((list, value) => {
  const match = list?.find((item) => Number(item.value) === Number(value))
  return match ? match.name : String(value)
})

const mockRegisterItem = { item: {} }
const getById = vi.fn()

vi.mock('@/stores/unregistered.parcels.store.js', () => ({
  useUnregisteredParcelsStore: () => ({
    items: mockItems,
    loading: mockLoading,
    error: mockError,
    getAll,
    download
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

vi.mock('@/stores/registers.store.js', () => ({
  useRegistersStore: () => mockRegisterItem
}))

describe('UnregisteredParcels_List.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockItems.value = []
    mockLoading.value = false
    mockError.value = null
    download.mockReset()
    mockRegisterItem.item = {}
    mockRegisterItem.getById = getById
    getById.mockReset()
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

  it('exports register when export action is clicked', async () => {
    getAll.mockResolvedValue([])
    download.mockResolvedValue(true)
    getById.mockImplementation(() => {
      mockRegisterItem.item = { id: 5, invoiceNumber: 'INV-100' }
    })

    const wrapper = mount(UnregisteredParcelsList, {
      props: { registerId: 5 },
      global: { stubs: vuetifyStubs }
    })

    await resolveAll()

    const actionButtons = wrapper.findAllComponents({ name: 'ActionButton' })
    const exportButton = actionButtons.find((button) => button.props('tooltipText') === 'Сформировать реестр')

    expect(exportButton).toBeTruthy()

    await exportButton.vm.$emit('click')

    expect(getById).toHaveBeenCalledWith(5)
    expect(download).toHaveBeenCalledWith(5, 'INV-100')
    expect(alertError).not.toHaveBeenCalledWith('Ошибка при экспорте реестра')
  })

  it('shows alert when export fails', async () => {
    getAll.mockResolvedValue([{ id: 1 }])
    download.mockResolvedValue(null)

    const wrapper = mount(UnregisteredParcelsList, {
      props: { registerId: 5 },
      global: { stubs: vuetifyStubs }
    })

    await resolveAll()

    const actionButtons = wrapper.findAllComponents({ name: 'ActionButton' })
    const exportButton = actionButtons.find((button) => button.props('tooltipText') === 'Сформировать реестр')

    await exportButton.vm.$emit('click')
    await resolveAll()

    expect(alertError).toHaveBeenCalledWith('Ошибка при экспорте реестра')
  })

  it('does not export and reports invalid register id on export', async () => {
    getAll.mockResolvedValue([])

    const wrapper = mount(UnregisteredParcelsList, {
      props: { registerId: 0 },
      global: { stubs: vuetifyStubs }
    })

    await resolveAll()

    const actionButtons = wrapper.findAllComponents({ name: 'ActionButton' })
    const exportButton = actionButtons.find((button) => button.props('tooltipText') === 'Сформировать реестр')

    await exportButton.vm.$emit('click')

    expect(download).not.toHaveBeenCalled()
    expect(alertError).toHaveBeenCalledWith('Некорректный идентификатор реестра')
  })

})
