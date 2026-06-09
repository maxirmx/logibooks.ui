/* @vitest-environment jsdom */
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
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
    registerStatusIdAfter: 31,
    parcelFoundStatusIdAfter: 41,
    parcelNotFoundStatusIdAfter: 42,
    registerId: 22,
    warehouseId: 10,
    dealNumber: 'DEAL-001',
    invoiceNumber: 'INV-001',
    invoiceDate: '2026-06-03',
    transportationTypeCode: 0,
    senderId: 101,
    recipientId: 102
  }
])

const mockOps = ref({
  types: [{ value: 0, name: 'Тип 1' }],
  operations: [{ value: 1, name: 'Операция 1' }],
  modes: [{ value: 2, name: 'Режим 1' }],
  statuses: [{ value: 3, name: 'Статус 1' }]
})

const mockRegisterOps = ref({
  customsProcedures: [],
  transportationTypes: [
    { value: 0, name: 'Авиа', document: 'AWB' }
  ]
})


const mockRegisterStatuses = ref([{ id: 31, title: 'Реестр готов' }])
const mockParcelStatuses = ref([
  { id: 41, title: 'Посылка найдена' },
  { id: 42, title: 'Посылка не найдена' }
])

const mockWarehouses = ref([{ id: 10, name: 'Основной склад' }])
const mockCompanies = ref([
  { id: 101, shortName: 'Отправитель ООО', name: 'Отправитель полное' },
  { id: 102, shortName: '', name: 'Получатель полное' }
])

const mockScanjobsPerPage = ref(10)
const mockScanjobsSearch = ref('')
const mockScanjobsSortBy = ref([{ key: 'id', order: 'desc' }])
const mockScanjobsPage = ref(1)
const mockTotalCount = ref(1)

const mockAlert = ref(null)
const getAllScanjobs = vi.hoisted(() => vi.fn())
const ensureOpsLoaded = vi.hoisted(() => vi.fn())
const ensureRegisterOpsLoaded = vi.hoisted(() => vi.fn())
const getAllWarehouses = vi.hoisted(() => vi.fn())
const getAllCompanies = vi.hoisted(() => vi.fn())
const ensureRegisterStatusesLoaded = vi.hoisted(() => vi.fn())
const ensureParcelStatusesLoaded = vi.hoisted(() => vi.fn())
const deleteScanjobFn = vi.hoisted(() => vi.fn())
const startScanjobFn = vi.hoisted(() => vi.fn())
const pauseScanjobFn = vi.hoisted(() => vi.fn())
const finishScanjobFn = vi.hoisted(() => vi.fn())
const startScanJobsListMonitorFn = vi.hoisted(() => vi.fn())
const stopScanJobsListMonitorFn = vi.hoisted(() => vi.fn())
const errorFn = vi.hoisted(() => vi.fn())
const confirmMock = vi.hoisted(() => vi.fn().mockResolvedValue(true))
const mockPush = vi.hoisted(() => vi.fn())
const clearAlertFn = vi.hoisted(() => vi.fn())
const triggerLoadMock = vi.hoisted(() => vi.fn())
const stopFilterSyncMock = vi.hoisted(() => vi.fn())

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

function mockGetTransportationDocument(value) {
  const num = Number(value)
  const match = mockRegisterOps.value.transportationTypes.find((item) => Number(item.value) === num)
  return match ? match.document : `[Тип ${value}]`
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
      if (store.companies !== undefined) {
        return {
          companies: mockCompanies
        }
      }
      if (store.warehouses !== undefined) {
        return {
          warehouses: mockWarehouses
        }
      }
      if (store.alert !== undefined) {
        return {
          alert: mockAlert
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
    pause: pauseScanjobFn,
    finish: finishScanjobFn,
    ensureOpsLoaded,
    getOpsLabel: mockGetOpsLabel,
    startScanJobsListMonitor: startScanJobsListMonitorFn,
    stopScanJobsListMonitor: stopScanJobsListMonitorFn
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

vi.mock('@/stores/registers.store.js', () => ({
  useRegistersStore: () => ({
    ops: mockRegisterOps,
    ensureOpsLoaded: ensureRegisterOpsLoaded,
    getTransportationDocument: mockGetTransportationDocument
  })
}))

vi.mock('@/stores/companies.store.js', () => ({
  useCompaniesStore: () => ({
    companies: mockCompanies,
    getAll: getAllCompanies
  })
}))

vi.mock('@/stores/register.statuses.store.js', () => ({
  useRegisterStatusesStore: () => ({
    ensureLoaded: ensureRegisterStatusesLoaded,
    getStatusTitle: (id) => {
      const match = mockRegisterStatuses.value.find((status) => status.id === id)
      return match ? match.title : `Статус ${id}`
    }
  })
}))

vi.mock('@/stores/parcel.statuses.store.js', () => ({
  useParcelStatusesStore: () => ({
    ensureLoaded: ensureParcelStatusesLoaded,
    getStatusTitle: (id) => {
      const match = mockParcelStatuses.value.find((status) => status.id === id)
      return match ? match.title : `Статус ${id}`
    }
  })
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => ({
    alert: null,
    error: errorFn,
    clear: clearAlertFn
  })
}))

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => ({
    isAdmin: true,
    isShiftLeadPlus: true,
    isWhManagerPlus: true,
    hasWhRole: true,
    isSrLogistPlus: true,
    scanjobs_per_page: mockScanjobsPerPage,
    scanjobs_search: mockScanjobsSearch,
    scanjobs_sort_by: mockScanjobsSortBy,
    scanjobs_page: mockScanjobsPage
  })
}))

vi.mock('@/composables/useDebouncedFilterSync.js', () => ({
  useDebouncedFilterSync: () => ({
    triggerLoad: triggerLoadMock,
    stop: stopFilterSyncMock
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
    mockScanjobsPerPage.value = 10
    mockScanjobsSearch.value = ''
    mockScanjobsSortBy.value = [{ key: 'id', order: 'desc' }]
    mockScanjobsPage.value = 1
    mockTotalCount.value = 1
    confirmMock.mockResolvedValue(true)
    startScanJobsListMonitorFn.mockResolvedValue(true)
    stopScanJobsListMonitorFn.mockResolvedValue(true)
  })

  afterEach(() => {
    vi.useRealTimers()
    mockAlert.value = null
  })

  it('calls ensureOpsLoaded and ensureLoaded warehouses on mount', async () => {
    const wrapper = mount(ScanjobsList, {
      global: {
        stubs: testStubs
      }
    })

    await wrapper.vm.$nextTick()
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(ensureOpsLoaded).toHaveBeenCalled()
    expect(getAllWarehouses).toHaveBeenCalled()
    expect(ensureRegisterOpsLoaded).toHaveBeenCalled()
    expect(getAllCompanies).toHaveBeenCalled()
    expect(startScanJobsListMonitorFn).toHaveBeenCalledWith({
      onChanged: expect.any(Function)
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('continues initialization when live list monitor cannot be started', async () => {
    startScanJobsListMonitorFn.mockRejectedValueOnce(new Error('SignalR unavailable'))

    const wrapper = mount(ScanjobsList, {
      global: {
        stubs: testStubs
      }
    })

    await wrapper.vm.$nextTick()
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(ensureOpsLoaded).toHaveBeenCalled()
    expect(getAllWarehouses).toHaveBeenCalled()
    expect(ensureRegisterOpsLoaded).toHaveBeenCalled()
    expect(getAllCompanies).toHaveBeenCalled()
    expect(startScanJobsListMonitorFn).toHaveBeenCalled()
    expect(errorFn).not.toHaveBeenCalled()
    expect(wrapper.exists()).toBe(true)
  })


  it('shows initialization error when preload fails', async () => {
    ensureRegisterOpsLoaded.mockRejectedValueOnce(new Error('Register ops failed'))

    const wrapper = mount(ScanjobsList, {
      global: {
        stubs: testStubs
      }
    })

    await wrapper.vm.$nextTick()
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(errorFn).toHaveBeenCalledWith(expect.stringContaining('Register ops failed'))
    expect(wrapper.exists()).toBe(true)
  })
  it('does not start live list monitor after unmount during warehouses loading', async () => {
    let resolveWarehousesLoad
    getAllWarehouses.mockImplementationOnce(() => new Promise((resolve) => {
      resolveWarehousesLoad = resolve
    }))

    const wrapper = mount(ScanjobsList, {
      global: {
        stubs: testStubs
      }
    })

    await wrapper.vm.$nextTick()
    await new Promise((resolve) => setTimeout(resolve, 0))
    wrapper.unmount()
    resolveWarehousesLoad()
    await Promise.resolve()

    expect(startScanJobsListMonitorFn).not.toHaveBeenCalled()
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
        registerStatusIdAfter: 31,
        parcelFoundStatusIdAfter: 41,
        parcelNotFoundStatusIdAfter: 42,
        registerId: 22,
        warehouseId: 10,
        dealNumber: 'DEAL-001',
        invoiceNumber: 'INV-001',
        invoiceDate: '2026-06-03',
        transportationTypeCode: 0,
        senderId: 101,
        recipientId: 102
      }
    ]
  })


  it('renders register-derived headers immediately after dealNumber', () => {
    const wrapper = mount(ScanjobsList, {
      global: {
        stubs: testStubs
      }
    })

    const keys = wrapper.vm.headers.map((header) => header.key)
    const dealNumberIndex = keys.indexOf('dealNumber')

    expect(keys.slice(dealNumberIndex, dealNumberIndex + 4)).toEqual([
      'dealNumber',
      'invoice',
      'senderRecipient',
      'name'
    ])
    expect(wrapper.text()).toContain('ТСД')
    expect(wrapper.text()).toContain('Отправитель')
    expect(wrapper.text()).toContain('Получатель')
  })

  it('renders register-derived invoice and sender recipient cells', () => {
    const wrapper = mount(ScanjobsList, {
      global: {
        stubs: testStubs
      }
    })

    expect(wrapper.text()).toContain('AWB INV-001')
    expect(wrapper.text()).toContain('от 03.06.2026')
    expect(wrapper.text()).toContain('Отправитель ООО')
    expect(wrapper.text()).toContain('Получатель полное')
  })

  it('triggers list reload when pagination changes', async () => {
    const wrapper = mount(ScanjobsList, {
      global: {
        stubs: testStubs
      }
    })

    await wrapper.vm.$nextTick()
    triggerLoadMock.mockClear()
    mockScanjobsPage.value = 2
    await wrapper.vm.$nextTick()

    expect(triggerLoadMock).toHaveBeenCalled()
    mockScanjobsPage.value = 1
  })

  it('clears visible alert from close button', async () => {
    mockAlert.value = { type: 'alert-danger', message: 'Ошибка' }
    const wrapper = mount(ScanjobsList, {
      global: {
        stubs: testStubs
      }
    })

    await wrapper.find('.close').trigger('click')

    expect(clearAlertFn).toHaveBeenCalled()
  })
  it('handles search input', async () => {
    const wrapper = mount(ScanjobsList, {
      global: {
        stubs: testStubs
      }
    })

    await wrapper.vm.$nextTick()
    await new Promise((resolve) => setTimeout(resolve, 0))

    const searchInput = wrapper.find('input')
    await searchInput.setValue('Сканирование')

    expect(searchInput.element.value).toBe('Сканирование')
    expect(wrapper.vm.localSearch).toBe('Сканирование')
  })

  it('updates table pagination and sort model bindings', async () => {
    const wrapper = mount(ScanjobsList, {
      global: {
        stubs: testStubs
      }
    })

    const table = wrapper.findComponent({ name: 'v-data-table-server' })
    await table.vm.$emit('update:itemsPerPage', 25)
    await table.vm.$emit('update:page', 3)
    await table.vm.$emit('update:sortBy', [{ key: 'senderRecipient', order: 'asc' }])

    expect(mockScanjobsPerPage.value).toBe(25)
    expect(mockScanjobsPage.value).toBe(3)
    expect(mockScanjobsSortBy.value).toEqual([{ key: 'senderRecipient', order: 'asc' }])
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

  it('routes to scanjob monitor with scanjob id', async () => {
    const wrapper = mount(ScanjobsList, {
      global: {
        stubs: testStubs
      }
    })

    wrapper.vm.openScanjobMonitor({ id: 7, registerId: 22 })

    expect(mockPush).toHaveBeenCalledWith('/scanjobs/7/monitor')
  })


  it('routes to scanjob edit with scanjob id', async () => {
    const wrapper = mount(ScanjobsList, {
      global: {
        stubs: testStubs
      }
    })

    wrapper.vm.openEditDialog({ id: 7 })

    expect(mockPush).toHaveBeenCalledWith('/scanjob/edit/7')
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


  it('does not delete while another action is running', async () => {
    const wrapper = mount(ScanjobsList, {
      global: {
        stubs: testStubs
      }
    })

    wrapper.vm.runningAction = true
    await wrapper.vm.deleteScanjob({ id: 1, name: 'Сканирование приемки' })

    expect(confirmMock).not.toHaveBeenCalled()
    expect(deleteScanjobFn).not.toHaveBeenCalled()
  })

  it('shows conflict error when delete fails with 409', async () => {
    deleteScanjobFn.mockRejectedValueOnce(new Error('409 Conflict'))
    const wrapper = mount(ScanjobsList, {
      global: {
        stubs: testStubs
      }
    })

    await wrapper.vm.deleteScanjob({ id: 1, name: 'Сканирование приемки' })

    expect(errorFn).toHaveBeenCalledWith('Нельзя удалить задание на сканирование, у которого есть связанные записи')
  })

  it('shows generic error when delete fails without conflict', async () => {
    deleteScanjobFn.mockRejectedValueOnce(new Error('Server error'))
    const wrapper = mount(ScanjobsList, {
      global: {
        stubs: testStubs
      }
    })

    await wrapper.vm.deleteScanjob({ id: 1, name: 'Сканирование приемки' })

    expect(errorFn).toHaveBeenCalledWith('Ошибка при удалении задания на сканирование')
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

  it('stops live monitor on unmount and swallows stop errors', async () => {
    stopScanJobsListMonitorFn.mockRejectedValueOnce(new Error('Stop failed'))

    const wrapper = mount(ScanjobsList, {
      global: {
        stubs: testStubs
      }
    })

    await wrapper.vm.$nextTick()
    expect(() => wrapper.unmount()).not.toThrow()
    expect(stopScanJobsListMonitorFn).toHaveBeenCalledTimes(1)
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

      expect(confirmMock).toHaveBeenCalled()
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

      expect(confirmMock).toHaveBeenCalled()
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

      expect(confirmMock).toHaveBeenCalled()
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

      expect(confirmMock).toHaveBeenCalled()
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

      expect(confirmMock).not.toHaveBeenCalled()
      expect(finishScanjobFn).not.toHaveBeenCalled()
    })

    it('does not finish when confirmation is declined', async () => {
      confirmMock.mockResolvedValueOnce(false)

      const wrapper = mount(ScanjobsList, {
        global: {
          stubs: testStubs
        }
      })

      const scanjob = { id: 1, name: 'Сканирование приемки' }
      await wrapper.vm.finishScanjob(scanjob)

      expect(confirmMock).toHaveBeenCalled()
      expect(finishScanjobFn).not.toHaveBeenCalled()
    })
  })

  describe('pauseScanjob', () => {
    it('calls pause function and reloads list on success', async () => {
      pauseScanjobFn.mockResolvedValue(true)
      getAllScanjobs.mockResolvedValue()

      const wrapper = mount(ScanjobsList, {
        global: {
          stubs: testStubs
        }
      })

      const scanjob = { id: 1, name: 'Сканирование приемки' }
      await wrapper.vm.pauseScanjob(scanjob)

      expect(pauseScanjobFn).toHaveBeenCalledWith(1)
      expect(getAllScanjobs).toHaveBeenCalled()
    })

    it('shows error message on 403 Forbidden', async () => {
      pauseScanjobFn.mockRejectedValue(new Error('403 Forbidden'))

      const wrapper = mount(ScanjobsList, {
        global: {
          stubs: testStubs
        }
      })

      const scanjob = { id: 1, name: 'Сканирование приемки' }
      await wrapper.vm.pauseScanjob(scanjob)

      expect(pauseScanjobFn).toHaveBeenCalledWith(1)
      expect(errorFn).toHaveBeenCalledWith('Нет прав для приостановки сканирования')
    })

    it('shows error message on 404 Not Found', async () => {
      pauseScanjobFn.mockRejectedValue(new Error('404 Not Found'))

      const wrapper = mount(ScanjobsList, {
        global: {
          stubs: testStubs
        }
      })

      const scanjob = { id: 1, name: 'Сканирование приемки' }
      await wrapper.vm.pauseScanjob(scanjob)

      expect(pauseScanjobFn).toHaveBeenCalledWith(1)
      expect(errorFn).toHaveBeenCalledWith('Задание на сканирование не найдено')
    })

    it('shows generic error message on other errors', async () => {
      pauseScanjobFn.mockRejectedValue(new Error('Server error'))

      const wrapper = mount(ScanjobsList, {
        global: {
          stubs: testStubs
        }
      })

      const scanjob = { id: 1, name: 'Сканирование приемки' }
      await wrapper.vm.pauseScanjob(scanjob)

      expect(pauseScanjobFn).toHaveBeenCalledWith(1)
      expect(errorFn).toHaveBeenCalledWith('Ошибка при приостановке сканирования')
    })

    it('does not pause if runningAction is true', async () => {
      const wrapper = mount(ScanjobsList, {
        global: {
          stubs: testStubs
        }
      })

      // Set runningAction to true
      wrapper.vm.runningAction = true

      const scanjob = { id: 1, name: 'Сканирование приемки' }
      await wrapper.vm.pauseScanjob(scanjob)

      expect(pauseScanjobFn).not.toHaveBeenCalled()
    })
  })
})
