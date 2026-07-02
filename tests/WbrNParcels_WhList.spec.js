/* @vitest-environment jsdom */
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks UI application

import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { vuetifyStubs, resolveAll } from './helpers/test-utils.js'
import { scanjobCheckStatusProjectionKind } from '@/helpers/scanjob.check-status.helpers.js'

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
const alertClear = vi.fn()
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
    replace: vi.fn()
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
      parcelEditCellClass: (baseClass = '') => `${baseClass} ${editCellDisabled.value ? '' : 'clickable-cell'}`.trim(),
      openParcelEdit
    }
  }
}))

vi.mock('@/helpers/parcel.defect.helpers.js', () => ({
  canSetParcelDefect: (item) => !item?.setDefectBlocked,
  canClearParcelDefect: (item) => item?.checkStatusProjection?.kind === scanjobCheckStatusProjectionKind.Defect,
  getSetParcelDefectErrorMessage: (error) => error?.message || 'set defect failed',
  getClearParcelDefectErrorMessage: (error) => error?.message || 'clear defect failed'
}))

vi.mock('@/helpers/parcel.ext-id.helpers.js', () => ({
  canClearParcelExtId: (item, authStore) => Boolean((authStore.isAdmin?.value ?? authStore.isAdmin) && item?.extId),
  getClearParcelExtIdErrorMessage: (error) => error?.message || 'clear ext id failed'
}))

vi.mock('@/stores/parcels.store.js', () => ({
  useParcelsStore: () => ({
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
  useScanjobsStore: () => ({
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
    getStatusTitle: vi.fn(id => `Status ${id}`)
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
    alert: mockAlert,
    error: alertError,
    clear: alertClear
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
    props: ['items', 'headers', 'loading', 'itemsLength', 'itemsPerPage', 'page', 'sortBy', 'itemsPerPageOptions'],
    emits: ['update:itemsPerPage', 'update:page', 'update:sortBy'],
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
    props: ['register', 'zones'],
    emits: ['bulk-change-parcel-status', 'close'],
    template: '<div data-testid="register-wh-header-action-bar" :data-register-type="register?.registerType" :data-zones="zones?.length"><button type="button" data-testid="open-parcel-status-bulk-dialog" @click="$emit(\'bulk-change-parcel-status\')"></button><button type="button" data-testid="close-list" @click="$emit(\'close\')"></button></div>'
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
      'update:localProductNameSearch'
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
      </div>
    `
  },
  ParcelStatusBulkChangeDialog: {
    props: ['show', 'registerId', 'register', 'statusOptions', 'disabled'],
    emits: ['updated', 'update:show'],
    template: '<div data-testid="parcel-status-bulk-dialog" :data-show="String(show)" :data-register-id="registerId" :data-register-type="register?.registerType"><button type="button" data-testid="parcel-status-bulk-dialog-updated" @click="$emit(\'updated\')"></button><button type="button" data-testid="parcel-status-bulk-dialog-close" @click="$emit(\'update:show\', false)"></button></div>'
  },
  ClickableCell: {
    props: ['item', 'displayValue', 'cellClass', 'disabled', 'title'],
    emits: ['click'],
    template: '<button type="button" :class="cellClass" :aria-disabled="disabled ? \'true\' : undefined" :title="title || displayValue" @click="$emit(\'click\', item)"><slot>{{ displayValue }}</slot></button>'
  },
  CorrectedWeightDisplay: {
    props: ['weight', 'useCorrection'],
    template: '<span class="corrected-weight-display">{{ Number(weight).toFixed(3) }}<span v-if="useCorrection"> corrected</span></span>'
  },
  ActionButton: {
    props: ['item', 'disabled', 'tooltipText'],
    emits: ['click'],
    template: '<button type="button" v-bind="$attrs" :disabled="disabled" @click="$emit(\'click\', item)">{{ tooltipText }}</button>'
  },
  PaginationFooter: {
    emits: ['update:itemsPerPage', 'update:page'],
    template: '<div data-testid="pagination-footer"><button data-testid="update-wh-items-per-page" @click="$emit(\'update:itemsPerPage\', 50)"></button><button data-testid="update-wh-page" @click="$emit(\'update:page\', 3)"></button></div>'
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
  loadParcels.mockResolvedValue()
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

  beforeEach(resetState)

  it('defines WbrN warehouse columns with article and without hidden fields', () => {
    const wrapper = mount(WbrNParcelsWhList, {
      props: { registerId: 9 },
      global: { stubs: globalStubs }
    })

    const headerKeys = wrapper.vm.headers.map(header => header.key)
    expect(headerKeys).toEqual([
      'actions',
      'id',
      'checkStatusProjection',
      'zone',
      'statusId',
      'extId',
      'shk',
      'article',
      'sticker',
      'stickerCode',
      'boxNumber',
      'productName',
      'weightKg',
      'quantity'
    ])
    expect(headerKeys).not.toContain('countryCode')
    expect(headerKeys).not.toContain('paymentAmount')
    expect(headerKeys).not.toContain('paymentCurrency')
  })

  it('renders WbrN warehouse data and uses SHK as the warehouse number label', () => {
    const wrapper = mount(WbrNParcelsWhList, {
      props: { registerId: 9 },
      global: { stubs: globalStubs }
    })

    const text = wrapper.text()
    expect(text).toContain('SHK-WH-1')
    expect(text).toContain('29817781')
    expect(text).toContain('WbrN warehouse product')
    expect(text).toContain('Sticker-N-1')
    expect(text).toContain('ST-N-1')
    expect(text).toContain('BOX-N-1')
    expect(text).toContain('KGT-77')
    expect(text).toContain('Status 7')
    expect(text).toContain('Зона 2')

    const filters = wrapper.get('[data-testid="parcel-wh-filter-selectors"]')
    expect(filters.attributes('data-number-label')).toBe('ШК')
    expect(filters.attributes('data-zone-options')).toContain('Не задана')
    expect(filters.attributes('data-zone-options')).toContain('Зона 2')
  })

  it('renders warehouse fallback branches for alerts, zones, tooltips, and paging', async () => {
    mockAlert.value = { type: 'alert-warning', message: 'WbrN warehouse alert' }
    mockTotalCount.value = 5000
    parcelsWhPage.value = 250
    warehouseOps.value = {
      zones: [
        { value: 1, name: 'Не задана' },
        { value: 2, name: 'Зона 2' },
        { value: 3 }
      ]
    }
    mockItems.value = [{
      ...baseParcel,
      zone: 99,
      checkStatusProjection: {
        kind: scanjobCheckStatusProjectionKind.Restriction,
        title: 'Запрет',
        restrictionReason: 'country mismatch'
      }
    }]

    const wrapper = mount(WbrNParcelsWhList, {
      props: { registerId: 9 },
      global: { stubs: globalStubs }
    })

    expect(wrapper.text()).toContain('WbrN warehouse alert')
    expect(wrapper.text()).toContain('country mismatch')
    expect(wrapper.text()).toContain('Запрет')
    expect(wrapper.vm.pageOptions.length).toBeLessThan(200)
    expect(wrapper.vm.pageOptions.map(option => option.value)).toEqual(
      expect.arrayContaining([1, 10, 240, 250, 260, 491, 500])
    )
    expect(wrapper.get('[data-testid="parcel-wh-filter-selectors"]').attributes('data-zone-options')).toContain('3')

    await wrapper.get('.alert .close').trigger('click')
    expect(alertClear).toHaveBeenCalled()

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
    expect(startParcelExtIdMonitor).toHaveBeenCalledWith(9, expect.objectContaining({ onChanged: expect.any(Function) }))

    const onChanged = startParcelExtIdMonitor.mock.calls[0][1].onChanged
    onChanged({ registerId: 9, parcelId: 22, extId: 'KGT-78' })
    onChanged({ registerId: 10, parcelId: 22, extId: 'KGT-79' })
    onChanged({ parcelId: 22, extId: 'KGT-80' })

    expect(applyExtIdChange).toHaveBeenCalledTimes(2)
    expect(applyExtIdChange).toHaveBeenCalledWith({ registerId: 9, parcelId: 22, extId: 'KGT-78' })
    expect(applyExtIdChange).toHaveBeenCalledWith({ parcelId: 22, extId: 'KGT-80' })
  })

  it('opens bulk status dialog and reloads warehouse parcels after update', async () => {
    const wrapper = mount(WbrNParcelsWhList, {
      props: { registerId: 9 },
      global: { stubs: globalStubs }
    })
    await resolveAll()

    await wrapper.get('[data-testid="open-parcel-status-bulk-dialog"]').trigger('click')
    expect(wrapper.get('[data-testid="parcel-status-bulk-dialog"]').attributes('data-show')).toBe('true')

    loadParcels.mockClear()
    await wrapper.get('[data-testid="parcel-status-bulk-dialog-updated"]').trigger('click')
    await resolveAll()

    expect(loadParcels).toHaveBeenCalledWith(
      9,
      expect.any(Object),
      expect.any(Object),
      expect.any(Object),
      { showMarkedByPartner: true }
    )
  })

  it('opens parcel edit from clickable warehouse cells and emits close', async () => {
    const wrapper = mount(WbrNParcelsWhList, {
      props: { registerId: 9 },
      global: { stubs: globalStubs }
    })
    await resolveAll()

    await wrapper.get('.warehouse-product-name-cell').trigger('click')
    expect(openParcelEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 22, shk: 'SHK-WH-1' }))

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

    mockItems.value = [{
      ...baseParcel,
      checkStatusProjection: {
        kind: scanjobCheckStatusProjectionKind.Defect,
        title: 'Брак',
        restrictionReason: 'manual'
      }
    }]
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

  it('does not render admin-only KGT clearing and disables blocked row actions', async () => {
    mockItems.value = [{
      ...baseParcel,
      setDefectBlocked: true,
      extId: ''
    }]

    const wrapper = mount(WbrNParcelsWhList, {
      props: { registerId: 9 },
      global: { stubs: globalStubs }
    })
    await resolveAll()

    expect(wrapper.find('[data-testid="clear-ext-id-action"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="set-defect-action"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-testid="clear-defect-action"]').attributes('disabled')).toBeDefined()
  })

  it('wires warehouse filters, pagination, bulk visibility, and edit access query params', async () => {
    const wrapper = mount(WbrNParcelsWhList, {
      props: { registerId: 9 },
      global: { stubs: globalStubs }
    })

    expect(parcelEditAccessOptions.getQueryParams()).toEqual({ registerId: 9 })
    expect(parcelEditAccessOptions.disabled.value).toBe(true)
    await resolveAll()
    expect(parcelEditAccessOptions.disabled.value).toBe(false)

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
    expect(wrapper.get('[data-testid="parcel-status-bulk-dialog"]').attributes('data-show')).toBe('true')
    await wrapper.get('[data-testid="parcel-status-bulk-dialog-close"]').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.get('[data-testid="parcel-status-bulk-dialog"]').attributes('data-show')).toBe('false')
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

    expect(alertError).toHaveBeenCalledWith('Ошибка при инициализации компонента')
  })

  it('stops filter sync and KGT monitor on unmount', async () => {
    const wrapper = mount(WbrNParcelsWhList, {
      props: { registerId: 9 },
      global: { stubs: globalStubs }
    })
    await resolveAll()

    wrapper.unmount()
    await resolveAll()

    expect(stopFilterSync).toHaveBeenCalled()
    expect(stopParcelExtIdMonitor).toHaveBeenCalled()
  })
})
