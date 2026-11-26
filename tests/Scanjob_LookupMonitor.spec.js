// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks UI application.

import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick, ref } from 'vue'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import LookupMonitorView from '@/views/Scanjob_LookupMonitor_View.vue'
import LoginView from '@/views/User_LoginView.vue'
import ParcelWhFilterSelectors from '@/components/ParcelWhFilterSelectors.vue'
import ParcelSavedFilterSelector from '@/components/ParcelSavedFilterSelector.vue'
import PaginationFooter from '@/components/PaginationFooter.vue'
import LocalLabelPrinting from '@/components/LocalLabelPrinting.vue'
import { WBRN_REGISTER_ID } from '@/helpers/company.constants.js'
import { scanjobMonitorArea } from '@/helpers/scanjob.monitor.helpers.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { vuetifyStubs } from './helpers/test-utils.js'

const api = vi.hoisted(() => ({ load: vi.fn(), createChannel: vi.fn(), start: vi.fn(), stop: vi.fn(),
  followUser: vi.fn(), clearFollowUser: vi.fn(), loadFollowUsers: vi.fn(), setFollowUser: vi.fn(), followUserId: null,
  loadRegister: vi.fn(), resolveTarget: vi.fn(), exportStickers: vi.fn(),
  scanParcel: vi.fn(), scanParcels: vi.fn(), confirm: vi.fn(), ensureOpsLoaded: vi.fn(),
  isWhOperator: false, registerReadOnly: false,
  filters: vi.fn(), push: vi.fn(), replace: vi.fn(), back: vi.fn(),
  beforeResolve: vi.fn(), afterEach: vi.fn(), onError: vi.fn(),
  setScanjobMonitorMode: vi.fn(), clearSession: vi.fn(), canOpenParcel: true, returnUrl: null,
  routed: false, route: { query: {} }, currentRoute: { value: { fullPath: '/scanjobs/8/monitor/lookup' } } }))

vi.mock('vue-router', async importOriginal => {
  const original = await importOriginal()
  return {
    ...original,
    useRoute: () => api.routed ? original.useRoute() : api.route,
    useRouter: () => api
  }
})
vi.mock('@/router', () => ({ default: api }))
vi.mock('@/composables/useAppConfirm.js', () => ({ useAppConfirm: () => api.confirm }))
vi.mock('@/stores/scanjobs.store.js', () => ({
  useScanjobsStore: () => ({
    scanjobMonitorArea,
    ops: { constants: { inProgressStatus: 15, parcelOnlyType: 10, boxOnlyType: 20, lookupOperation: 30 } },
    ensureOpsLoaded: api.ensureOpsLoaded,
    scanParcel: api.scanParcel,
    scanParcels: api.scanParcels,
    loadLookupMonitorPage: api.load,
    createLookupMonitorChannel: api.createChannel,
    loadMonitorFollowUsers: api.loadFollowUsers,
    resolveMonitorTarget: api.resolveTarget
  })
}))
vi.mock('@/stores/registers.store.js', () => ({
  useRegistersStore: () => ({ item: { id: 42, readOnly: api.registerReadOnly }, getById: api.loadRegister,
    getTransportationDocument: () => 'Авианакладная' })
}))
vi.mock('@/stores/boxes.store.js', () => ({
  useBoxesStore: () => ({ downloadRegisterStickers: api.exportStickers })
}))
vi.mock('@/stores/auth.store.js', () => ({ useAuthStore: () => ({
  hasLogistRole: api.canOpenParcel, isWhManagerPlus: true, isWhOperator: api.isWhOperator,
  setScanjobMonitorMode: api.setScanjobMonitorMode,
  clearSession: api.clearSession, set returnUrl(value) { api.returnUrl = value },
  scanjobmonitor_follow_user_id: api.followUserId, setScanjobMonitorFollowUserId: api.setFollowUser
}) }))
vi.mock('@/stores/parcel.filters.store.js', () => ({
  useParcelFiltersStore: () => ({ filters: [{ id: 9, name: 'Склад' }], getAll: api.filters })
}))

const trailingHeaders = ['Номер коробки', 'Статус', 'Пользователь\nВремя\nСканированный код',
  'Описание', 'Вес, кг', 'Количество']

function lookupSnapshot(overrides = {}) {
  return {
    scanJobId: 8, scanJobName: 'Поиск пропущенных посылок', type: 30, operation: 30, status: 15, registerId: 42, registerType: 1,
    totalBoxes: 5, boxesWithStickerScanned: 2, boxesWithStickerNotScanned: 3,
    totalParcels: 100, parcelsWithStickerScanned: 4, parcelsWithStickerNotScanned: 96,
    lookupFoundCount: 1, lookupNotFoundCount: 1,
    lookupPage: { page: 2, totalCount: 75, items: [
      { found: true, ozonId: '000-ID', boxId: 7, boxNumber: 'B-55', boxSticker: 'B-LABEL',
        boxStickerScanned: true, boxFoundCount: 2, boxTargetCount: 2,
        parcel: { parcelId: 312, parcelNumber: '0001-1', barcode: '001-LABEL', productName: 'Куртка', quantity: 3,
          weightKg: 2, adjustedWeightKg: 2.3, zoneName: 'Красная зона', statusTitle: 'Выпуск',
          stickerScanned: true, scannedUserName: 'Иванов Иван', scannedTime: '2026-11-25T14:35:00', scannedSticker: 'SCAN-01',
          checkStatusProjection: { kind: 20, title: 'Запрет', restrictionReason: 'Наименование запрещено' } } },
      { found: false, boxId: 9, boxNumber: 'B-56', boxStickerScanned: false, boxFoundCount: 0, boxTargetCount: 2,
        parcel: { parcelId: 313, parcelNumber: '0001-2' } }
    ] },
    ...overrides
  }
}

let wrapper
let handlers
let onConnectionError
const reconnecting = ref(false)

function openMonitor(navigation) {
  const table = vuetifyStubs['v-data-table-server']
  wrapper = mount(navigation ? RouterView : LookupMonitorView, {
    props: navigation ? {} : { id: 8 },
    global: {
      plugins: navigation ? [navigation] : [],
      stubs: {
        ...vuetifyStubs, LocalLabelPrinting: true, 'font-awesome-icon': true, 'v-btn': { template: '<button><slot /></button>' },
        'v-data-table-server': {
          ...table, props: [...table.props, 'rowProps'],
          template: table.template
            .replace('class="v-data-table-row"', 'class="v-data-table-row" v-bind="rowProps({ item })"')
            .replace('class="v-data-table-cell"', 'class="v-data-table-cell" v-bind="header.cellProps?.({ item })"')
        },
        'v-tooltip': { props: ['text'], template: '<div><slot name="activator" :props="{ \'aria-label\': text }"></slot><slot></slot></div>' }
      }
    }
  })
  return wrapper
}

async function openRoutedMonitor({ previousPath } = {}) {
  const navigation = createRouter({ history: createMemoryHistory(), routes: [
    { path: '/scanjobs/:id/monitor/lookup', name: 'scanjob-monitor-lookup', component: LookupMonitorView,
      props: route => ({ id: Number(route.params.id) }) },
    { path: '/login', component: LoginView }
  ] })
  if (previousPath) await navigation.push(previousPath)
  await navigation.push(api.currentRoute.value.fullPath)
  api.routed = true
  api.currentRoute = navigation.currentRoute
  api.options = navigation.options
  api.replace.mockImplementation(navigation.replace)
  api.resolve = navigation.resolve
  api.beforeResolve.mockImplementation(navigation.beforeResolve)
  api.afterEach.mockImplementation(navigation.afterEach)
  api.onError.mockImplementation(navigation.onError)
  openMonitor(navigation)
  return navigation
}

function setLookupFilter(label, value) {
  const field = wrapper.getComponent(ParcelWhFilterSelectors).findAll('.v-text-field-stub')
    .find(field => field.get('span').text() === label)
  expect(field, `Lookup filter ${label}`).toBeDefined()
  return field.get('input').setValue(value)
}

function expectDiagnostics(...entries) {
  const expected = entries.map(([context, error]) => [`[${context}]`, error])
  const logError = console.error.bind(console)
  const diagnostics = vi.spyOn(console, 'error').mockImplementation((...args) => {
    if (!expected.some(call => call.length === args.length && call.every((arg, index) => arg === args[index]))) {
      logError(...args)
    }
  })
  onTestFinished(() => expect(diagnostics.mock.calls).toEqual(expected))
}

const followedRow = '.monitor-followed-parcel-row'

function scanEvent(scanCodeId, parcelId) {
  return { scanJobId: 8, userId: 21, scanCodeId, lookupParcelMatched: parcelId != null, followTarget: { parcelId } }
}

async function sendScan(event) {
  await api.followUser.mock.lastCall[2].onFollowEvent(event)
  await vi.advanceTimersByTimeAsync(150)
  await flushPromises()
}

function followedPage(page, parcelId) {
  const snapshot = lookupSnapshot()
  snapshot.lookupPage = { ...snapshot.lookupPage, page, followedParcelId: parcelId }
  return snapshot
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.resetAllMocks()
  api.canOpenParcel = true
  api.isWhOperator = false
  api.registerReadOnly = false
  api.returnUrl = null
  api.followUserId = null
  reconnecting.value = false
  api.loadRegister.mockResolvedValue(true)
  api.loadFollowUsers.mockResolvedValue([{ id: 21, displayName: 'Оператор 21' }])
  api.followUser.mockResolvedValue(true)
  api.clearFollowUser.mockResolvedValue(true)
  api.route.query = { page: '2', stickerPrefix: '00', parcelFilterId: '9' }
  api.routed = false
  api.currentRoute = { value: { name: 'scanjob-monitor-lookup', params: { id: '8' },
    fullPath: '/scanjobs/8/monitor/lookup?page=2&stickerPrefix=00&parcelFilterId=9' } }
  api.load.mockResolvedValue(lookupSnapshot())
  api.confirm.mockResolvedValue(true)
  api.beforeResolve.mockReturnValue(() => {})
  api.replace.mockImplementation(async location => {
    if (location === '/login') api.currentRoute.value = { path: '/login', fullPath: '/login' }
  })
  api.start.mockImplementation(async (_id, callbacks) => { handlers = callbacks })
  api.createChannel.mockImplementation(callback => {
    onConnectionError = callback
    return { start: api.start, reconnecting, followUser: api.followUser, clearFollowUser: api.clearFollowUser, stop: api.stop }
  })
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('Lookup monitor', () => {
  it('switches back to boxes from the header and can close directly', async () => {
    openMonitor()
    await flushPromises()
    const button = wrapper.get('.header-actions-bar button[data-testid="scanjob-monitor-mode-toggle"]')
    expect(button.attributes('aria-label')).toBe('Монитор сканирования')
    expect(button.get('font-awesome-icon-stub').attributes('icon')).toBe('fa-solid fa-sort')
    expect(button.classes()).not.toContain('anti-btn-green')
    expect(button.element.closest('.header-actions-group')).toBe(
      wrapper.get('button[data-testid="scanjob-monitor-follow-user-open"]').element.closest('.header-actions-group')
    )
    expect(wrapper.getComponent(LocalLabelPrinting).props()).toMatchObject({ scanJobId: 8, active: true })
    expect(wrapper.get('button[data-testid="scanjob-monitor-jump-open"]').isVisible()).toBe(true)
    expect(wrapper.get('button[data-testid="scanjob-monitor-unregistered-action"]').isVisible()).toBe(true)
    expect(wrapper.get('button[data-testid="register-export-stickers"]').isVisible()).toBe(true)
    expect(wrapper.find('nav[aria-label="Режим монитора сканирования"]').exists()).toBe(false)
    api.replace.mockImplementationOnce(async location => {
      api.currentRoute.value = { ...location, fullPath: '/scanjobs/8/monitor' }
    })
    await button.trigger('click')
    await flushPromises()
    expect(api.replace).toHaveBeenCalledExactlyOnceWith({ name: 'scanjob-monitor-register', params: { id: 8 } })
    expect(api.setScanjobMonitorMode).toHaveBeenCalledExactlyOnceWith('boxes')
    await wrapper.get('.header-actions-bar button[data-testid="scanjob-monitor-close-action"]').trigger('click')
    expect(api.back).toHaveBeenCalledOnce()
  })

  it('follows a scanner in the lookup list and retries a rejected subscription', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    api.followUser.mockRejectedValueOnce(new Error('Invalid follow request'))
    openMonitor()
    await flushPromises()
    await wrapper.get('button[data-testid="scanjob-monitor-follow-user-open"]').trigger('click')
    const select = wrapper.findAllComponents({ name: 'v-select' }).find(component => component.props('label') === 'Следить за сканером')
    expect(select.props('items')).toContainEqual({ title: 'Оператор 21', value: 21 })
    select.vm.$emit('update:modelValue', 21)
    const apply = wrapper.get('button[data-testid="scanjob-monitor-follow-user-apply"]')
    await apply.trigger('click')
    await flushPromises()
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.get('[role="alert"]').text()).toContain('Ошибка при загрузке монитора сканирования')
    expect(api.setFollowUser).not.toHaveBeenCalled()

    await apply.trigger('click')
    await flushPromises()
    expect(api.followUser).toHaveBeenLastCalledWith(8, 21, expect.any(Object))
    expect(api.setFollowUser).toHaveBeenCalledExactlyOnceWith(21)
    expect(wrapper.getComponent(LocalLabelPrinting).props('userId')).toBe(21)
    const scroll = vi.fn()
    wrapper.findAll('.v-data-table-row')[1].element.scrollIntoView = scroll
    await sendScan({ ...scanEvent(1), followTarget: { area: 1, boxId: 7 } })
    expect(wrapper.find(followedRow).exists()).toBe(false)
    expect(api.load).toHaveBeenCalledOnce()
    api.load.mockResolvedValueOnce(followedPage(2, 313))
    await sendScan(scanEvent(2, 313))
    expect(wrapper.get(followedRow).text()).toContain('0001-2')
    expect(scroll).toHaveBeenCalledWith({ block: 'nearest' })
    expect(api.load.mock.lastCall[1]).toMatchObject({ followParcelId: '313', page: '2', stickerPrefix: '00' })
    await sendScan({ ...scanEvent(3), followTarget: { area: 1, boxId: 7 } })
    expect(wrapper.get(followedRow).text()).toContain('0001-2')
    expect(scroll).toHaveBeenCalledOnce()
    api.load.mockResolvedValueOnce(followedPage(2, 313))
    await sendScan(scanEvent(4, 313))
    expect(scroll).toHaveBeenCalledTimes(2)
    await sendScan({ ...scanEvent(5), followTarget: { parcelId: 312 } })
    expect(wrapper.get(followedRow).text()).toContain('0001-2')
    await sendScan(scanEvent(4, 313))
    expect(scroll).toHaveBeenCalledTimes(2)
    expect(api.push).not.toHaveBeenCalled()
    expect(api.replace).not.toHaveBeenCalled()
    expect(api.load).toHaveBeenCalledTimes(3)
  })

  it.each(['applied', 'disabled', 'refused'])('handles a pending scanner selection that is %s', async outcome => {
    api.followUserId = 21
    api.loadFollowUsers.mockResolvedValue([
      { id: 21, displayName: 'Оператор 21' }, { id: 22, displayName: 'Оператор 22' }
    ])
    openMonitor()
    await flushPromises()
    reconnecting.value = true
    handlers.onReconnecting()
    await wrapper.get('button[data-testid="scanjob-monitor-follow-user-open"]').trigger('click')
    const select = wrapper.findAllComponents({ name: 'v-select' })
      .find(component => component.props('label') === 'Следить за сканером')
    expect(select).toBeDefined()
    const apply = wrapper.get('button[data-testid="scanjob-monitor-follow-user-apply"]')
    let confirmSelection, rejectSelection
    api.followUser.mockImplementationOnce(() => new Promise((resolve, reject) => {
      confirmSelection = resolve
      rejectSelection = reject
    }))

    select.vm.$emit('update:modelValue', 22)
    await apply.trigger('click')
    await flushPromises()
    expect(api.followUser).toHaveBeenLastCalledWith(8, 22, expect.any(Object))
    expect(api.setFollowUser).not.toHaveBeenCalled()
    expect(apply.element.disabled).toBe(false)
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)

    if (outcome === 'disabled') {
      select.vm.$emit('update:modelValue', null)
      await apply.trigger('click')
      await flushPromises()
      confirmSelection(false)
    } else {
      reconnecting.value = false
      if (outcome === 'refused') rejectSelection(new Error('Scanner not available'))
      else confirmSelection(true)
    }
    await flushPromises()

    if (outcome === 'refused') {
      expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
      expect(wrapper.get('[role="alert"]').text()).toContain('Ошибка при загрузке монитора сканирования')
      expect(api.setFollowUser).not.toHaveBeenCalled()
      expect(apply.element.disabled).toBe(false)
      return
    }
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(api.setFollowUser).toHaveBeenCalledExactlyOnceWith(outcome === 'disabled' ? null : 22)
    expect(wrapper.get('button[data-testid="scanjob-monitor-follow-user-open"]').classes().includes('anti-btn-green'))
      .toBe(outcome === 'applied')
  })

  it('applies an off-page scan once and keeps the follow target out of the URL', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    api.followUserId = 21
    const navigation = await openRoutedMonitor()
    await flushPromises()
    api.load.mockResolvedValueOnce(followedPage(1, 313))
    await sendScan(scanEvent(1, 313))

    expect(navigation.currentRoute.value.query).toMatchObject({ page: '1', stickerPrefix: '00', parcelFilterId: '9' })
    expect(navigation.currentRoute.value.query).not.toHaveProperty('followParcelId')
    expect(wrapper.getComponent(PaginationFooter).props('page')).toBe(1)
    expect(wrapper.get(followedRow).text()).toContain('0001-2')
    expect(api.load).toHaveBeenCalledTimes(2)
    expect(api.replace).toHaveBeenCalledOnce()
  })

  it('retains an explicit parcel selection from the opening URL', async () => {
    api.currentRoute.value.fullPath += '&selectedParcelId=313'
    await openRoutedMonitor()
    await flushPromises()
    expect(wrapper.get(followedRow).text()).toContain('0001-2')
    expect(api.load.mock.lastCall[1]).not.toHaveProperty('followParcelId')
  })

  it('restores the previous URL if a box arrives as an automatic replacement finishes', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    api.followUserId = 21
    const navigation = await openRoutedMonitor()
    await flushPromises()
    const previous = navigation.currentRoute.value.fullPath
    let newerEvent
    const unguard = navigation.afterEach((to, _from, failure) => {
      if (!failure && to.query.page === '1') {
        newerEvent = api.followUser.mock.lastCall[2].onFollowEvent(scanEvent(2))
      }
    })
    api.load.mockResolvedValueOnce(followedPage(1, 313))
    await sendScan(scanEvent(1, 313))
    await newerEvent
    unguard()
    expect(newerEvent).toBeDefined()
    expect(navigation.currentRoute.value.fullPath).toBe(previous)
    expect(wrapper.getComponent(PaginationFooter).props('page')).toBe(2)
    expect(wrapper.find(followedRow).exists()).toBe(false)
    expect(api.replace).toHaveBeenCalledTimes(2)
  })

  it('keeps the newest matched scan and filter when restoring a URL after an aborted filter change', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    api.followUserId = 21
    api.currentRoute.value.fullPath += '#selection'
    const navigation = await openRoutedMonitor()
    await flushPromises()
    const previous = navigation.currentRoute.value.fullPath
    const abortFilterChange = navigation.beforeEach(to => to.query.stickerPrefix !== 'NEW')
    api.load.mockResolvedValueOnce(followedPage(1, null))
    await setLookupFilter('Любой из стикеров', 'NEW')
    await vi.advanceTimersByTimeAsync(250)
    await flushPromises()
    abortFilterChange()
    expect(navigation.currentRoute.value.fullPath).toBe(previous)
    expect(wrapper.getComponent(PaginationFooter).props('page')).toBe(1)

    let newerEvent
    const captureReplacement = navigation.afterEach((to, _from, failure) => {
      if (!failure && to.query.page === '2' && to.query.stickerPrefix === 'NEW') {
        newerEvent = api.followUser.mock.lastCall[2].onFollowEvent(scanEvent(2, 312))
      }
    })
    api.load.mockResolvedValueOnce(followedPage(2, 313)).mockResolvedValueOnce(followedPage(2, 312))
    await sendScan(scanEvent(1, 313))
    await newerEvent
    captureReplacement()
    expect(newerEvent).toBeDefined()
    expect(navigation.currentRoute.value.fullPath).toBe(previous)
    expect(wrapper.getComponent(PaginationFooter).props('page')).toBe(1)
    expect(wrapper.find(followedRow).exists()).toBe(false)

    await vi.advanceTimersByTimeAsync(150)
    await flushPromises()
    expect(api.load.mock.lastCall[1]).toMatchObject({ page: '1', stickerPrefix: 'NEW', followParcelId: '312' })
    expect(navigation.currentRoute.value.query).toMatchObject({ page: '2', stickerPrefix: 'NEW' })
    expect(wrapper.get(followedRow).text()).toContain('0001-1')
  })

  it.each(['box scan', 'reconnecting', 'follow disabled'])('preserves the displayed URL if %s cancels a pending jump', async cancellation => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    api.followUserId = 21
    const navigation = await openRoutedMonitor()
    await flushPromises()
    const initial = navigation.currentRoute.value.fullPath
    const scroll = vi.fn()
    wrapper.findAll('.v-data-table-row')[0].element.scrollIntoView = scroll
    api.load.mockResolvedValueOnce(followedPage(2, 312))
    await sendScan(scanEvent(1, 312))
    let unblock
    const unguard = navigation.beforeResolve(to => Number(to.query.page) === 1
      ? new Promise(resolve => { unblock = resolve }) : true)
    api.load.mockResolvedValueOnce(followedPage(1, 313))
    await sendScan(scanEvent(2, 313))
    expect(unblock).toEqual(expect.any(Function))
    expect(wrapper.getComponent(PaginationFooter).props('loading')).toBe(false)
    const followButton = wrapper.get('button[data-testid="scanjob-monitor-follow-user-open"]')
    expect(followButton.element.disabled).toBe(false)

    if (cancellation === 'box scan') {
      await sendScan({ ...scanEvent(3), followTarget: { area: 1, boxId: 7 } })
    } else if (cancellation === 'reconnecting') {
      handlers.onReconnecting()
    } else {
      await followButton.trigger('click')
      const select = wrapper.findAllComponents({ name: 'v-select' })
        .find(component => component.props('label') === 'Следить за сканером')
      select.vm.$emit('update:modelValue', null)
      await wrapper.get('button[data-testid="scanjob-monitor-follow-user-apply"]').trigger('click')
      await flushPromises()
      expect(api.setFollowUser).toHaveBeenCalledWith(null)
    }
    unblock()
    await flushPromises()
    unguard()
    expect(navigation.currentRoute.value.fullPath).toBe(initial)
    expect(wrapper.getComponent(PaginationFooter).props('page')).toBe(2)
    expect(wrapper.get(followedRow).text()).toContain('0001-1')
    expect(scroll).toHaveBeenCalledOnce()
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('lets a user change page during a slow follow read', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    api.followUserId = 21
    const navigation = await openRoutedMonitor()
    await flushPromises()
    let finishFollow
    api.load.mockImplementationOnce(() => new Promise(resolve => { finishFollow = resolve }))
    await sendScan(scanEvent(1, 313))
    const footer = wrapper.getComponent(PaginationFooter)
    const previous = footer.get('button[icon="$prev"]')
    expect(previous.element.disabled).toBe(false)
    await previous.trigger('click')
    api.load.mockResolvedValueOnce(followedPage(1, null))
    finishFollow(followedPage(2, 313))
    await flushPromises()
    expect(navigation.currentRoute.value.query.page).toBe('1')
    expect(footer.props('page')).toBe(1)
    expect(wrapper.find(followedRow).exists()).toBe(false)
    expect(api.load.mock.lastCall[1]).not.toHaveProperty('followParcelId')
  })

  it('defers the ordinary reload until an in-flight browser Back finishes', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    api.followUserId = 21
    const navigation = await openRoutedMonitor()
    await flushPromises()
    api.load.mockResolvedValueOnce(followedPage(1, null))
    await navigation.push({ query: { ...navigation.currentRoute.value.query, page: '1' } })
    await flushPromises()

    let finishFollow
    api.load.mockImplementationOnce(() => new Promise(resolve => { finishFollow = resolve }))
    await sendScan(scanEvent(1, 313))
    let finishBack
    const unguard = navigation.beforeEach(to => to.query.page === '2'
      ? new Promise(resolve => { finishBack = resolve }) : true)
    navigation.back()
    await flushPromises()
    expect(finishBack).toEqual(expect.any(Function))
    finishFollow(followedPage(2, 313))
    await sendScan(scanEvent(2, 313))
    expect(api.load).toHaveBeenCalledTimes(3)
    expect(navigation.currentRoute.value.query.page).toBe('1')
    expect(wrapper.find(followedRow).exists()).toBe(false)

    finishBack()
    await flushPromises()
    unguard()
    expect(navigation.currentRoute.value.query.page).toBe('2')
    expect(wrapper.getComponent(PaginationFooter).props('page')).toBe(2)
    expect(api.load.mock.lastCall[1]).not.toHaveProperty('followParcelId')
  })

  it.each(['completed', 'aborted', 'rejected'])('resumes Lookup after a redirected browser Back is %s', async outcome => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    api.followUserId = 21
    const navigation = await openRoutedMonitor()
    await flushPromises()
    api.load.mockResolvedValueOnce(followedPage(1, null))
    await navigation.push({ query: { ...navigation.currentRoute.value.query, page: '1' } })
    await flushPromises()

    const error = new Error('Redirected navigation failed')
    const onError = vi.fn()
    const removeErrorHandler = navigation.onError(onError)
    const unguard = navigation.beforeEach(to => {
      if (to.query.page === '2') return { query: { ...to.query, page: '1', stickerPrefix: 'REDIRECTED' } }
      if (to.query.stickerPrefix === 'REDIRECTED') {
        if (outcome === 'aborted') return false
        if (outcome === 'rejected') throw error
      }
    })
    if (outcome === 'completed') api.load.mockResolvedValueOnce(followedPage(1, null))
    navigation.back()
    await flushPromises()
    unguard()
    removeErrorHandler()
    expect(navigation.currentRoute.value.query.stickerPrefix).toBe(outcome === 'completed' ? 'REDIRECTED' : '00')
    expect(onError).toHaveBeenCalledTimes(outcome === 'rejected' ? 1 : 0)

    api.load.mockResolvedValueOnce(followedPage(2, 313))
    await sendScan(scanEvent(1, 313))
    expect(api.load.mock.lastCall[1]).toMatchObject({
      page: '1', stickerPrefix: outcome === 'completed' ? 'REDIRECTED' : '00', followParcelId: '313'
    })
    expect(navigation.currentRoute.value.query.page).toBe('2')
    expect(wrapper.get(followedRow).text()).toContain('0001-2')
  })

  it('resumes Lookup after Back redirects through two routes and returns to the same monitor', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    api.followUserId = 21
    const navigation = await openRoutedMonitor({ previousPath: '/login' })
    await flushPromises()
    navigation.addRoute({ path: '/intermediate', component: LoginView })
    const unguard = navigation.beforeEach(to => {
      if (to.path === '/login') return '/intermediate'
      if (to.path === '/intermediate') {
        return { name: 'scanjob-monitor-lookup', params: { id: 8 }, query: { page: '1', stickerPrefix: 'RETURNED' } }
      }
    })
    api.load.mockResolvedValueOnce(followedPage(1, null))
    navigation.back()
    await flushPromises()
    unguard()
    expect(navigation.currentRoute.value.query).toMatchObject({ page: '1', stickerPrefix: 'RETURNED' })
    expect(api.load.mock.lastCall[1]).toMatchObject({ page: '1', stickerPrefix: 'RETURNED' })

    api.load.mockResolvedValueOnce(followedPage(2, 313))
    await sendScan(scanEvent(1, 313))
    expect(wrapper.get(followedRow).text()).toContain('0001-2')
  })

  it('keeps Back pending when an older autofollow replacement to the same URL is cancelled', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    api.followUserId = 21
    api.currentRoute.value.fullPath = '/scanjobs/8/monitor/lookup?page=2&pageSize=50&sortBy=id&sortOrder=asc&parcelFilterId=9&stickerPrefix=00'
    const navigation = await openRoutedMonitor()
    await flushPromises()
    const previous = navigation.currentRoute.value.fullPath
    api.load.mockResolvedValueOnce(followedPage(1, null))
    await navigation.push({ query: { ...navigation.currentRoute.value.query, page: '1' } })
    await flushPromises()
    const blocked = []
    const unguard = navigation.beforeEach(to => {
      if (to.fullPath === previous) return new Promise(resolve => { blocked.push(resolve) })
    })
    api.load.mockResolvedValueOnce(followedPage(2, 313))
    await sendScan(scanEvent(1, 313))
    navigation.back()
    await flushPromises()
    expect(blocked).toHaveLength(2)

    blocked[0]()
    await flushPromises()
    await sendScan(scanEvent(2, 312))
    expect(api.load).toHaveBeenCalledTimes(3)
    expect(navigation.currentRoute.value.query.page).toBe('1')
    expect(wrapper.find(followedRow).exists()).toBe(false)

    api.load.mockResolvedValueOnce(followedPage(2, null))
    blocked[1]()
    await flushPromises()
    unguard()
    expect(navigation.currentRoute.value.fullPath).toBe(previous)
    expect(api.load.mock.lastCall[1]).not.toHaveProperty('followParcelId')
    expect(wrapper.getComponent(PaginationFooter).props('page')).toBe(2)
  })

  it('resumes Lookup when leaving supersedes a held Back and the new route fails to load', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    api.followUserId = 21
    const navigation = await openRoutedMonitor()
    await flushPromises()
    api.load.mockResolvedValueOnce(followedPage(1, null))
    await navigation.push({ query: { ...navigation.currentRoute.value.query, page: '1' } })
    await flushPromises()
    let finishBack
    const unguard = navigation.beforeEach(to => to.query.page === '2'
      ? new Promise(resolve => { finishBack = resolve }) : true)
    navigation.back()
    await flushPromises()
    expect(finishBack).toEqual(expect.any(Function))

    const error = new Error('Route chunk unavailable')
    navigation.addRoute({ path: '/removed-chunk', component: () => Promise.reject(error) })
    await expect(navigation.push('/removed-chunk')).rejects.toBe(error)
    finishBack()
    await flushPromises()
    unguard()
    expect(navigation.currentRoute.value.query.page).toBe('1')

    api.load.mockResolvedValueOnce(followedPage(2, 313))
    await sendScan(scanEvent(1, 313))
    expect(navigation.currentRoute.value.query.page).toBe('2')
    expect(wrapper.get(followedRow).text()).toContain('0001-2')
  })

  it('reloads the current page when a navigation guard aborts autofollow', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    api.followUserId = 21
    const navigation = await openRoutedMonitor()
    await flushPromises()
    const unguard = navigation.beforeResolve(to => to.query.page !== '1')
    const diagnostics = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    try {
      api.load.mockResolvedValueOnce(followedPage(1, 313))
      await sendScan(scanEvent(1, 313))
      expect(navigation.currentRoute.value.query.page).toBe('2')
      expect(wrapper.getComponent(PaginationFooter).props('page')).toBe(2)
      expect(wrapper.find(followedRow).exists()).toBe(false)
      expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
      expect(wrapper.get('[role="alert"]').text()).toContain('Операция отменена.')
      expect(diagnostics).toHaveBeenCalledExactlyOnceWith('[Не удалось открыть страницу найденной посылки]', expect.any(Error))
      expect(api.load).toHaveBeenCalledTimes(3)
      expect(api.load.mock.lastCall[1]).not.toHaveProperty('followParcelId')
    } finally {
      diagnostics.mockRestore()
      unguard()
    }
  })

  it('recovers a rejected follow request once through the login alert', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    api.followUserId = 21
    const navigation = await openRoutedMonitor()
    await flushPromises()
    const error = new Error('Follow read failed')
    expectDiagnostics(['Не удалось загрузить посылки для поиска', error])
    api.load.mockRejectedValueOnce(error)
    await sendScan(scanEvent(1, 313))
    expect(navigation.currentRoute.value.path).toBe('/login')
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.get('[role="alert"]').text()).toContain('Не удалось загрузить посылки для поиска')
  })

  it('refreshes the current page when a superseded follow request rejects', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    api.followUserId = 21
    const navigation = await openRoutedMonitor()
    await flushPromises()
    let rejectFollow
    api.load.mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectFollow = reject }))
    await sendScan(scanEvent(1, 313))
    await sendScan(scanEvent(2))
    const error = new Error('Obsolete follow read failed')
    expectDiagnostics(['Ошибка устаревшего запроса посылок для поиска', error])
    rejectFollow(error)
    await flushPromises()
    expect(navigation.currentRoute.value.query.page).toBe('2')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(api.load).toHaveBeenCalledTimes(3)
    expect(api.load.mock.lastCall[1]).not.toHaveProperty('followParcelId')
  })

  it('clears the follow indicator and restores the preference when Lookup is opened again', async () => {
    const error = new Error('Invalid connection')
    expectDiagnostics(['Не удалось подключить обновления монитора сканирования', error])
    api.followUserId = 21
    openMonitor()
    await flushPromises()
    expect(api.followUser).toHaveBeenCalledExactlyOnceWith(8, 21, expect.any(Object))
    const button = wrapper.get('button[data-testid="scanjob-monitor-follow-user-open"]')
    expect(button.classes()).toContain('anti-btn-green')
    onConnectionError(error)
    await flushPromises()
    expect(button.classes()).not.toContain('anti-btn-green')
    expect(api.currentRoute.value.path).toBe('/login')
    wrapper.unmount()
    api.currentRoute.value = { path: '/scanjobs/8/monitor/lookup', fullPath: api.returnUrl }
    openMonitor()
    await flushPromises()
    expect(api.followUser).toHaveBeenCalledTimes(2)
    expect(wrapper.get('button[data-testid="scanjob-monitor-follow-user-open"]').classes()).toContain('anti-btn-green')
  })

  it('opens parcel details from the jump action and exports stickers from the shared toolbar', async () => {
    api.resolveTarget.mockResolvedValue({ kind: 2, area: 1, boxId: 7, parcelId: 313 })
    openMonitor()
    await flushPromises()
    await wrapper.get('button[data-testid="scanjob-monitor-jump-open"]').trigger('click')
    await wrapper.get('input[data-testid="scanjob-monitor-jump-input"]').setValue('000-ID')
    await wrapper.get('button[data-testid="scanjob-monitor-jump-action"]').trigger('click')
    await flushPromises()
    expect(api.resolveTarget).toHaveBeenCalledExactlyOnceWith(8, '000-ID')
    expect(api.push).toHaveBeenLastCalledWith({ name: 'scanjob-monitor-box', params: { id: 8, boxId: 7 },
      query: { returnUrl: api.currentRoute.value.fullPath, selectedParcelId: '313' } })
    await wrapper.get('button[data-testid="register-export-stickers"]').trigger('click')
    await flushPromises()
    expect(api.exportStickers).toHaveBeenCalledExactlyOnceWith(42)
    expect(api.setScanjobMonitorMode).not.toHaveBeenCalled()
  })

  it('keeps the lookup list available when opening unregistered stickers fails and allows retry', async () => {
    const navigationError = new Error('Invalid route')
    expectDiagnostics(['Не удалось открыть стикеры вне реестра', navigationError])
    api.push.mockRejectedValueOnce(navigationError)
    openMonitor()
    await flushPromises()
    expect(wrapper.findAll('.v-data-table-row')).toHaveLength(2)
    const unregistered = wrapper.get('button[data-testid="scanjob-monitor-unregistered-action"]')
    await unregistered.trigger('click')
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('Не удалось открыть стикеры вне реестра')
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    await unregistered.trigger('click')
    expect(api.push).toHaveBeenLastCalledWith({ path: '/registers/42/unregistered-parcels',
      query: { returnUrl: api.currentRoute.value.fullPath } })
  })

  it('keeps the view and preference when switching is blocked, and saves on retry', async () => {
    const navigationRouter = createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: {} }, { path: '/blocked', component: {} }] })
    await navigationRouter.push('/')
    navigationRouter.beforeEach(() => false)
    const failure = await navigationRouter.push('/blocked')
    expectDiagnostics(['Не удалось переключить режим монитора', failure])
    api.replace.mockResolvedValueOnce(failure)
    openMonitor()
    await flushPromises()
    const button = wrapper.get('button[data-testid="scanjob-monitor-mode-toggle"]')
    await button.trigger('click')
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('Не удалось переключить режим монитора')
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(api.currentRoute.value.name).toBe('scanjob-monitor-lookup')
    expect(api.setScanjobMonitorMode).not.toHaveBeenCalled()
    expect(button.element.disabled).toBe(false)

    api.replace.mockImplementationOnce(async location => { api.currentRoute.value = location })
    await button.trigger('click')
    await flushPromises()
    expect(api.setScanjobMonitorMode).toHaveBeenCalledExactlyOnceWith('boxes')
  })

  it('reports a preference write failure without exposing storage details', async () => {
    const error = new Error('Storage quota')
    expectDiagnostics(['Не удалось сохранить режим монитора', error])
    api.replace.mockImplementationOnce(async location => { api.currentRoute.value = location })
    api.setScanjobMonitorMode.mockImplementationOnce(() => { throw error })
    openMonitor()
    await flushPromises()
    await wrapper.get('button[data-testid="scanjob-monitor-mode-toggle"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('Не удалось сохранить режим монитора')
    expect(wrapper.get('[role="alert"]').text()).not.toContain('Storage quota')
  })

  it('leaves the preference alone when the navigation is duplicated or redirected', async () => {
    const navigationRouter = createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: {} }] })
    await navigationRouter.push('/')
    api.replace.mockResolvedValueOnce(await navigationRouter.push('/'))
    api.replace.mockImplementationOnce(async () => {
      api.currentRoute.value = { name: 'login', params: {}, fullPath: '/login' }
    })
    openMonitor()
    await flushPromises()
    const button = wrapper.get('button[data-testid="scanjob-monitor-mode-toggle"]')
    await button.trigger('click')
    await flushPromises()
    await button.trigger('click')
    await flushPromises()
    expect(api.replace).toHaveBeenCalledTimes(2)
    expect(api.setScanjobMonitorMode).not.toHaveBeenCalled()
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('renders Ozon identifiers, status, scan details, and saved weights in separate cells', async () => {
    openMonitor()
    await flushPromises()
    expect(wrapper.findAll('.v-data-table-header-cell').map(cell => cell.text())).toEqual([
      'Поиск', 'Номер отправления', 'ID отправления', 'Штрихкод', ...trailingHeaders
    ])
    const [first, second] = wrapper.findAll('.v-data-table-row')
    expect(first.findAll('.v-data-table-cell').map(cell => cell.text())).toEqual([
      'Найдена', '0001-1', '000-ID', '001-LABEL', 'B-55',
      'Выпуск', 'Иванов Иван14:35 25.11SCAN-01', 'Куртка', '2.0002.300', '3'
    ])
    expect(first.findAll('.scanjob-monitor-scanned-info span').map(line => line.text())).toEqual([
      'Иванов Иван', '14:35 25.11', 'SCAN-01'
    ])
    expect(second.findAll('.scanjob-monitor-scanned-info span').map(line => line.text())).toEqual(['-', '-', '-'])
    const secondCells = second.findAll('.v-data-table-cell')
    expect([secondCells[2].text(), secondCells[3].text(), secondCells[5].text()]).toEqual(['-', '-', '-'])
    expect(first.get('.monitor-status-scanned').text()).toBe('Найдена')
    expect(first.get('button[aria-label="Открыть коробку № B-55"]').classes()).toContain('monitor-status-scanned')
    expect(second.get('button[aria-label="Открыть коробку № B-56"]').classes()).toContain('monitor-status-waiting')
    expect(second.get('.monitor-status-waiting').text()).toBe('Не сканирована')
    const cards = wrapper.get('[data-testid="scanjob-monitor-summary"]').findAll('.monitor-summary-item')
    expect(cards.map(card => [card.get('.monitor-summary-label').text(), card.get('.monitor-summary-value').text()])).toEqual([
      ['Коробки всего / сканировано / не сканировано', '5 / 2 / 3'],
      ['Посылки всего / сканировано / не сканировано', '100 / 4 / 96'],
      ['Найдено / Не найдено', '1 / 1']
    ])
    expect(wrapper.findComponent(ParcelWhFilterSelectors).props('numberLabel')).toBe('Номер отправления')
    expect(api.load).toHaveBeenCalledWith(8, expect.objectContaining({ page: '2', stickerPrefix: '00', parcelFilterId: '9' }))
    expect(api.start).toHaveBeenCalledOnce()

    expect(first.find('a, .link').exists()).toBe(false)
    expect(first.attributes('tabindex')).toBe('0')
    await first.trigger('keydown', { key: 'Tab' })
    await first.get('button[aria-label="Открыть коробку № B-55"]').trigger('keydown', { key: 'Enter' })
    expect(api.push).not.toHaveBeenCalled()
    await first.trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(api.push).toHaveBeenCalledWith(expect.objectContaining({ params: { id: 312, registerId: 42 },
      query: { mode: 'modeWarehouse', returnUrl: api.currentRoute.value.fullPath } }))
  })

  it.each([false, null])('renders a WBR-N parcel without confirmation in blue (%s)', async found => {
    api.canOpenParcel = false
    api.load.mockResolvedValue(lookupSnapshot({ registerType: WBRN_REGISTER_ID, status: 20,
      lookupFoundCount: null, lookupNotFoundCount: null, lookupRemainingCount: 2,
      lookupPage: { page: 1, totalCount: 1, items: [
        { found, parcel: { parcelId: 20, parcelNumber: '001', sticker: 'У01', stickerCode: 'C01', barcode: 'BAR-01',
          stickerScanned: true, statusTitle: 'Выпуск без уплаты',
          productName: 'Чехол', derivedTotalsPending: true } }
      ] } }))
    openMonitor()
    await flushPromises()
    expect(wrapper.findAll('.v-data-table-header-cell').map(cell => cell.text())).toEqual([
      'Поиск', 'ШК', 'Стикер (УИН)', 'Код стикера', 'Баркод', ...trailingHeaders
    ])
    const row = wrapper.get('.v-data-table-row')
    expect(row.findAll('.v-data-table-cell').slice(2, 7).map(cell => cell.text())).toEqual([
      'У01', 'C01', 'BAR-01', 'Без коробки', 'Выпуск без уплаты'
    ])
    expect(row.findAll('.scanjob-monitor-scanned-info span').map(line => line.text())).toEqual(['-', '-', '-'])
    expect(wrapper.get('.monitor-status-waiting').text()).toBe('Не сканирована')
    expect(wrapper.text()).toContain('Осталось найти 2')
    expect(wrapper.text()).toContain('(пересчёт)')
    expect(row.attributes('tabindex')).toBeUndefined()
    await row.trigger('click')
    expect(api.push).not.toHaveBeenCalled()
    expect(api.replace).toHaveBeenCalledWith({ query: expect.objectContaining({ page: '1' }) })
    expect(api.start).not.toHaveBeenCalled()
  })

  it.each([
    { boxStickerScanned: true, boxFoundCount: 0 },
    { boxStickerScanned: false, boxFoundCount: 1 }
  ])('shows yellow for a partially processed box (%o)', async progress => {
    const snapshot = lookupSnapshot()
    Object.assign(snapshot.lookupPage.items[1], progress, { boxId: null })
    api.load.mockResolvedValue(snapshot)
    openMonitor()
    await flushPromises()
    const boxNumber = wrapper.get('span.monitor-status-partial')
    expect(boxNumber.text()).toBe('B-56')
    expect(boxNumber.element.closest('.lookup-box-cell-unavailable')).not.toBeNull()
    await boxNumber.trigger('click')
    expect(api.push).not.toHaveBeenCalled()
  })

  it('opens the parcel from the row and the box from any part of its cell', async () => {
    const query = {
      page: '2', pageSize: '10', sortBy: 'postingNumber', sortOrder: 'desc',
      parcelFilterId: '9', numberPrefix: '000', boxNumberPrefix: 'B-', stickerPrefix: '00', productName: 'Куртка'
    }
    api.route.query = query
    const returnUrl = `/scanjobs/8/monitor/lookup?${new URLSearchParams(query)}`
    api.currentRoute.value.fullPath = returnUrl
    openMonitor()
    await flushPromises()
    expect(api.load).toHaveBeenCalledExactlyOnceWith(8, query)
    const row = wrapper.findAll('.v-data-table-row')[0]
    await row.findAll('.v-data-table-cell').find(cell => cell.text() === 'Куртка').trigger('click')
    await flushPromises()
    expect(api.push).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ params: { id: 312, registerId: 42 },
      query: { mode: 'modeWarehouse', returnUrl: api.currentRoute.value.fullPath } }))

    api.push.mockClear()
    await row.get('.lookup-box-cell').trigger('click')
    await flushPromises()
    expect(api.push).toHaveBeenCalledExactlyOnceWith({
      name: 'scanjob-monitor-box', params: { id: 8, boxId: 7 }, query: { returnUrl }
    })
  })

  const manualScanButton = 'button[data-testid="manual-parcel-scan"]'
  const lookupRows = () => wrapper.findAll('.v-data-table-row')

  it('scans one parcel and refreshes its current sorted page without following its own scan', async () => {
    vi.useFakeTimers()
    api.isWhOperator = true
    api.followUserId = 21
    Object.assign(api.route.query, { sortBy: 'postingNumber', sortOrder: 'desc' })
    let finishScan
    api.scanParcel.mockImplementationOnce(() => new Promise(resolve => { finishScan = resolve }))
    openMonitor()
    await flushPromises()
    const row = lookupRows()[1]
    await row.trigger('click', { ctrlKey: true })
    await row.get(manualScanButton).trigger('click')
    expect(api.scanParcel).toHaveBeenCalledExactlyOnceWith(8, 313)
    expect(api.confirm).not.toHaveBeenCalled()
    expect(wrapper.get('button[data-testid="scanjob-monitor-close-action"]').element.disabled).toBe(true)
    await row.trigger('keydown', { key: 'Enter' })
    await api.followUser.mock.lastCall[2].onFollowEvent(scanEvent(603, 313))
    handlers.onSnapshot({ scanJobId: 8, area: scanjobMonitorArea.Lookup })

    const refreshed = lookupSnapshot({ lookupFoundCount: 2, lookupNotFoundCount: 0 })
    refreshed.lookupPage.items[1].found = true
    api.load.mockResolvedValueOnce(refreshed)
    finishScan({ id: 313, count: 1, scanCodeId: 603, lookupOutcome: 'confirmed',
      itemNumbers: ['0001-2'], extData: 'Посылка найдена' })
    await flushPromises()
    await sendScan(scanEvent(603, 313))

    const expectedQuery = { pageSize: '50', ...api.route.query }
    expect(api.load.mock.calls).toEqual([[8, expectedQuery], [8, expectedQuery]])
    expect(api.push).not.toHaveBeenCalled()
    expect(api.replace).not.toHaveBeenCalled()
    expect(wrapper.get('.selected-parcel-row').element).toBe(row.element)
    expect(row.text()).toContain('Найдена')
    expect(wrapper.get('[data-testid="page-alert-region"] [role="status"]').text()).toContain('0001-2 — Посылка найдена')
  })

  it('waits for an in-flight read and resumes a queued follow event after the manual scan', async () => {
    vi.useFakeTimers()
    api.isWhOperator = true
    api.followUserId = 21
    let finishScan
    let finishRead
    api.scanParcel.mockImplementationOnce(() => new Promise(resolve => { finishScan = resolve }))
    openMonitor()
    await flushPromises()

    await api.followUser.mock.lastCall[2].onFollowEvent(scanEvent(603, 312))
    api.load.mockImplementationOnce(() => new Promise(resolve => { finishRead = resolve }))
    await lookupRows()[1].get(manualScanButton).trigger('click')
    await vi.advanceTimersByTimeAsync(150)
    const query = { pageSize: '50', sortBy: 'id', sortOrder: 'asc', ...api.route.query }
    expect(api.load).toHaveBeenLastCalledWith(8, query)
    finishScan({ id: 313, count: 1, scanCodeId: 604 })
    await flushPromises()
    handlers.onSnapshot({ scanJobId: 8, area: scanjobMonitorArea.Lookup })
    await vi.advanceTimersByTimeAsync(150)
    expect(api.load).toHaveBeenCalledTimes(2)

    api.load.mockResolvedValueOnce(lookupSnapshot()).mockResolvedValueOnce(followedPage(2, 312))
    finishRead(lookupSnapshot())
    await flushPromises()
    expect(api.load.mock.calls.slice(2)).toEqual([[8, query], [8, { ...query, followParcelId: '312' }]])
    expect(wrapper.get(followedRow).text()).toContain('0001-1')
  })

  it.each(['кнопка', 'контекстное меню'])('scans the selected rows through %s after confirmation', async action => {
    api.isWhOperator = true
    api.confirm.mockResolvedValueOnce(false)
    api.scanParcels.mockResolvedValue({ completed: [{ id: 312, count: 1 }, { id: 313, count: 1 }], skippedIds: [] })
    openMonitor()
    await flushPromises()
    const [first, second] = lookupRows()
    await first.trigger('click', { ctrlKey: true })
    await second.get('.lookup-box-cell').trigger('click', { shiftKey: true })
    expect(wrapper.findAll('.selected-parcel-row')).toHaveLength(2)
    expect(api.push).not.toHaveBeenCalled()
    const scan = () => action === 'кнопка' ? second.get(manualScanButton).trigger('click') : second.trigger('contextmenu')
    await scan()
    await flushPromises()
    expect(api.scanParcels).not.toHaveBeenCalled()
    expect(wrapper.findAll('.selected-parcel-row')).toHaveLength(2)

    await scan()
    await flushPromises()
    expect(api.confirm).toHaveBeenCalledTimes(2)
    expect(api.confirm).toHaveBeenLastCalledWith(expect.objectContaining({
      title: 'Сканирование посылок', contentComponentProps: expect.objectContaining({
        count: 2, jobs: [{ id: 8, label: 'Поиск пропущенных посылок' }]
      })
    }))
    expect(api.scanParcels).toHaveBeenCalledExactlyOnceWith(8, [312, 313])
    expect(api.scanParcel).not.toHaveBeenCalled()
    expect(wrapper.findAll('.selected-parcel-row')).toHaveLength(0)
    expect(api.load).toHaveBeenCalledTimes(2)
  })

  it.each(['snapshot', 'register'])('disables the action and multi-selection for a read-only %s', async source => {
    api.isWhOperator = true
    api.registerReadOnly = source === 'register'
    api.load.mockResolvedValue(lookupSnapshot({ readOnly: source === 'snapshot' }))
    openMonitor()
    await flushPromises()
    expect(wrapper.get('.read-only-notice').isVisible()).toBe(true)
    const [first, second] = lookupRows()
    expect(first.get(manualScanButton).element.disabled).toBe(true)
    await first.trigger('click', { ctrlKey: true })
    await second.trigger('click', { shiftKey: true })
    await first.trigger('contextmenu')
    await first.get(manualScanButton).trigger('click')
    expect(wrapper.findAll('.selected-parcel-row')).toHaveLength(0)
    expect(api.confirm).not.toHaveBeenCalled()
    expect(api.scanParcel).not.toHaveBeenCalled()
    expect(api.scanParcels).not.toHaveBeenCalled()
    await first.trigger('click')
    await flushPromises()
    expect(api.push).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ params: { id: 312, registerId: 42 } }))
  })

  it('shows a rejected batch once and retries the same selected parcels', async () => {
    api.isWhOperator = true
    api.scanParcels.mockRejectedValueOnce(Object.assign(new Error('Batch rejected'), { status: 422 }))
      .mockResolvedValueOnce({ completed: [{ id: 312, count: 1 }, { id: 313, count: 1 }], skippedIds: [] })
    openMonitor()
    await flushPromises()
    const [first, second] = lookupRows()
    await first.trigger('click', { ctrlKey: true })
    await second.trigger('click', { ctrlKey: true })
    await second.trigger('contextmenu')
    await flushPromises()
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.get('[role="alert"]').text()).toContain('Не удалось отсканировать выбранные позиции')
    expect(wrapper.text()).not.toContain('Batch rejected')
    expect(wrapper.findAll('.selected-parcel-row')).toHaveLength(2)
    expect(api.push).not.toHaveBeenCalled()
    expect(api.replace).not.toHaveBeenCalled()

    await second.get(manualScanButton).trigger('click')
    await flushPromises()
    expect(api.scanParcels.mock.calls).toEqual([[8, [312, 313]], [8, [312, 313]]])
    expect(wrapper.findAll('.selected-parcel-row')).toHaveLength(0)
  })

  it('clears selected parcels when a rejected scan refreshes the register as read-only', async () => {
    api.isWhOperator = true
    const error = { status: 409, data: { code: 'RegisterReadOnly', msg: 'Партия доступна только для просмотра' } }
    api.scanParcels.mockRejectedValueOnce(error)
    openMonitor()
    await flushPromises()
    const [first, second] = lookupRows()
    await first.trigger('click', { ctrlKey: true })
    await second.trigger('click', { shiftKey: true })
    api.load.mockResolvedValueOnce(lookupSnapshot({ readOnly: true }))
    await second.trigger('contextmenu')
    await flushPromises()
    expect(api.scanParcels).toHaveBeenCalledExactlyOnceWith(8, [312, 313])
    expect(wrapper.get('[role="alert"]').text()).toContain(error.data.msg)
    expect(wrapper.get('.read-only-notice').isVisible()).toBe(true)
    expect(first.get(manualScanButton).element.disabled).toBe(true)
    expect(wrapper.findAll('.selected-parcel-row')).toHaveLength(0)
  })

  it('reports a failed post-scan read once and keeps the current page open', async () => {
    const error = new Error('Lookup snapshot unavailable')
    expectDiagnostics(['manual scan failure refresh', error])
    api.isWhOperator = true
    api.scanParcel.mockResolvedValue({ id: 313, count: 1 })
    openMonitor()
    await flushPromises()
    api.load.mockRejectedValueOnce(error)
    await lookupRows()[1].get(manualScanButton).trigger('click')
    await flushPromises()
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.get('[role="alert"]').text()).toContain('Не удалось обновить данные после сканирования')
    expect(wrapper.text()).not.toContain(error.message)
    expect(lookupRows()).toHaveLength(2)
    expect(api.replace).not.toHaveBeenCalled()
  })

  it('presents a rejected box navigation once and retries the box route', async () => {
    const error = new Error('Box navigation failed')
    expectDiagnostics(['Не удалось открыть коробку', error])
    api.push.mockRejectedValueOnce(error)
    openMonitor()
    await flushPromises()
    const box = wrapper.get('button[aria-label="Открыть коробку № B-55"]')
    await box.trigger('click')
    await flushPromises()
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.get('[role="alert"]').text()).toContain('Не удалось открыть коробку')
    expect(wrapper.text()).not.toContain('Box navigation failed')
    await box.trigger('click')
    await flushPromises()
    const boxRoute = {
      name: 'scanjob-monitor-box', params: { id: 8, boxId: 7 }, query: { returnUrl: api.currentRoute.value.fullPath }
    }
    expect(api.push.mock.calls).toEqual([[boxRoute], [boxRoute]])
  })

  it('coalesces live invalidations and refreshes the current filtered page again at completion', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    openMonitor()
    await flushPromises()
    handlers.onSnapshot({ scanJobId: 9, area: 4 })
    handlers.onSnapshot({ scanJobId: 8, area: 0 })
    await vi.advanceTimersByTimeAsync(200)
    expect(api.load).toHaveBeenCalledOnce()
    handlers.onSnapshot({ scanJobId: 8, area: 4 })
    await vi.advanceTimersByTimeAsync(100)
    handlers.onSnapshot({ scanJobId: 8, area: 4 })
    await vi.advanceTimersByTimeAsync(50)
    expect(api.load).toHaveBeenCalledTimes(2)
    expect(api.load.mock.calls[1]).toEqual(api.load.mock.calls[0])
    handlers.onClosed(9)
    expect(api.stop).not.toHaveBeenCalled()
    api.load.mockResolvedValueOnce(lookupSnapshot({ status: 20 }))
    handlers.onClosed(8)
    await flushPromises()
    expect(wrapper.getComponent(LocalLabelPrinting).props('active')).toBe(false)
    expect(api.load).toHaveBeenCalledTimes(3)
    expect(api.start).toHaveBeenCalledOnce()
    expect(api.stop).toHaveBeenCalledOnce()
  })

  it('replaces query filters and drops results from a superseded request', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    openMonitor()
    await flushPromises()
    let finishFirst
    api.load.mockImplementationOnce(() => new Promise(resolve => { finishFirst = resolve }))
    wrapper.getComponent(PaginationFooter).vm.$emit('update:page', 3)
    await flushPromises()
    expect(api.load).toHaveBeenLastCalledWith(8, expect.objectContaining({ page: '3' }))
    await setLookupFilter('Номер отправления', '00-1')
    await setLookupFilter('Номер коробки', '00-BOX')
    await setLookupFilter('Любой из стикеров', '00-CODE')
    await setLookupFilter('Товар', 'Юбка')
    await vi.advanceTimersByTimeAsync(250)
    api.load.mockResolvedValueOnce(lookupSnapshot({ lookupPage: { page: 1, totalCount: 0, items: [] } }))
    finishFirst(lookupSnapshot({ scanJobName: 'Устаревшее задание' }))
    await flushPromises()
    expect(wrapper.text()).not.toContain('Устаревшее задание')
    expect(api.load).toHaveBeenLastCalledWith(8, expect.objectContaining({ page: '1', numberPrefix: '00-1',
      boxNumberPrefix: '00-BOX', stickerPrefix: '00-CODE', productName: 'Юбка' }))
    expect(api.replace).toHaveBeenLastCalledWith({ query: api.load.mock.calls.at(-1)[1] })
  })

  it('resyncs controls and rows on history navigation and ignores stale responses', async () => {
    api.load.mockImplementation(async (_id, query) => {
      const snapshot = lookupSnapshot()
      snapshot.lookupPage.page = Number(query.page)
      snapshot.lookupPage.items[0].parcel.parcelNumber = query.stickerPrefix || 'Без фильтра'
      return snapshot
    })
    const navigation = await openRoutedMonitor()
    const destination = navigation.currentRoute.value.fullPath
    await flushPromises()
    expect(wrapper.get('.v-data-table-row').text()).toContain('00')

    let resolveStalePage
    api.load.mockImplementationOnce(() => new Promise(resolve => { resolveStalePage = resolve }))
    const query = { page: '3', pageSize: '10', sortBy: 'postingNumber', sortOrder: 'desc', stickerPrefix: 'ALT' }
    await navigation.push({ query })
    await flushPromises()
    expect(api.load).toHaveBeenLastCalledWith(8, query)
    expect(wrapper.getComponent(ParcelWhFilterSelectors).props('localStickerSearch')).toBe('ALT')
    expect(wrapper.find('.v-data-table-row').exists()).toBe(false)

    navigation.back()
    await flushPromises()
    expect(navigation.currentRoute.value.fullPath).toBe(destination)
    expect(wrapper.getComponent(ParcelWhFilterSelectors).props('localStickerSearch')).toBe('00')
    resolveStalePage(lookupSnapshot({ scanJobName: 'Устаревшее задание' }))
    await flushPromises()
    expect(wrapper.text()).not.toContain('Устаревшее задание')
    expect(api.load).toHaveBeenLastCalledWith(8, expect.objectContaining({ page: '2', parcelFilterId: '9' }))
    expect(wrapper.getComponent(PaginationFooter).props('page')).toBe(2)

    navigation.forward()
    await flushPromises()
    expect(api.load).toHaveBeenLastCalledWith(8, query)
    expect(wrapper.getComponent(PaginationFooter).props()).toMatchObject({ page: 3, itemsPerPage: 10 })
    expect(wrapper.getComponent({ name: 'v-data-table-server' }).props('sortBy'))
      .toEqual([{ key: 'postingNumber', order: 'desc' }])
    expect(wrapper.get('.v-data-table-row').text()).toContain('ALT')
    expect(api.load).toHaveBeenCalledTimes(4)
    expect(api.replace).not.toHaveBeenCalled()

    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    wrapper.getComponent(ParcelWhFilterSelectors).vm.$emit('update:localStickerSearch', null)
    await vi.advanceTimersByTimeAsync(250)
    await flushPromises()
    expect(navigation.currentRoute.value.query).toEqual({ page: '1', pageSize: '10', sortBy: 'postingNumber', sortOrder: 'desc' })
    expect(api.replace).toHaveBeenCalledOnce()
    expect(api.load).toHaveBeenCalledTimes(5)
    expect(wrapper.get('.v-data-table-row').text()).toContain('Без фильтра')
  })

  it('shows a rejected query update once and keeps filtering and parcel navigation usable', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    openMonitor()
    await flushPromises()
    const alertError = vi.spyOn(useAlertStore(), 'error')
    const error = new Error('Invalid route update')
    const message = 'Не удалось сохранить параметры поиска'
    expectDiagnostics([message, error])
    const snapshot = lookupSnapshot()
    api.load.mockResolvedValue({ ...snapshot, lookupPage: { ...snapshot.lookupPage, page: 1 } })
    api.replace.mockRejectedValueOnce(error)

    await setLookupFilter('Любой из стикеров', '00-1')
    await vi.advanceTimersByTimeAsync(250)
    await flushPromises()
    const firstQuery = { page: '1', pageSize: '50', sortBy: 'id', sortOrder: 'asc', parcelFilterId: '9', stickerPrefix: '00-1' }
    expect(api.replace).toHaveBeenCalledExactlyOnceWith({ query: firstQuery })
    expect(api.load).toHaveBeenLastCalledWith(8, firstQuery)
    expect(alertError).toHaveBeenCalledExactlyOnceWith(error, { fallback: message })
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.get('[role="alert"]').isVisible()).toBe(true)
    expect(wrapper.get('[role="alert"]').text()).toContain(message)
    expect(wrapper.text()).not.toContain(error.message)

    api.replace.mockImplementationOnce(async ({ query }) => {
      api.currentRoute.value = { ...api.currentRoute.value, fullPath: `/scanjobs/8/monitor/lookup?${new URLSearchParams(query)}` }
    })
    await setLookupFilter('Любой из стикеров', '00-2')
    await vi.advanceTimersByTimeAsync(250)
    await flushPromises()
    const nextQuery = { ...firstQuery, stickerPrefix: '00-2' }
    expect(api.replace).toHaveBeenLastCalledWith({ query: nextQuery })
    expect(api.load).toHaveBeenLastCalledWith(8, nextQuery)
    expect(alertError).toHaveBeenCalledOnce()

    await wrapper.findAll('.v-data-table-row')[0].trigger('click')
    await flushPromises()
    expect(api.push).toHaveBeenCalledExactlyOnceWith({
      name: 'Редактирование посылки',
      params: { id: 312, registerId: 42 },
      query: { mode: 'modeWarehouse', returnUrl: `/scanjobs/8/monitor/lookup?${new URLSearchParams(nextQuery)}` }
    })
  })

  it.each([
    new Error('Invalid fixture token'),
    Object.assign(new Error('Not Found'), { status: 404 })
  ])('opens login after an unexpected page load failure (%s)', async error => {
    expectDiagnostics(['Не удалось загрузить посылки для поиска', error])
    api.load.mockRejectedValueOnce(error)
    const destination = api.currentRoute.value.fullPath
    openMonitor()
    await flushPromises()
    expect(wrapper.get('.primary-heading').text()).toBe('Посылки для поиска')
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.get('[role="alert"]').text()).toContain('Не удалось загрузить посылки для поиска')
    expect(wrapper.text()).not.toContain(error.message)
    expect(api.push).not.toHaveBeenCalled()
    expect(api.currentRoute.value.path).toBe('/login')
    expect(api.clearSession).toHaveBeenCalledOnce()
    expect(api.returnUrl).toBe(destination)
    expect(api.load).toHaveBeenCalledOnce()
    expect(wrapper.text()).not.toContain('Повторить загрузку')
  })

  it.each([
    ['loadRegister', 'Не удалось загрузить данные партии'],
    ['filters', 'Не удалось загрузить фильтры посылок'],
    ['loadFollowUsers', 'Не удалось загрузить список сканеров']
  ])('shows a failed %s request once on the login page', async (request, message) => {
    const error = new Error('Invalid initialization response')
    expectDiagnostics([message, error])
    api[request].mockRejectedValueOnce(error)
    const destination = api.currentRoute.value.fullPath
    const navigation = await openRoutedMonitor()
    await flushPromises()

    expect(navigation.currentRoute.value.path).toBe('/login')
    expect(api.returnUrl).toBe(destination)
    expect(api.clearSession).toHaveBeenCalledOnce()
    expect(api.replace).toHaveBeenCalledExactlyOnceWith('/login')
    expect(wrapper.get('.primary-heading').text()).toBe('Вход')
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.get('hr.hr + .page-alert-region [role="alert"]').text()).toContain(message)
    expect(wrapper.text()).not.toContain(error.message)
  })

  it.each([
    ['loadRegister', 'Не удалось загрузить данные партии'],
    ['filters', 'Не удалось загрузить фильтры посылок'],
    ['loadFollowUsers', 'Не удалось загрузить список сканеров']
  ])('keeps a late %s failure out of the next page alert', async (request, message) => {
    const error = new Error('Invalid late response')
    expectDiagnostics([message, error])
    let rejectRequest
    api[request].mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectRequest = reject }))
    const navigation = await openRoutedMonitor()
    await flushPromises()
    await navigation.push('/login')
    await flushPromises()
    rejectRequest(error)
    await flushPromises()

    expect(wrapper.get('.primary-heading').text()).toBe('Вход')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(api.clearSession).not.toHaveBeenCalled()
  })

  it('keeps scanner following disabled and attempts login once when both initialization requests fail', async () => {
    const error = new Error('Invalid scanner response')
    const navigationError = new Error('Invalid navigation')
    const registerError = new Error('Invalid register response')
    expectDiagnostics(
      ['Не удалось загрузить список сканеров', error],
      ['Переход на страницу входа после ошибки загрузки', navigationError],
      ['Не удалось загрузить данные партии', registerError]
    )
    api.followUserId = 21
    let rejectRegister
    api.loadRegister.mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectRegister = reject }))
    api.loadFollowUsers.mockRejectedValueOnce(error)
    api.replace.mockRejectedValueOnce(navigationError)
    openMonitor()
    await flushPromises()
    rejectRegister(registerError)
    await flushPromises()

    const button = wrapper.get('button[data-testid="scanjob-monitor-follow-user-open"]')
    expect(button.element.disabled).toBe(true)
    expect(api.followUser).not.toHaveBeenCalled()
    expect(api.clearSession).toHaveBeenCalledOnce()
    expect(api.replace).toHaveBeenCalledExactlyOnceWith('/login')
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.get('[role="alert"]').text()).toContain('Не удалось загрузить список сканеров')
  })

  it('opens Lookup normally when the scanner list is empty', async () => {
    api.loadFollowUsers.mockResolvedValueOnce([])
    const navigation = await openRoutedMonitor()
    await flushPromises()

    expect(navigation.currentRoute.value.name).toBe('scanjob-monitor-lookup')
    expect(wrapper.findAll('.v-data-table-row')).toHaveLength(2)
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(api.clearSession).not.toHaveBeenCalled()
    await wrapper.get('button[data-testid="scanjob-monitor-follow-user-open"]').trigger('click')
    const selector = wrapper.findAllComponents({ name: 'v-select' })
      .find(component => component.props('label') === 'Следить за сканером')
    expect(selector.props('items')).toEqual([{ title: 'Не следить (Esc)', value: null }])
  })

  it('keeps the saved scanner preference when an obsolete scanner list returns empty', async () => {
    api.followUserId = 21
    let resolveUsers
    api.loadFollowUsers.mockImplementationOnce(() => new Promise(resolve => { resolveUsers = resolve }))
    const navigation = await openRoutedMonitor()
    await flushPromises()
    await navigation.push('/login')
    await flushPromises()
    resolveUsers([])
    await flushPromises()

    expect(api.setFollowUser).not.toHaveBeenCalled()
    expect(api.followUser).not.toHaveBeenCalled()
  })

  it.each([false, true])('handles an unavailable Lookup job locally (previous snapshot: %s)', async previouslyAvailable => {
    const error = { status: 404, data: { msg: "Не удалось найти задачу сканирования '8'" } }
    if (!previouslyAvailable) api.load.mockRejectedValueOnce(error)
    const navigation = await openRoutedMonitor()
    await flushPromises()
    if (previouslyAvailable) {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
      expect(wrapper.findAll('.v-data-table-row')).toHaveLength(2)
      let rejectPage
      api.load.mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectPage = reject }))
      await navigation.push({ query: { page: '1' } })
      await flushPromises()
      handlers.onSnapshot({ scanJobId: 8, area: scanjobMonitorArea.Lookup })
      rejectPage(error)
      await flushPromises()
      await vi.advanceTimersByTimeAsync(150)
      await flushPromises()
      expect(api.load).toHaveBeenCalledTimes(2)
      expect(api.stop).toHaveBeenCalledOnce()
    } else {
      expect(api.start).not.toHaveBeenCalled()
    }

    expect(navigation.currentRoute.value.name).toBe('scanjob-monitor-lookup')
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.get('[role="alert"]').text()).toContain('Монитор поиска недоступен для задания «8»')
    expect(wrapper.find('.v-data-table-row').exists()).toBe(false)
    expect(api.clearSession).not.toHaveBeenCalled()
    expect(api.replace).not.toHaveBeenCalled()
  })

  it('shows the load error once if the login navigation rejects', async () => {
    const loadError = new Error('Invalid page response')
    const navigationError = new Error('Invalid navigation')
    expectDiagnostics(
      ['Не удалось загрузить посылки для поиска', loadError],
      ['Переход на страницу входа после ошибки загрузки', navigationError]
    )
    api.load.mockRejectedValueOnce(loadError)
    api.replace.mockRejectedValueOnce(navigationError)
    openMonitor()
    await flushPromises()
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.get('[role="alert"]').text()).toContain('Не удалось загрузить посылки для поиска')
    expect(wrapper.text()).not.toContain('Повторить загрузку')
  })

  it('clears a removed saved filter and reloads from the first page', async () => {
    api.load.mockRejectedValueOnce({ status: 404, data: { code: 'parcel_filter_not_found' } })
    api.load.mockResolvedValueOnce(lookupSnapshot({ lookupPage: { page: 1, totalCount: 0, items: [] } }))
    openMonitor()
    await flushPromises()
    const retry = api.load.mock.calls[1][1]
    expect(retry.page).toBe('1')
    expect(retry.stickerPrefix).toBe('00')
    expect(retry).not.toHaveProperty('parcelFilterId')
    expect(wrapper.text()).toContain('Выбранный пользовательский фильтр недоступен. Фильтр сброшен.')
  })

  it('preserves the requested page for sign-in when a filtered page fails to load', async () => {
    const error = new Error('Invalid page response')
    expectDiagnostics(['Не удалось загрузить посылки для поиска', error])
    openMonitor()
    await flushPromises()
    api.load.mockRejectedValueOnce(error)
    const destination = '/scanjobs/8/monitor/lookup?page=3&stickerPrefix=00'
    api.replace.mockImplementationOnce(async () => {
      api.currentRoute.value = { path: '/scanjobs/8/monitor/lookup', fullPath: destination }
    })
    wrapper.getComponent(PaginationFooter).vm.$emit('update:page', 3)
    await flushPromises()
    expect(wrapper.findAll('.v-data-table-row')).toHaveLength(0)
    expect(wrapper.findComponent(ParcelWhFilterSelectors).exists()).toBe(true)
    expect(wrapper.get('[role="alert"]').text()).toContain('Не удалось загрузить посылки для поиска')
    expect(api.load.mock.calls.slice(1)).toEqual([[8, expect.objectContaining({ page: '3', stickerPrefix: '00' })]])
    expect(wrapper.findComponent(PaginationFooter).exists()).toBe(false)
    expect(api.returnUrl).toBe(destination)
    expect(api.currentRoute.value.path).toBe('/login')
  })

  it('uses the saved filter and ignores obsolete check, zone and status filters from older URLs', async () => {
    Object.assign(api.route.query, { statusId: '10', checkStatusProjectionKind: '20', zone: '2' })
    openMonitor()
    await flushPromises()
    const filterBar = wrapper.getComponent(ParcelWhFilterSelectors)
    expect(filterBar.findAllComponents({ name: 'v-select' }).map(select => select.props('label'))).toEqual(['Пользовательский фильтр'])
    expect(api.load.mock.lastCall[1]).toEqual({ page: '2', pageSize: '50', sortBy: 'id', sortOrder: 'asc',
      stickerPrefix: '00', parcelFilterId: '9' })
    api.load.mockResolvedValue(lookupSnapshot({ lookupPage: { page: 1, totalCount: 0, items: [] } }))
    const saved = wrapper.getComponent(ParcelSavedFilterSelector).getComponent({ name: 'v-select' })
    saved.vm.$emit('update:modelValue', null)
    wrapper.getComponent({ name: 'v-data-table-server' }).vm.$emit('update:sortBy', [{ key: 'postingNumber', order: 'desc' }])
    wrapper.getComponent(PaginationFooter).vm.$emit('update:itemsPerPage', -1)
    await flushPromises()
    const query = { page: '1', pageSize: '-1', sortBy: 'postingNumber', sortOrder: 'desc', stickerPrefix: '00' }
    expect(api.load).toHaveBeenLastCalledWith(8, query)
    expect(api.replace).toHaveBeenLastCalledWith({ query })
    expect(wrapper.getComponent(PaginationFooter).props('maxPage')).toBe(1)
  })

  it('shows the page error once when reconciliation also fails, retaining the saved page', async () => {
    const loadError = new Error('Invalid snapshot')
    const connectionError = new Error('Invalid connection')
    expectDiagnostics(
      ['Подключение обновлений монитора сканирования', connectionError],
      ['Не удалось загрузить посылки для поиска', loadError]
    )
    openMonitor()
    await flushPromises()
    api.load.mockRejectedValueOnce(loadError)
    onConnectionError(connectionError)
    await flushPromises()
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.get('[role="alert"]').text()).toContain('Не удалось загрузить посылки для поиска')
    expect(wrapper.findAll('.v-data-table-row')).toHaveLength(2)
  })

  it('does not let an abandoned view report a late connection failure or failed disconnect', async () => {
    const connectionError = new Error('Invalid late connection')
    const disconnectError = new Error('Invalid disconnect')
    expectDiagnostics(
      ['Подключение закрытого монитора сканирования', connectionError],
      ['Отключение монитора поиска посылок', disconnectError]
    )
    openMonitor()
    await flushPromises()
    api.stop.mockRejectedValueOnce(disconnectError)
    wrapper.unmount()
    wrapper = null
    onConnectionError(connectionError)
    await flushPromises()
    expect(api.load).toHaveBeenCalledOnce()
  })

  it('keeps a final saved page if the job finishes before live observation starts', async () => {
    const error = new Error('Invalid status')
    expectDiagnostics(['Подписка на остановленное задание', error])
    api.start.mockRejectedValueOnce(error)
    api.load.mockResolvedValueOnce(lookupSnapshot()).mockResolvedValueOnce(lookupSnapshot({ status: 20 }))
    openMonitor()
    await flushPromises()
    expect(api.start).toHaveBeenCalledOnce()
    expect(api.load).toHaveBeenCalledTimes(2)
    expect(api.stop).toHaveBeenCalledOnce()
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper.findAll('.v-data-table-row')).toHaveLength(2)
  })

  it('opens login after confirming a terminal connection failure for an active job', async () => {
    const error = new Error('Invalid connection')
    expectDiagnostics(['Не удалось подключить обновления монитора сканирования', error])
    openMonitor()
    await flushPromises()
    onConnectionError(error)
    await flushPromises()
    expect(api.load).toHaveBeenCalledTimes(2)
    expect(api.start).toHaveBeenCalledOnce()
    expect(api.stop).toHaveBeenCalledOnce()
    expect(api.replace).toHaveBeenCalledExactlyOnceWith('/login')
    expect(wrapper.get('[role="alert"]').text()).toContain('Не удалось подключить обновления монитора сканирования')
    expect(wrapper.text()).not.toContain('Повторить загрузку')
  })

  it.each([
    ['start', 'Не удалось подключить обновления монитора сканирования'],
    ['connection', 'Не удалось подключить обновления монитора сканирования'],
    ['navigation', 'Не удалось открыть посылку']
  ])('shows the %s failure in the page alert', async (failure, message) => {
    const error = new Error('Invalid internal message')
    expectDiagnostics([message, error])
    if (failure === 'start') api.start.mockRejectedValueOnce(error)
    if (failure === 'navigation') api.push.mockRejectedValueOnce(error)
    openMonitor()
    await flushPromises()
    if (failure === 'connection') onConnectionError(error)
    if (failure === 'navigation') await wrapper.findAll('.v-data-table-row')[0].trigger('click')
    await flushPromises()
    await nextTick()
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.get('[role="alert"]').text()).toContain(message)
    expect(wrapper.text()).not.toContain('Invalid internal message')
    if (failure === 'start') expect(api.stop).toHaveBeenCalledOnce()
  })
})
