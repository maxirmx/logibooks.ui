const manualScanApi = vi.hoisted(() => ({
  getInProgress: vi.fn().mockResolvedValue([]), getById: vi.fn(), scanParcel: vi.fn(),
  getAll: vi.fn(), updateItems: vi.fn()
}))
const manualScanConfirm = vi.hoisted(() => vi.fn().mockResolvedValue(true))
vi.mock('@/composables/useAppConfirm.js', () => ({ useAppConfirm: () => manualScanConfirm }))
import { setActivePinia, createPinia } from 'pinia'
/* @vitest-environment jsdom */
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks UI application

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import WbrParcelsWhList from '@/lists/WbrParcels_WhList.vue'
import { vuetifyStubs, resolveAll } from './helpers/test-utils.js'
import { scanjobCheckStatusProjectionKind } from '@/helpers/scanjob.check-status.helpers.js'
import { WBR_COMPANY_ID } from '@/helpers/company.constants.js'
import { OP_MODE_WAREHOUSE } from '@/helpers/op.mode.js'

const {
  loadParcels,
  navigateToEditParcel,
  setDefect,
  clearDefect,
  clearExtId,
  applyExtIdChange,
  startParcelExtIdMonitor,
  stopParcelExtIdMonitor
} = vi.hoisted(() => ({
  loadParcels: vi.fn().mockResolvedValue(),
  navigateToEditParcel: vi.fn(),
  setDefect: vi.fn().mockResolvedValue(true),
  clearDefect: vi.fn().mockResolvedValue(true),
  clearExtId: vi.fn().mockResolvedValue(true),
  applyExtIdChange: vi.fn(),
  startParcelExtIdMonitor: vi.fn().mockResolvedValue(),
  stopParcelExtIdMonitor: vi.fn().mockResolvedValue()
}))

const mockItems = ref([
  {
    id: 1,
    shk: 'SHK-1',
    productName: 'Very long WBR product name that must remain on one line',
    sticker: 'Sticker-1',
    stickerCode: 'STK-1',
    boxNumber: 'BOX-1',
    extId: '77',
    weightKg: 2.4,
    quantity: 3,
    statusId: 7,
    checkStatusProjection: {
      kind: scanjobCheckStatusProjectionKind.NotChecked,
      title: 'Не проверено',
      restrictionReason: null
    },
    zone: 1
  }
])
const mockLoading = ref(false)
const mockError = ref(null)
const mockTotalCount = ref(1)

const parcelsWhPerPage = ref(10)
const parcelsWhSortBy = ref([])
const parcelsWhPage = ref(1)
const parcelsWhStatus = ref(null)
const parcelsWhCheckStatusProjection = ref(null)
const parcelsWhZone = ref(null)
const parcelsWhNumber = ref('')
const parcelsWhBoxNumber = ref('')
const parcelsWhSticker = ref('')
const parcelsWhProductName = ref('')
const isAdmin = ref(false)
const isWhManager = ref(false)
const isShiftLead = ref(false)
const hasLogistRole = ref(true)

const registerItem = ref({ id: 1, dealNumber: 'D-1', registerType: WBR_COMPANY_ID })

const getById = vi.fn().mockResolvedValue()

const alertRef = ref(null)
const alertError = vi.fn()
const alertClear = vi.fn()

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

vi.mock('@/helpers/parcels.list.helpers.js', () => {
  const unrefValue = (value) =>
    value && typeof value === 'object' && 'value' in value ? value.value : value

  return {
    loadParcels,
    navigateToEditParcel,
    hasParcelEditRouteAccess: (authStore) => Boolean(unrefValue(authStore?.hasLogistRole)),
    buildParcelEditCellClass: (canAccess, baseClass = '') =>
      [String(baseClass || '').trim(), unrefValue(canAccess) ? 'clickable-cell' : '']
        .filter(Boolean)
        .join(' ')
  }
})

vi.mock('@/router', () => ({
  default: {
    push: vi.fn(),
    currentRoute: {
      value: {
        fullPath:
          '/registers/1/parcels?mode=modeWarehouse&boxId=17&boxCode=BOX-17&returnUrl=/registers/1/boxes'
      }
    }
  }
}))

vi.mock('@/stores/parcels.store.js', () => ({
  useParcelsStore: () => ({
    getAll: manualScanApi.getAll, updateItems: manualScanApi.updateItems,
    items: mockItems,
    loading: mockLoading,
    error: mockError,
    totalCount: mockTotalCount,
    setDefect,
    clearDefect,
    clearExtId,
    applyExtIdChange
  })
}))

vi.mock('@/stores/scanjobs.store.js', () => ({
  useScanjobsStore: () => ({ ops: { constants: { inProgressStatus: 15, boxOnlyType: 20, parcelScanSource: 10, lookupOperation: 30 } }, ensureOpsLoaded: vi.fn().mockResolvedValue(true), getScanJobLabel: job => `#${job.id}`, createScanJobsListChannel: () => ({ start: vi.fn().mockResolvedValue(true), stop: vi.fn().mockResolvedValue(true) }),
    getInProgress: manualScanApi.getInProgress,
    getById: manualScanApi.getById,
    scanParcel: manualScanApi.scanParcel,
    startScanJobsListMonitor: vi.fn().mockResolvedValue(true),
    stopScanJobsListMonitor: vi.fn().mockResolvedValue(true),
    startParcelExtIdMonitor,
    stopParcelExtIdMonitor
  })
}))

vi.mock('@/stores/parcel.statuses.store.js', () => ({
  useParcelStatusesStore: () => ({
    ensureLoaded: vi.fn().mockResolvedValue(),
    parcelStatuses: [],
    getStatusTitle: vi.fn((id) => `Status ${id}`)
  })
}))

vi.mock('@/stores/registers.store.js', () => ({
  useRegistersStore: () => ({
    item: registerItem,
    ops: { customsProcedures: [], transportationTypes: [] },
    getById,
    ensureOpsLoaded: vi.fn().mockResolvedValue(),
    getTransportationDocument: vi.fn(() => 'Документ')
  })
}))

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => ({
    parcels_wh_per_page: parcelsWhPerPage,
    parcels_wh_sort_by: parcelsWhSortBy,
    parcels_wh_page: parcelsWhPage,
    parcels_wh_status: parcelsWhStatus,
    parcels_wh_check_status_projection: parcelsWhCheckStatusProjection,
    parcels_wh_zone: parcelsWhZone,
    parcels_wh_number: parcelsWhNumber,
    parcels_wh_box_number: parcelsWhBoxNumber,
    parcels_wh_sticker: parcelsWhSticker,
    parcels_wh_product_name: parcelsWhProductName,
    isAdmin,
    isWhManager,
    isShiftLead,
    hasLogistRole
  })
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => ({
    alert: alertRef,
    error: alertError,
    clear: alertClear
  })
}))

vi.mock('@/stores/warehouses.store.js', () => ({
  useWarehousesStore: () => ({
    ops: ref({ zones: [{ value: 1, name: 'Зона 1' }] }),
    ensureOpsLoaded: vi.fn().mockResolvedValue()
  })
}))

const globalStubs = {
  ...vuetifyStubs,
  RegisterHeadingWithStats: {
    template: '<div data-testid="register-heading"></div>'
  },
  PaginationFooter: {
    name: 'PaginationFooter',
    template: '<div data-testid="pagination-footer"></div>'
  },
  RegisterWhHeaderActionBar: {
    name: 'RegisterWhHeaderActionBar',
    props: ['register', 'loading', 'disabled'],
    emits: ['bulk-change-parcel-status', 'close'],
    template:
      '<div data-testid="register-wh-header-action-bar" :data-register-type="register?.registerType"><button type="button" data-testid="open-parcel-status-bulk-dialog" @click="$emit(\'bulk-change-parcel-status\')"></button></div>'
  },
  ParcelStatusBulkChangeDialog: {
    props: ['show', 'registerId', 'register', 'statusOptions', 'disabled'],
    emits: ['update:show', 'updated'],
    template:
      '<div data-testid="parcel-status-bulk-dialog" :data-show="String(show)" :data-register-id="registerId" :data-register-type="register?.value?.registerType ?? register?.registerType"><button type="button" data-testid="parcel-status-bulk-dialog-updated" @click="$emit(\'updated\')"></button></div>'
  }
}

describe('WbrParcels_WhList.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockItems.value = [
      {
        id: 1,
        shk: 'SHK-1',
        productName: 'Very long WBR product name that must remain on one line',
        sticker: 'Sticker-1',
        stickerCode: 'STK-1',
        boxNumber: 'BOX-1',
        extId: '77',
        weightKg: 2.4,
        quantity: 3,
        statusId: 7,
        checkStatusProjection: {
          kind: scanjobCheckStatusProjectionKind.NotChecked,
          title: 'Не проверено',
          restrictionReason: null
        },
        zone: 1
      }
    ]
    isAdmin.value = false
    isWhManager.value = false
    isShiftLead.value = false
    hasLogistRole.value = true
    mockLoading.value = false
    parcelsWhStatus.value = null
    parcelsWhCheckStatusProjection.value = null
    parcelsWhZone.value = null
    parcelsWhNumber.value = ''
    parcelsWhBoxNumber.value = ''
    parcelsWhSticker.value = ''
    parcelsWhProductName.value = ''
    registerItem.value = { id: 1, dealNumber: 'D-1', registerType: WBR_COMPANY_ID }
    navigateToEditParcel.mockClear()
  })

  it('normalizes an initial exact box scope before the first request', async () => {
    parcelsWhPage.value = 3
    parcelsWhBoxNumber.value = 'STALE-PREFIX'
    let firstRequestState
    loadParcels.mockImplementationOnce(async (...args) => {
      firstRequestState = {
        page: parcelsWhPage.value,
        boxNumber: parcelsWhBoxNumber.value,
        options: args[4]
      }
    })

    const wrapper = mount(WbrParcelsWhList, {
      props: { registerId: 1, boxId: 17, boxCode: 'BOX-17' },
      global: { stubs: globalStubs }
    })
    await resolveAll()

    expect(firstRequestState).toEqual({
      page: 1,
      boxNumber: '',
      options: { showMarkedByPartner: true, boxId: 17 }
    })

    wrapper.unmount()
  })

  it('opens parcel status bulk dialog and reloads warehouse parcels after update', async () => {
    const wrapper = mount(WbrParcelsWhList, {
      props: { registerId: 1 },
      global: { stubs: globalStubs }
    })

    await resolveAll()

    await wrapper.get('[data-testid="open-parcel-status-bulk-dialog"]').trigger('click')
    await wrapper.vm.$nextTick()

    const dialog = wrapper.get('[data-testid="parcel-status-bulk-dialog"]')
    expect(dialog.attributes('data-show')).toBe('true')
    expect(dialog.attributes('data-register-id')).toBe('1')
    expect(dialog.attributes('data-register-type')).toBe(String(WBR_COMPANY_ID))

    loadParcels.mockClear()
    await wrapper.get('[data-testid="parcel-status-bulk-dialog-updated"]').trigger('click')
    await resolveAll()

    expect(loadParcels).toHaveBeenCalledWith(
      1,
      expect.any(Object),
      expect.objectContaining({ value: true }),
      expect.any(Object),
      { showMarkedByPartner: true }
    )
  })

  it('opens parcel edit from warehouse table cells', async () => {
    const wrapper = mount(WbrParcelsWhList, {
      props: { registerId: 1, boxId: 17, boxCode: 'BOX-17' },
      global: { stubs: globalStubs }
    })

    await resolveAll()

    const productNameCell = wrapper.get('.warehouse-product-name-cell')
    expect(productNameCell.classes()).toContain('clickable-cell')
    expect(productNameCell.attributes('aria-disabled')).toBeUndefined()

    await productNameCell.trigger('click')

    expect(navigateToEditParcel).toHaveBeenCalledWith(
      expect.any(Object),
      mockItems.value[0],
      'Редактирование посылки',
      {
        registerId: 1,
        mode: OP_MODE_WAREHOUSE,
        boxId: 17,
        returnUrl:
          '/registers/1/parcels?mode=modeWarehouse&boxId=17&boxCode=BOX-17&returnUrl=/registers/1/boxes'
      }
    )
    expect(loadParcels).toHaveBeenCalledWith(
      1,
      expect.any(Object),
      expect.objectContaining({ value: true }),
      expect.any(Object),
      { showMarkedByPartner: true, boxId: 17 }
    )
  })

  it('reloads and forwards clear when an exact box scope is applied', async () => {
    parcelsWhPage.value = 1
    parcelsWhBoxNumber.value = 'STALE-PREFIX'
    const wrapper = mount(WbrParcelsWhList, {
      props: { registerId: 1 },
      global: { stubs: globalStubs }
    })

    await resolveAll()
    await wrapper.get('.warehouse-product-name-cell').trigger('click')
    expect(navigateToEditParcel).toHaveBeenCalledWith(
      expect.any(Object),
      mockItems.value[0],
      'Редактирование посылки',
      { registerId: 1, mode: OP_MODE_WAREHOUSE }
    )

    parcelsWhPage.value = 2
    await wrapper.vm.$nextTick()
    loadParcels.mockClear()

    await wrapper.setProps({ boxId: 17, boxCode: 'BOX-17' })
    await resolveAll()

    expect(parcelsWhPage.value).toBe(1)
    expect(wrapper.vm.localBoxNumberSearch).toBe('')
    expect(parcelsWhBoxNumber.value).toBe('')
    expect(loadParcels).toHaveBeenCalledWith(
      1,
      expect.any(Object),
      expect.objectContaining({ value: true }),
      expect.any(Object),
      { showMarkedByPartner: true, boxId: 17 }
    )

    wrapper.findComponent({ name: 'ParcelWhFilterSelectors' }).vm.$emit('clear-box-scope')
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('clear-box-scope')).toHaveLength(1)

    await wrapper.setProps({ boxId: null, boxCode: null })
    await resolveAll()

    wrapper.unmount()
  })

  it('shows and clears KGT number only for admins', async () => {
    isAdmin.value = true
    const wrapper = mount(WbrParcelsWhList, {
      props: { registerId: 1 },
      global: { stubs: globalStubs }
    })

    await resolveAll()
    loadParcels.mockClear()

    const clearExtIdAction = wrapper.get('[data-testid="clear-ext-id-action"]')
    expect(clearExtIdAction.attributes('aria-label')).toBe('Очистить номер КГТ')
    expect(clearExtIdAction.attributes('title')).toBe('Очистить номер КГТ')
    expect(clearExtIdAction.attributes('disabled')).toBeUndefined()

    await clearExtIdAction.trigger('click')
    await resolveAll()

    expect(clearExtId).toHaveBeenCalledWith(1)
    expect(loadParcels).toHaveBeenCalledWith(
      1,
      expect.any(Object),
      expect.objectContaining({ value: true }),
      expect.any(Object),
      { showMarkedByPartner: true }
    )
  })

  it('subscribes to KGT number changes and patches matching register events', async () => {
    mount(WbrParcelsWhList, {
      props: { registerId: 1 },
      global: { stubs: globalStubs }
    })

    await resolveAll()

    expect(startParcelExtIdMonitor).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ onChanged: expect.any(Function) })
    )

    const onChanged = startParcelExtIdMonitor.mock.calls[0][1].onChanged
    const matchingChange = { registerId: 1, parcelId: 1, extId: '78', revision: 2 }
    const otherRegisterChange = { registerId: 2, parcelId: 1, extId: '79', revision: 3 }

    onChanged(matchingChange)
    onChanged(otherRegisterChange)

    expect(applyExtIdChange).toHaveBeenCalledTimes(1)
    expect(applyExtIdChange).toHaveBeenCalledWith(matchingChange)
  })

  it('clears defect from row action and reloads parcels for shift lead', async () => {
    isShiftLead.value = true
    mockItems.value = [
      {
        ...mockItems.value[0],
        checkStatusProjection: {
          kind: scanjobCheckStatusProjectionKind.Defect,
          title: 'Брак',
          restrictionReason: 'Брак'
        }
      }
    ]
    const wrapper = mount(WbrParcelsWhList, {
      props: { registerId: 1 },
      global: { stubs: globalStubs }
    })

    await resolveAll()
    loadParcels.mockClear()

    const clearDefectAction = wrapper.get('[data-testid="clear-defect-action"]')
    expect(clearDefectAction.attributes('aria-label')).toBe('Отменить брак')
    expect(clearDefectAction.attributes('title')).toBe('Отменить брак')

    await clearDefectAction.trigger('click')
    await resolveAll()

    expect(clearDefect).toHaveBeenCalledWith(1)
    expect(loadParcels).toHaveBeenCalledWith(
      1,
      expect.any(Object),
      expect.objectContaining({ value: true }),
      expect.any(Object),
      { showMarkedByPartner: true }
    )
  })

  it('shows reload error message when refresh fails after setting defect', async () => {
    isWhManager.value = true
    const wrapper = mount(WbrParcelsWhList, {
      props: { registerId: 1 },
      global: { stubs: globalStubs }
    })

    await resolveAll()
    loadParcels.mockRejectedValueOnce(new Error('refresh failed'))

    await wrapper.get('[data-testid="set-defect-action"]').trigger('click')
    await resolveAll()

    expect(setDefect).toHaveBeenCalledWith(1)
    expect(alertError).toHaveBeenCalledWith('Ошибка при обновлении данных')
  })

  it('disables set defect action for duplicate and partner-marked projection statuses', async () => {
    isWhManager.value = true
    mockItems.value = [
      {
        ...mockItems.value[0],
        checkStatusProjection: { title: 'Дубликат' }
      },
      {
        ...mockItems.value[0],
        id: 2,
        checkStatusProjection: { title: 'Исключено партнёром' }
      }
    ]
    const wrapper = mount(WbrParcelsWhList, {
      props: { registerId: 1 },
      global: { stubs: globalStubs }
    })

    await resolveAll()

    const setDefectButtons = wrapper.findAll('[data-testid="set-defect-action"]')
    expect(setDefectButtons).toHaveLength(2)
    expect(setDefectButtons[0].attributes('disabled')).toBeDefined()
    expect(setDefectButtons[1].attributes('disabled')).toBeDefined()
  })
  for (const boxId of [null, 17]) {
    it('manually scans the selected parcel in ' + (boxId ? 'box scope' : 'whole-party scope'), async () => {
      isAdmin.value = true
      const activeJob = { id: 7, registerId: 1, status: 15, type: 30, operation: 10 }
      manualScanApi.getInProgress.mockResolvedValue([activeJob])
      manualScanApi.getById.mockResolvedValue(activeJob)
      manualScanApi.scanParcel.mockResolvedValue({ parcelCount: 1, scanSource: 10 })
      manualScanApi.getAll.mockResolvedValue({ items: [] })
      const wrapper = mount(WbrParcelsWhList, { props: { registerId: 1, boxId }, global: { stubs: globalStubs } })
      await resolveAll()
      wrapper.vm.selection.selectAllCurrentPage()
      const parcelId = mockItems.value[0].id
      await wrapper.vm.manualScan.run(wrapper.vm.selection.selectedItems.value, 7, true)
      await resolveAll()
      expect(manualScanApi.scanParcel).toHaveBeenCalledWith(7, parcelId)
      expect(manualScanApi.getAll).toHaveBeenCalledWith(1, { showMarkedByPartner: true, boxId, updateStore: false })
      expect(manualScanApi.updateItems).toHaveBeenCalledWith({ items: [] })
      expect(wrapper.vm.selection.selectedItems.value).toEqual([])
      wrapper.unmount()
    })
  }

  it('retains the selected parcel when a manual scan rejects', async () => {
    isAdmin.value = true
    const activeJob = { id: 7, registerId: 1, status: 15, type: 30, operation: 10 }
    manualScanApi.getInProgress.mockResolvedValue([activeJob])
    manualScanApi.getById.mockResolvedValue(activeJob)
    manualScanApi.scanParcel.mockRejectedValueOnce(Object.assign(new Error('Сбой сканирования'), { status: 400 }))
    manualScanApi.getAll.mockResolvedValue({ items: mockItems.value })
    const wrapper = mount(WbrParcelsWhList, { props: { registerId: 1 }, global: { stubs: globalStubs } })
    await resolveAll()
    wrapper.vm.selection.selectAllCurrentPage()
    await wrapper.vm.manualScan.run(wrapper.vm.selection.selectedItems.value, 7, true)
    await resolveAll()
    expect(wrapper.vm.manualScan.pendingBatch.value.parcels).toHaveLength(mockItems.value.length)
    expect(wrapper.vm.selection.selectedItems.value).toHaveLength(mockItems.value.length)
    expect(alertError).toHaveBeenCalledWith(expect.stringContaining('Сбой сканирования'))
    wrapper.unmount()
  })

  it('retains unfinished scan IDs when refresh automatically clamps a filtered page', async () => {
    isAdmin.value = true
    parcelsWhPerPage.value = 20
    parcelsWhPage.value = 2
    mockTotalCount.value = 21
    mockItems.value = [{ id: 1, statusId: 7 }, { id: 2, statusId: 7 }]
    loadParcels.mockResolvedValue(true)
    const job = { id: 7, registerId: 1, status: 15, type: 30, operation: 10 }
    manualScanApi.getInProgress.mockResolvedValue([job])
    manualScanApi.getById.mockResolvedValue(job)
    manualScanApi.scanParcel.mockResolvedValueOnce({ parcelCount: 1, scanSource: 10 })
      .mockRejectedValueOnce(Object.assign(new Error('Сбой сканирования'), { status: 400 }))
    manualScanApi.getAll.mockImplementationOnce(async () => { mockTotalCount.value = 20; return { items: [mockItems.value[1]] } })
    const wrapper = mount(WbrParcelsWhList, { props: { registerId: 1 }, global: { stubs: globalStubs } })
    await resolveAll()
    expect(parcelsWhPage.value).toBe(2)
    await wrapper.vm.manualScan.run(mockItems.value, 7, true)
    await resolveAll()
    expect(parcelsWhPage.value).toBe(1)
    expect(wrapper.vm.manualScan.pendingBatch.value.parcels.map(parcel => parcel.id)).toEqual([2])
    wrapper.findComponent({ name: 'PaginationFooter' }).vm.$emit('update:page', 1)
    await resolveAll()
    expect(wrapper.vm.manualScan.pendingBatch.value).toBeNull()
    wrapper.unmount()
  })

  it.each([null, 17])('confirms the right-click selection and locks the header during scanning (box: %s)', async boxId => {
    isAdmin.value = true
    mockItems.value = [{ id: 10, statusId: 7 }, { id: 11, statusId: 7 }]
    const job = { id: 7, registerId: 1, status: 15, type: 30, operation: 10 }
    manualScanApi.getInProgress.mockResolvedValue([job])
    manualScanApi.getAll.mockResolvedValue({ items: mockItems.value })
    manualScanApi.scanParcel.mockResolvedValue({ parcelCount: 1, scanSource: 10 })
    let accept, finish
    manualScanConfirm.mockImplementationOnce(() => new Promise(resolve => { accept = resolve }))
    manualScanApi.scanParcel.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    const wrapper = mount(WbrParcelsWhList, { props: { registerId: 1, boxId }, global: { stubs: globalStubs } })
    await resolveAll()
    const table = wrapper.findComponent({ name: 'v-data-table-server' })
    table.vm.$emit('click:row', { target: null }, { item: mockItems.value[0] })
    table.vm.$emit('click:row', { target: null, ctrlKey: true }, { item: mockItems.value[1] })
    table.vm.$emit('contextmenu:row', { preventDefault: vi.fn() }, { item: mockItems.value[0] })
    await resolveAll()
    const header = wrapper.findComponent({ name: 'RegisterWhHeaderActionBar' })
    expect(header.props('loading')).toBe(false)
    expect(header.props('disabled')).toBe(true)
    expect(manualScanApi.scanParcel).not.toHaveBeenCalled()
    expect(manualScanConfirm.mock.lastCall[0].contentComponentProps.count).toBe(2)
    expect(wrapper.find('[data-testid="parcel-scan-selection"]').exists()).toBe(false)
    accept(true)
    await resolveAll()
    expect(header.props('loading')).toBe(true)
    expect(wrapper.findAll('button[data-testid="manual-parcel-scan"]').every(button => button.element.disabled)).toBe(true)
    finish({ parcelCount: 1, scanSource: 10 })
    await resolveAll()
    expect(manualScanApi.scanParcel.mock.calls).toEqual([[7, 10], [7, 11]])
    expect(header.props('loading')).toBe(false)
    expect(header.props('disabled')).toBe(false)
    wrapper.unmount()
  })

})
