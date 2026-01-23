/* @vitest-environment jsdom */
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { reactive, ref } from 'vue'
import ScanJobsList from '@/lists/ScanJobs_List.vue'
import { defaultGlobalStubs } from './helpers/test-utils.js'

const scanJobsRef = ref([
  {
    id: 1,
    name: 'Сканирование',
    type: 0,
    operation: 1,
    mode: 0,
    status: 0,
    warehouseId: 10
  }
])

const warehousesRef = ref([
  { id: 10, name: 'Основной склад' },
  { id: 11, name: 'Склад 2' }
])

const loadingRef = ref(false)
const errorRef = ref(null)
const totalCountRef = ref(1)

const getAllScanJobs = vi.hoisted(() => vi.fn())
const removeScanJob = vi.hoisted(() => vi.fn())
const getAllWarehouses = vi.hoisted(() => vi.fn())
const errorFn = vi.hoisted(() => vi.fn())
const confirmMock = vi.hoisted(() => vi.fn().mockResolvedValue(true))
const routerPushMock = vi.hoisted(() => vi.fn())
const triggerLoadMock = vi.hoisted(() => vi.fn())

const authStoreMock = reactive({
  scanjobs_per_page: 10,
  scanjobs_search: '',
  scanjobs_sort_by: [{ key: 'id', order: 'asc' }],
  scanjobs_page: 1,
  isSrLogistPlus: true
})

vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  return {
    ...actual,
    storeToRefs: (store) => {
      const refs = {}
      Object.keys(store).forEach((key) => {
        const value = store[key]
        if (value && typeof value === 'object' && 'value' in value) {
          refs[key] = value
        }
      })
      return refs
    }
  }
})

vi.mock('@/stores/scanjobs.store.js', () => ({
  useScanJobsStore: () => ({
    scanJobs: scanJobsRef,
    loading: loadingRef,
    error: errorRef,
    totalCount: totalCountRef,
    getAll: getAllScanJobs,
    remove: removeScanJob
  }),
  SCANJOB_TYPE_PACKAGE: 0,
  SCANJOB_TYPE_BAG: 1,
  SCANJOB_OPERATION_INCOMING: 0,
  SCANJOB_OPERATION_OUTGOING: 1,
  SCANJOB_OPERATION_SEARCH: 2,
  SCANJOB_MODE_MANUAL: 0,
  SCANJOB_MODE_AUTOMATIC: 1,
  SCANJOB_STATUS_IN_PROGRESS: 0,
  SCANJOB_STATUS_COMPLETED: 1,
  SCANJOB_TYPE_OPTIONS: [
    { value: 0, label: 'Посылка' },
    { value: 1, label: 'Мешок' }
  ],
  SCANJOB_OPERATION_OPTIONS: [
    { value: 0, label: 'Входящее' },
    { value: 1, label: 'Исходящее' },
    { value: 2, label: 'Поиск' }
  ],
  SCANJOB_MODE_OPTIONS: [
    { value: 0, label: 'Ручное' },
    { value: 1, label: 'Автоматическое' }
  ],
  SCANJOB_STATUS_OPTIONS: [
    { value: 0, label: 'В работе' },
    { value: 1, label: 'Завершено' }
  ]
}))

vi.mock('@/stores/warehouses.store.js', () => ({
  useWarehousesStore: () => ({
    warehouses: warehousesRef,
    getAll: getAllWarehouses
  })
}))

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => authStoreMock
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => ({
    alert: null,
    error: errorFn,
    clear: vi.fn()
  })
}))

vi.mock('vuetify-use-dialog', () => ({
  useConfirm: () => confirmMock
}))

vi.mock('@/router', () => ({
  default: {
    push: routerPushMock
  }
}))

vi.mock('@/helpers/items.per.page.js', () => ({
  itemsPerPageOptions: [10, 25, 50]
}))

vi.mock('@mdi/js', () => ({
  mdiMagnify: 'mdi-magnify'
}))

vi.mock('@/composables/useDebouncedFilterSync.js', () => ({
  useDebouncedFilterSync: () => ({
    triggerLoad: triggerLoadMock,
    stop: vi.fn()
  })
}))

describe('ScanJobs_List.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authStoreMock.scanjobs_search = ''
    authStoreMock.scanjobs_page = 1
    authStoreMock.scanjobs_per_page = 10
    authStoreMock.scanjobs_sort_by = [{ key: 'id', order: 'asc' }]
  })

  it('calls getAll methods on mount', async () => {
    mount(ScanJobsList, {
      global: {
        stubs: {
          ...defaultGlobalStubs,
          ActionButton: { template: '<button data-testid="action-button" />' },
          PaginationFooter: { template: '<div data-testid="pagination-footer"></div>' },
          'font-awesome-icon': { template: '<i class="fa-icon-stub" />' }
        }
      }
    })

    await flushPromises()

    expect(getAllWarehouses).toHaveBeenCalled()
    expect(getAllScanJobs).toHaveBeenCalled()
  })

  it('maps option labels correctly', async () => {
    const wrapper = mount(ScanJobsList, {
      global: {
        stubs: {
          ...defaultGlobalStubs,
          ActionButton: { template: '<button data-testid="action-button" />' },
          PaginationFooter: { template: '<div data-testid="pagination-footer"></div>' },
          'font-awesome-icon': { template: '<i class="fa-icon-stub" />' }
        }
      }
    })

    expect(wrapper.vm.getOptionLabel([{ value: 0, label: 'Посылка' }], 0)).toBe('Посылка')
    expect(wrapper.vm.getOptionLabel([{ value: 1, label: 'Исходящее' }], 1)).toBe('Исходящее')
    expect(wrapper.vm.getOptionLabel([{ value: 1, label: 'Автоматическое' }], 1)).toBe('Автоматическое')
    expect(wrapper.vm.getOptionLabel([{ value: 1, label: 'Завершено' }], 1)).toBe('Завершено')
  })

  it('navigates to create page when create action is called', async () => {
    const wrapper = mount(ScanJobsList, {
      global: {
        stubs: {
          ...defaultGlobalStubs,
          ActionButton: { template: '<button data-testid="action-button" />' },
          PaginationFooter: { template: '<div data-testid="pagination-footer"></div>' },
          'font-awesome-icon': { template: '<i class="fa-icon-stub" />' }
        }
      }
    })

    await wrapper.vm.openCreateDialog()
    expect(routerPushMock).toHaveBeenCalledWith('/scanjob/create')
  })

  it('navigates to edit page when edit is called', async () => {
    const wrapper = mount(ScanJobsList, {
      global: {
        stubs: {
          ...defaultGlobalStubs,
          ActionButton: { template: '<button data-testid="action-button" />' },
          PaginationFooter: { template: '<div data-testid="pagination-footer"></div>' },
          'font-awesome-icon': { template: '<i class="fa-icon-stub" />' }
        }
      }
    })

    await wrapper.vm.openEditDialog({ id: 7 })
    expect(routerPushMock).toHaveBeenCalledWith('/scanjob/edit/7')
  })

  it('calls remove when deleteScanJob is confirmed', async () => {
    const wrapper = mount(ScanJobsList, {
      global: {
        stubs: {
          ...defaultGlobalStubs,
          ActionButton: { template: '<button data-testid="action-button" />' },
          PaginationFooter: { template: '<div data-testid="pagination-footer"></div>' },
          'font-awesome-icon': { template: '<i class="fa-icon-stub" />' }
        }
      }
    })

    await wrapper.vm.deleteScanJob({ id: 1, name: 'Сканирование' })

    expect(removeScanJob).toHaveBeenCalledWith(1)
  })
})
