const manualScanApi = vi.hoisted(() => ({
  getInProgress: vi.fn().mockResolvedValue([]), getById: vi.fn(), scanParcel: vi.fn(),
  getAll: vi.fn(), updateItems: vi.fn()
}))
const manualScanConfirm = vi.hoisted(() => vi.fn().mockResolvedValue(true))
vi.mock('@/composables/useAppConfirm.js', () => ({ useAppConfirm: () => manualScanConfirm }))
import { setActivePinia, createPinia } from 'pinia'
/* @vitest-environment jsdom */
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks UI application

import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { vuetifyStubs, resolveAll } from './helpers/test-utils.js'
import { scanjobCheckStatusProjectionKind } from '@/helpers/scanjob.check-status.helpers.js'
import { OP_MODE_WAREHOUSE } from '@/helpers/op.mode.js'

let WbrNParcelsWhList

const loadParcels = vi.fn().mockResolvedValue()
const openParcelEdit = vi.fn()
const startParcelExtIdMonitor = vi.fn().mockResolvedValue()
const stopParcelExtIdMonitor = vi.fn().mockResolvedValue()
const setDefect = vi.fn().mockResolvedValue(true)
const clearDefect = vi.fn().mockResolvedValue(true)
const clearExtId = vi.fn().mockResolvedValue(true)
const applyExtIdChange = vi.fn()
const triggerLoad = vi.fn()
const stopFilterSync = vi.fn()
let parcelEditAccessOptions = null

const mockItems = ref([])
const mockLoading = ref(false)
const mockError = ref(null)
const mockTotalCount = ref(1)
const mockAlert = ref(null)

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
const editCellDisabled = ref(false)

const registerItem = {
  id: 9,
  dealNumber: 'WBRN-WH',
  registerType: 2097154,
  realWeightKg: 10,
  totalWeightKgToRelease: 20
}
const getRegisterById = vi.fn().mockResolvedValue()
const ensureRegisterOpsLoaded = vi.fn().mockResolvedValue()
const ensureStatusesLoaded = vi.fn().mockResolvedValue()
const ensureWarehouseOpsLoaded = vi.fn().mockResolvedValue()
const alertError = vi.fn()
const alertDismiss = vi.fn()
const warehouseOps = ref({
  zones: [
    { value: 1, name: 'Не задана' },
    { value: 2, name: 'Зона 2' }
  ]
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

vi.mock('@/router', () => ({
  default: {
    push: vi.fn(),
    replace: vi.fn(),
    currentRoute: {
      value: {
        fullPath:
          '/registers/9/parcels?mode=modeWarehouse&boxId=17&boxCode=BOX-17&returnUrl=/registers/9/boxes'
      }
    }
  }
}))

vi.mock('@/helpers/parcels.list.helpers.js', async () => {
  const actual = await vi.importActual('@/helpers/parcels.list.helpers.js')
  return {
    ...actual,
    loadParcels
  }
})

vi.mock('@/composables/useDebouncedFilterSync.js', () => ({
  useDebouncedFilterSync: () => ({
    triggerLoad,
    stop: stopFilterSync
  })
}))

vi.mock('@/composables/useParcelEditAccess.js', () => ({
  useParcelEditAccess: (options) => {
    parcelEditAccessOptions = options
    return {
      isParcelEditCellDisabled: editCellDisabled,
      parcelEditCellClass: (baseClass = '') =>
        `${baseClass} ${editCellDisabled.value ? '' : 'clickable-cell'}`.trim(),
      openParcelEdit
    }
  }
}))

vi.mock('@/helpers/parcel.defect.helpers.js', () => ({
  canSetParcelDefect: (item) => !item?.setDefectBlocked,
  canClearParcelDefect: (item) =>
    item?.checkStatusProjection?.kind === scanjobCheckStatusProjectionKind.Defect,
  getSetParcelDefectErrorMessage: (error) => error?.message || 'set defect failed',
  getClearParcelDefectErrorMessage: (error) => error?.message || 'clear defect failed'
}))

vi.mock('@/helpers/parcel.ext-id.helpers.js', () => ({
  canClearParcelExtId: (item, authStore) =>
    Boolean((authStore.isAdmin?.value ?? authStore.isAdmin) && item?.extId),
  getClearParcelExtIdErrorMessage: (error) => error?.message || 'clear ext id failed'
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
  useScanjobsStore: () => ({ ops: { constants: { inProgressStatus: 15, boxOnlyType: 20, parcelScanSource: 10 } }, ensureOpsLoaded: vi.fn().mockResolvedValue(true), getScanJobLabel: job => `#${job.id}`, createScanJobsListChannel: () => ({ start: vi.fn().mockResolvedValue(true), stop: vi.fn().mockResolvedValue(true) }),
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
    ensureLoaded: ensureStatusesLoaded,
    parcelStatuses: [
      { id: 7, title: 'В работе' },
      { id: 8, title: 'Брак' }
    ],
    getStatusTitle: vi.fn((id) => `Status ${id}`)
  })
}))

vi.mock('@/stores/registers.store.js', () => ({
  useRegistersStore: () => ({
    item: registerItem,
    getById: getRegisterById,
    ensureOpsLoaded: ensureRegisterOpsLoaded,
    getTransportationDocument: vi.fn(() => 'CMR')
  })
}))

vi.mock('@/stores/warehouses.store.js', () => ({
  useWarehousesStore: () => ({
    ops: warehouseOps,
    ensureOpsLoaded: ensureWarehouseOpsLoaded
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
    isAdmin
  })
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => ({
    get alert() {
      return mockAlert.value
    },
    error: alertError,
    dismiss: alertDismiss
  })
}))

const baseParcel = {
  id: 22,
  shk: 'SHK-WH-1',
  article: '29817781',
  productName: 'WbrN warehouse product',
  sticker: 'Sticker-N-1',
  stickerCode: 'ST-N-1',
  boxNumber: 'BOX-N-1',
  extId: 'KGT-77',
  weightKg: 2.4,
  weightCorrectionEligible: true,
  quantity: 3,
  statusId: 7,
  checkStatusProjection: {
    kind: scanjobCheckStatusProjectionKind.NotChecked,
    title: 'Не проверено',
    restrictionReason: null
  },
  zone: 2
}

const globalStubs = {
  ...vuetifyStubs,
  'v-data-table-server': {
    name: 'v-data-table-server',
    props: [
      'items',
      'headers',
      'loading',
      'itemsLength',
      'itemsPerPage',
      'page',
      'sortBy',
      'itemsPerPageOptions'
    ],
    emits: ['update:itemsPerPage', 'update:page', 'update:sortBy', 'click:row', 'contextmenu:row'],
    template: `
      <div class="v-data-table-stub" data-testid="v-data-table">
        <button data-testid="table-update-wh-items-per-page" @click="$emit('update:itemsPerPage', 100)"></button>
        <button data-testid="table-update-wh-page" @click="$emit('update:page', 4)"></button>
        <button data-testid="table-update-wh-sort" @click="$emit('update:sortBy', [{ key: 'shk', order: 'asc' }])"></button>
        <div v-for="header in headers" :key="header.key" class="v-data-table-header-cell">
          <slot :name="'header.' + header.key" :column="header">{{ header.title }}</slot>
        </div>
        <div v-for="(item, i) in items" :key="i" class="v-data-table-row">
          <div v-for="header in headers" :key="header.key" class="v-data-table-cell">
            <slot :name="'item.' + header.key" :item="item">{{ item[header.key] }}</slot>
          </div>
        </div>
      </div>
    `
  },
  RegisterHeadingWithStats: {
    props: ['heading'],
    template: '<div data-testid="register-heading">{{ heading }}</div>'
  },
  RegisterWhHeaderActionBar: {
    name: 'RegisterWhHeaderActionBar',
    props: ['register', 'zones', 'loading', 'disabled'],
    emits: ['bulk-change-parcel-status', 'close'],
    template:
      '<div data-testid="register-wh-header-action-bar" :data-register-type="register?.registerType" :data-zones="zones?.length"><button type="button" data-testid="open-parcel-status-bulk-dialog" @click="$emit(\'bulk-change-parcel-status\')"></button><button type="button" data-testid="close-list" @click="$emit(\'close\')"></button></div>'
  },
  ParcelWhFilterSelectors: {
    props: ['numberLabel', 'zoneOptions', 'statusOptions', 'checkStatusProjectionOptions'],
    emits: [
      'update:parcelsWhStatus',
      'update:parcelsWhCheckStatusProjection',
      'update:parcelsWhZone',
      'update:localParcelNumberSearch',
      'update:localBoxNumberSearch',
      'update:localStickerSearch',
      'update:localProductNameSearch',
      'clear-box-scope'
    ],
    template: `
      <div data-testid="parcel-wh-filter-selectors" :data-number-label="numberLabel" :data-zone-options="zoneOptions.map(o => o.title).join(',')" :data-status-count="statusOptions.length" :data-check-count="checkStatusProjectionOptions.length">
        <button data-testid="update-wh-status" @click="$emit('update:parcelsWhStatus', 7)"></button>
        <button data-testid="update-wh-check" @click="$emit('update:parcelsWhCheckStatusProjection', 20)"></button>
        <button data-testid="update-wh-zone" @click="$emit('update:parcelsWhZone', 2)"></button>
        <button data-testid="update-wh-number" @click="$emit('update:localParcelNumberSearch', 'SHK-WH')"></button>
        <button data-testid="update-wh-box" @click="$emit('update:localBoxNumberSearch', 'BOX')"></button>
        <button data-testid="update-wh-sticker" @click="$emit('update:localStickerSearch', 'Sticker')"></button>
        <button data-testid="update-wh-product" @click="$emit('update:localProductNameSearch', 'boots')"></button>
        <button data-testid="clear-box-scope" @click="$emit('clear-box-scope')"></button>
      </div>
    `
  },
  ParcelStatusBulkChangeDialog: {
    props: ['show', 'registerId', 'register', 'statusOptions', 'disabled'],
    emits: ['updated', 'update:show'],
    template:
      '<div data-testid="parcel-status-bulk-dialog" :data-show="String(show)" :data-register-id="registerId" :data-register-type="register?.registerType"><button type="button" data-testid="parcel-status-bulk-dialog-updated" @click="$emit(\'updated\')"></button><button type="button" data-testid="parcel-status-bulk-dialog-close" @click="$emit(\'update:show\', false)"></button></div>'
  },
  ClickableCell: {
    props: ['item', 'displayValue', 'cellClass', 'disabled', 'title'],
    emits: ['click'],
    template:
      '<button type="button" :class="cellClass" :aria-disabled="disabled ? \'true\' : undefined" :title="title || displayValue" @click="$emit(\'click\', item)"><slot>{{ displayValue }}</slot></button>'
  },
  CorrectedWeightDisplay: {
    props: ['weight', 'useCorrection'],
    template:
      '<span class="corrected-weight-display">{{ Number(weight).toFixed(3) }}<span v-if="useCorrection"> corrected</span></span>'
  },
  ActionButton: {
    props: ['item', 'disabled', 'tooltipText'],
    emits: ['click'],
    template:
      '<button type="button" v-bind="$attrs" :disabled="disabled" @click="$emit(\'click\', item)">{{ tooltipText }}</button>'
  },
  PaginationFooter: {
    emits: ['update:itemsPerPage', 'update:page'],
    template:
      '<div data-testid="pagination-footer"><button data-testid="update-wh-items-per-page" @click="$emit(\'update:itemsPerPage\', 50)"></button><button data-testid="update-wh-page" @click="$emit(\'update:page\', 3)"></button></div>'
  }
}

function resetState() {
  vi.clearAllMocks()
  mockItems.value = [{ ...baseParcel }]
  mockLoading.value = false
  mockError.value = null
  mockTotalCount.value = 1
  mockAlert.value = null
  parcelsWhPerPage.value = 10
  parcelsWhSortBy.value = []
  parcelsWhPage.value = 1
  parcelsWhStatus.value = null
  parcelsWhCheckStatusProjection.value = null
  parcelsWhZone.value = null
  parcelsWhNumber.value = ''
  parcelsWhBoxNumber.value = ''
  parcelsWhSticker.value = ''
  parcelsWhProductName.value = ''
  isAdmin.value = false
  editCellDisabled.value = false
  parcelEditAccessOptions = null
  ensureRegisterOpsLoaded.mockResolvedValue()
  ensureStatusesLoaded.mockResolvedValue()
  ensureWarehouseOpsLoaded.mockResolvedValue()
  loadParcels.mockResolvedValue(true)
  setDefect.mockResolvedValue(true)
  clearDefect.mockResolvedValue(true)
  clearExtId.mockResolvedValue(true)
  startParcelExtIdMonitor.mockResolvedValue()
  stopParcelExtIdMonitor.mockResolvedValue()
  warehouseOps.value = {
    zones: [
      { value: 1, name: 'Не задана' },
      { value: 2, name: 'Зона 2' }
    ]
  }
}

describe('WbrNParcels_WhList.vue', () => {
  beforeAll(async () => {
    WbrNParcelsWhList = (await import('@/lists/WbrNParcels_WhList.vue')).default
  }, 30000)

  beforeEach(() => { setActivePinia(createPinia()); resetState() })

  it('initializes and loads directly inside an exact box scope', async () => {
    parcelsWhPage.value = 3
    parcelsWhBoxNumber.value = 'STALE-PREFIX'
    const wrapper = mount(WbrNParcelsWhList, {
      props: { registerId: 9, boxId: 17, boxCode: 'BOX-17' },
      global: { stubs: globalStubs }
    })
    await resolveAll()

    expect(parcelsWhPage.value).toBe(1)
    expect(parcelsWhBoxNumber.value).toBe('')
    expect(wrapper.vm.localBoxNumberSearch).toBe('')
    await wrapper.get('[data-testid="parcel-status-bulk-dialog-updated"]').trigger('click')
    await resolveAll()
    expect(loadParcels).toHaveBeenCalledWith(
      9,
      expect.any(Object),
      expect.any(Object),
      expect.any(Object),
      { showMarkedByPartner: true, boxId: 17 }
    )

    wrapper.unmount()
  })

  it('renders warehouse fallback branches for alerts, zones, tooltips, and paging', async () => {
    mockAlert.value = {
      id: 29,
      severity: 'warning',
      message: 'WbrN warehouse alert'
    }
    mockTotalCount.value = 5000
    parcelsWhPage.value = 250
    warehouseOps.value = {
      zones: [{ value: 1, name: 'Не задана' }, { value: 2, name: 'Зона 2' }, { value: 3 }]
    }
    mockItems.value = [
      {
        ...baseParcel,
        zone: 99,
        checkStatusProjection: {
          kind: scanjobCheckStatusProjectionKind.Restriction,
          title: 'Запрет',
          restrictionReason: 'country mismatch'
        }
      }
    ]

    const wrapper = mount(WbrNParcelsWhList, {
      props: { registerId: 9 },
      global: { stubs: globalStubs }
    })

    expect(wrapper.text()).toContain('WbrN warehouse alert')
    expect(wrapper.text()).toContain('country mismatch')
    expect(wrapper.text()).toContain('Запрет')
    expect(wrapper.vm.pageOptions.length).toBeLessThan(200)
    expect(wrapper.vm.pageOptions.map((option) => option.value)).toEqual(
      expect.arrayContaining([1, 10, 240, 250, 260, 491, 500])
    )
    expect(
      wrapper.get('[data-testid="parcel-wh-filter-selectors"]').attributes('data-zone-options')
    ).toContain('3')

    await wrapper.get('.alert .close').trigger('click')
    expect(alertDismiss).toHaveBeenCalledWith(29)

    // Filter synchronization is stubbed here, so explicitly complete the initial load.
    await wrapper.vm.loadParcelsWrapper()
    mockTotalCount.value = 1
    await resolveAll()
    expect(parcelsWhPage.value).toBe(1)
  })

  it('loads dependencies, starts KGT monitor, and applies only matching register updates', async () => {
    mount(WbrNParcelsWhList, {
      props: { registerId: 9 },
      global: { stubs: globalStubs }
    })

    await resolveAll()

    expect(ensureRegisterOpsLoaded).toHaveBeenCalled()
    expect(ensureStatusesLoaded).toHaveBeenCalled()
    expect(ensureWarehouseOpsLoaded).toHaveBeenCalled()
    expect(getRegisterById).toHaveBeenCalledWith(9)
    expect(startParcelExtIdMonitor).toHaveBeenCalledWith(
      9,
      expect.objectContaining({ onChanged: expect.any(Function) })
    )

    const onChanged = startParcelExtIdMonitor.mock.calls[0][1].onChanged
    onChanged({ registerId: 9, parcelId: 22, extId: 'KGT-78' })
    onChanged({ registerId: 10, parcelId: 22, extId: 'KGT-79' })
    onChanged({ parcelId: 22, extId: 'KGT-80' })

    expect(applyExtIdChange).toHaveBeenCalledTimes(2)
    expect(applyExtIdChange).toHaveBeenCalledWith({ registerId: 9, parcelId: 22, extId: 'KGT-78' })
    expect(applyExtIdChange).toHaveBeenCalledWith({ parcelId: 22, extId: 'KGT-80' })
  })

  it('opens parcel edit from clickable warehouse cells and emits close', async () => {
    const wrapper = mount(WbrNParcelsWhList, {
      props: { registerId: 9 },
      global: { stubs: globalStubs }
    })
    await resolveAll()

    await wrapper.get('.warehouse-product-name-cell').trigger('click')
    expect(openParcelEdit).toHaveBeenCalledWith(
      expect.objectContaining({ id: 22, shk: 'SHK-WH-1' })
    )

    editCellDisabled.value = true
    await wrapper.vm.$nextTick()
    const disabledCell = wrapper.get('.warehouse-product-name-cell')
    expect(disabledCell.attributes('aria-disabled')).toBe('true')

    await wrapper.get('[data-testid="close-list"]').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('runs WbrN warehouse row actions and reports refresh errors', async () => {
    isAdmin.value = true
    const wrapper = mount(WbrNParcelsWhList, {
      props: { registerId: 9 },
      global: { stubs: globalStubs }
    })
    await resolveAll()

    loadParcels.mockClear()
    await wrapper.get('[data-testid="set-defect-action"]').trigger('click')
    await resolveAll()
    expect(setDefect).toHaveBeenCalledWith(22)
    expect(loadParcels).toHaveBeenCalledWith(
      9,
      expect.any(Object),
      expect.any(Object),
      expect.any(Object),
      { showMarkedByPartner: true }
    )

    mockItems.value = [
      {
        ...baseParcel,
        checkStatusProjection: {
          kind: scanjobCheckStatusProjectionKind.Defect,
          title: 'Брак',
          restrictionReason: 'manual'
        }
      }
    ]
    await wrapper.vm.$nextTick()
    loadParcels.mockRejectedValueOnce(new Error('refresh failed'))
    await wrapper.get('[data-testid="clear-defect-action"]').trigger('click')
    await resolveAll()
    expect(clearDefect).toHaveBeenCalledWith(22)
    expect(alertError).toHaveBeenCalledWith('Ошибка при обновлении данных')

    loadParcels.mockResolvedValue()
    await wrapper.get('[data-testid="clear-ext-id-action"]').trigger('click')
    await resolveAll()
    expect(clearExtId).toHaveBeenCalledWith(22)
  })

  it('wires warehouse filters, pagination, bulk visibility, and edit access query params', async () => {
    const wrapper = mount(WbrNParcelsWhList, {
      props: { registerId: 9 },
      global: { stubs: globalStubs }
    })

    expect(parcelEditAccessOptions.getQueryParams()).toEqual({
      registerId: 9,
      mode: OP_MODE_WAREHOUSE
    })
    wrapper.vm.localBoxNumberSearch = 'STALE-PREFIX'
    parcelsWhBoxNumber.value = 'STALE-PREFIX'
    parcelsWhPage.value = 3
    await wrapper.setProps({ boxId: 17, boxCode: 'BOX-17' })
    expect(parcelEditAccessOptions.getQueryParams()).toEqual({
      registerId: 9,
      mode: OP_MODE_WAREHOUSE,
      boxId: 17,
      returnUrl:
        '/registers/9/parcels?mode=modeWarehouse&boxId=17&boxCode=BOX-17&returnUrl=/registers/9/boxes'
    })
    expect(parcelsWhPage.value).toBe(1)
    expect(wrapper.vm.localBoxNumberSearch).toBe('')
    expect(parcelsWhBoxNumber.value).toBe('')
    expect(parcelEditAccessOptions.disabled.value).toBe(true)
    await resolveAll()
    expect(parcelEditAccessOptions.disabled.value).toBe(false)

    triggerLoad.mockClear()
    await wrapper.setProps({ boxId: 18, boxCode: 'BOX-18' })
    expect(triggerLoad).toHaveBeenCalled()

    await wrapper.get('[data-testid="clear-box-scope"]').trigger('click')
    expect(wrapper.emitted('clear-box-scope')).toHaveLength(1)

    await wrapper.setProps({ boxId: null, boxCode: null })
    expect(triggerLoad).toHaveBeenCalled()

    await wrapper.get('[data-testid="update-wh-status"]').trigger('click')
    await wrapper.get('[data-testid="update-wh-check"]').trigger('click')
    await wrapper.get('[data-testid="update-wh-zone"]').trigger('click')
    await wrapper.get('[data-testid="update-wh-number"]').trigger('click')
    await wrapper.get('[data-testid="update-wh-box"]').trigger('click')
    await wrapper.get('[data-testid="update-wh-sticker"]').trigger('click')
    await wrapper.get('[data-testid="update-wh-product"]').trigger('click')
    await wrapper.get('[data-testid="table-update-wh-items-per-page"]').trigger('click')
    await wrapper.get('[data-testid="table-update-wh-page"]').trigger('click')
    await wrapper.get('[data-testid="table-update-wh-sort"]').trigger('click')
    await wrapper.get('[data-testid="update-wh-items-per-page"]').trigger('click')
    await wrapper.get('[data-testid="update-wh-page"]').trigger('click')

    expect(parcelsWhStatus.value).toBe(7)
    expect(parcelsWhCheckStatusProjection.value).toBe(20)
    expect(parcelsWhZone.value).toBe(2)
    expect(wrapper.vm.localParcelNumberSearch).toBe('SHK-WH')
    expect(wrapper.vm.localBoxNumberSearch).toBe('BOX')
    expect(wrapper.vm.localStickerSearch).toBe('Sticker')
    expect(wrapper.vm.localProductNameSearch).toBe('boots')
    expect(parcelsWhPerPage.value).toBe(50)
    expect(parcelsWhPage.value).toBe(3)
    expect(parcelsWhSortBy.value).toEqual([{ key: 'shk', order: 'asc' }])

    await wrapper.get('[data-testid="open-parcel-status-bulk-dialog"]').trigger('click')
    expect(wrapper.get('[data-testid="parcel-status-bulk-dialog"]').attributes('data-show')).toBe(
      'true'
    )
    await wrapper.get('[data-testid="parcel-status-bulk-dialog-close"]').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.get('[data-testid="parcel-status-bulk-dialog"]').attributes('data-show')).toBe(
      'false'
    )
  })

  it('reports action and initialization errors', async () => {
    setDefect.mockRejectedValueOnce(new Error('defect denied'))
    const wrapper = mount(WbrNParcelsWhList, {
      props: { registerId: 9 },
      global: { stubs: globalStubs }
    })
    await resolveAll()

    await wrapper.get('[data-testid="set-defect-action"]').trigger('click')
    await resolveAll()
    expect(alertError).toHaveBeenCalledWith('defect denied')

    alertError.mockClear()
    ensureWarehouseOpsLoaded.mockRejectedValueOnce(new Error('warehouse failed'))
    mount(WbrNParcelsWhList, {
      props: { registerId: 9 },
      global: { stubs: globalStubs }
    })
    await resolveAll()

    expect(alertError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'warehouse failed' }),
      expect.objectContaining({
        fallback: 'Ошибка при инициализации компонента'
      })
    )
  })

  for (const boxId of [null, 17]) {
    it('manually scans the selected parcel in ' + (boxId ? 'box scope' : 'whole-party scope'), async () => {
      isAdmin.value = true
      const activeJob = { id: 7, registerId: 9, status: 15, type: 30, operation: 10 }
      manualScanApi.getInProgress.mockResolvedValue([activeJob])
      manualScanApi.getById.mockResolvedValue(activeJob)
      manualScanApi.scanParcel.mockResolvedValue({ parcelCount: 1, scanSource: 10 })
      manualScanApi.getAll.mockResolvedValue({ items: [] })
      const wrapper = mount(WbrNParcelsWhList, { props: { registerId: 9, boxId }, global: { stubs: globalStubs } })
      await resolveAll()
      wrapper.vm.selection.selectAllCurrentPage()
      const parcelId = mockItems.value[0].id
      await wrapper.vm.manualScan.run(wrapper.vm.selection.selectedItems.value, 7, true)
      await resolveAll()
      expect(manualScanApi.scanParcel).toHaveBeenCalledWith(7, parcelId)
      expect(manualScanApi.getAll).toHaveBeenCalledWith(9, { showMarkedByPartner: true, boxId, updateStore: false })
      expect(manualScanApi.updateItems).toHaveBeenCalledWith({ items: [] })
      expect(wrapper.vm.selection.selectedItems.value).toEqual([])
      wrapper.unmount()
    })
  }

  it('retains the selected parcel when a manual scan rejects', async () => {
    isAdmin.value = true
    const activeJob = { id: 7, registerId: 9, status: 15, type: 30, operation: 10 }
    manualScanApi.getInProgress.mockResolvedValue([activeJob])
    manualScanApi.getById.mockResolvedValue(activeJob)
    manualScanApi.scanParcel.mockRejectedValueOnce(Object.assign(new Error('Сбой сканирования'), { status: 400 }))
    manualScanApi.getAll.mockResolvedValue({ items: mockItems.value })
    const wrapper = mount(WbrNParcelsWhList, { props: { registerId: 9 }, global: { stubs: globalStubs } })
    await resolveAll()
    wrapper.vm.selection.selectAllCurrentPage()
    await wrapper.vm.manualScan.run(wrapper.vm.selection.selectedItems.value, 7, true)
    await resolveAll()
    expect(wrapper.vm.manualScan.pendingBatch.value.parcels).toHaveLength(mockItems.value.length)
    expect(wrapper.vm.selection.selectedItems.value).toHaveLength(mockItems.value.length)
    expect(alertError).toHaveBeenCalledWith(expect.stringContaining('Сбой сканирования'))
    wrapper.unmount()
  })

  it.each([null, 17])('confirms the right-click selection and locks the header during scanning (box: %s)', async boxId => {
    isAdmin.value = true
    mockItems.value = [{ id: 10, statusId: 7 }, { id: 11, statusId: 7 }]
    const job = { id: 7, registerId: 9, status: 15, type: 30, operation: 10 }
    manualScanApi.getInProgress.mockResolvedValue([job])
    manualScanApi.getAll.mockResolvedValue({ items: mockItems.value })
    manualScanApi.scanParcel.mockResolvedValue({ parcelCount: 1, scanSource: 10 })
    let accept, finish
    manualScanConfirm.mockImplementationOnce(() => new Promise(resolve => { accept = resolve }))
    manualScanApi.scanParcel.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    const wrapper = mount(WbrNParcelsWhList, { props: { registerId: 9, boxId }, global: { stubs: globalStubs } })
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
    expect(manualScanConfirm.mock.lastCall[0].content).toContain('Количество: 2')
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
