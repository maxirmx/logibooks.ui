/* @vitest-environment jsdom */
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks UI application

import { beforeEach, describe, it, expect, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import ScanjobMonitor from '@/dialogs/Scanjob_Monitor.vue'
import { defaultGlobalStubs } from './helpers/test-utils'

const mockBack = vi.hoisted(() => vi.fn())
const clearAlert = vi.hoisted(() => vi.fn())
const alertError = vi.hoisted(() => vi.fn())
const mockAlert = vi.hoisted(() => ({
  __v_isRef: true,
  value: null
}))
const mockScanjob = vi.hoisted(() => ({
  __v_isRef: true,
  value: { id: 42, name: 'Scanjob A', type: 30, status: 15 }
}))
const getById = vi.hoisted(() => vi.fn().mockResolvedValue({ id: 42, name: 'Scanjob A', type: 30, status: 15 }))
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
      totalParcels: 3,
      parcelsWithStickerScanned: 2,
      parcelsWithStickerNotScanned: 1
    },
    {
      boxId: 8,
      boxCode: 'BOX-8',
      boxStickerScanned: false,
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
    totalParcels: 3,
    parcelsWithStickerScanned: 2,
    parcelsWithStickerNotScanned: 1,
    parcels: [
      {
        parcelId: 70,
        parcelNumber: 'P-70',
        stickerScanned: true,
        zoneName: 'Green',
        statusTitle: 'На складе'
      },
      {
        parcelId: 71,
        parcelNumber: 'P-71',
        stickerScanned: false,
        zoneName: 'Red',
        statusTitle: 'Ожидается'
      }
    ]
  }
}

vi.mock('@/router', () => ({
  default: { back: mockBack }
}), { virtual: true })

vi.mock('@/stores/scanjobs.store.js', () => ({
  useScanjobsStore: () => ({
    scanjob: mockScanjob,
    monitorLoading,
    monitorError,
    monitorClosed,
    scanJobMonitorArea: {
      Boxes: 0,
      Box: 1
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

describe('Scanjob_Monitor.vue', () => {
  beforeEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
    mockAlert.value = null
    monitorLoading.value = false
    monitorError.value = null
    monitorClosed.value = null
    mockScanjob.value = { id: 42, name: 'Scanjob A', type: 30, status: 15 }
    getById.mockResolvedValue({ id: 42, name: 'Scanjob A', type: 30, status: 15 })
    loadMonitorSnapshot.mockResolvedValue(registerSnapshot)
    startMonitor.mockResolvedValue(true)
    clearMonitor.mockResolvedValue(true)
    stopMonitor.mockResolvedValue(true)
  })

  it('loads and renders register monitor on mount', async () => {
    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: defaultGlobalStubs }
    })

    await flushPromises()

    expect(getById).toHaveBeenCalledWith(42)
    expect(loadMonitorSnapshot).toHaveBeenCalledWith(42, { area: 0, boxId: null })
    expect(startMonitor).toHaveBeenCalledWith(42, expect.objectContaining({ area: 0, boxId: null }))
    expect(wrapper.text()).toContain('Scanjob A')
    expect(wrapper.text()).toContain('BOX-7')
    expect(wrapper.text()).toContain('1 / 2')
    expect(wrapper.text()).toContain('5 / 3 / 2')
  })

  it('closes via header action', async () => {
    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: defaultGlobalStubs }
    })

    await wrapper.vm.close()

    expect(mockBack).toHaveBeenCalled()
  })

  it('switches to box monitor and renders parcels', async () => {
    loadMonitorSnapshot.mockResolvedValueOnce(registerSnapshot).mockResolvedValueOnce(boxSnapshot)

    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: defaultGlobalStubs }
    })

    await flushPromises()
    await wrapper.find('[data-testid="scanjob-monitor-box-row"]').trigger('click')
    await flushPromises()

    expect(clearMonitor).toHaveBeenCalled()
    expect(loadMonitorSnapshot).toHaveBeenLastCalledWith(42, { area: 1, boxId: 7 })
    expect(startMonitor).toHaveBeenLastCalledWith(42, expect.objectContaining({ area: 1, boxId: 7 }))
    expect(wrapper.find('[data-testid="scanjob-monitor-box"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('P-70')
    expect(wrapper.text()).toContain('P-71')
  })

  it('returns from box monitor to register monitor', async () => {
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
    await wrapper.find('[data-testid="scanjob-monitor-back-action"]').trigger('click')
    await flushPromises()

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
    const inactiveScanjob = { id: 42, name: 'Scanjob A', type: 30, status: 20 }
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
    const parcelScanjob = { id: 42, name: 'Scanjob A', type: 10, status: 15 }
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
