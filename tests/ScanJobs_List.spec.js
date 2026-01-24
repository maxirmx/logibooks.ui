/* @vitest-environment jsdom */
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import ScanJobsList from '@/lists/ScanJobs_List.vue'
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

const mockScanJobs = ref([
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

const getAllScanJobs = vi.hoisted(() => vi.fn())
const ensureOpsLoaded = vi.hoisted(() => vi.fn())
const getAllWarehouses = vi.hoisted(() => vi.fn())
const deleteScanJobFn = vi.hoisted(() => vi.fn())
const errorFn = vi.hoisted(() => vi.fn())
const confirmMock = vi.hoisted(() => vi.fn().mockResolvedValue(true))
const mockPush = vi.hoisted(() => vi.fn())

const router = vi.hoisted(() => ({
  push: mockPush
}))

vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  return {
    ...actual,
    storeToRefs: (store) => {
      if (store.scanjobs !== undefined) {
        return {
          scanjobs: mockScanJobs,
          loading: ref(false),
          ops: mockOps
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
      return {}
    }
  }
})

vi.mock('@/stores/scanjobs.store.js', () => ({
  useScanJobsStore: () => ({
    scanjobs: mockScanJobs,
    loading: false,
    ops: mockOps,
    getAll: getAllScanJobs,
    remove: deleteScanJobFn,
    ensureOpsLoaded
  })
}))

vi.mock('@/stores/warehouses.store.js', () => ({
  useWarehousesStore: () => ({
    warehouses: mockWarehouses,
    getAll: getAllWarehouses
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
    scanjobs_per_page: 10,
    scanjobs_search: '',
    scanjobs_sort_by: ['id'],
    scanjobs_page: 1
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

describe('ScanJobs_List.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('calls getAll methods on mount', async () => {
    const wrapper = mount(ScanJobsList, {
      global: {
        stubs: testStubs
      }
    })

    await wrapper.vm.$nextTick()

    expect(ensureOpsLoaded).toHaveBeenCalled()
    expect(getAllScanJobs).toHaveBeenCalled()
    expect(getAllWarehouses).toHaveBeenCalled()
    expect(wrapper.exists()).toBe(true)
  })

  it('handles empty scanjobs array', async () => {
    mockScanJobs.value = []
    const wrapper = mount(ScanJobsList, {
      global: {
        stubs: testStubs
      }
    })
    expect(wrapper.exists()).toBe(true)
    mockScanJobs.value = [
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
    const wrapper = mount(ScanJobsList, {
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
    const wrapper = mount(ScanJobsList, {
      global: {
        stubs: testStubs
      }
    })

    expect(wrapper.vm.getOpsLabel(mockOps.value.types, 0)).toBe('Тип 1')
    expect(wrapper.vm.getOpsLabel(mockOps.value.operations, 1)).toBe('Операция 1')
    expect(wrapper.vm.getOpsLabel(mockOps.value.modes, 2)).toBe('Режим 1')
    expect(wrapper.vm.getOpsLabel(mockOps.value.statuses, 3)).toBe('Статус 1')
    expect(wrapper.vm.getOpsLabel(mockOps.value.types, 99)).toBe(99)
  })

  it('maps warehouse name', async () => {
    const wrapper = mount(ScanJobsList, {
      global: {
        stubs: testStubs
      }
    })

    expect(wrapper.vm.getWarehouseName(10)).toBe('Основной склад')
    expect(wrapper.vm.getWarehouseName(20)).toBe(20)
  })

  it('navigates to create page when add link is clicked', async () => {
    const wrapper = mount(ScanJobsList, {
      global: {
        stubs: testStubs
      }
    })

    await wrapper.vm.openCreateDialog()
    expect(router.push).toHaveBeenCalledWith('/scanjob/create')
  })

  it('navigates to edit page when edit is called', async () => {
    const wrapper = mount(ScanJobsList, {
      global: {
        stubs: {
          ...testStubs,
          'v-data-table': {
            template: `<div><slot name="item.actions" :item="{ id: 1, name: 'Сканирование приемки' }"></slot></div>`
          }
        }
      }
    })

    const scanjob = { id: 1, name: 'Сканирование приемки' }
    await wrapper.vm.openEditDialog(scanjob)

    expect(router.push).toHaveBeenCalledWith('/scanjob/edit/1')
  })

  it('calls delete function when delete button is clicked', async () => {
    const wrapper = mount(ScanJobsList, {
      global: {
        stubs: {
          ...testStubs,
          'v-data-table': {
            template: `<div><slot name="item.actions" :item="{ id: 1, name: 'Сканирование приемки' }"></slot></div>`
          }
        }
      }
    })

    const scanjob = { id: 1, name: 'Сканирование приемки' }
    await wrapper.vm.deleteScanJob(scanjob)

    expect(confirmMock).toHaveBeenCalled()
    expect(deleteScanJobFn).toHaveBeenCalledWith(1)
  })

  it('does not delete scanjob when confirmation is declined', async () => {
    confirmMock.mockResolvedValue(false)

    const wrapper = mount(ScanJobsList, {
      global: {
        stubs: {
          ...testStubs,
          'v-data-table': {
            template: `<div><slot name="item.actions" :item="{ id: 1, name: 'Сканирование приемки' }"></slot></div>`
          }
        }
      }
    })

    const scanjob = { id: 1, name: 'Сканирование приемки' }
    await wrapper.vm.deleteScanJob(scanjob)

    expect(confirmMock).toHaveBeenCalled()
    expect(deleteScanJobFn).not.toHaveBeenCalled()
  })
})
