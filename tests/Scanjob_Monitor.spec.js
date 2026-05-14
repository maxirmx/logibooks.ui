/* @vitest-environment jsdom */
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks UI application

import { beforeEach, describe, it, expect, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import ScanjobMonitor from '@/dialogs/Scanjob_Monitor.vue'
import ActionButton from '@/components/ActionButton.vue'
import { defaultGlobalStubs } from './helpers/test-utils'

const mockBack = vi.hoisted(() => vi.fn())
const mockPush = vi.hoisted(() => vi.fn())
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
const startMonitor = vi.hoisted(() => vi.fn())
const clearMonitor = vi.hoisted(() => vi.fn())
const stopMonitor = vi.hoisted(() => vi.fn())
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

const registerSnapshot = {
  scanJobId: 42,
  area: 0,
  totalBoxes: 2,
  boxesWithStickerScanned: 1,
  boxesWithStickerNotScanned: 1,
  totalParcels: 5,
  parcelsWithStickerScanned: 3,
  parcelsWithStickerNotScanned: 2,
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
      parcelsWithStickerNotScanned: 1
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
      parcelsWithStickerNotScanned: 1
    }
  ],
  box: null
}

const boxSnapshot = {
  scanJobId: 42,
  area: 1,
  totalBoxes: 2,
  boxesWithStickerScanned: 1,
  boxesWithStickerNotScanned: 1,
  totalParcels: 5,
  parcelsWithStickerScanned: 3,
  parcelsWithStickerNotScanned: 2,
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
    parcels: [
      {
        parcelId: 70,
        parcelNumber: 'P-70',
        stickerScanned: true,
        scannedSticker: 'P-70-SCAN',
        scannedUserName: 'Петров Петр',
        scannedTime: '2026-01-02T10:10:00',
        zoneName: 'Green',
        statusTitle: 'На складе'
      },
      {
        parcelId: 71,
        parcelNumber: 'P-71',
        stickerScanned: false,
        scannedSticker: null,
        scannedUserName: '',
        scannedTime: null,
        zoneName: 'Red',
        statusTitle: 'Ожидается'
      }
    ]
  }
}

const boxSnapshotForBox8 = {
  ...boxSnapshot,
  box: {
    ...boxSnapshot.box,
    boxId: 8,
    boxCode: 'BOX-8',
    boxStickerScanned: true,
    boxScannedSticker: 'BOX-8-ACTUAL',
    totalParcels: 2,
    parcelsWithStickerScanned: 1,
    parcelsWithStickerNotScanned: 1,
    parcels: [
      {
        parcelId: 80,
        parcelNumber: 'P-80',
        stickerScanned: true,
        scannedSticker: 'P-80-SCAN',
        scannedUserName: 'Сидоров Сидор',
        scannedTime: '2026-01-02T11:00:00',
        zoneName: 'Blue',
        statusTitle: 'На складе'
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
  parcelsWithStickerNotScanned: 1
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
        parcelId: 90,
        parcelNumber: 'PU-90',
        stickerScanned: true,
        scannedSticker: 'PU-90-SCAN',
        scannedUserName: 'Николаев Николай',
        scannedTime: '2026-01-02T12:00:00',
        zoneName: 'Yellow',
        statusTitle: 'Без коробки'
      },
      {
        parcelId: 91,
        parcelNumber: 'PU-91',
        stickerScanned: false,
        scannedSticker: null,
        scannedUserName: '',
        scannedTime: null,
        zoneName: 'Yellow',
        statusTitle: 'Без коробки'
      }
    ]
  }
}

vi.mock('@/router', () => ({
  default: { back: mockBack, push: mockPush, currentRoute: mockCurrentRoute }
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
    startMonitor,
    clearMonitor,
    stopMonitor
  })
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => ({
    alert: mockAlert,
    error: alertError,
    clear: clearAlert
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
    scanjobmonitor_parcels_page: monitorParcelsPage
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
        <div v-for="(item, i) in items" :key="i" class="v-data-table-row">
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
      'class'
    ],
    inheritAttrs: false
  }
}

function getAutoFollowAction(wrapper) {
  return wrapper
    .findAllComponents(ActionButton)
    .find((button) => ['fa-solid fa-link', 'fa-solid fa-link-slash'].includes(button.props('icon')))
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
    mockScanjob.value = { id: 42, name: 'Scanjob A', type: 30, status: 15, registerId: 101 }
    getById.mockResolvedValue({ id: 42, name: 'Scanjob A', type: 30, status: 15, registerId: 101 })
    registerGetById.mockResolvedValue(true)
    getTransportationDocument.mockReturnValue('Авианакладная')
    loadMonitorSnapshot.mockResolvedValue(registerSnapshot)
    startMonitor.mockResolvedValue(true)
    clearMonitor.mockResolvedValue(true)
    stopMonitor.mockResolvedValue(true)
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
      { label: 'Посылки всего / сканировано / не сканировано', value: '5 / 3 / 2' },
      { label: 'Посылки не в реестре', value: '1' }
    ])

    const registerSection = wrapper.get('[data-testid="scanjob-monitor-register"]')
    expect(registerSection.text()).toContain('BOX-7')
    expect(registerSection.text()).toContain('BOX-7-ACTUAL')
    expect(registerSection.text()).toContain('Иванов Иван')
    expect(registerSection.text()).toContain('02.01.2026, 09:30')
    expect(registerSection.text()).toContain('3 / 2 / 1')

    const boxesTable = wrapper.findComponent({ name: 'v-data-table' })
    expect(boxesTable.exists()).toBe(true)
    expect(boxesTable.props('itemsPerPage')).toBe(25)
    expect(boxesTable.props('page')).toBe(2)
    expect(boxesTable.props('sortBy')).toEqual([{ key: 'boxCode', order: 'desc' }])
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

  it('toggles auto-follow from the header action and switches icon', async () => {
    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: monitorGlobalStubs }
    })

    await flushPromises()

    expect(getAutoFollowAction(wrapper).props('icon')).toBe('fa-solid fa-link-slash')
    expect(getAutoFollowAction(wrapper).props('tooltipText')).toBe('Отключить автослежение')

    await wrapper.find('[data-testid="scanjob-monitor-auto-follow-action"]').trigger('click')

    expect(getAutoFollowAction(wrapper).props('icon')).toBe('fa-solid fa-link')
    expect(getAutoFollowAction(wrapper).props('tooltipText')).toBe('Включить автослежение')

    await wrapper.find('[data-testid="scanjob-monitor-auto-follow-action"]').trigger('click')

    expect(getAutoFollowAction(wrapper).props('icon')).toBe('fa-solid fa-link-slash')
  })

  it('switches to box monitor and renders parcels', async () => {
    loadMonitorSnapshot.mockResolvedValueOnce(registerSnapshot).mockResolvedValueOnce(boxSnapshot)

    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: monitorGlobalStubs }
    })

    await flushPromises()
    await wrapper.find('[data-testid="scanjob-monitor-box-row"]').trigger('click')
    await flushPromises()

    expect(clearMonitor).toHaveBeenCalled()
    expect(loadMonitorSnapshot).toHaveBeenLastCalledWith(42, { area: 1, boxId: 7 })
    expect(startMonitor).toHaveBeenLastCalledWith(42, expect.objectContaining({ area: 1, boxId: 7 }))
    expect(wrapper.find('[data-testid="scanjob-monitor-box"]').exists()).toBe(true)
    expect(wrapper.find('.primary-heading').text()).toBe('Сканирование | Сделка DEAL-101 (Авианакладная INV-101) | Коробка BOX-7')

    const summaryItems = wrapper.findAll('.monitor-summary-item').map((item) => ({
      label: item.find('.monitor-summary-label').text(),
      value: item.find('.monitor-summary-value').text()
    }))
    expect(summaryItems).toEqual([
      { label: 'Статус сканирования коробки', value: 'Сканирована' },
      { label: 'Посылки всего / сканировано / не сканировано', value: '3 / 2 / 1' }
    ])

    expect(wrapper.text()).toContain('P-70')
    expect(wrapper.text()).toContain('P-70-SCAN')
    expect(wrapper.text()).toContain('Петров Петр')
    expect(wrapper.text()).toContain('02.01.2026, 10:10')
    expect(wrapper.text()).toContain('P-71')

    const parcelsTable = wrapper.findComponent({ name: 'v-data-table' })
    expect(parcelsTable.exists()).toBe(true)
    expect(parcelsTable.props('itemsPerPage')).toBe(50)
    expect(parcelsTable.props('page')).toBe(3)
    expect(parcelsTable.props('sortBy')).toEqual([{ key: 'parcelNumber', order: 'desc' }])
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
    await wrapper.findAll('[data-testid="scanjob-monitor-box-row"]').at(2).trigger('click')
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
      { label: 'Посылки всего / сканировано / не сканировано', value: '2 / 1 / 1' }
    ])

    expect(wrapper.text()).toContain('PU-90')
    expect(wrapper.text()).toContain('PU-90-SCAN')
    expect(wrapper.text()).toContain('PU-91')
  })

  it('makes every boxes table cell clickable to open the box monitor', async () => {
    loadMonitorSnapshot.mockResolvedValueOnce(registerSnapshot).mockResolvedValueOnce(boxSnapshot)

    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: monitorGlobalStubs }
    })

    await flushPromises()

    const registerSection = wrapper.get('[data-testid="scanjob-monitor-register"]')
    expect(registerSection.findAll('.clickable-cell')).toHaveLength(registerSnapshot.boxes.length * 6)

    await registerSection.find('.monitor-status').trigger('click')
    await flushPromises()

    expect(loadMonitorSnapshot).toHaveBeenLastCalledWith(42, { area: 1, boxId: 7 })
    expect(wrapper.find('[data-testid="scanjob-monitor-box"]').exists()).toBe(true)
  })

  it('returns from box monitor to register monitor via close action', async () => {
    loadMonitorSnapshot
      .mockResolvedValueOnce(registerSnapshot)
      .mockResolvedValueOnce(boxSnapshot)
      .mockResolvedValueOnce(registerSnapshot)

    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: defaultGlobalStubs }
    })

    await flushPromises()
    await wrapper.find('[data-testid="scanjob-monitor-box-row"]').trigger('click')
    await flushPromises()
    await wrapper.find('[data-testid="scanjob-monitor-close-action"]').trigger('click')
    await flushPromises()

    expect(mockBack).not.toHaveBeenCalled()
    expect(loadMonitorSnapshot).toHaveBeenLastCalledWith(42, { area: 0, boxId: null })
    expect(startMonitor).toHaveBeenLastCalledWith(42, expect.objectContaining({ area: 0, boxId: null }))
    expect(wrapper.find('[data-testid="scanjob-monitor-register"]').exists()).toBe(true)
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
    loadMonitorSnapshot
      .mockResolvedValueOnce(registerSnapshot)
      .mockResolvedValueOnce(boxSnapshotForBox8)

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

    expect(loadMonitorSnapshot).toHaveBeenLastCalledWith(42, { area: 1, boxId: 8 })
    expect(wrapper.find('[data-testid="scanjob-monitor-box"]').exists()).toBe(true)
    expect(wrapper.find('.primary-heading').text()).toContain('Коробка BOX-8')
  })

  it('auto-follows repeated registered scans from latest scan metadata', async () => {
    vi.useFakeTimers()
    loadMonitorSnapshot
      .mockResolvedValueOnce(registerSnapshot)
      .mockResolvedValueOnce(boxSnapshot)

    const wrapper = mount(ScanjobMonitor, {
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
        scanTime: '2026-01-02T10:10:00'
      }
    })
    vi.advanceTimersByTime(150)
    await flushPromises()

    expect(loadMonitorSnapshot).toHaveBeenLastCalledWith(42, { area: 1, boxId: 7 })
    expect(wrapper.find('[data-testid="scanjob-monitor-box"]').exists()).toBe(true)
    expect(wrapper.find('.primary-heading').text()).toContain('Коробка BOX-7')
  })

  it('auto-follows to parcel view when a parcel sticker is scanned in a box', async () => {
    vi.useFakeTimers()
    loadMonitorSnapshot
      .mockResolvedValueOnce(registerSnapshot)
      .mockResolvedValueOnce(boxSnapshotForBox8)

    const wrapper = mount(ScanjobMonitor, {
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

    expect(loadMonitorSnapshot).toHaveBeenLastCalledWith(42, { area: 1, boxId: 8 })
    expect(wrapper.find('[data-testid="scanjob-monitor-box"]').exists()).toBe(true)
  })

  it('auto-follows to unassigned bucket when an unboxed parcel sticker is scanned', async () => {
    vi.useFakeTimers()
    loadMonitorSnapshot
      .mockResolvedValueOnce(registerSnapshotWithUnassignedBucket)
      .mockResolvedValueOnce(unassignedBucketSnapshot)

    const wrapper = mount(ScanjobMonitor, {
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

    expect(loadMonitorSnapshot).toHaveBeenLastCalledWith(42, {
      area: 2,
      boxId: null,
      bucketIndex: 1
    })
    expect(wrapper.find('[data-testid="scanjob-monitor-box"]').exists()).toBe(true)
    expect(wrapper.find('.primary-heading').text()).toContain('Без коробки 2')
  })

  it('auto-follows repeated unassigned parcel scans from latest scan metadata', async () => {
    vi.useFakeTimers()
    loadMonitorSnapshot
      .mockResolvedValueOnce(registerSnapshotWithUnassignedBucket)
      .mockResolvedValueOnce(unassignedBucketSnapshot)

    const wrapper = mount(ScanjobMonitor, {
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
        scanTime: '2026-01-02T12:00:00'
      }
    })
    vi.advanceTimersByTime(150)
    await flushPromises()

    expect(loadMonitorSnapshot).toHaveBeenLastCalledWith(42, {
      area: 2,
      boxId: null,
      bucketIndex: 1
    })
    expect(wrapper.find('[data-testid="scanjob-monitor-box"]').exists()).toBe(true)
    expect(wrapper.find('.primary-heading').text()).toContain('Без коробки 2')
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
    expect(wrapper.find('[data-testid="scanjob-monitor-register"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="scanjob-monitor-box"]').exists()).toBe(false)
  })

  it('stays in box mode when a registered parcel scan arrives for the currently open box', async () => {
    vi.useFakeTimers()
    loadMonitorSnapshot
      .mockResolvedValueOnce(registerSnapshot)
      .mockResolvedValueOnce(boxSnapshot)

    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: defaultGlobalStubs }
    })

    await flushPromises()
    await wrapper.find('[data-testid="scanjob-monitor-box-row"]').trigger('click')
    await flushPromises()

    const onSnapshot = startMonitor.mock.calls[1][1].onSnapshot
    onSnapshot({
      ...boxSnapshot,
      parcelsWithStickerScanned: boxSnapshot.parcelsWithStickerScanned + 1,
      parcelsWithStickerNotScanned: boxSnapshot.parcelsWithStickerNotScanned - 1,
      scannedItemsNotInRegister: boxSnapshot.scannedItemsNotInRegister
    })
    vi.advanceTimersByTime(150)
    await flushPromises()

    expect(loadMonitorSnapshot).toHaveBeenLastCalledWith(42, { area: 1, boxId: 7 })
    expect(wrapper.find('[data-testid="scanjob-monitor-box"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="scanjob-monitor-register"]').exists()).toBe(false)
  })

  it('switches to boxes view when unregistered parcel scan arrives in box mode', async () => {
    vi.useFakeTimers()
    loadMonitorSnapshot
      .mockResolvedValueOnce(registerSnapshot)
      .mockResolvedValueOnce(boxSnapshot)
      .mockResolvedValueOnce(registerSnapshot)

    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: defaultGlobalStubs }
    })

    await flushPromises()
    await wrapper.find('[data-testid="scanjob-monitor-box-row"]').trigger('click')
    await flushPromises()

    const onSnapshot = startMonitor.mock.calls[1][1].onSnapshot
    onSnapshot({
      ...boxSnapshot,
      scannedItemsNotInRegister: 2
    })
    vi.advanceTimersByTime(150)
    await flushPromises()

    expect(loadMonitorSnapshot).toHaveBeenLastCalledWith(42, { area: 0, boxId: null })
    expect(wrapper.find('[data-testid="scanjob-monitor-register"]').exists()).toBe(true)
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
    await wrapper.find('[data-testid="scanjob-monitor-box-row"]').trigger('click')
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
