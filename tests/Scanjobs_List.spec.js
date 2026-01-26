/* @vitest-environment jsdom */
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import ScanjobsList from '@/lists/Scanjobs_List.vue'
import { defaultGlobalStubs } from './helpers/test-utils'

const additionalStubs = {
  'v-alert': {
    template: '<div class="v-alert-stub" data-testid="v-alert"><slot></slot></div>',
    props: ['type', 'text', 'dismissible']
  },
  'v-spacer': {
    template: '<div class="v-spacer-stub" data-testid="v-spacer"></div>'
  },
  'font-awesome-icon': {
    template: '<i class="fa-icon-stub" data-testid="fa-icon"></i>',
    props: ['size', 'icon', 'class']
  }
}

const testStubs = {
  ...defaultGlobalStubs,
  ...additionalStubs
}

const mockScanjobs = ref([
  {
    id: 1,
    name: 'Сканирование приемки',
    type: 0,
    operation: 1,
    mode: 2,
    status: 3,
    warehouseId: 10
  }
])

const mockOps = ref({
  types: [{ value: 0, name: 'Тип 1' }],
  operations: [{ value: 1, name: 'Операция 1' }],
  modes: [{ value: 2, name: 'Режим 1' }],
  statuses: [{ value: 3, name: 'Статус 1' }]
})

const mockWarehouses = ref([{ id: 10, name: 'Основной склад' }])

const mockScanjobsPerPage = ref(10)
const mockScanjobsSearch = ref('')
const mockScanjobsSortBy = ref([{ key: 'id', order: 'desc' }])
const mockScanjobsPage = ref(1)
const mockTotalCount = ref(1)

const getAllScanjobs = vi.hoisted(() => vi.fn())
const ensureOpsLoaded = vi.hoisted(() => vi.fn())
const getAllWarehouses = vi.hoisted(() => vi.fn())
const deleteScanjobFn = vi.hoisted(() => vi.fn())
const startScanjobFn = vi.hoisted(() => vi.fn())
const finishScanjobFn = vi.hoisted(() => vi.fn())
const errorFn = vi.hoisted(() => vi.fn())
const confirmMock = vi.hoisted(() => vi.fn().mockResolvedValue(true))
const mockPush = vi.hoisted(() => vi.fn())

const router = vi.hoisted(() => ({
  push: mockPush
}))

function mockGetOpsLabel(list, value) {
  const num = Number(value)
  const match = list?.find((item) => Number(item.value) === num)
  return match ? match.name : String(value)
}

function mockGetWarehouseName(warehouseId) {
  const num = Number(warehouseId)
  const match = mockWarehouses.value?.find((warehouse) => warehouse.id === num)
  return match ? match.name : String(warehouseId)
}

vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  return {
    ...actual,
    storeToRefs: (store) => {
      if (store.items !== undefined) {
        return {
          items: mockScanjobs,
          loading: ref(false),
          ops: mockOps,
          totalCount: mockTotalCount
        }
      }
      if (store.warehouses !== undefined) {
        return {
          warehouses: mockWarehouses
        }
      }
      if (store.alert !== undefined) {
        return {
          alert: ref(null)
        }
      }
      if (store.scanjobs_per_page !== undefined) {
        return {
          scanjobs_per_page: mockScanjobsPerPage,
          scanjobs_search: mockScanjobsSearch,
          scanjobs_sort_by: mockScanjobsSortBy,
          scanjobs_page: mockScanjobsPage
        }
      }
      return {}
    }
  }
})

vi.mock('@/stores/scanjobs.store.js', () => ({
  useScanjobsStore: () => ({
    items: mockScanjobs,
    loading: false,
    ops: mockOps,
    totalCount: mockTotalCount,
    getAll: getAllScanjobs,
    remove: deleteScanjobFn,
    start: startScanjobFn,
    finish: finishScanjobFn,
    ensureOpsLoaded,
    getOpsLabel: mockGetOpsLabel
  })
}))

vi.mock('@/stores/warehouses.store.js', () => ({
  useWarehousesStore: () => ({
    warehouses: mockWarehouses,
    getAll: getAllWarehouses,
    ensureLoaded: getAllWarehouses,
    getWarehouseName: mockGetWarehouseName
  })
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => ({
    alert: null,
    error: errorFn,
    clear: vi.fn()
  })
}))

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => ({
    isAdmin: true,
    isSrLogistPlus: true,
    scanjobs_per_page: mockScanjobsPerPage,
    scanjobs_search: mockScanjobsSearch,
    scanjobs_sort_by: mockScanjobsSortBy,
    scanjobs_page: mockScanjobsPage
  })
}))

vi.mock('@/composables/useDebouncedFilterSync.js', () => ({
  useDebouncedFilterSync: () => ({
    triggerLoad: vi.fn(),
    stop: vi.fn()
  })
}))

vi.mock('vuetify-use-dialog', () => ({
  useConfirm: () => confirmMock
}))

vi.mock('@/router', () => ({
  default: router
}), { virtual: true })

vi.mock('@/helpers/items.per.page.js', () => ({
  itemsPerPageOptions: [10, 25, 50, 100]
}))

vi.mock('@mdi/js', () => ({
  mdiMagnify: 'mdi-magnify'
}))

describe('Scanjobs_List.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('calls ensureOpsLoaded and ensureLoaded warehouses on mount', async () => {
    const wrapper = mount(ScanjobsList, {
      global: {
        stubs: testStubs
      }
    })

    await wrapper.vm.$nextTick()

    expect(ensureOpsLoaded).toHaveBeenCalled()
    expect(getAllWarehouses).toHaveBeenCalled()
    expect(wrapper.exists()).toBe(true)
  })

  it('handles empty scanjobs array', async () => {
    mockScanjobs.value = []
    const wrapper = mount(ScanjobsList, {
      global: {
        stubs: testStubs
      }
    })
    expect(wrapper.exists()).toBe(true)
    mockScanjobs.value = [
      {
        id: 1,
        name: 'Сканирование приемки',
        type: 0,
        operation: 1,
        mode: 2,
        status: 3,
        warehouseId: 10
      }
    ]
  })

  it('handles search input', async () => {
    const wrapper = mount(ScanjobsList, {
      global: {
        stubs: testStubs
      }
    })

    const authStore = wrapper.vm.authStore
    const searchInput = wrapper.findComponent({ name: 'v-text-field' }) || wrapper.find('input[type="text"]')
    if (searchInput.exists()) {
      await searchInput.setValue('Сканирование')
      await searchInput.trigger('input')

      expect(authStore.scanjobs_search).toBe('Сканирование')
    }
  })

  it('maps ops labels', async () => {
    expect(mockGetOpsLabel(mockOps.value.types, 0)).toBe('Тип 1')
    expect(mockGetOpsLabel(mockOps.value.operations, 1)).toBe('Операция 1')
    expect(mockGetOpsLabel(mockOps.value.modes, 2)).toBe('Режим 1')
    expect(mockGetOpsLabel(mockOps.value.statuses, 3)).toBe('Статус 1')
    expect(mockGetOpsLabel(mockOps.value.types, 99)).toBe('99')
  })

  it('maps warehouse name', async () => {
    expect(mockGetWarehouseName(10)).toBe('Основной склад')
    expect(mockGetWarehouseName(20)).toBe('20')
  })

  it('calls delete function when delete button is clicked', async () => {
    const wrapper = mount(ScanjobsList, {
      global: {
        stubs: {
          ...testStubs,
          'v-data-table-server': {
            template: `<div><slot name="item.actions" :item="{ id: 1, name: 'Сканирование приемки' }"></slot></div>`
          }
        }
      }
    })

    const scanjob = { id: 1, name: 'Сканирование приемки' }
    await wrapper.vm.deleteScanjob(scanjob)

    expect(confirmMock).toHaveBeenCalled()
    expect(deleteScanjobFn).toHaveBeenCalledWith(1)
  })

  it('does not delete scanjob when confirmation is declined', async () => {
    confirmMock.mockResolvedValue(false)

    const wrapper = mount(ScanjobsList, {
      global: {
        stubs: {
          ...testStubs,
          'v-data-table-server': {
            template: `<div><slot name="item.actions" :item="{ id: 1, name: 'Сканирование приемки' }"></slot></div>`
          }
        }
      }
    })

    const scanjob = { id: 1, name: 'Сканирование приемки' }
    await wrapper.vm.deleteScanjob(scanjob)

    expect(confirmMock).toHaveBeenCalled()
    expect(deleteScanjobFn).not.toHaveBeenCalled()
  })

  describe('startScanjob', () => {
    it('calls start function and reloads list on success', async () => {
      startScanjobFn.mockResolvedValue(true)
      getAllScanjobs.mockResolvedValue()

      const wrapper = mount(ScanjobsList, {
        global: {
          stubs: testStubs
        }
      })

      const scanjob = { id: 1, name: 'Сканирование приемки' }
      await wrapper.vm.startScanjob(scanjob)

      expect(startScanjobFn).toHaveBeenCalledWith(1)
      expect(getAllScanjobs).toHaveBeenCalled()
    })

    it('shows error message on 403 Forbidden', async () => {
      startScanjobFn.mockRejectedValue(new Error('403 Forbidden'))

      const wrapper = mount(ScanjobsList, {
        global: {
          stubs: testStubs
        }
      })

      const scanjob = { id: 1, name: 'Сканирование приемки' }
      await wrapper.vm.startScanjob(scanjob)

      expect(startScanjobFn).toHaveBeenCalledWith(1)
      expect(errorFn).toHaveBeenCalledWith('Нет прав для запуска сканирования')
    })

    it('shows error message on 404 Not Found', async () => {
      startScanjobFn.mockRejectedValue(new Error('404 Not Found'))

      const wrapper = mount(ScanjobsList, {
        global: {
          stubs: testStubs
        }
      })

      const scanjob = { id: 1, name: 'Сканирование приемки' }
      await wrapper.vm.startScanjob(scanjob)

      expect(startScanjobFn).toHaveBeenCalledWith(1)
      expect(errorFn).toHaveBeenCalledWith('Задание на сканирование не найдено')
    })

    it('shows generic error message on other errors', async () => {
      startScanjobFn.mockRejectedValue(new Error('Server error'))

      const wrapper = mount(ScanjobsList, {
        global: {
          stubs: testStubs
        }
      })

      const scanjob = { id: 1, name: 'Сканирование приемки' }
      await wrapper.vm.startScanjob(scanjob)

      expect(startScanjobFn).toHaveBeenCalledWith(1)
      expect(errorFn).toHaveBeenCalledWith('Ошибка при запуске сканирования')
    })

    it('does not start if runningAction is true', async () => {
      const wrapper = mount(ScanjobsList, {
        global: {
          stubs: testStubs
        }
      })

      // Set runningAction to true
      wrapper.vm.runningAction = true

      const scanjob = { id: 1, name: 'Сканирование приемки' }
      await wrapper.vm.startScanjob(scanjob)

      expect(startScanjobFn).not.toHaveBeenCalled()
    })
  })

  describe('finishScanjob', () => {
    it('calls finish function and reloads list on success', async () => {
      finishScanjobFn.mockResolvedValue(true)
      getAllScanjobs.mockResolvedValue()

      const wrapper = mount(ScanjobsList, {
        global: {
          stubs: testStubs
        }
      })

      const scanjob = { id: 1, name: 'Сканирование приемки' }
      await wrapper.vm.finishScanjob(scanjob)

      expect(finishScanjobFn).toHaveBeenCalledWith(1)
      expect(getAllScanjobs).toHaveBeenCalled()
    })

    it('shows error message on 403 Forbidden', async () => {
      finishScanjobFn.mockRejectedValue(new Error('403 Forbidden'))

      const wrapper = mount(ScanjobsList, {
        global: {
          stubs: testStubs
        }
      })

      const scanjob = { id: 1, name: 'Сканирование приемки' }
      await wrapper.vm.finishScanjob(scanjob)

      expect(finishScanjobFn).toHaveBeenCalledWith(1)
      expect(errorFn).toHaveBeenCalledWith('Нет прав для завершения сканирования')
    })

    it('shows error message on 404 Not Found', async () => {
      finishScanjobFn.mockRejectedValue(new Error('404 Not Found'))

      const wrapper = mount(ScanjobsList, {
        global: {
          stubs: testStubs
        }
      })

      const scanjob = { id: 1, name: 'Сканирование приемки' }
      await wrapper.vm.finishScanjob(scanjob)

      expect(finishScanjobFn).toHaveBeenCalledWith(1)
      expect(errorFn).toHaveBeenCalledWith('Задание на сканирование не найдено')
    })

    it('shows generic error message on other errors', async () => {
      finishScanjobFn.mockRejectedValue(new Error('Server error'))

      const wrapper = mount(ScanjobsList, {
        global: {
          stubs: testStubs
        }
      })

      const scanjob = { id: 1, name: 'Сканирование приемки' }
      await wrapper.vm.finishScanjob(scanjob)

      expect(finishScanjobFn).toHaveBeenCalledWith(1)
      expect(errorFn).toHaveBeenCalledWith('Ошибка при завершении сканирования')
    })

    it('does not finish if runningAction is true', async () => {
      const wrapper = mount(ScanjobsList, {
        global: {
          stubs: testStubs
        }
      })

      // Set runningAction to true
      wrapper.vm.runningAction = true

      const scanjob = { id: 1, name: 'Сканирование приемки' }
      await wrapper.vm.finishScanjob(scanjob)

      expect(finishScanjobFn).not.toHaveBeenCalled()
    })
  })
})
