/* @vitest-environment jsdom */
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks UI application

import { beforeEach, describe, it, expect, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import ScanjobMonitor from '@/dialogs/Scanjob_Monitor.vue'
import { defaultGlobalStubs } from './helpers/test-utils'
import { OP_MODE_WAREHOUSE } from '@/helpers/op.mode.js'
import { useLabelPrintingStore } from '@/stores/label.printing.store.js'

const manualConfirm = vi.hoisted(() => vi.fn().mockResolvedValue(true))
vi.mock('@/composables/useAppConfirm.js', () => ({ useAppConfirm: () => manualConfirm }))
vi.mock('@/services/qz.printing.js', async (original) => {
  const actual = await original()
  const { reactive } = await import('vue')
  return { ...actual, createQzPrinting: () => ({
    state: reactive({ connected: true, printer: 'TSC TE200', printers: ['TSC TE200'] }),
    restoreSelection: vi.fn(), onDisconnect: vi.fn(), connect: vi.fn().mockResolvedValue(['TSC TE200']),
    ready: vi.fn().mockResolvedValue(), submit: vi.fn().mockResolvedValue(), disconnect: vi.fn().mockResolvedValue()
  }) }
})

const mockBack = vi.hoisted(() => vi.fn())
const mockPush = vi.hoisted(() => vi.fn())
const mockReplace = vi.hoisted(() => vi.fn())
const mockCurrentRoute = vi.hoisted(() => ({
  value: { fullPath: '/scanjobs/42/monitor' }
}))
const dismissAlert = vi.hoisted(() => vi.fn())
const alertError = vi.hoisted(() => vi.fn(() => 71))
const alertSuccess = vi.hoisted(() => vi.fn())
const alertInfo = vi.hoisted(() => vi.fn())
const mockAlert = await vi.hoisted(async () => {
  const { ref } = await import('vue')
  return ref(null)
})
const mockScanjob = vi.hoisted(() => ({
  __v_isRef: true,
  value: { id: 42, name: 'Scanjob A', type: 30, operation: 30, status: 15, registerId: 101 }
}))
const getById = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ id: 42, name: 'Scanjob A', type: 30, operation: 30, status: 15, registerId: 101 })
)
const manualScanParcel = vi.hoisted(() => vi.fn())
const manualScanParcels = vi.hoisted(() => vi.fn())
const manualScanBox = vi.hoisted(() => vi.fn())
const exportStickers = vi.hoisted(() => vi.fn())
const exportRegisterStickers = vi.hoisted(() => vi.fn())
vi.mock('@/stores/boxes.store.js', () => ({ useBoxesStore: () => ({
  downloadStickers: exportStickers,
  downloadRegisterStickers: exportRegisterStickers
}) }))
const mockRegisterItem = vi.hoisted(() => ({
  id: 101,
  dealNumber: 'DEAL-101',
  invoiceNumber: 'INV-101',
  transportationTypeCode: 1
}))
const registerGetById = vi.hoisted(() => vi.fn().mockResolvedValue(true))
const getTransportationDocument = vi.hoisted(() => vi.fn(() => 'Авианакладная'))
const monitorLoading = await vi.hoisted(async () => {
  const { ref } = await import('vue')
  return ref(false)
})
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
const loadMonitorFollowUsers = vi.hoisted(() => vi.fn())
const startMonitor = vi.hoisted(() => vi.fn())
const clearMonitor = vi.hoisted(() => vi.fn())
const stopMonitor = vi.hoisted(() => vi.fn())
const startMonitorFollowUser = vi.hoisted(() => vi.fn())
const clearMonitorFollowUser = vi.hoisted(() => vi.fn())
const setScanjobMonitorFollowUserId = vi.hoisted(() => vi.fn())
const persistedFollowUserId = vi.hoisted(() => ({
  __v_isRef: true,
  value: null
}))
const setDefect = vi.hoisted(() => vi.fn().mockResolvedValue(true))
const clearDefect = vi.hoisted(() => vi.fn().mockResolvedValue(true))
const clearExtId = vi.hoisted(() => vi.fn().mockResolvedValue(true))
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
const WBRN_REGISTER_TYPE = 2 * 1024 * 1024 + 2
const registerMonitorScope = { area: 0, boxId: null, bucketIndex: null }
const box7MonitorScope = { area: 1, boxId: 7, bucketIndex: null }
const unassignedBucket1MonitorScope = { area: 2, boxId: null, bucketIndex: 1 }

const registerSnapshot = {
  scanJobId: 42,
  registerType: WBRN_REGISTER_TYPE,
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
      lengthCm: 10.5,
      widthCm: 20,
      heightCm: 30.25,
      weightKg: 4.125,
      boxStickerScanned: true,
      boxSticker: 'BOX-7-ACTUAL',
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
      boxSticker: null,
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
  registerType: WBRN_REGISTER_TYPE,
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
    area: 1,
    boxId: 7,
    boxCode: 'BOX-7',
    lengthCm: 10.5,
    widthCm: 20,
    heightCm: 30.25,
    weightKg: 4.125,
    boxStickerScanned: true,
    boxSticker: 'BOX-7-ACTUAL',
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
  boxSticker: null,
  boxScannedUserName: '',
  boxScannedTime: null,
  totalParcels: 2,
  parcelsWithStickerScanned: 1,
  parcelsWithStickerNotScanned: 1,
  restrictedParcels: 1
}

const registerSnapshotWithUnassignedBucket = {
  ...registerSnapshot,
  boxes: [...registerSnapshot.boxes, unassignedBucketRow]
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

vi.mock(
  '@/router',
  () => ({
    default: {
      back: mockBack,
      push: mockPush,
      replace: mockReplace,
      currentRoute: mockCurrentRoute
    }
  }),
  { virtual: true }
)

vi.mock('@/stores/scanjobs.store.js', () => ({
  useScanjobsStore: () => ({
    ops: { constants: { inProgressStatus: 15, parcelOnlyType: 10, boxOnlyType: 20, parcelScanSource: 10, lookupOperation: 30 } },
    ensureOpsLoaded: vi.fn().mockResolvedValue(true),
    getScanJobLabel: job => `#${job.id}`,
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
    scanParcel: manualScanParcel,
    scanParcels: manualScanParcels,
    scanBox: manualScanBox,
    loadMonitorSnapshot,
    resolveMonitorTarget,
    loadMonitorFollowUsers,
    startMonitor,
    clearMonitor,
    stopMonitor,
    startMonitorFollowUser,
    clearMonitorFollowUser
  })
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => ({
    get alert() { return mockAlert.value },
    error: alertError,
    success: alertSuccess,
    info: alertInfo,
    dismiss: dismissAlert
  })
}))

vi.mock('@/stores/parcels.store.js', () => ({
  useParcelsStore: () => ({
    setDefect,
    clearDefect,
    clearExtId
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
    get scanjobmonitor_follow_user_id() {
      return persistedFollowUserId.value
    },
    setScanjobMonitorFollowUserId,
    hasLogistRole,
    isAdmin,
    isWhManager,
    get isWhManagerPlus() { return isAdmin.value || isWhManager.value || isShiftLead.value },
    isShiftLead
  })
}))

vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  return {
    ...actual,
    storeToRefs: (store) => {
      if (store.$id) return actual.storeToRefs(store)
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
  'v-menu': true,
  'font-awesome-icon': {
    props: ['icon'],
    template: '<i :data-icon="icon" class="fa-stub"></i>'
  },
  'v-select': {
    name: 'v-select',
    template: '<div class="v-select-stub" data-testid="v-select" tabindex="0" v-bind="$attrs"></div>',
    methods: { focus() { this.$el.focus() } },
    props: [
      'modelValue',
      'items',
      'itemTitle',
      'itemValue',
      'density',
      'variant',
      'label',
      'hint',
      'persistentHint',
      'hideDetails',
      'loading',
      'disabled'
    ],
    emits: ['update:modelValue'],
    inheritAttrs: false
  },
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

async function getFollowUserSelect(wrapper) {
  if (!wrapper.find('[data-testid="scanjob-monitor-follow-user-select"]').exists()) {
    await wrapper.get('[data-testid="scanjob-monitor-follow-user-open"]').trigger('click')
  }
  return wrapper.getComponent('[data-testid="scanjob-monitor-follow-user-select"]')
}
async function openJump(wrapper) {
  if (!wrapper.find('[data-testid="scanjob-monitor-jump-input"]').exists()) {
    await wrapper.get('[data-testid="scanjob-monitor-jump-open"]').trigger('click')
  }
}

function getFollowEventHandler() {
  const call = startMonitorFollowUser.mock.calls[startMonitorFollowUser.mock.calls.length - 1]
  return call?.[2]?.onFollowEvent
}

describe('Scanjob_Monitor.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.useRealTimers()
    vi.clearAllMocks()
    manualConfirm.mockReset().mockResolvedValue(true)
    mockCurrentRoute.value = { fullPath: '/scanjobs/42/monitor' }
    mockAlert.value = null
    dismissAlert.mockImplementation(id => {
      if (mockAlert.value?.id === id) mockAlert.value = null
    })
    alertError.mockImplementation((error) => {
      mockAlert.value = { id: 71, severity: 'error', message: error?.message || String(error) }
      return 71
    })
    monitorLoading.value = false
    monitorError.value = null
    monitorClosed.value = null
    monitorBoxesPerPage.value = 25
    monitorBoxesSortBy.value = [{ key: 'boxCode', order: 'desc' }]
    monitorBoxesPage.value = 2
    monitorParcelsPerPage.value = 50
    monitorParcelsSortBy.value = [{ key: 'parcelNumber', order: 'desc' }]
    monitorParcelsPage.value = 3
    persistedFollowUserId.value = null
    hasLogistRole.value = true
    isAdmin.value = false
    isWhManager.value = false
    isShiftLead.value = false
    mockScanjob.value = { id: 42, name: 'Scanjob A', type: 30, operation: 30, status: 15, registerId: 101 }
    getById.mockResolvedValue({ id: 42, name: 'Scanjob A', type: 30, operation: 30, status: 15, registerId: 101 })
    mockRegisterItem.invoiceNumber = 'INV-101'
    delete mockRegisterItem.readOnly
    registerGetById.mockResolvedValue(true)
    getTransportationDocument.mockReturnValue('Авианакладная')
    loadMonitorSnapshot.mockResolvedValue(registerSnapshot)
    resolveMonitorTarget.mockResolvedValue({ kind: 0, number: 'MISSING' })
    loadMonitorFollowUsers.mockResolvedValue([
      { id: 17, displayName: 'Operator A', email: 'operator-a@example.com' },
      { id: 18, displayName: 'Operator B', email: 'operator-b@example.com' }
    ])
    startMonitor.mockResolvedValue(true)
    clearMonitor.mockResolvedValue(true)
    stopMonitor.mockResolvedValue(true)
    startMonitorFollowUser.mockResolvedValue(true)
    clearMonitorFollowUser.mockResolvedValue(true)
    setScanjobMonitorFollowUserId.mockImplementation((userId) => {
      const parsed = Number(userId)
      persistedFollowUserId.value = Number.isInteger(parsed) && parsed > 0 ? parsed : null
    })
  })

  it('exports the party from its boxes monitor header, with retry after one visible failure', async () => {
    isWhManager.value = true
    exportRegisterStickers.mockRejectedValueOnce(new Error('У коробки отсутствует код стикера')).mockResolvedValueOnce(true)
    loadMonitorSnapshot.mockResolvedValueOnce(registerSnapshot).mockResolvedValueOnce(boxSnapshot)
    const wrapper = mount(ScanjobMonitor, { props: { scanjobId: 42 }, global: { stubs: monitorGlobalStubs } })
    await flushPromises()
    const button = wrapper.get('button[data-testid="register-export-stickers"]')
    const headerButtons = [...button.element.closest('.header-actions-group').querySelectorAll('button')]
    expect(headerButtons.at(-2)).toBe(button.element)
    await button.trigger('click')
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('У коробки отсутствует код стикера')
    expect(alertError).toHaveBeenCalledOnce()
    await button.trigger('click')
    await flushPromises()
    expect(exportRegisterStickers.mock.calls).toEqual([[101], [101]])
    await wrapper.setProps({ monitorScope: box7MonitorScope })
    await flushPromises()
    expect(wrapper.find('[data-testid="register-export-stickers"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('preserves jump input on a resolved navigation failure and allows retry', async () => {
    const navigationRouter = createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: {} }, { path: '/blocked', component: {} }] })
    await navigationRouter.push('/')
    navigationRouter.beforeEach(() => false)
    const failure = await navigationRouter.push('/blocked')
    mockPush.mockResolvedValueOnce(failure)
    resolveMonitorTarget.mockResolvedValue({ kind: 1, boxId: 7 })
    const wrapper = mount(ScanjobMonitor, { props: { scanjobId: 42 }, global: { stubs: monitorGlobalStubs } })
    await flushPromises()
    await openJump(wrapper)
    await wrapper.get('[data-testid="scanjob-monitor-jump-input"]').setValue('BOX-7')
    await wrapper.get('[data-testid="scanjob-monitor-jump-action"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-testid="scanjob-monitor-jump-input"]').element.value).toBe('BOX-7')
    expect(wrapper.get('[role="alert"]').text()).toContain(failure.message)
    expect(alertError).toHaveBeenCalledOnce()
    await wrapper.get('[data-testid="scanjob-monitor-jump-action"]').trigger('click')
    await flushPromises()
    expect(resolveMonitorTarget).toHaveBeenNthCalledWith(2, 42, 'BOX-7')
    expect(wrapper.find('[data-testid="scanjob-monitor-jump-input"]').exists()).toBe(false)
  })

  it('shows scanner stop and persistence failures in the page region and preserves retry input', async () => {
    const wrapper = mount(ScanjobMonitor, { props: { scanjobId: 42 }, global: { stubs: monitorGlobalStubs } })
    await flushPromises()
    const selection = await getFollowUserSelect(wrapper)
    selection.vm.$emit('update:modelValue', 17)
    clearMonitorFollowUser.mockRejectedValueOnce(new Error('Ошибка остановки'))
    await wrapper.get('[data-testid="scanjob-monitor-follow-user-apply"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('Ошибка остановки')
    expect(startMonitorFollowUser).not.toHaveBeenCalled()
    setScanjobMonitorFollowUserId.mockImplementationOnce(() => { throw new Error('Ошибка сохранения') })
    await wrapper.get('[data-testid="scanjob-monitor-follow-user-apply"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('Ошибка сохранения')
    expect((await getFollowUserSelect(wrapper)).props('modelValue')).toBe(17)
    await wrapper.get('[data-testid="scanjob-monitor-follow-user-apply"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="scanjob-monitor-follow-user-select"]').exists()).toBe(false)
  })

  it.each(['', null, undefined])('uses the existing heading fallback for an unnamed scanjob: %j', async (name) => {
    mockScanjob.value = { ...mockScanjob.value, name }
    getById.mockResolvedValue(mockScanjob.value)
    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: monitorGlobalStubs }
    })
    await flushPromises()

    expect(wrapper.get('.primary-heading').text()).toBe(
      'Результаты сканирования (Авианакладная INV-101) | Коробки'
    )
    wrapper.unmount()
    await flushPromises()
  })

  it('shows the saved name when the scanjob has no register', async () => {
    mockScanjob.value = { ...mockScanjob.value, registerId: null }
    getById.mockResolvedValue(mockScanjob.value)
    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: monitorGlobalStubs }
    })
    await flushPromises()

    expect(wrapper.get('.primary-heading').text()).toBe('Scanjob A | Коробки')
    wrapper.unmount()
    await flushPromises()
  })

  it('retains the missing document placeholder alongside the saved name', async () => {
    mockRegisterItem.invoiceNumber = null
    getTransportationDocument.mockReturnValue('')
    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: monitorGlobalStubs }
    })
    await flushPromises()

    expect(wrapper.get('.primary-heading').text()).toBe('Scanjob A (ТСД отсутствует) | Коробки')
    wrapper.unmount()
    await flushPromises()
  })

  it('alerts when jump input is empty', async () => {
    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: monitorGlobalStubs }
    })

    await flushPromises()
    // Input is empty; button is disabled, so trigger via keydown.enter on the input field
    await openJump(wrapper)
    const form = wrapper.get('[data-testid="scanjob-monitor-jump"]')
    await form.trigger('submit')
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain('Введите номер посылки или коробки')
    expect(wrapper.get('[role="alert"]').element.previousElementSibling.className).toBe('scanjob-monitor-editor-row')
    expect(alertError).not.toHaveBeenCalled()
    expect(resolveMonitorTarget).not.toHaveBeenCalled()
  })

  it('shows jump loading spinner while resolving', async () => {
    let resolveTarget
    resolveMonitorTarget.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveTarget = resolve
      })
    )

    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: monitorGlobalStubs }
    })

    await flushPromises()
    await openJump(wrapper)
    await wrapper.get('[data-testid="scanjob-monitor-jump-input"]').setValue('BOX-7')
    await wrapper.get('[data-testid="scanjob-monitor-jump-action"]').trigger('click')

    expect(wrapper.find('[data-testid="scanjob-monitor-operation-loading"]').exists()).toBe(true)

    resolveTarget({ kind: 0 })
    await flushPromises()

    expect(wrapper.find('[data-testid="scanjob-monitor-operation-loading"]').exists()).toBe(false)
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
    await openJump(wrapper)
    await wrapper.get('[data-testid="scanjob-monitor-jump-input"]').setValue('BADPARCEL')
    await wrapper.get('[data-testid="scanjob-monitor-jump-action"]').trigger('click')
    await flushPromises()

    expect(alertError).toHaveBeenCalledWith('Посылка или коробка не найдена')
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('shows fallback error message when resolveMonitorTarget throws without message', async () => {
    resolveMonitorTarget.mockRejectedValueOnce({})
    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: monitorGlobalStubs }
    })

    await flushPromises()
    await openJump(wrapper)
    await wrapper.get('[data-testid="scanjob-monitor-jump-input"]').setValue('BOX-7')
    await wrapper.get('[data-testid="scanjob-monitor-jump-action"]').trigger('click')
    await flushPromises()

    expect(alertError).toHaveBeenCalledWith('Ошибка при поиске посылки или коробки')
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
    await openJump(wrapper)
    await wrapper.get('[data-testid="scanjob-monitor-jump-input"]').setValue('P-71')
    await wrapper.get('[data-testid="scanjob-monitor-jump-action"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('.monitor-followed-parcel-row').exists()).toBe(true)

    loadMonitorSnapshot.mockResolvedValue(registerSnapshot)
    clearMonitor.mockResolvedValue(true)
    await wrapper.vm.openRegisterMonitor()
    await flushPromises()

    expect(wrapper.find('.monitor-followed-parcel-row').exists()).toBe(false)
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

    await openJump(wrapper)

    await wrapper.get('[data-testid="scanjob-monitor-jump-input"]').setValue('BOX-SAME')
    await wrapper.get('[data-testid="scanjob-monitor-jump-action"]').trigger('click')
    await flushPromises()

    expect(mockPush.mock.calls.length).toBe(pushCallsBefore)
    expect(mockReplace.mock.calls.length).toBe(replaceCallsBefore)
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

  it('clears follow user selection on Escape', async () => {
    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: monitorGlobalStubs }
    })

    await flushPromises()

    const selection = await getFollowUserSelect(wrapper)
    selection.vm.$emit('update:modelValue', 17)
    await wrapper.get('[data-testid="scanjob-monitor-follow-user-apply"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('button[data-testid="scanjob-monitor-follow-user-open"]').classes()).toContain('anti-btn-green')
    const clearCallsBeforeEscape = clearMonitorFollowUser.mock.calls.length
    await (await getFollowUserSelect(wrapper)).trigger('keydown', { key: 'Escape' })
    await flushPromises()

    expect(wrapper.get('button[data-testid="scanjob-monitor-follow-user-open"]').classes()).not.toContain('anti-btn-green')
    expect((await getFollowUserSelect(wrapper)).props('modelValue')).toBeNull()
    expect(setScanjobMonitorFollowUserId).toHaveBeenLastCalledWith(null)
    expect(clearMonitorFollowUser.mock.calls.length).toBeGreaterThan(clearCallsBeforeEscape)
  })

  it('opens parcel edit with the unassigned monitor return context', async () => {
    mockCurrentRoute.value = { fullPath: '/scanjobs/42/monitor/unassigned/1' }
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

    wrapper.findComponent({ name: 'Scanjob_Parcels_Monitor' }).vm.$emit('edit-parcel', { id: 90 })
    await flushPromises()

    expect(mockPush).toHaveBeenCalledWith({
      name: 'Редактирование посылки',
      params: { id: 90, registerId: 101 },
      query: {
        mode: OP_MODE_WAREHOUSE,
        returnUrl: '/scanjobs/42/monitor/unassigned/1'
      }
    })
  })

  it.each(['snapshot', 'scanjob', 'register'])('allows parcel printing with a read-only %s while blocking parcel changes', async (source) => {
    isAdmin.value = true
    const parcel = { ...boxSnapshot.box.parcels[0], extId: '77', printableTemplates: ['WBRN', 'TJ_EXPORT'] }
    const snapshot = { ...boxSnapshot, readOnly: source === 'snapshot', box: { ...boxSnapshot.box, parcels: [parcel] } }
    if (source === 'scanjob') mockScanjob.value = { ...mockScanjob.value, readOnly: true }
    if (source === 'register') mockRegisterItem.readOnly = true
    loadMonitorSnapshot.mockResolvedValueOnce(snapshot)
    const printing = useLabelPrintingStore()
    const print = vi.spyOn(printing, 'printParcel').mockResolvedValue(true)
    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42, monitorScope: box7MonitorScope }, global: { stubs: monitorGlobalStubs }
    })
    await flushPromises()
    expect(wrapper.get('.read-only-notice').isVisible()).toBe(true)
    for (const id of ['scanjob-clear-ext-id-action', 'scanjob-set-defect-action', 'scanjob-clear-defect-action']) {
      const action = wrapper.get(`button[data-testid="${id}"]`)
      expect(action.element.disabled).toBe(true)
      await action.trigger('click')
    }
    const panel = wrapper.getComponent({ name: 'Scanjob_Parcels_Monitor' })
    for (const event of ['clear-ext-id', 'set-defect', 'clear-defect']) panel.vm.$emit(event, parcel)
    await flushPromises()
    expect(clearExtId).not.toHaveBeenCalled()
    expect(setDefect).not.toHaveBeenCalled()
    expect(clearDefect).not.toHaveBeenCalled()
    for (const id of ['monitor-print-label', 'monitor-print-invoice']) {
      const action = wrapper.get(`button[data-testid="${id}"]`)
      expect(action.element.disabled).toBe(false)
      await action.trigger('click'); await flushPromises()
    }
    expect(print.mock.calls).toEqual([[{ parcelId: 70, template: 'WBRN' }], [{ parcelId: 70, template: 'TJ_EXPORT' }]])
    print.mockRestore()
    wrapper.unmount()
  })

  it('clears a KGT number through box details, keeps failures visible once and retries', async () => {
    isAdmin.value = true
    const snapshot = { ...boxSnapshot, box: { ...boxSnapshot.box,
      parcels: [{ ...boxSnapshot.box.parcels[0], id: undefined, parcelId: 70, extId: '77' }]
    } }
    loadMonitorSnapshot.mockResolvedValueOnce(snapshot)
    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42, monitorScope: box7MonitorScope }, global: { stubs: monitorGlobalStubs }
    })
    await flushPromises()
    clearExtId.mockRejectedValueOnce(new Error('clear failed'))
    const action = wrapper.get('[data-testid="scanjob-clear-ext-id-action"]')
    await action.trigger('click'); await flushPromises()
    expect(clearExtId).toHaveBeenCalledWith(70)
    expect(alertError).toHaveBeenCalledExactlyOnceWith('clear failed')
    expect(wrapper.get('[data-testid="page-alert-region"]').text()).toContain('clear failed')
    expect(mockPush).not.toHaveBeenCalled()
    loadMonitorSnapshot.mockResolvedValueOnce(snapshot)
    await action.trigger('click'); await flushPromises()
    expect(clearExtId).toHaveBeenCalledTimes(2)
    expect(loadMonitorSnapshot).toHaveBeenLastCalledWith(42, { area: 1, boxId: 7 })
    expect(alertError).toHaveBeenCalledOnce()
    const panel = wrapper.getComponent({ name: 'Scanjob_Parcels_Monitor' })
    panel.vm.$emit('clear-ext-id', { parcelId: 70, extId: null }); await flushPromises()
    expect(clearExtId).toHaveBeenCalledTimes(2)
    wrapper.unmount()
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

  it('makes every boxes table cell clickable and routes to the box monitor', async () => {
    loadMonitorSnapshot.mockResolvedValueOnce(registerSnapshot)

    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: monitorGlobalStubs }
    })

    await flushPromises()

    const registerSection = wrapper.get('[data-testid="scanjob-monitor-register"]')
    const listActions = registerSection.findAll('button[data-testid="box-parcels-action"]')
    expect(listActions).toHaveLength(registerSnapshot.boxes.length)
    expect(listActions[0].element.closest('.actions-container').querySelector('button')).toBe(listActions[0].element)
    expect(listActions[0].attributes('aria-label')).toBe('Список посылок')
    await listActions[0].trigger('click'); await flushPromises()
    expect(mockPush).toHaveBeenCalledExactlyOnceWith({
      name: 'scanjob-monitor-box', params: { id: 42, boxId: 7 }
    })
    mockPush.mockClear()
    monitorLoading.value = true; await flushPromises()
    expect(listActions[0].element.disabled).toBe(true)
    await listActions[0].trigger('click')
    expect(mockPush).not.toHaveBeenCalled()
    monitorLoading.value = false; await flushPromises()
    expect(registerSection.findAll('.clickable-cell')).toHaveLength(
      registerSnapshot.boxes.length * 8
    )

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
    loadMonitorSnapshot.mockResolvedValueOnce(registerSnapshot).mockResolvedValueOnce(boxSnapshot)

    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: monitorGlobalStubs }
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

  it('ignores route scope updates until scanjob data is loaded', async () => {
    let resolveScanjob
    getById.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveScanjob = resolve
      })
    )

    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: monitorGlobalStubs }
    })

    await wrapper.setProps({ monitorScope: box7MonitorScope })
    await flushPromises()

    expect(loadMonitorSnapshot).not.toHaveBeenCalled()
    expect(wrapper.get('.primary-heading').text()).toBe('Загрузка задания на сканирование... | Коробки')

    resolveScanjob({ id: 42, name: 'Scanjob A', type: 30, operation: 30, status: 15, registerId: 101 })
    await flushPromises()

    expect(loadMonitorSnapshot).toHaveBeenCalledWith(42, { area: 1, boxId: 7 })
  })

  it('reloads monitor when scanjob id changes', async () => {
    loadMonitorSnapshot.mockResolvedValueOnce(registerSnapshot)

    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: monitorGlobalStubs }
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
    expect(startMonitor).toHaveBeenLastCalledWith(
      43,
      expect.objectContaining({ area: 0, boxId: null })
    )
  })

  it('shows status-only panel when scanjob id changes and ignores closed state from the previous scanjob', async () => {
    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: monitorGlobalStubs }
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
      global: { stubs: monitorGlobalStubs }
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

  it('shows box inspection advice and committed recovery counts independently', async () => {
    vi.useFakeTimers()
    persistedFollowUserId.value = 17
    const recovery = { ...registerSnapshot, returnRecovery: { remaining: 2, recovered: 0 } }
    loadMonitorSnapshot.mockResolvedValue(recovery)
    const wrapper = mount(ScanjobMonitor, { props: { scanjobId: 42 }, global: { stubs: monitorGlobalStubs } })
    await flushPromises()

    const follow = getFollowEventHandler()
    await follow({
      scanJobId: 42, userId: 17,
      recoveryBoxAdvice: {
        boxNumber: 'ORIGINAL-BOX',
        instruction: 'Откройте коробку и проверьте посылки',
        candidateParcelNumbers: ['P1', 'P2']
      }
    })
    const advice = wrapper.get('[data-testid="scanjob-recovery-box-advice"]')
    expect(advice.text()).toContain('Коробка ORIGINAL-BOX')
    expect(advice.text()).toContain('Откройте коробку и проверьте посылки')
    expect(advice.text()).toContain('Посылки P1, P2')
    expect(wrapper.text()).toContain('Найдено при поиске0')
    expect(mockReplace).not.toHaveBeenCalled()

    loadMonitorSnapshot.mockResolvedValue({ ...recovery, returnRecovery: { remaining: 1, recovered: 1 } })
    await follow({ scanJobId: 42, userId: 17, recoveryConfirmed: true })
    expect(wrapper.find('[data-testid="scanjob-recovery-box-advice"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="scanjob-recovery-confirmed"]').text()).toContain('Посылка найдена при поиске')
    expect(wrapper.text()).toContain('Найдено при поиске1')
    startMonitor.mock.calls[0][1].onSnapshot({ ...recovery, returnRecovery: { remaining: 0, recovered: 2 } })
    vi.advanceTimersByTime(150)
    await flushPromises()
    expect(wrapper.text()).toContain('Осталось найти0')
    expect(wrapper.text()).toContain('Найдено при поиске2')
    wrapper.unmount()
  })

  it('opens the saved Inbound verification result for a completed job', async () => {
    const completed = { ...mockScanjob.value, status: 20, operation: 10 }
    mockScanjob.value = completed
    getById.mockResolvedValue(completed)
    loadMonitorSnapshot.mockResolvedValue({
      ...registerSnapshot, status: 20, returnVerification: { expected: 9, confirmed: 7, missing: 2 }
    })
    const wrapper = mount(ScanjobMonitor, { props: { scanjobId: 42 }, global: { stubs: monitorGlobalStubs } })
    await flushPromises()
    expect(wrapper.text()).toContain('Проверка красной зоны')
    expect(wrapper.text()).toContain('9 / 7 / 2')
    expect(startMonitor).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('refreshes and highlights same-scope follow event', async () => {
    persistedFollowUserId.value = 17
    loadMonitorSnapshot.mockResolvedValueOnce(boxSnapshot).mockResolvedValueOnce({
      ...boxSnapshot,
      box: {
        ...boxSnapshot.box,
        parcels: boxSnapshot.box.parcels
      }
    })

    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42, monitorScope: box7MonitorScope },
      global: { stubs: monitorGlobalStubs }
    })

    await flushPromises()

    await getFollowEventHandler()({
      scanJobId: 42,
      userId: 17,
      followTarget: {
        area: 1,
        boxId: 7,
        parcelId: 71
      }
    })
    await flushPromises()

    expect(loadMonitorSnapshot).toHaveBeenLastCalledWith(42, { area: 1, boxId: 7 })
    expect(mockReplace).not.toHaveBeenCalled()
    expect(wrapper.find('.monitor-followed-parcel-row').exists()).toBe(true)
  })

  it('follows selected user event back to register for not-in-register target', async () => {
    persistedFollowUserId.value = 17
    loadMonitorSnapshot.mockResolvedValueOnce(boxSnapshot)

    mount(ScanjobMonitor, {
      props: { scanjobId: 42, monitorScope: box7MonitorScope },
      global: { stubs: monitorGlobalStubs }
    })

    await flushPromises()

    await getFollowEventHandler()({
      scanJobId: 42,
      userId: 17,
      followTarget: {
        area: 3
      }
    })
    await flushPromises()

    expect(mockReplace).toHaveBeenCalledWith({
      name: 'scanjob-monitor-register',
      params: { id: 42 }
    })
  })

  it('refreshes register for selected user not-in-register event already on register', async () => {
    persistedFollowUserId.value = 17

    mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: monitorGlobalStubs }
    })

    await flushPromises()
    loadMonitorSnapshot.mockClear()
    mockReplace.mockClear()

    await getFollowEventHandler()({
      scanJobId: 42,
      userId: 17,
      followTarget: {
        area: 3
      }
    })
    await flushPromises()

    expect(loadMonitorSnapshot).toHaveBeenCalledWith(42, { area: 0, boxId: null })
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('ignores follow events for unrelated users', async () => {
    persistedFollowUserId.value = 17

    mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: monitorGlobalStubs }
    })

    await flushPromises()

    await getFollowEventHandler()({
      scanJobId: 42,
      userId: 18,
      followTarget: {
        area: 1,
        boxId: 8
      }
    })
    await flushPromises()

    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('loads monitor snapshot without subscription when scanjob is not active', async () => {
    const inactiveScanjob = { id: 42, name: 'Scanjob A', type: 30, status: 20, registerId: 101 }
    mockScanjob.value = inactiveScanjob
    getById.mockResolvedValueOnce(inactiveScanjob)

    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: monitorGlobalStubs }
    })

    await flushPromises()

    expect(loadMonitorSnapshot).toHaveBeenCalledWith(42, { area: 0, boxId: null })
    expect(startMonitor).not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="scanjob-monitor-status-only"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('BOX-7')
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
        global: { stubs: monitorGlobalStubs }
      })

      await flushPromises()

      const panel = wrapper.find('[data-testid="scanjob-monitor-status-only"]')
      expect(panel.exists()).toBe(true)
      expect(panel.text()).toContain(text)
      wrapper.unmount()
    }
  })

  it('shows specific message for status-400 monitor error', async () => {
    loadMonitorSnapshot.mockImplementationOnce(() => {
      monitorError.value = { status: 400 }
      return Promise.reject({ status: 400, message: '' })
    })

    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: monitorGlobalStubs }
    })

    await flushPromises()

    const panel = wrapper.find('[data-testid="scanjob-monitor-unavailable"]')
    expect(panel.exists()).toBe(true)
    expect(panel.text()).toContain(
      'Монитор доступен только для активного задания сканирования коробок и посылок'
    )
  })

  it('ignores applySnapshot with wrong scanJobId', async () => {
    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: monitorGlobalStubs }
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
      global: { stubs: monitorGlobalStubs }
    })

    await flushPromises()

    const onClosed = startMonitor.mock.calls[0][1].onClosed
    onClosed(999, 2)
    await flushPromises()

    expect(wrapper.find('[data-testid="scanjob-monitor-closed"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="scanjob-monitor-register"]').exists()).toBe(true)
  })

  it('clears pending throttled snapshot when switching scope', async () => {
    vi.useFakeTimers()

    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: monitorGlobalStubs }
    })

    await flushPromises()

    const onSnapshot = startMonitor.mock.calls[0][1].onSnapshot

    // Dispatch a non-immediate snapshot (starts a throttle timer)
    onSnapshot({
      ...registerSnapshot,
      boxes: [{ ...registerSnapshot.boxes[0], boxCode: 'PENDING-BOX' }]
    })

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

  it('keeps the follow indicator off if a pending subscription finishes after the monitor closes', async () => {
    persistedFollowUserId.value = 17
    let finishSubscription
    startMonitorFollowUser.mockReturnValueOnce(new Promise((resolve) => { finishSubscription = resolve }))
    const wrapper = mount(ScanjobMonitor, { props: { scanjobId: 42 }, global: { stubs: monitorGlobalStubs } })
    await flushPromises()
    expect(wrapper.get('button[data-testid="scanjob-monitor-follow-user-open"]').classes()).not.toContain('anti-btn-green')
    startMonitor.mock.calls[0][1].onClosed(42, 20)
    finishSubscription(true)
    await flushPromises()
    expect(wrapper.find('[data-testid="scanjob-monitor-closed"]').exists()).toBe(true)
    expect(wrapper.get('button[data-testid="scanjob-monitor-follow-user-open"]').classes()).not.toContain('anti-btn-green')
  })
  it('refreshes once for a batch even when following its committed scans', async () => {
    persistedFollowUserId.value = 17
    isAdmin.value = true
    monitorParcelsPage.value = 1
    monitorParcelsSortBy.value = []
    loadMonitorSnapshot.mockResolvedValue(boxSnapshot)
    let finishScan
    manualScanParcels.mockImplementationOnce(() => new Promise(resolve => { finishScan = resolve }))
    const wrapper = mount(ScanjobMonitor, { props: { scanjobId: 42, monitorScope: box7MonitorScope }, global: { stubs: monitorGlobalStubs } })
    await flushPromises()
    loadMonitorSnapshot.mockClear()
    const table = wrapper.getComponent({ name: 'v-data-table' })
    const [first, second] = boxSnapshot.box.parcels
    table.vm.$emit('click:row', {}, { item: first })
    table.vm.$emit('click:row', { ctrlKey: true }, { item: second })
    await wrapper.get('[data-testid="manual-parcel-scan"]').trigger('click')
    await flushPromises()
    expect(manualScanParcels).toHaveBeenCalledExactlyOnceWith(42, [first.parcelId, second.parcelId])
    const event = { scanJobId: 42, userId: 17, scanCodeId: 601, followTarget: { area: 1, boxId: 7, parcelId: first.parcelId } }
    await getFollowEventHandler()(event)
    finishScan({
      completed: [{ id: first.parcelId, scanCodeId: 601, count: 1 }, { id: second.parcelId, scanCodeId: 602, count: 1 }],
      skippedIds: []
    })
    await flushPromises()
    await getFollowEventHandler()(event)
    expect(loadMonitorSnapshot).toHaveBeenCalledOnce()
    expect(mockReplace).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it.each([
    ['box', registerMonitorScope, registerSnapshot, registerSnapshot.boxes, manualScanBox,
      { area: 1, boxId: 7 }, { count: 1, boxCount: 1 }],
    ['parcel', box7MonitorScope, boxSnapshot, boxSnapshot.box.parcels, manualScanParcel,
      { area: 1, boxId: 7, parcelId: 70 }, { count: 1, recoveryConfirmed: true }]
  ])('keeps the selected %s in place when its row scan sends a follow event', async (
    kind, monitorScope, snapshot, rows, scan, followTarget, result
  ) => {
    persistedFollowUserId.value = 17
    isAdmin.value = true
    monitorBoxesPage.value = 1
    monitorParcelsPage.value = 1
    mockScanjob.value = { ...mockScanjob.value, operation: 10 }
    getById.mockResolvedValue(mockScanjob.value)
    loadMonitorSnapshot.mockResolvedValue(snapshot)
    let finish
    scan.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    const wrapper = mount(ScanjobMonitor, { props: { scanjobId: 42, monitorScope }, global: { stubs: monitorGlobalStubs } })
    await flushPromises()
    loadMonitorSnapshot.mockClear()
    const table = wrapper.getComponent({ name: 'v-data-table' })
    table.vm.$emit('update:current-items', rows)
    table.vm.$emit('click:row', {}, { item: rows[0] })
    await wrapper.vm.$nextTick()
    const selectedRow = wrapper.get('.selected-parcel-row')
    await selectedRow.get(`[data-testid="manual-${kind}-scan"]`).trigger('click')
    expect(scan).toHaveBeenCalledExactlyOnceWith(42, rows[0].parcelId ?? rows[0].boxId)
    const event = { scanJobId: 42, userId: 17, scanCodeId: 603, followTarget }
    await getFollowEventHandler()(event)
    finish({ ...result, scanCodeId: 603 })
    await flushPromises()
    await getFollowEventHandler()(event)
    expect(mockReplace).not.toHaveBeenCalled()
    expect(loadMonitorSnapshot).toHaveBeenCalledOnce()
    expect(wrapper.get('.selected-parcel-row').element).toBe(selectedRow.element)
    if (result.recoveryConfirmed) {
      expect(wrapper.find('[data-testid="scanjob-recovery-confirmed"]').exists()).toBe(true)
      scan.mockResolvedValueOnce({ count: 0, recoveryConfirmed: false, scanCodeId: 604 })
      await selectedRow.get('[data-testid="manual-parcel-scan"]').trigger('click')
      await flushPromises()
      expect(wrapper.find('[data-testid="scanjob-recovery-confirmed"]').exists()).toBe(false)

      scan.mockRejectedValueOnce(Object.assign(new Error('Временный конфликт сканирования'), { status: 409 }))
      await selectedRow.get('[data-testid="manual-parcel-scan"]').trigger('click')
      await flushPromises()
      expect(wrapper.text()).toContain('Временный конфликт сканирования')

      scan.mockResolvedValueOnce({ count: 1, recoveryConfirmed: true, scanCodeId: 605 })
      await selectedRow.get('[data-testid="manual-parcel-scan"]').trigger('click')
      await flushPromises()
      expect(wrapper.text()).not.toContain('Временный конфликт сканирования')
      expect(wrapper.find('[data-testid="scanjob-recovery-confirmed"]').exists()).toBe(true)

      scan.mockResolvedValueOnce({ count: 1, recoveryConfirmed: true, scanCodeId: 606 })
      loadMonitorSnapshot.mockRejectedValueOnce(new Error('Не удалось обновить данные после сканирования'))
      await selectedRow.get('[data-testid="manual-parcel-scan"]').trigger('click')
      await flushPromises()
      expect(wrapper.text()).toContain('Не удалось обновить данные после сканирования')

      scan.mockResolvedValueOnce({ count: 1, recoveryConfirmed: true, scanCodeId: 607 })
      await selectedRow.get('[data-testid="manual-parcel-scan"]').trigger('click')
      await flushPromises()
      expect(wrapper.text()).not.toContain('Не удалось обновить данные после сканирования')
    }
    wrapper.unmount()
  })

  for (const navigationFails of [false, true]) {
    it('defers followed-scanner navigation during manual scanning' + (navigationFails ? ' and presents a replay failure' : ''), async () => {
      persistedFollowUserId.value = 17
      isAdmin.value = true
      const job = { id: 42, name: 'Scanjob A', type: 30, operation: 10, status: 15, registerId: 101 }
      mockScanjob.value = job
      getById.mockResolvedValue(job)
      loadMonitorSnapshot.mockResolvedValue(boxSnapshot)
      let finishScan
      manualScanParcel.mockImplementationOnce(() => new Promise(resolve => { finishScan = resolve }))
      const wrapper = mount(ScanjobMonitor, { props: { scanjobId: 42, monitorScope: box7MonitorScope }, global: { stubs: monitorGlobalStubs } })
      await flushPromises()
      const rowAction = wrapper.findAll('button[data-testid="manual-parcel-scan"]').find(button => button.attributes('disabled') === undefined)
      await rowAction.trigger('click')
      await flushPromises()
      expect(manualScanParcel).toHaveBeenCalledOnce()
      await getFollowEventHandler()({ scanJobId: 42, userId: 17, followTarget: { area: 2, bucketIndex: 1, parcelId: 90 } })
      expect(mockReplace).not.toHaveBeenCalled()
      if (navigationFails) mockReplace.mockRejectedValueOnce(new Error('Follow navigation failed'))
      finishScan({ parcelCount: 1, scanSource: 10 })
      await flushPromises()
      expect(mockReplace).toHaveBeenCalledWith({ name: 'scanjob-monitor-unassigned', params: { id: 42, bucketIndex: 1 } })
      if (navigationFails) {
        expect(alertError).toHaveBeenCalledWith(expect.objectContaining({ message: 'Follow navigation failed' }))
        expect(wrapper.text()).toContain('Follow navigation failed')
      }
      wrapper.unmount()
    })
  }

})
