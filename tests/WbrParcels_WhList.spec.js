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
import { CheckStatusCode } from '@/helpers/check.status.code.js'

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

const registerItem = ref({ dealNumber: 'D-1' })

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

vi.mock('@/helpers/parcels.list.helpers.js', () => ({
  loadParcels,
  navigateToEditParcel
}))

vi.mock('@/router', () => ({
  default: { push: vi.fn() }
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
    ensureLoaded: vi.fn().mockResolvedValue(),
    parcelStatuses: [],
    getStatusTitle: vi.fn(id => `Status ${id}`)
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
    isShiftLead
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
    template: '<div data-testid="pagination-footer"></div>'
  },
  RegisterWhHeaderActionBar: {
    template: '<div data-testid="register-wh-header-action-bar"></div>'
  }
}

describe('WbrParcels_WhList.vue', () => {
  beforeEach(() => {
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
    parcelsWhStatus.value = null
    parcelsWhCheckStatusProjection.value = null
    parcelsWhZone.value = null
    parcelsWhNumber.value = ''
    parcelsWhBoxNumber.value = ''
    parcelsWhSticker.value = ''
    parcelsWhProductName.value = ''
    navigateToEditParcel.mockClear()
  })

  it('loads warehouse parcels with showMarkedByPartner enabled', async () => {
    mount(WbrParcelsWhList, {
      props: { registerId: 1 },
      global: { stubs: globalStubs }
    })

    await resolveAll()

    expect(loadParcels).toHaveBeenCalledWith(
      1,
      expect.any(Object),
      expect.objectContaining({ value: true }),
      expect.any(Object),
      { showMarkedByPartner: true }
    )
  })

  it('renders the required parcel fields in the table', async () => {
    const wrapper = mount(WbrParcelsWhList, {
      props: { registerId: 1 },
      global: { stubs: globalStubs }
    })

    const text = wrapper.text()
    expect(text).toContain('SHK-1')
    expect(text).toContain('Very long WBR product name that must remain on one line')
    expect(text).toContain('Sticker-1')
    expect(text).toContain('STK-1')
    expect(text).toContain('BOX-1')
    expect(text).toContain('77')
    expect(text).toContain('3')
    expect(text).toContain('Status 7')
    expect(text).toContain('Не проверено')
    expect(text).toContain('Зона 1')
  })

  it('defines headers only for the warehouse parcel columns', () => {
    const wrapper = mount(WbrParcelsWhList, {
      props: { registerId: 1 },
      global: { stubs: globalStubs }
    })

    const headerKeys = wrapper.vm.headers.map((header) => header.key)
    expect(headerKeys).toEqual([
      'actions',
      'id',
      'checkStatusProjection',
      'zone',
      'statusId',
      'extId',
      'shk',
      'sticker',
      'stickerCode',
      'boxNumber',
      'productName',
      'weightKg',
      'quantity'
    ])
    expect(wrapper.vm.headers.find((header) => header.key === 'checkStatusProjection').sortable).toBe(true)
    expect(wrapper.vm.headers.find((header) => header.key === 'extId').sortable).not.toBe(false)
  })

  it('renders product name in a non-wrapping truncated cell', () => {
    const wrapper = mount(WbrParcelsWhList, {
      props: { registerId: 1 },
      global: { stubs: globalStubs }
    })

    const productName = wrapper.get('.warehouse-product-name-cell')
    expect(productName.text()).toBe('Very long WBR product name that must remain on one line')
    expect(productName.attributes('title')).toBe('Very long WBR product name that must remain on one line')
  })

  it('opens parcel edit from warehouse table cells', async () => {
    const wrapper = mount(WbrParcelsWhList, {
      props: { registerId: 1 },
      global: { stubs: globalStubs }
    })

    await wrapper.get('.warehouse-product-name-cell').trigger('click')

    expect(navigateToEditParcel).toHaveBeenCalledWith(
      expect.any(Object),
      mockItems.value[0],
      'Редактирование посылки',
      { registerId: 1 }
    )
  })

  it('sets defect from row action and reloads parcels for warehouse manager', async () => {
    isWhManager.value = true
    const wrapper = mount(WbrParcelsWhList, {
      props: { registerId: 1 },
      global: { stubs: globalStubs }
    })

    await resolveAll()
    loadParcels.mockClear()

    const setDefectAction = wrapper.get('[data-testid="set-defect-action"]')
    expect(setDefectAction.attributes('aria-label')).toBe('Брак')
    expect(setDefectAction.attributes('title')).toBe('Брак')

    await setDefectAction.trigger('click')
    await resolveAll()

    expect(setDefect).toHaveBeenCalledWith(1)
    expect(loadParcels).toHaveBeenCalledWith(
      1,
      expect.any(Object),
      expect.objectContaining({ value: true }),
      expect.any(Object),
      { showMarkedByPartner: true }
    )
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

  it('does not render KGT clear action for non-admins', () => {
    const wrapper = mount(WbrParcelsWhList, {
      props: { registerId: 1 },
      global: { stubs: globalStubs }
    })

    expect(wrapper.find('[data-testid="clear-ext-id-action"]').exists()).toBe(false)
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
    mockItems.value = [{
      ...mockItems.value[0],
      checkStatusProjection: {
        kind: scanjobCheckStatusProjectionKind.Defect,
        title: 'Брак',
        restrictionReason: 'Брак'
      }
    }]
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

  it('disables clear defect action for Duplicate2 status that is not defect', async () => {
    isShiftLead.value = true
    mockItems.value = [{
      ...mockItems.value[0],
      checkStatus: CheckStatusCode.Duplicate2.value,
      checkStatusProjection: {
        kind: scanjobCheckStatusProjectionKind.Checked,
        title: 'Проверено',
        restrictionReason: null
      }
    }]
    const wrapper = mount(WbrParcelsWhList, {
      props: { registerId: 1 },
      global: { stubs: globalStubs }
    })

    await resolveAll()

    const clearDefectAction = wrapper.get('[data-testid="clear-defect-action"]')
    expect(clearDefectAction.attributes('disabled')).toBeDefined()

    await clearDefectAction.trigger('click')
    await resolveAll()

    expect(clearDefect).not.toHaveBeenCalled()
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
})
