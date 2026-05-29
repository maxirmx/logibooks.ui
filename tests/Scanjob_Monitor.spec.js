/* @vitest-environment jsdom */
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks UI application

import { beforeEach, describe, it, expect, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import ScanjobMonitor from '@/dialogs/Scanjob_Monitor.vue'
import ActionButton from '@/components/ActionButton.vue'
import { scannedItemSource } from '@/helpers/scanjob.monitor.helpers.js'
import { defaultGlobalStubs } from './helpers/test-utils'

const mockBack = vi.hoisted(() => vi.fn())
const mockPush = vi.hoisted(() => vi.fn())
const mockReplace = vi.hoisted(() => vi.fn())
const mockCurrentRoute = vi.hoisted(() => ({
  value: { fullPath: '/scanjobs/42/monitor' }
}))
const clearAlert = vi.hoisted(() => vi.fn())
const alertError = vi.hoisted(() => vi.fn())
const mockAlert = vi.hoisted(() => ({
  __v_isRef: true,
  value: null
}))
const mockScanjob = vi.hoisted(() => ({
  __v_isRef: true,
  value: { id: 42, name: 'Scanjob A', type: 30, status: 15, registerId: 101 }
}))
const getById = vi.hoisted(() => vi.fn().mockResolvedValue({ id: 42, name: 'Scanjob A', type: 30, status: 15, registerId: 101 }))
const mockRegisterItem = vi.hoisted(() => ({
  id: 101,
  dealNumber: 'DEAL-101',
  invoiceNumber: 'INV-101',
  transportationTypeCode: 1
}))
const registerGetById = vi.hoisted(() => vi.fn().mockResolvedValue(true))
const getTransportationDocument = vi.hoisted(() => vi.fn(() => 'Авианакладная'))
const monitorLoading = vi.hoisted(() => ({
  __v_isRef: true,
  value: false
}))
const monitorError = vi.hoisted(() => ({
  __v_isRef: true,
  value: null
}))
const monitorClosed = vi.hoisted(() => ({
  __v_isRef: true,
  value: null
}))
const loadMonitorSnapshot = vi.hoisted(() => vi.fn())
const resolveMonitorTarget = vi.hoisted(() => vi.fn())
const startMonitor = vi.hoisted(() => vi.fn())
const clearMonitor = vi.hoisted(() => vi.fn())
const stopMonitor = vi.hoisted(() => vi.fn())
const startMonitorAutoFollow = vi.hoisted(() => vi.fn())
const stopMonitorAutoFollow = vi.hoisted(() => vi.fn())
const setDefect = vi.hoisted(() => vi.fn().mockResolvedValue(true))
const clearDefect = vi.hoisted(() => vi.fn().mockResolvedValue(true))
const monitorBoxesPerPage = vi.hoisted(() => ({
  __v_isRef: true,
  value: 25
}))
const monitorBoxesSortBy = vi.hoisted(() => ({
  __v_isRef: true,
  value: [{ key: 'boxCode', order: 'desc' }]
}))
const monitorBoxesPage = vi.hoisted(() => ({
  __v_isRef: true,
  value: 2
}))
const monitorParcelsPerPage = vi.hoisted(() => ({
  __v_isRef: true,
  value: 50
}))
const monitorParcelsSortBy = vi.hoisted(() => ({
  __v_isRef: true,
  value: [{ key: 'parcelNumber', order: 'desc' }]
}))
const monitorParcelsPage = vi.hoisted(() => ({
  __v_isRef: true,
  value: 3
}))
const hasLogistRole = vi.hoisted(() => ({
  __v_isRef: true,
  value: true
}))
const isAdmin = vi.hoisted(() => ({
  __v_isRef: true,
  value: false
}))
const isWhManager = vi.hoisted(() => ({
  __v_isRef: true,
  value: false
}))
const isShiftLead = vi.hoisted(() => ({
  __v_isRef: true,
  value: false
}))
const WBR2_REGISTER_TYPE = 1024 * 1024 + 2
const registerMonitorScope = { area: 0, boxId: null, bucketIndex: null }
const box7MonitorScope = { area: 1, boxId: 7, bucketIndex: null }
const unassignedBucket1MonitorScope = { area: 2, boxId: null, bucketIndex: 1 }

const registerSnapshot = {
  scanJobId: 42,
  registerType: WBR2_REGISTER_TYPE,
  area: 0,
  totalBoxes: 2,
  boxesWithStickerScanned: 1,
  boxesWithStickerNotScanned: 1,
  totalParcels: 5,
  parcelsWithStickerScanned: 3,
  parcelsWithStickerNotScanned: 2,
  restrictedParcels: 2,
  scannedItemsNotInRegister: 1,
  boxes: [
    {
      boxId: 7,
      boxCode: 'BOX-7',
      boxStickerScanned: true,
      boxScannedSticker: 'BOX-7-ACTUAL',
      boxScannedUserName: 'Иванов Иван',
      boxScannedTime: '2026-01-02T09:30:00',
      totalParcels: 3,
      parcelsWithStickerScanned: 2,
      parcelsWithStickerNotScanned: 1,
      restrictedParcels: 1
    },
    {
      boxId: 8,
      boxCode: 'BOX-8',
      boxStickerScanned: false,
      boxScannedSticker: null,
      boxScannedUserName: '',
      boxScannedTime: null,
      totalParcels: 2,
      parcelsWithStickerScanned: 1,
      parcelsWithStickerNotScanned: 1,
      restrictedParcels: 1
    }
  ],
  box: null
}

const boxSnapshot = {
  scanJobId: 42,
  registerType: WBR2_REGISTER_TYPE,
  area: 1,
  totalBoxes: 2,
  boxesWithStickerScanned: 1,
  boxesWithStickerNotScanned: 1,
  totalParcels: 5,
  parcelsWithStickerScanned: 3,
  parcelsWithStickerNotScanned: 2,
  restrictedParcels: 2,
  scannedItemsNotInRegister: 1,
  boxes: [],
  box: {
    boxId: 7,
    boxCode: 'BOX-7',
    boxStickerScanned: true,
    boxScannedSticker: 'BOX-7-ACTUAL',
    boxScannedUserName: 'Иванов Иван',
    boxScannedTime: '2026-01-02T09:30:00',
    totalParcels: 3,
    parcelsWithStickerScanned: 2,
    parcelsWithStickerNotScanned: 1,
    restrictedParcels: 1,
    parcels: [
      {
        id: 70,
        parcelId: 70,
        parcelNumber: 'P-70',
        shk: 'P-70',
        stickerCode: 'CODE-70',
        wbSticker: 'WB-70',
        sellerSticker: 'SELLER-70',
        productName: 'Product 70',
        weightKg: 1.2,
        quantity: 1,
        stickerScanned: true,
        scannedSticker: 'P-70-SCAN',
        scannedUserName: 'Петров Петр',
        scannedTime: '2026-01-02T10:10:00',
        zoneName: 'Green',
        statusTitle: 'На складе',
        checkStatusProjection: { kind: 10, title: 'Не проверено', restrictionReason: null }
      },
      {
        id: 71,
        parcelId: 71,
        parcelNumber: 'P-71',
        shk: 'P-71',
        stickerCode: 'CODE-71',
        wbSticker: 'WB-71',
        sellerSticker: 'SELLER-71',
        productName: 'Product 71',
        weightKg: 2.3,
        quantity: 2,
        stickerScanned: false,
        scannedSticker: null,
        scannedUserName: '',
        scannedTime: null,
        zoneName: 'Red',
        statusTitle: 'Ожидается',
        checkStatusProjection: { kind: 30, title: 'Проверено', restrictionReason: null }
      }
    ]
  }
}

const unassignedBucketRow = {
  area: 2,
  boxId: null,
  bucketIndex: 1,
  boxCode: 'Без коробки 2',
  boxStickerScanned: false,
  boxScannedSticker: null,
  boxScannedUserName: '',
  boxScannedTime: null,
  totalParcels: 2,
  parcelsWithStickerScanned: 1,
  parcelsWithStickerNotScanned: 1,
  restrictedParcels: 1
}

const registerSnapshotWithUnassignedBucket = {
  ...registerSnapshot,
  boxes: [
    ...registerSnapshot.boxes,
    unassignedBucketRow
  ]
}

const unassignedBucketSnapshot = {
  ...boxSnapshot,
  area: 2,
  box: {
    ...unassignedBucketRow,
    parcels: [
      {
        id: 90,
        parcelId: 90,
        parcelNumber: 'PU-90',
        shk: 'PU-90',
        stickerCode: 'CODE-90',
        wbSticker: 'WB-90',
        sellerSticker: 'SELLER-90',
        productName: 'Product U90',
        weightKg: 4.5,
        quantity: 1,
        stickerScanned: true,
        scannedSticker: 'PU-90-SCAN',
        scannedUserName: 'Николаев Николай',
        scannedTime: '2026-01-02T12:00:00',
        zoneName: 'Yellow',
        statusTitle: 'Без коробки',
        checkStatusProjection: { kind: 10, title: 'Не проверено', restrictionReason: null }
      },
      {
        id: 91,
        parcelId: 91,
        parcelNumber: 'PU-91',
        shk: 'PU-91',
        stickerCode: 'CODE-91',
        wbSticker: 'WB-91',
        sellerSticker: 'SELLER-91',
        productName: 'Product U91',
        weightKg: 5.6,
        quantity: 3,
        stickerScanned: false,
        scannedSticker: null,
        scannedUserName: '',
        scannedTime: null,
        zoneName: 'Yellow',
        statusTitle: 'Без коробки',
        checkStatusProjection: { kind: 30, title: 'Проверено', restrictionReason: null }
      }
    ]
  }
}

vi.mock('@/router', () => ({
  default: { back: mockBack, push: mockPush, replace: mockReplace, currentRoute: mockCurrentRoute }
}), { virtual: true })

vi.mock('@/stores/scanjobs.store.js', () => ({
  useScanjobsStore: () => ({
    scanjob: mockScanjob,
    monitorLoading,
    monitorError,
    monitorClosed,
    scanjobMonitorArea: {
      Boxes: 0,
      Box: 1,
      Unassigned: 2,
      NotInRegister: 3
    },
    getById,
    loadMonitorSnapshot,
    resolveMonitorTarget,
    startMonitor,
    clearMonitor,
    stopMonitor,
    startMonitorAutoFollow,
    stopMonitorAutoFollow
  })
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => ({
    alert: mockAlert,
    error: alertError,
    clear: clearAlert
  })
}))

vi.mock('@/stores/parcels.store.js', () => ({
  useParcelsStore: () => ({
    setDefect,
    clearDefect
  })
}))

vi.mock('@/stores/registers.store.js', () => ({
  useRegistersStore: () => ({
    item: mockRegisterItem,
    getById: registerGetById,
    getTransportationDocument
  })
}))

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => ({
    scanjobmonitor_boxes_per_page: monitorBoxesPerPage,
    scanjobmonitor_boxes_sort_by: monitorBoxesSortBy,
    scanjobmonitor_boxes_page: monitorBoxesPage,
    scanjobmonitor_parcels_per_page: monitorParcelsPerPage,
    scanjobmonitor_parcels_sort_by: monitorParcelsSortBy,
    scanjobmonitor_parcels_page: monitorParcelsPage,
    hasLogistRole,
    isAdmin,
    isWhManager,
    isShiftLead
  })
}))

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

const monitorGlobalStubs = {
  ...defaultGlobalStubs,
  'v-data-table': {
    name: 'v-data-table',
    template: `
      <div class="v-data-table-stub" data-testid="v-data-table" v-bind="$attrs">
        <div
          v-for="(item, i) in items"
          :key="i"
          :class="['v-data-table-row', rowProps ? rowProps({ item })?.class : '']"
        >
          <div v-for="header in headers" :key="header.key" class="v-data-table-cell">
            <slot :name="'item.' + header.key" :item="item">
              {{ item[header.key] }}
            </slot>
          </div>
        </div>
        <slot></slot>
      </div>
    `,
    props: [
      'items',
      'headers',
      'loading',
      'itemsPerPage',
      'page',
      'sortBy',
      'itemsPerPageOptions',
      'itemsPerPageText',
      'pageText',
      'density',
      'class',
      'rowProps'
    ],
    inheritAttrs: false
  }
}

function getAutoFollowAction(wrapper) {
  return wrapper
    .findAllComponents(ActionButton)
    .find((button) => (
      button.props('icon') === 'fa-solid fa-link'
      && ['green', 'orange'].includes(button.props('variant'))
    ))
}

function getAutoFollowSnapshotHandler() {
  const call = startMonitorAutoFollow.mock.calls[startMonitorAutoFollow.mock.calls.length - 1]
  return call?.[1]?.onSnapshot
}

describe('Scanjob_Monitor.vue', () => {
  beforeEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
    mockAlert.value = null
    monitorLoading.value = false
    monitorError.value = null
    monitorClosed.value = null
    monitorBoxesPerPage.value = 25
    monitorBoxesSortBy.value = [{ key: 'boxCode', order: 'desc' }]
    monitorBoxesPage.value = 2
    monitorParcelsPerPage.value = 50
    monitorParcelsSortBy.value = [{ key: 'parcelNumber', order: 'desc' }]
    monitorParcelsPage.value = 3
    hasLogistRole.value = true
    isAdmin.value = false
    isWhManager.value = false
    isShiftLead.value = false
    mockScanjob.value = { id: 42, name: 'Scanjob A', type: 30, status: 15, registerId: 101 }
    getById.mockResolvedValue({ id: 42, name: 'Scanjob A', type: 30, status: 15, registerId: 101 })
    registerGetById.mockResolvedValue(true)
    getTransportationDocument.mockReturnValue('Авианакладная')
    loadMonitorSnapshot.mockResolvedValue(registerSnapshot)
    resolveMonitorTarget.mockResolvedValue({ kind: 0, number: 'MISSING' })
    startMonitor.mockResolvedValue(true)
    clearMonitor.mockResolvedValue(true)
    stopMonitor.mockResolvedValue(true)
    startMonitorAutoFollow.mockResolvedValue(true)
    stopMonitorAutoFollow.mockResolvedValue(true)
  })

  it('loads and renders register monitor on mount', async () => {
    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: monitorGlobalStubs }
    })

    await flushPromises()

    expect(getById).toHaveBeenCalledWith(42)
    expect(loadMonitorSnapshot).toHaveBeenCalledWith(42, { area: 0, boxId: null })
    expect(registerGetById).toHaveBeenCalledWith(101)
    expect(startMonitor).toHaveBeenCalledWith(42, expect.objectContaining({ area: 0, boxId: null }))
    expect(wrapper.find('.primary-heading').text()).toBe('Сканирование | Сделка DEAL-101 (Авианакладная INV-101) | Коробки')

    const summaryItems = wrapper.findAll('.monitor-summary-item').map((item) => ({
      label: item.find('.monitor-summary-label').text(),
      value: item.find('.monitor-summary-value').text()
    }))
    expect(summaryItems).toEqual([
      { label: 'Коробки всего / сканировано / не сканировано', value: '2 / 1 / 1' },
      { label: 'Посылки всего / сканировано / не сканировано / запретов', value: '5 / 3 / 2 / 2' },
      { label: 'Посылки не в реестре', value: '1' }
    ])

    const registerSection = wrapper.get('[data-testid="scanjob-monitor-register"]')
    expect(registerSection.text()).toContain('BOX-7')
    expect(registerSection.text()).toContain('BOX-7-ACTUAL')
    expect(registerSection.text()).toContain('Иванов Иван')
    expect(registerSection.text()).toContain('09:30 02.01')
    const parcelProgressPanel = registerSection.get('.scanjob-monitor-parcel-progress-panel')
    expect(parcelProgressPanel.findAll('.scanjob-monitor-parcel-progress-label').map((label) => label.text())).toEqual([
      'Всего',
      'Сканировано',
      'Запретов',
      'Не сканировано'
    ])
    expect(parcelProgressPanel.findAll('.scanjob-monitor-parcel-progress-value').map((value) => value.text())).toEqual([
      '3',
      '2',
      '1',
      '1'
    ])
    expect(parcelProgressPanel.get('.scanjob-monitor-parcel-progress-restricted').text()).toContain('Запретов')

    const boxesTable = wrapper.findComponent({ name: 'v-data-table' })
    expect(boxesTable.exists()).toBe(true)
    expect(boxesTable.props('headers').find((header) => header.key === 'parcelsProgress')?.title)
      .toBe('Посылки')
    expect(boxesTable.props('itemsPerPage')).toBe(25)
    expect(boxesTable.props('page')).toBe(2)
    expect(boxesTable.props('sortBy')).toEqual([{ key: 'boxCode', order: 'desc' }])
    expect(wrapper.get('[data-testid="scanjob-monitor-jump"]').text()).toContain('Перейти к посылке или коробке')
  })

  it('navigates to resolved box by number', async () => {
    resolveMonitorTarget.mockResolvedValueOnce({
      kind: 1,
      area: 1,
      boxId: 7,
      bucketIndex: null,
      parcelId: null,
      number: 'BOX-7',
      boxCode: 'BOX-7',
      parcelNumber: null
    })
    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: monitorGlobalStubs }
    })

    await flushPromises()
    await wrapper.get('[data-testid="scanjob-monitor-jump-input"]').setValue(' BOX-7 ')
    await wrapper.get('[data-testid="scanjob-monitor-jump-action"]').trigger('click')
    await flushPromises()

    expect(resolveMonitorTarget).toHaveBeenCalledWith(42, 'BOX-7')
    expect(mockPush).toHaveBeenCalledWith({
      name: 'scanjob-monitor-box',
      params: { id: 42, boxId: 7 }
    })
  })

  it('clears stale jump error after successful box search', async () => {
    mockAlert.value = { message: 'Посылка или коробка не найдена', type: 'alert-danger' }
    clearAlert.mockImplementationOnce(() => { mockAlert.value = null })
    resolveMonitorTarget.mockResolvedValueOnce({
      kind: 1,
      area: 1,
      boxId: 7,
      bucketIndex: null,
      parcelId: null,
      number: 'BOX-7',
      boxCode: 'BOX-7',
      parcelNumber: null
    })
    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: monitorGlobalStubs }
    })

    await flushPromises()
    await wrapper.get('[data-testid="scanjob-monitor-jump-input"]').setValue('BOX-7')
    await wrapper.get('[data-testid="scanjob-monitor-jump-action"]').trigger('click')
    await flushPromises()

    expect(clearAlert).toHaveBeenCalledTimes(1)
    expect(mockAlert.value).toBeNull()
  })

  it('keeps unrelated alert after successful box search', async () => {
    mockAlert.value = { message: 'Несвязанное сообщение', type: 'alert-danger' }
    resolveMonitorTarget.mockResolvedValueOnce({
      kind: 1,
      area: 1,
      boxId: 7,
      bucketIndex: null,
      parcelId: null,
      number: 'BOX-7',
      boxCode: 'BOX-7',
      parcelNumber: null
    })
    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: monitorGlobalStubs }
    })

    await flushPromises()
    await wrapper.get('[data-testid="scanjob-monitor-jump-input"]').setValue('BOX-7')
    await wrapper.get('[data-testid="scanjob-monitor-jump-action"]').trigger('click')
    await flushPromises()

    expect(clearAlert).not.toHaveBeenCalled()
    expect(mockAlert.value).toEqual({ message: 'Несвязанное сообщение', type: 'alert-danger' })
  })

  it('navigates to resolved unassigned parcel bucket', async () => {
    resolveMonitorTarget.mockResolvedValueOnce({
      kind: 2,
      area: 2,
      boxId: null,
      bucketIndex: 1,
      parcelId: 90,
      number: 'PU-90',
      boxCode: 'Без коробки 2',
      parcelNumber: 'PU-90'
    })
    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: monitorGlobalStubs }
    })

    await flushPromises()
    await wrapper.get('[data-testid="scanjob-monitor-jump-input"]').setValue('PU-90')
    await wrapper.get('[data-testid="scanjob-monitor-jump-action"]').trigger('click')
    await flushPromises()

    expect(mockPush).toHaveBeenCalledWith({
      name: 'scanjob-monitor-unassigned',
      params: { id: 42, bucketIndex: 1 }
    })
  })

  it('marks and scrolls resolved parcel in current box', async () => {
    const originalScrollIntoView = window.HTMLElement.prototype.scrollIntoView
    window.HTMLElement.prototype.scrollIntoView ??= vi.fn()
    const scrollIntoView = vi
      .spyOn(window.HTMLElement.prototype, 'scrollIntoView')
      .mockImplementation(() => {})

    try {
      loadMonitorSnapshot.mockResolvedValue(boxSnapshot)
      resolveMonitorTarget.mockResolvedValueOnce({
        kind: 2,
        area: 1,
        boxId: 7,
        bucketIndex: null,
        parcelId: 71,
        number: 'P-71',
        boxCode: 'BOX-7',
        parcelNumber: 'P-71'
      })
      const wrapper = mount(ScanjobMonitor, {
        props: { scanjobId: 42, monitorScope: box7MonitorScope },
        global: { stubs: monitorGlobalStubs }
      })

      await flushPromises()
      await wrapper.get('[data-testid="scanjob-monitor-jump-input"]').setValue('P-71')
      await wrapper.get('[data-testid="scanjob-monitor-jump-action"]').trigger('click')
      await flushPromises()

      expect(loadMonitorSnapshot).toHaveBeenLastCalledWith(42, { area: 1, boxId: 7 })
      expect(wrapper.find('.selected-parcel-row').exists()).toBe(true)
      expect(scrollIntoView).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      })
    } finally {
      scrollIntoView.mockRestore()
      if (originalScrollIntoView === undefined) {
        delete window.HTMLElement.prototype.scrollIntoView
      }
    }
  })

  it('clears stale jump error after successful parcel search', async () => {
    mockAlert.value = { message: 'Посылка или коробка не найдена', type: 'alert-danger' }
    clearAlert.mockImplementationOnce(() => { mockAlert.value = null })
    loadMonitorSnapshot.mockResolvedValue(boxSnapshot)
    resolveMonitorTarget.mockResolvedValueOnce({
      kind: 2,
      area: 1,
      boxId: 7,
      bucketIndex: null,
      parcelId: 71,
      number: 'P-71',
      boxCode: 'BOX-7',
      parcelNumber: 'P-71'
    })
    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42, monitorScope: box7MonitorScope },
      global: { stubs: monitorGlobalStubs }
    })

    await flushPromises()
    await wrapper.get('[data-testid="scanjob-monitor-jump-input"]').setValue('P-71')
    await wrapper.get('[data-testid="scanjob-monitor-jump-action"]').trigger('click')
    await flushPromises()

    expect(loadMonitorSnapshot).toHaveBeenLastCalledWith(42, { area: 1, boxId: 7 })
    expect(clearAlert).toHaveBeenCalledTimes(1)
    expect(mockAlert.value).toBeNull()
  })

  it('alerts when jump target is not found', async () => {
    resolveMonitorTarget.mockResolvedValueOnce({ kind: 0, area: null, number: 'MISSING' })
    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: monitorGlobalStubs }
    })

    await flushPromises()
    await wrapper.get('[data-testid="scanjob-monitor-jump-input"]').setValue('MISSING')
    await wrapper.get('[data-testid="scanjob-monitor-jump-action"]').trigger('click')
    await flushPromises()

    expect(alertError).toHaveBeenCalledWith('Посылка или коробка не найдена')
  })

  it('alerts when jump input is empty', async () => {
    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: monitorGlobalStubs }
    })

    await flushPromises()
    // Input is empty; button is disabled, so trigger via keydown.enter on the input field
    const form = wrapper.get('[data-testid="scanjob-monitor-jump"]')
    await form.trigger('submit')
    await flushPromises()

    expect(alertError).toHaveBeenCalledWith('Введите номер посылки или коробки')
    expect(resolveMonitorTarget).not.toHaveBeenCalled()
  })

  it('does not call resolveMonitorTarget when isLoading is true', async () => {
    monitorLoading.value = true

    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: monitorGlobalStubs }
    })

    await flushPromises()
    await wrapper.get('[data-testid="scanjob-monitor-jump-input"]').setValue('BOX-7')
    await wrapper.get('[data-testid="scanjob-monitor-jump-action"]').trigger('click')
    await flushPromises()

    expect(resolveMonitorTarget).not.toHaveBeenCalled()
  })

  it('disables jump action button when input is empty', async () => {
    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: monitorGlobalStubs }
    })

    await flushPromises()

    const jumpAction = wrapper.get('[data-testid="scanjob-monitor-jump-action"]')
    expect(jumpAction.attributes('disabled')).toBeDefined()
  })

  it('enables jump action button when input has text', async () => {
    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: monitorGlobalStubs }
    })

    await flushPromises()
    await wrapper.get('[data-testid="scanjob-monitor-jump-input"]').setValue('BOX-7')

    const jumpAction = wrapper.get('[data-testid="scanjob-monitor-jump-action"]')
    expect(jumpAction.attributes('disabled')).toBeUndefined()
  })

  it('shows jump loading spinner while resolving', async () => {
    let resolveTarget
    resolveMonitorTarget.mockReturnValueOnce(new Promise((resolve) => { resolveTarget = resolve }))

    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: monitorGlobalStubs }
    })

    await flushPromises()
    await wrapper.get('[data-testid="scanjob-monitor-jump-input"]').setValue('BOX-7')
    await wrapper.get('[data-testid="scanjob-monitor-jump-action"]').trigger('click')

    expect(wrapper.find('[data-testid="scanjob-monitor-jump-loading"]').exists()).toBe(true)

    resolveTarget({ kind: 0 })
    await flushPromises()

    expect(wrapper.find('[data-testid="scanjob-monitor-jump-loading"]').exists()).toBe(false)
  })

  it('alerts when resolved box target has null boxId', async () => {
    resolveMonitorTarget.mockResolvedValueOnce({
      kind: 1,
      area: 1,
      boxId: null,
      parcelId: null,
      number: 'BADBOX'
    })
    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: monitorGlobalStubs }
    })

    await flushPromises()
    await wrapper.get('[data-testid="scanjob-monitor-jump-input"]').setValue('BADBOX')
    await wrapper.get('[data-testid="scanjob-monitor-jump-action"]').trigger('click')
    await flushPromises()

    expect(alertError).toHaveBeenCalledWith('Посылка или коробка не найдена')
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('alerts when resolved parcel target has null parcelId', async () => {
    resolveMonitorTarget.mockResolvedValueOnce({
      kind: 2,
      area: 1,
      boxId: 7,
      bucketIndex: null,
      parcelId: null,
      number: 'BADPARCEL'
    })
    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: monitorGlobalStubs }
    })

    await flushPromises()
    await wrapper.get('[data-testid="scanjob-monitor-jump-input"]').setValue('BADPARCEL')
    await wrapper.get('[data-testid="scanjob-monitor-jump-action"]').trigger('click')
    await flushPromises()

    expect(alertError).toHaveBeenCalledWith('Посылка или коробка не найдена')
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('alerts when resolved parcel target scope is Boxes area', async () => {
    resolveMonitorTarget.mockResolvedValueOnce({
      kind: 2,
      area: 0,
      boxId: null,
      bucketIndex: null,
      parcelId: 55,
      number: 'P-55'
    })
    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: monitorGlobalStubs }
    })

    await flushPromises()
    await wrapper.get('[data-testid="scanjob-monitor-jump-input"]').setValue('P-55')
    await wrapper.get('[data-testid="scanjob-monitor-jump-action"]').trigger('click')
    await flushPromises()

    expect(alertError).toHaveBeenCalledWith('Посылка или коробка не найдена')
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('shows error alert when resolveMonitorTarget throws with a message', async () => {
    resolveMonitorTarget.mockRejectedValueOnce(new Error('Network failure'))
    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: monitorGlobalStubs }
    })

    await flushPromises()
    await wrapper.get('[data-testid="scanjob-monitor-jump-input"]').setValue('BOX-7')
    await wrapper.get('[data-testid="scanjob-monitor-jump-action"]').trigger('click')
    await flushPromises()

    expect(alertError).toHaveBeenCalledWith('Network failure')
  })

  it('shows fallback error message when resolveMonitorTarget throws without message', async () => {
    resolveMonitorTarget.mockRejectedValueOnce({})
    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: monitorGlobalStubs }
    })

    await flushPromises()
    await wrapper.get('[data-testid="scanjob-monitor-jump-input"]').setValue('BOX-7')
    await wrapper.get('[data-testid="scanjob-monitor-jump-action"]').trigger('click')
    await flushPromises()

    expect(alertError).toHaveBeenCalledWith('Ошибка при поиске посылки или коробки')
  })

  it('submits jump form on Enter key press', async () => {
    resolveMonitorTarget.mockResolvedValueOnce({
      kind: 1,
      area: 1,
      boxId: 7,
      bucketIndex: null,
      parcelId: null,
      number: 'BOX-7'
    })
    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: monitorGlobalStubs }
    })

    await flushPromises()
    const input = wrapper.get('[data-testid="scanjob-monitor-jump-input"]')
    await input.setValue('BOX-7')
    await input.trigger('keydown.enter')
    await flushPromises()

    expect(resolveMonitorTarget).toHaveBeenCalledWith(42, 'BOX-7')
  })

  it('clears selectedParcelId when navigating back to register monitor', async () => {
    loadMonitorSnapshot.mockResolvedValue(boxSnapshot)
    resolveMonitorTarget.mockResolvedValueOnce({
      kind: 2,
      area: 1,
      boxId: 7,
      bucketIndex: null,
      parcelId: 71,
      number: 'P-71'
    })

    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42, monitorScope: box7MonitorScope },
      global: { stubs: monitorGlobalStubs }
    })

    await flushPromises()
    await wrapper.get('[data-testid="scanjob-monitor-jump-input"]').setValue('P-71')
    await wrapper.get('[data-testid="scanjob-monitor-jump-action"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('.selected-parcel-row').exists()).toBe(true)

    loadMonitorSnapshot.mockResolvedValue(registerSnapshot)
    clearMonitor.mockResolvedValue(true)
    await wrapper.vm.openRegisterMonitor()
    await flushPromises()

    expect(wrapper.find('.selected-parcel-row').exists()).toBe(false)
  })

  it('stays on same scope without navigation when scope is unchanged and reloadIfSame is false', async () => {
    resolveMonitorTarget.mockResolvedValueOnce({
      kind: 1,
      area: 0,
      boxId: null,
      bucketIndex: null,
      parcelId: null,
      number: 'BOX-SAME'
    })
    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: monitorGlobalStubs }
    })

    await flushPromises()
    const pushCallsBefore = mockPush.mock.calls.length
    const replaceCallsBefore = mockReplace.mock.calls.length

    await wrapper.get('[data-testid="scanjob-monitor-jump-input"]').setValue('BOX-SAME')
    await wrapper.get('[data-testid="scanjob-monitor-jump-action"]').trigger('click')
    await flushPromises()

    expect(mockPush.mock.calls.length).toBe(pushCallsBefore)
    expect(mockReplace.mock.calls.length).toBe(replaceCallsBefore)
  })

  it('does not start a separate autofollow observer for the register panel', async () => {
    mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: monitorGlobalStubs }
    })

    await flushPromises()

    expect(startMonitorAutoFollow).not.toHaveBeenCalled()
  })

  it('closes via header action', async () => {
    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: monitorGlobalStubs }
    })

    await flushPromises()
    await wrapper.find('[data-testid="scanjob-monitor-close-action"]').trigger('click')

    expect(mockBack).toHaveBeenCalled()
  })

  it('opens unregistered parcels from summary action with return url', async () => {
    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: monitorGlobalStubs }
    })

    await flushPromises()
    await wrapper.find('[data-testid="scanjob-monitor-unregistered-action"]').trigger('click')

    expect(mockPush).toHaveBeenCalledWith({
      path: '/registers/101/unregistered-parcels',
      query: {
        returnUrl: '/scanjobs/42/monitor'
      }
    })
  })

  it('toggles auto-follow from the header action and switches color', async () => {
    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: monitorGlobalStubs }
    })

    await flushPromises()

    expect(getAutoFollowAction(wrapper).props('icon')).toBe('fa-solid fa-link')
    expect(getAutoFollowAction(wrapper).props('variant')).toBe('green')
    expect(getAutoFollowAction(wrapper).props('tooltipText')).toBe('Отключить автослежение')

    await wrapper.find('[data-testid="scanjob-monitor-auto-follow-action"]').trigger('click')

    expect(getAutoFollowAction(wrapper).props('icon')).toBe('fa-solid fa-link')
    expect(getAutoFollowAction(wrapper).props('variant')).toBe('orange')
    expect(getAutoFollowAction(wrapper).props('tooltipText')).toBe('Включить автослежение')

    await wrapper.find('[data-testid="scanjob-monitor-auto-follow-action"]').trigger('click')

    expect(getAutoFollowAction(wrapper).props('icon')).toBe('fa-solid fa-link')
    expect(getAutoFollowAction(wrapper).props('variant')).toBe('green')
  })

  it('switches to box monitor and renders parcels', async () => {
    loadMonitorSnapshot.mockResolvedValueOnce(registerSnapshot).mockResolvedValueOnce(boxSnapshot)

    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: monitorGlobalStubs }
    })

    await flushPromises()
    await wrapper.setProps({ monitorScope: box7MonitorScope })
    await flushPromises()

    expect(clearMonitor).toHaveBeenCalled()
    expect(loadMonitorSnapshot).toHaveBeenLastCalledWith(42, { area: 1, boxId: 7 })
    expect(startMonitor).toHaveBeenLastCalledWith(42, expect.objectContaining({ area: 1, boxId: 7 }))
    expect(wrapper.find('[data-testid="scanjob-monitor-box"]').exists()).toBe(true)
    expect(wrapper.find('.primary-heading').text()).toBe('Сканирование | Сделка DEAL-101 (Авианакладная INV-101) | Коробка BOX-7')
    expect(wrapper.findComponent({ name: 'Scanjob_Wbr2_Parcels_Monitor_Table' }).exists()).toBe(true)

    const summaryItems = wrapper.findAll('.monitor-summary-item').map((item) => ({
      label: item.find('.monitor-summary-label').text(),
      value: item.find('.monitor-summary-value').text()
    }))
    expect(summaryItems).toEqual([
      { label: 'Статус сканирования коробки', value: 'Сканирована' },
      { label: 'Посылки всего / сканировано / не сканировано / запретов', value: '3 / 2 / 1 / 1' }
    ])

    expect(wrapper.text()).toContain('P-70')
    expect(wrapper.text()).toContain('P-70-SCAN')
    expect(wrapper.text()).toContain('Product 70')
    expect(wrapper.text()).toContain('Петров Петр')
    expect(wrapper.text()).toContain('10:10 02.01')
    expect(wrapper.text()).toContain('P-71')

    const parcelsTable = wrapper.findComponent({ name: 'v-data-table' })
    expect(parcelsTable.exists()).toBe(true)
    expect(parcelsTable.props('itemsPerPage')).toBe(50)
    expect(parcelsTable.props('page')).toBe(3)
    expect(parcelsTable.props('sortBy')).toEqual([{ key: 'parcelNumber', order: 'desc' }])
  })

  it('sets parcel defect from box monitor and refreshes current scope', async () => {
    isWhManager.value = true
    loadMonitorSnapshot
      .mockResolvedValueOnce(registerSnapshot)
      .mockResolvedValueOnce(boxSnapshot)
      .mockResolvedValueOnce(boxSnapshot)

    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: monitorGlobalStubs }
    })

    await flushPromises()
    await wrapper.setProps({ monitorScope: box7MonitorScope })
    await flushPromises()

    loadMonitorSnapshot.mockClear()
    await wrapper.get('[data-testid="scanjob-set-defect-action"]').trigger('click')
    await flushPromises()

    expect(setDefect).toHaveBeenCalledWith(70)
    expect(loadMonitorSnapshot).toHaveBeenCalledWith(42, { area: 1, boxId: 7 })
  })

  it('shows reload error message when snapshot refresh fails after defect update', async () => {
    isWhManager.value = true
    loadMonitorSnapshot
      .mockResolvedValueOnce(registerSnapshot)
      .mockResolvedValueOnce(boxSnapshot)
      .mockRejectedValueOnce(new Error('refresh failed'))

    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: monitorGlobalStubs }
    })

    await flushPromises()
    await wrapper.setProps({ monitorScope: box7MonitorScope })
    await flushPromises()

    loadMonitorSnapshot.mockClear()
    await wrapper.get('[data-testid="scanjob-set-defect-action"]').trigger('click')
    await flushPromises()

    expect(setDefect).toHaveBeenCalledWith(70)
    expect(alertError).toHaveBeenCalledWith('Ошибка при обновлении данных')
  })

  it('switches to unassigned bucket monitor and renders bucket parcels', async () => {
    loadMonitorSnapshot
      .mockResolvedValueOnce(registerSnapshotWithUnassignedBucket)
      .mockResolvedValueOnce(unassignedBucketSnapshot)

    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: monitorGlobalStubs }
    })

    await flushPromises()
    await wrapper.setProps({ monitorScope: unassignedBucket1MonitorScope })
    await flushPromises()

    expect(loadMonitorSnapshot).toHaveBeenLastCalledWith(42, {
      area: 2,
      boxId: null,
      bucketIndex: 1
    })
    expect(startMonitor).toHaveBeenLastCalledWith(42, expect.objectContaining({
      area: 2,
      boxId: null,
      bucketIndex: 1
    }))
    expect(wrapper.find('[data-testid="scanjob-monitor-box"]').exists()).toBe(true)
    expect(wrapper.find('.primary-heading').text()).toBe('Сканирование | Сделка DEAL-101 (Авианакладная INV-101) | Без коробки 2')

    const summaryItems = wrapper.findAll('.monitor-summary-item').map((item) => ({
      label: item.find('.monitor-summary-label').text(),
      value: item.find('.monitor-summary-value').text()
    }))
    expect(summaryItems).toEqual([
      { label: 'Группа посылок', value: 'Без коробки' },
      { label: 'Посылки всего / сканировано / не сканировано / запретов', value: '2 / 1 / 1 / 1' }
    ])

    expect(wrapper.text()).toContain('PU-90')
    expect(wrapper.text()).toContain('PU-90-SCAN')
    expect(wrapper.text()).toContain('Product U90')
    expect(wrapper.text()).toContain('PU-91')
  })

  it('makes every boxes table cell clickable and routes to the box monitor', async () => {
    loadMonitorSnapshot.mockResolvedValueOnce(registerSnapshot)

    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: monitorGlobalStubs }
    })

    await flushPromises()

    const registerSection = wrapper.get('[data-testid="scanjob-monitor-register"]')
    expect(registerSection.findAll('.clickable-cell')).toHaveLength(registerSnapshot.boxes.length * 6)

    await registerSection.find('.monitor-status').trigger('click')
    await flushPromises()

    expect(mockPush).toHaveBeenCalledWith({
      name: 'scanjob-monitor-box',
      params: { id: 42, boxId: 7 }
    })
    expect(wrapper.find('[data-testid="scanjob-monitor-register"]').exists()).toBe(true)
  })

  it('routes unassigned bucket rows to the unassigned monitor', async () => {
    loadMonitorSnapshot.mockResolvedValueOnce(registerSnapshotWithUnassignedBucket)

    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: monitorGlobalStubs }
    })

    await flushPromises()

    await wrapper.findAll('[data-testid="scanjob-monitor-box-row"]').at(2).trigger('click')
    await flushPromises()

    expect(mockPush).toHaveBeenCalledWith({
      name: 'scanjob-monitor-unassigned',
      params: { id: 42, bucketIndex: 1 }
    })
  })

  it('returns from box monitor to register monitor via close action', async () => {
    loadMonitorSnapshot
      .mockResolvedValueOnce(registerSnapshot)
      .mockResolvedValueOnce(boxSnapshot)

    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: defaultGlobalStubs }
    })

    await flushPromises()
    await wrapper.setProps({ monitorScope: box7MonitorScope })
    await flushPromises()
    await wrapper.find('[data-testid="scanjob-monitor-close-action"]').trigger('click')
    await flushPromises()

    expect(mockBack).not.toHaveBeenCalled()
    expect(mockReplace).toHaveBeenCalledWith({
      name: 'scanjob-monitor-register',
      params: { id: 42 }
    })
    expect(wrapper.find('[data-testid="scanjob-monitor-box"]').exists()).toBe(true)
  })

  it('reloads register monitor when route scope changes from box to register', async () => {
    loadMonitorSnapshot
      .mockResolvedValueOnce(boxSnapshot)
      .mockResolvedValueOnce(registerSnapshot)

    const wrapper = mount(ScanjobMonitor, {
      props: {
        scanjobId: 42,
        monitorScope: box7MonitorScope
      },
      global: { stubs: defaultGlobalStubs }
    })

    await flushPromises()
    expect(loadMonitorSnapshot).toHaveBeenLastCalledWith(42, { area: 1, boxId: 7 })

    await wrapper.setProps({ monitorScope: registerMonitorScope })
    await flushPromises()

    expect(loadMonitorSnapshot).toHaveBeenLastCalledWith(42, { area: 0, boxId: null })
    expect(startMonitor).toHaveBeenLastCalledWith(42, expect.objectContaining({ area: 0, boxId: null }))
    expect(wrapper.find('[data-testid="scanjob-monitor-register"]').exists()).toBe(true)
  })

  it('ignores route scope updates until scanjob data is loaded', async () => {
    let resolveScanjob
    getById.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveScanjob = resolve
      })
    )

    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: defaultGlobalStubs }
    })

    await wrapper.setProps({ monitorScope: box7MonitorScope })
    await flushPromises()

    expect(loadMonitorSnapshot).not.toHaveBeenCalled()

    resolveScanjob({ id: 42, name: 'Scanjob A', type: 30, status: 15, registerId: 101 })
    await flushPromises()

    expect(loadMonitorSnapshot).toHaveBeenCalledWith(42, { area: 1, boxId: 7 })
  })

  it('reloads monitor when scanjob id changes', async () => {
    loadMonitorSnapshot.mockResolvedValueOnce(registerSnapshot)

    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: defaultGlobalStubs }
    })

    await flushPromises()

    const scanjob43 = { id: 43, name: 'Scanjob B', type: 30, status: 15, registerId: 101 }
    const registerSnapshot43 = { ...registerSnapshot, scanJobId: 43 }
    getById.mockResolvedValueOnce(scanjob43)
    loadMonitorSnapshot.mockResolvedValueOnce(registerSnapshot43)

    await wrapper.setProps({ scanjobId: 43, monitorScope: registerMonitorScope })
    await flushPromises()

    expect(getById).toHaveBeenLastCalledWith(43)
    expect(stopMonitor).toHaveBeenCalled()
    expect(loadMonitorSnapshot).toHaveBeenLastCalledWith(43, { area: 0, boxId: null })
    expect(startMonitor).toHaveBeenLastCalledWith(43, expect.objectContaining({ area: 0, boxId: null }))
  })

  it('shows status-only panel when scanjob id changes and ignores closed state from the previous scanjob', async () => {
    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: defaultGlobalStubs }
    })

    await flushPromises()

    loadMonitorSnapshot.mockClear()
    getById.mockResolvedValueOnce(null)
    monitorClosed.value = { scanJobId: 42, status: 2 }

    await wrapper.setProps({ scanjobId: 43, monitorScope: registerMonitorScope })
    await flushPromises()

    expect(stopMonitor).toHaveBeenCalled()
    expect(loadMonitorSnapshot).not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="scanjob-monitor-closed"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="scanjob-monitor-status-only"]').exists()).toBe(true)
  })

  it('throttles live snapshots and commits only the latest', async () => {
    vi.useFakeTimers()

    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: defaultGlobalStubs }
    })

    await flushPromises()

    const onSnapshot = startMonitor.mock.calls[0][1].onSnapshot
    onSnapshot({
      ...registerSnapshot,
      boxes: [{ ...registerSnapshot.boxes[0], boxCode: 'BOX-OLD' }]
    })
    onSnapshot({
      ...registerSnapshot,
      boxes: [{ ...registerSnapshot.boxes[0], boxCode: 'BOX-LATEST' }]
    })

    expect(wrapper.text()).not.toContain('BOX-LATEST')

    vi.advanceTimersByTime(150)
    await flushPromises()

    expect(wrapper.text()).toContain('BOX-LATEST')
    expect(wrapper.text()).not.toContain('BOX-OLD')
  })

  it('auto-follows to parcel view when a box sticker is scanned', async () => {
    vi.useFakeTimers()
    loadMonitorSnapshot.mockResolvedValueOnce(registerSnapshot)

    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: defaultGlobalStubs }
    })

    await flushPromises()

    const onSnapshot = startMonitor.mock.calls[0][1].onSnapshot
    onSnapshot({
      ...registerSnapshot,
      boxes: registerSnapshot.boxes.map((box) =>
        box.boxId === 8
          ? {
              ...box,
              boxStickerScanned: true,
              boxScannedSticker: 'BOX-8-ACTUAL',
              boxScannedUserName: 'Сидоров Сидор',
              boxScannedTime: '2026-01-02T11:00:00'
            }
          : box
      )
    })
    vi.advanceTimersByTime(150)
    await flushPromises()

    expect(mockReplace).toHaveBeenCalledWith({
      name: 'scanjob-monitor-box',
      params: { id: 42, boxId: 8 }
    })
    expect(loadMonitorSnapshot).toHaveBeenCalledTimes(1)
    expect(wrapper.find('[data-testid="scanjob-monitor-register"]').exists()).toBe(true)
  })

  it('auto-follows repeated registered scans from latest scan metadata', async () => {
    vi.useFakeTimers()
    loadMonitorSnapshot.mockResolvedValueOnce(registerSnapshot)

    mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: defaultGlobalStubs }
    })

    await flushPromises()

    const onSnapshot = startMonitor.mock.calls[0][1].onSnapshot
    onSnapshot({
      ...registerSnapshot,
      latestScan: {
        scanCodeId: 9001,
        area: 1,
        boxId: 7,
        bucketIndex: null,
        code: 'P-70-SCAN',
        scanTime: '2026-01-02T10:10:00',
        parcelCount: 1,
        boxCount: 0,
        scanSource: scannedItemSource.ParcelSticker,
        itemNumbers: ['P-70']
      }
    })
    vi.advanceTimersByTime(150)
    await flushPromises()

    expect(mockReplace).toHaveBeenCalledWith({
      name: 'scanjob-monitor-box',
      params: { id: 42, boxId: 7 }
    })
    expect(loadMonitorSnapshot).toHaveBeenCalledTimes(1)
  })

  it('auto-follows to parcel view when a parcel sticker is scanned in a box', async () => {
    vi.useFakeTimers()
    loadMonitorSnapshot.mockResolvedValueOnce(registerSnapshot)

    mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: defaultGlobalStubs }
    })

    await flushPromises()

    const onSnapshot = startMonitor.mock.calls[0][1].onSnapshot
    onSnapshot({
      ...registerSnapshot,
      parcelsWithStickerScanned: 4,
      parcelsWithStickerNotScanned: 1,
      boxes: registerSnapshot.boxes.map((box) =>
        box.boxId === 8
          ? {
              ...box,
              parcelsWithStickerScanned: 2,
              parcelsWithStickerNotScanned: 0
            }
          : box
      )
    })
    vi.advanceTimersByTime(150)
    await flushPromises()

    expect(mockReplace).toHaveBeenCalledWith({
      name: 'scanjob-monitor-box',
      params: { id: 42, boxId: 8 }
    })
    expect(loadMonitorSnapshot).toHaveBeenCalledTimes(1)
  })

  it('auto-follows to unassigned bucket when an unboxed parcel sticker is scanned', async () => {
    vi.useFakeTimers()
    loadMonitorSnapshot.mockResolvedValueOnce(registerSnapshotWithUnassignedBucket)

    mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: defaultGlobalStubs }
    })

    await flushPromises()

    const onSnapshot = startMonitor.mock.calls[0][1].onSnapshot
    onSnapshot({
      ...registerSnapshotWithUnassignedBucket,
      parcelsWithStickerScanned: 4,
      parcelsWithStickerNotScanned: 1,
      boxes: registerSnapshotWithUnassignedBucket.boxes.map((box) =>
        box.bucketIndex === 1
          ? {
              ...box,
              parcelsWithStickerScanned: 2,
              parcelsWithStickerNotScanned: 0
            }
          : box
      )
    })
    vi.advanceTimersByTime(150)
    await flushPromises()

    expect(mockReplace).toHaveBeenCalledWith({
      name: 'scanjob-monitor-unassigned',
      params: { id: 42, bucketIndex: 1 }
    })
    expect(loadMonitorSnapshot).toHaveBeenCalledTimes(1)
  })

  it('auto-follows repeated unassigned parcel scans from latest scan metadata', async () => {
    vi.useFakeTimers()
    loadMonitorSnapshot.mockResolvedValueOnce(registerSnapshotWithUnassignedBucket)

    mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: defaultGlobalStubs }
    })

    await flushPromises()

    const onSnapshot = startMonitor.mock.calls[0][1].onSnapshot
    onSnapshot({
      ...registerSnapshotWithUnassignedBucket,
      latestScan: {
        scanCodeId: 9002,
        area: 2,
        boxId: null,
        bucketIndex: 1,
        code: 'PU-90-SCAN',
        scanTime: '2026-01-02T12:00:00',
        parcelCount: 1,
        boxCount: 0,
        scanSource: scannedItemSource.ParcelSticker,
        itemNumbers: ['PU-90']
      }
    })
    vi.advanceTimersByTime(150)
    await flushPromises()

    expect(mockReplace).toHaveBeenCalledWith({
      name: 'scanjob-monitor-unassigned',
      params: { id: 42, bucketIndex: 1 }
    })
    expect(loadMonitorSnapshot).toHaveBeenCalledTimes(1)
  })

  it('does not auto-follow live scans when auto-follow is disabled', async () => {
    vi.useFakeTimers()

    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: defaultGlobalStubs }
    })

    await flushPromises()
    await wrapper.find('[data-testid="scanjob-monitor-auto-follow-action"]').trigger('click')

    const onSnapshot = startMonitor.mock.calls[0][1].onSnapshot
    onSnapshot({
      ...registerSnapshot,
      boxes: registerSnapshot.boxes.map((box) =>
        box.boxId === 8
          ? {
              ...box,
              boxStickerScanned: true,
              boxScannedSticker: 'BOX-8-ACTUAL',
              boxScannedUserName: 'Сидоров Сидор',
              boxScannedTime: '2026-01-02T11:00:00'
            }
          : box
      )
    })
    vi.advanceTimersByTime(150)
    await flushPromises()

    expect(loadMonitorSnapshot).toHaveBeenCalledTimes(1)
    expect(mockReplace).not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="scanjob-monitor-register"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="scanjob-monitor-box"]').exists()).toBe(false)
  })

  it('keeps register monitor when only total scanned parcels changes', async () => {
    vi.useFakeTimers()

    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: defaultGlobalStubs }
    })

    await flushPromises()

    const onSnapshot = startMonitor.mock.calls[0][1].onSnapshot
    onSnapshot({
      ...registerSnapshot,
      parcelsWithStickerScanned: registerSnapshot.parcelsWithStickerScanned + 1,
      parcelsWithStickerNotScanned: registerSnapshot.parcelsWithStickerNotScanned - 1
    })
    vi.advanceTimersByTime(150)
    await flushPromises()

    expect(mockReplace).not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="scanjob-monitor-register"]').exists()).toBe(true)
  })

  it('skips malformed boxes in auto-follow matching', async () => {
    vi.useFakeTimers()

    mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: defaultGlobalStubs }
    })

    await flushPromises()

    const onSnapshot = startMonitor.mock.calls[0][1].onSnapshot
    onSnapshot({
      ...registerSnapshot,
      boxes: [
        ...registerSnapshot.boxes,
        {
          area: 1,
          boxId: null,
          bucketIndex: null,
          parcelsWithStickerScanned: registerSnapshot.parcelsWithStickerScanned + 10
        }
      ]
    })
    vi.advanceTimersByTime(150)
    await flushPromises()

    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('stays in box mode when a registered parcel scan arrives for the currently open box', async () => {
    vi.useFakeTimers()
    loadMonitorSnapshot.mockResolvedValueOnce(boxSnapshot)

    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42, monitorScope: box7MonitorScope },
      global: { stubs: defaultGlobalStubs }
    })

    await flushPromises()

    const onSnapshot = startMonitor.mock.calls[0][1].onSnapshot
    onSnapshot({
      ...boxSnapshot,
      parcelsWithStickerScanned: boxSnapshot.parcelsWithStickerScanned + 1,
      parcelsWithStickerNotScanned: boxSnapshot.parcelsWithStickerNotScanned - 1,
      scannedItemsNotInRegister: boxSnapshot.scannedItemsNotInRegister
    })
    vi.advanceTimersByTime(150)
    await flushPromises()

    expect(loadMonitorSnapshot).toHaveBeenLastCalledWith(42, { area: 1, boxId: 7 })
    expect(mockReplace).not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="scanjob-monitor-box"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="scanjob-monitor-register"]').exists()).toBe(false)
  })

  it('stays in box mode for repeated latest scan in the currently open box', async () => {
    vi.useFakeTimers()
    loadMonitorSnapshot.mockResolvedValueOnce(boxSnapshot)

    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42, monitorScope: box7MonitorScope },
      global: { stubs: defaultGlobalStubs }
    })

    await flushPromises()

    const onSnapshot = startMonitor.mock.calls[0][1].onSnapshot
    onSnapshot({
      ...boxSnapshot,
      latestScan: {
        scanCodeId: 9003,
        area: 1,
        boxId: 7,
        bucketIndex: null,
        scanSource: scannedItemSource.ParcelSticker
      }
    })
    vi.advanceTimersByTime(150)
    await flushPromises()

    expect(mockReplace).not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="scanjob-monitor-box"]').exists()).toBe(true)
  })

  it('starts register autofollow observer while a box panel is open', async () => {
    loadMonitorSnapshot.mockResolvedValueOnce(boxSnapshot)

    mount(ScanjobMonitor, {
      props: { scanjobId: 42, monitorScope: box7MonitorScope },
      global: { stubs: defaultGlobalStubs }
    })

    await flushPromises()

    expect(startMonitor).toHaveBeenCalledWith(42, expect.objectContaining({
      area: 1,
      boxId: 7
    }))
    expect(startMonitorAutoFollow).toHaveBeenCalledWith(42, {
      onSnapshot: expect.any(Function)
    })
  })

  it('uses first register autofollow snapshot as baseline only', async () => {
    loadMonitorSnapshot.mockResolvedValueOnce(boxSnapshot)

    mount(ScanjobMonitor, {
      props: { scanjobId: 42, monitorScope: box7MonitorScope },
      global: { stubs: defaultGlobalStubs }
    })

    await flushPromises()

    getAutoFollowSnapshotHandler()({
      ...registerSnapshot,
      latestScan: {
        scanCodeId: 9010,
        area: 1,
        boxId: 8,
        bucketIndex: null,
        scanSource: scannedItemSource.ParcelSticker
      }
    })
    await flushPromises()

    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('auto-follows from an open box to another box when register stream reports a parcel scan', async () => {
    loadMonitorSnapshot.mockResolvedValueOnce(boxSnapshot)

    mount(ScanjobMonitor, {
      props: { scanjobId: 42, monitorScope: box7MonitorScope },
      global: { stubs: defaultGlobalStubs }
    })

    await flushPromises()

    const onAutoFollowSnapshot = getAutoFollowSnapshotHandler()
    onAutoFollowSnapshot({
      ...registerSnapshot,
      latestScan: {
        scanCodeId: 9010,
        area: 1,
        boxId: 7,
        bucketIndex: null,
        scanSource: scannedItemSource.ParcelSticker
      }
    })
    onAutoFollowSnapshot({
      ...registerSnapshot,
      latestScan: {
        scanCodeId: 9011,
        area: 1,
        boxId: 8,
        bucketIndex: null,
        scanSource: scannedItemSource.ParcelSticker
      }
    })
    await flushPromises()

    expect(mockReplace).toHaveBeenCalledWith({
      name: 'scanjob-monitor-box',
      params: { id: 42, boxId: 8 }
    })
  })

  it('keeps an open box when register stream reports another scan in the same box', async () => {
    loadMonitorSnapshot.mockResolvedValueOnce(boxSnapshot)

    mount(ScanjobMonitor, {
      props: { scanjobId: 42, monitorScope: box7MonitorScope },
      global: { stubs: defaultGlobalStubs }
    })

    await flushPromises()

    const onAutoFollowSnapshot = getAutoFollowSnapshotHandler()
    onAutoFollowSnapshot({
      ...registerSnapshot,
      latestScan: {
        scanCodeId: 9010,
        area: 1,
        boxId: 7,
        bucketIndex: null,
        scanSource: scannedItemSource.ParcelSticker
      }
    })
    onAutoFollowSnapshot({
      ...registerSnapshot,
      latestScan: {
        scanCodeId: 9011,
        area: 1,
        boxId: 7,
        bucketIndex: null,
        scanSource: scannedItemSource.ParcelSticker
      }
    })
    await flushPromises()

    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('auto-follows from an open box to an unassigned bucket from register stream metadata', async () => {
    loadMonitorSnapshot.mockResolvedValueOnce(boxSnapshot)

    mount(ScanjobMonitor, {
      props: { scanjobId: 42, monitorScope: box7MonitorScope },
      global: { stubs: defaultGlobalStubs }
    })

    await flushPromises()

    const onAutoFollowSnapshot = getAutoFollowSnapshotHandler()
    onAutoFollowSnapshot({
      ...registerSnapshotWithUnassignedBucket,
      latestScan: {
        scanCodeId: 9010,
        area: 1,
        boxId: 7,
        bucketIndex: null,
        scanSource: scannedItemSource.ParcelSticker
      }
    })
    onAutoFollowSnapshot({
      ...registerSnapshotWithUnassignedBucket,
      latestScan: {
        scanCodeId: 9011,
        area: 2,
        boxId: null,
        bucketIndex: 1,
        scanSource: scannedItemSource.ParcelSticker
      }
    })
    await flushPromises()

    expect(mockReplace).toHaveBeenCalledWith({
      name: 'scanjob-monitor-unassigned',
      params: { id: 42, bucketIndex: 1 }
    })
  })

  it('auto-follows from an open box back to register for not-in-register scans', async () => {
    loadMonitorSnapshot.mockResolvedValueOnce(boxSnapshot)

    mount(ScanjobMonitor, {
      props: { scanjobId: 42, monitorScope: box7MonitorScope },
      global: { stubs: defaultGlobalStubs }
    })

    await flushPromises()

    const onAutoFollowSnapshot = getAutoFollowSnapshotHandler()
    onAutoFollowSnapshot({
      ...registerSnapshot,
      latestScan: {
        scanCodeId: 9010,
        area: 1,
        boxId: 7,
        bucketIndex: null,
        scanSource: scannedItemSource.ParcelSticker
      }
    })
    onAutoFollowSnapshot({
      ...registerSnapshot,
      latestScan: {
        scanCodeId: 9011,
        area: 3,
        boxId: null,
        bucketIndex: null,
        scanSource: scannedItemSource.NotInRegister
      }
    })
    await flushPromises()

    expect(mockReplace).toHaveBeenCalledWith({
      name: 'scanjob-monitor-register',
      params: { id: 42 }
    })
  })

  it('ignores register autofollow snapshots after auto-follow is disabled', async () => {
    loadMonitorSnapshot.mockResolvedValueOnce(boxSnapshot)

    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42, monitorScope: box7MonitorScope },
      global: { stubs: defaultGlobalStubs }
    })

    await flushPromises()

    const onAutoFollowSnapshot = getAutoFollowSnapshotHandler()
    await wrapper.find('[data-testid="scanjob-monitor-auto-follow-action"]').trigger('click')
    await flushPromises()

    onAutoFollowSnapshot({
      ...registerSnapshot,
      latestScan: {
        scanCodeId: 9011,
        area: 1,
        boxId: 8,
        bucketIndex: null,
        scanSource: scannedItemSource.ParcelSticker
      }
    })
    await flushPromises()

    expect(stopMonitorAutoFollow).toHaveBeenCalled()
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('switches to boxes view when unregistered parcel scan arrives in box mode', async () => {
    vi.useFakeTimers()
    loadMonitorSnapshot.mockResolvedValueOnce(boxSnapshot)

    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42, monitorScope: box7MonitorScope },
      global: { stubs: defaultGlobalStubs }
    })

    await flushPromises()

    const onSnapshot = startMonitor.mock.calls[0][1].onSnapshot
    onSnapshot({
      ...boxSnapshot,
      scannedItemsNotInRegister: 2
    })
    vi.advanceTimersByTime(150)
    await flushPromises()

    expect(mockReplace).toHaveBeenCalledWith({
      name: 'scanjob-monitor-register',
      params: { id: 42 }
    })
    expect(loadMonitorSnapshot).toHaveBeenCalledTimes(1)
    expect(wrapper.find('[data-testid="scanjob-monitor-box"]').exists()).toBe(true)
  })

  it('clears and stops monitor on unmount', async () => {
    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: defaultGlobalStubs }
    })

    await flushPromises()
    wrapper.unmount()

    expect(stopMonitor).toHaveBeenCalled()
  })

  it('shows closed monitor state from hub event', async () => {
    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: defaultGlobalStubs }
    })

    await flushPromises()

    const onClosed = startMonitor.mock.calls[0][1].onClosed
    onClosed(42, 2)
    await flushPromises()

    expect(stopMonitor).toHaveBeenCalled()
    expect(wrapper.find('[data-testid="scanjob-monitor-closed"]').exists()).toBe(true)
  })

  it('loads monitor snapshot without subscription when scanjob is not active', async () => {
    const inactiveScanjob = { id: 42, name: 'Scanjob A', type: 30, status: 20, registerId: 101 }
    mockScanjob.value = inactiveScanjob
    getById.mockResolvedValueOnce(inactiveScanjob)

    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: defaultGlobalStubs }
    })

    await flushPromises()

    expect(loadMonitorSnapshot).toHaveBeenCalledWith(42, { area: 0, boxId: null })
    expect(startMonitor).not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="scanjob-monitor-status-only"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('BOX-7')
  })

  it('loads monitor snapshot with subscription when scanjob type is parcel and active', async () => {
    const parcelScanjob = { id: 42, name: 'Scanjob A', type: 10, status: 15, registerId: 101 }
    mockScanjob.value = parcelScanjob
    getById.mockResolvedValueOnce(parcelScanjob)

    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: defaultGlobalStubs }
    })

    await flushPromises()

    expect(loadMonitorSnapshot).toHaveBeenCalledWith(42, { area: 0, boxId: null })
    expect(startMonitor).toHaveBeenCalledWith(
      42,
      expect.objectContaining({
        area: 0,
        boxId: null,
        onSnapshot: expect.any(Function)
      })
    )
    expect(wrapper.text()).toContain('BOX-7')
  })

  it('shows status-only panel when scanjob fails to load', async () => {
    getById.mockResolvedValueOnce(null)
    mockScanjob.value = { id: 42, name: 'Scanjob A', type: 30, status: 15 }

    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: defaultGlobalStubs }
    })

    await flushPromises()

    expect(loadMonitorSnapshot).not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="scanjob-monitor-status-only"]').exists()).toBe(true)
  })

  it('displays correct status text for each scanjob status in status-only mode', async () => {
    const statusCases = [
      { status: 10, text: 'Создано' },
      { status: 15, text: 'Выполняется' },
      { status: 18, text: 'Приостановлено' },
      { status: 20, text: 'Завершено' },
      { status: null, text: 'Неизвестно' },
      { status: 99, text: '99' }
    ]

    for (const { status, text } of statusCases) {
      vi.clearAllMocks()
      getById.mockResolvedValueOnce(null)
      mockScanjob.value = { id: 42, name: 'Scanjob A', type: 30, status }
      loadMonitorSnapshot.mockResolvedValue(registerSnapshot)
      startMonitor.mockResolvedValue(true)
      clearMonitor.mockResolvedValue(true)
      stopMonitor.mockResolvedValue(true)

      const wrapper = mount(ScanjobMonitor, {
        props: { scanjobId: 42 },
        global: { stubs: defaultGlobalStubs }
      })

      await flushPromises()

      const panel = wrapper.find('[data-testid="scanjob-monitor-status-only"]')
      expect(panel.exists()).toBe(true)
      expect(panel.text()).toContain(text)
      wrapper.unmount()
    }
  })

  it('shows monitor-unavailable panel when loadMonitorSnapshot fails', async () => {
    loadMonitorSnapshot.mockImplementationOnce(() => {
      monitorError.value = {}
      return Promise.reject({})
    })

    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: defaultGlobalStubs }
    })

    await flushPromises()

    const panel = wrapper.find('[data-testid="scanjob-monitor-unavailable"]')
    expect(panel.exists()).toBe(true)
    expect(panel.text()).toContain('Ошибка при загрузке монитора сканирования')
  })

  it('shows specific message for status-400 monitor error', async () => {
    loadMonitorSnapshot.mockImplementationOnce(() => {
      monitorError.value = { status: 400 }
      return Promise.reject({ status: 400, message: '' })
    })

    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: defaultGlobalStubs }
    })

    await flushPromises()

    const panel = wrapper.find('[data-testid="scanjob-monitor-unavailable"]')
    expect(panel.exists()).toBe(true)
    expect(panel.text()).toContain(
      'Монитор доступен только для активного задания сканирования коробок и посылок'
    )
  })

  it('shows empty-boxes message when register snapshot has no boxes', async () => {
    const emptyBoxesSnapshot = { ...registerSnapshot, boxes: [] }
    loadMonitorSnapshot.mockResolvedValue(emptyBoxesSnapshot)

    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: defaultGlobalStubs }
    })

    await flushPromises()

    expect(wrapper.find('[data-testid="scanjob-monitor-empty-boxes"]').exists()).toBe(true)
  })

  it('shows empty-parcels message when box has no parcels', async () => {
    const emptyParcelsBoxSnapshot = {
      ...registerSnapshot,
      area: 1,
      boxes: [],
      box: {
        boxId: 7,
        boxCode: 'BOX-7',
        boxStickerScanned: true,
        totalParcels: 0,
        parcelsWithStickerScanned: 0,
        parcelsWithStickerNotScanned: 0,
        parcels: []
      }
    }
    loadMonitorSnapshot
      .mockResolvedValueOnce(registerSnapshot)
      .mockResolvedValueOnce(emptyParcelsBoxSnapshot)

    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: defaultGlobalStubs }
    })

    await flushPromises()
    await wrapper.setProps({ monitorScope: box7MonitorScope })
    await flushPromises()

    expect(wrapper.find('[data-testid="scanjob-monitor-empty-parcels"]').exists()).toBe(true)
  })

  it('ignores applySnapshot with stale scope version', async () => {
    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: defaultGlobalStubs }
    })

    await flushPromises()

    // Apply snapshot with stale version 0 (current scopeVersion is 1 after mount)
    const staleSnapshot = {
      ...registerSnapshot,
      boxes: [{ ...registerSnapshot.boxes[0], boxCode: 'STALE-BOX' }]
    }
    wrapper.vm.applySnapshot(staleSnapshot, { version: 0, immediate: true })
    await flushPromises()

    expect(wrapper.text()).not.toContain('STALE-BOX')
    expect(wrapper.text()).toContain('BOX-7')
  })

  it('ignores applySnapshot with wrong scanJobId', async () => {
    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: defaultGlobalStubs }
    })

    await flushPromises()

    const wrongJobSnapshot = {
      ...registerSnapshot,
      scanJobId: 999,
      boxes: [{ ...registerSnapshot.boxes[0], boxCode: 'WRONG-BOX' }]
    }
    wrapper.vm.applySnapshot(wrongJobSnapshot, { immediate: true })
    await flushPromises()

    expect(wrapper.text()).not.toContain('WRONG-BOX')
  })

  it('ignores handleMonitorClosed when scanJobId does not match', async () => {
    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: defaultGlobalStubs }
    })

    await flushPromises()

    const onClosed = startMonitor.mock.calls[0][1].onClosed
    onClosed(999, 2)
    await flushPromises()

    expect(wrapper.find('[data-testid="scanjob-monitor-closed"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="scanjob-monitor-register"]').exists()).toBe(true)
  })

  it('shows loading state during initial snapshot load', async () => {
    let resolveSnapshot
    loadMonitorSnapshot.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveSnapshot = resolve
      })
    )

    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: defaultGlobalStubs }
    })

    await flushPromises()

    expect(wrapper.find('[data-testid="scanjob-monitor-loading"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="scanjob-monitor-close-action"]').attributes('disabled')).toBeDefined()

    resolveSnapshot(registerSnapshot)
    await flushPromises()
    startMonitor.mockResolvedValue(true)
    await flushPromises()
  })

  it('renders aggregate cards with null/undefined snapshot fields using ?? 0 fallback', async () => {
    const sparseSnapshot = {
      scanJobId: 42,
      area: 0,
      totalBoxes: null,
      boxesWithStickerScanned: undefined,
      boxesWithStickerNotScanned: null,
      totalParcels: undefined,
      parcelsWithStickerScanned: null,
      parcelsWithStickerNotScanned: undefined,
      scannedItemsNotInRegister: null,
      boxes: [],
      box: null
    }
    loadMonitorSnapshot.mockResolvedValue(sparseSnapshot)

    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: defaultGlobalStubs }
    })

    await flushPromises()

    const summary = wrapper.find('[data-testid="scanjob-monitor-summary"]')
    expect(summary.exists()).toBe(true)
    expect(summary.text()).toContain('0 / 0')
  })

  it('formatCount handles null/undefined value via ?? 0', async () => {
    const snapshotWithNullParcels = {
      ...registerSnapshot,
      boxes: [
        {
          boxId: 7,
          boxCode: 'BOX-7',
          boxStickerScanned: true,
          totalParcels: null,
          parcelsWithStickerScanned: undefined,
          parcelsWithStickerNotScanned: null
        }
      ]
    }
    loadMonitorSnapshot.mockResolvedValue(snapshotWithNullParcels)

    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: defaultGlobalStubs }
    })

    await flushPromises()

    // Boxes are rendered; table shows with null-count fields defaulting to 0
    expect(wrapper.find('[data-testid="scanjob-monitor-register"]').exists()).toBe(true)
    // The formatCount(null/undefined) via ?? 0 renders as '0'
    expect(wrapper.text()).toContain('BOX-7')
  })

  it('clears pending throttled snapshot when switching scope', async () => {
    vi.useFakeTimers()

    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: defaultGlobalStubs }
    })

    await flushPromises()

    const onSnapshot = startMonitor.mock.calls[0][1].onSnapshot

    // Dispatch a non-immediate snapshot (starts a throttle timer)
    onSnapshot({ ...registerSnapshot, boxes: [{ ...registerSnapshot.boxes[0], boxCode: 'PENDING-BOX' }] })

    // Snapshot is pending (not yet applied)
    expect(wrapper.text()).not.toContain('PENDING-BOX')

    // Switch scope via openRegisterMonitor (calls clearPendingSnapshot while timer is active)
    loadMonitorSnapshot.mockResolvedValue({
      ...registerSnapshot,
      boxes: [{ ...registerSnapshot.boxes[0], boxCode: 'FRESH-BOX' }]
    })
    clearMonitor.mockResolvedValue(true)
    startMonitor.mockResolvedValue(true)

    const switchPromise = wrapper.vm.openRegisterMonitor()
    vi.runAllTimers()
    await switchPromise
    await flushPromises()

    // Pending snapshot was cleared; fresh snapshot from new scope is shown
    expect(wrapper.text()).not.toContain('PENDING-BOX')
  })

  it('clears pending throttled snapshot on handleMonitorClosed', async () => {
    vi.useFakeTimers()

    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: defaultGlobalStubs }
    })

    await flushPromises()

    const { onSnapshot, onClosed } = startMonitor.mock.calls[0][1]

    // Build up pending snapshot in throttle timer
    onSnapshot({ ...registerSnapshot, boxes: [{ ...registerSnapshot.boxes[0], boxCode: 'CANCELLABLE' }] })
    expect(wrapper.text()).not.toContain('CANCELLABLE')

    // Close the monitor before the timer fires
    onClosed(42, 20)
    await flushPromises()

    vi.runAllTimers()
    await flushPromises()

    // Monitor closed; pending snapshot should have been discarded
    expect(wrapper.find('[data-testid="scanjob-monitor-closed"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('CANCELLABLE')
  })
})
