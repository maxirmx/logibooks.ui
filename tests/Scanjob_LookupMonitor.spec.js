// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks UI application.

import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import LookupMonitorView from '@/views/Scanjob_LookupMonitor_View.vue'
import ParcelWhFilterSelectors from '@/components/ParcelWhFilterSelectors.vue'
import ParcelSavedFilterSelector from '@/components/ParcelSavedFilterSelector.vue'
import PaginationFooter from '@/components/PaginationFooter.vue'
import { WBRN_REGISTER_ID } from '@/helpers/company.constants.js'
import { vuetifyStubs } from './helpers/test-utils.js'

const api = vi.hoisted(() => ({ load: vi.fn(), createChannel: vi.fn(), start: vi.fn(), stop: vi.fn(),
  filters: vi.fn(), statuses: vi.fn(), zones: vi.fn(), push: vi.fn(), replace: vi.fn(), canOpenParcel: true,
  route: { query: {} }, currentRoute: { value: { fullPath: '/scanjobs/8/monitor/lookup' } } }))

vi.mock('vue-router', async importOriginal => ({
  ...await importOriginal(),
  useRoute: () => api.route,
  useRouter: () => api
}))
vi.mock('@/stores/scanjobs.store.js', () => ({
  useScanjobsStore: () => ({ loadLookupMonitorPage: api.load, createLookupMonitorChannel: api.createChannel })
}))
vi.mock('@/stores/auth.store.js', () => ({ useAuthStore: () => ({ hasLogistRole: api.canOpenParcel }) }))
vi.mock('@/stores/parcel.filters.store.js', () => ({
  useParcelFiltersStore: () => ({ filters: [{ id: 9, name: 'Склад' }], getAll: api.filters })
}))
vi.mock('@/stores/parcel.statuses.store.js', () => ({
  useParcelStatusesStore: () => ({ parcelStatuses: [{ id: 10, title: 'Выпуск' }], ensureLoaded: api.statuses })
}))
vi.mock('@/stores/warehouses.store.js', () => ({
  useWarehousesStore: () => ({ ops: { zones: [{ value: 1, name: '' }, { value: 2, name: 'Зелёная зона' }] }, ensureOpsLoaded: api.zones })
}))

const headerTitles = ['№', 'Поиск', 'Номер отправления', 'Стикеры', 'Номер и стикер коробки',
  'Проверка, зона, статус', 'Описание', 'Вес, кг', 'Количество']

function lookupSnapshot(overrides = {}) {
  return {
    scanJobId: 8, scanJobName: 'Поиск пропущенных посылок', status: 15, registerId: 42, registerType: 1,
    lookupFoundCount: 1, lookupNotFoundCount: 1,
    lookupPage: { page: 2, totalCount: 75, items: [
      { found: true, ozonId: '000-ID', boxNumber: 'B-55', boxSticker: 'B-LABEL', boxStickerScanned: true,
        parcel: { parcelId: 312, parcelNumber: '0001-1', barcode: '001-LABEL', productName: 'Куртка', quantity: 3,
          weightKg: 2, adjustedWeightKg: 2.3, zoneName: 'Красная зона', statusTitle: 'Выпуск',
          checkStatusProjection: { kind: 20, title: 'Запрет', restrictionReason: 'Наименование запрещено' } } },
      { found: false, boxNumber: 'B-56', boxStickerScanned: false, parcel: { parcelId: 313, parcelNumber: '0001-2' } }
    ] },
    ...overrides
  }
}

let wrapper
let handlers
let onConnectionError

function openMonitor() {
  wrapper = mount(LookupMonitorView, { props: { id: 8 }, global: {
    stubs: { ...vuetifyStubs, 'font-awesome-icon': true, 'v-btn': { template: '<button><slot /></button>' },
      'v-tooltip': { props: ['text'], template: '<div><slot name="activator" :props="{ \'aria-label\': text }"></slot><slot></slot></div>' } }
  } })
  return wrapper
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.resetAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  api.canOpenParcel = true
  api.route.query = { page: '2', stickerPrefix: '00', parcelFilterId: '9' }
  api.currentRoute.value.fullPath = '/scanjobs/8/monitor/lookup?page=2&stickerPrefix=00&parcelFilterId=9'
  api.load.mockResolvedValue(lookupSnapshot())
  api.replace.mockResolvedValue(undefined)
  api.start.mockImplementation(async (_id, callbacks) => { handlers = callbacks })
  api.createChannel.mockImplementation(callback => {
    onConnectionError = callback
    return { start: api.start, stop: api.stop }
  })
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('Lookup monitor', () => {
  it('renders Ozon columns, separate sticker lines, box state, customs projection and saved weights', async () => {
    openMonitor()
    await flushPromises()
    expect(wrapper.findAll('.v-data-table-header-cell').map(cell => cell.text())).toEqual(headerTitles)
    const [first, second] = wrapper.findAll('.v-data-table-row')
    expect(first.findAll('.v-data-table-cell').map(cell => cell.text())).toEqual([
      '312', 'Найдено', '0001-1', 'Штрихкод: 001-LABELID отправления: 000-ID', 'B-55B-LABEL',
      'ЗапретКрасная зонаВыпуск', 'Куртка', '2.0002.300', '3'
    ])
    expect(first.get('[aria-label="Коробка отсканирована"]').classes()).toContain('no-issues')
    expect(first.get('[aria-label="Наименование запрещено"]').classes()).toContain('has-issues')
    expect(second.get('[aria-label="Коробка не отсканирована"]').classes()).toContain('lookup-box-unscanned')
    expect(second.get('.lookup-pending').text()).toBe('Не найдено')
    expect(wrapper.text()).toContain('Найдено 1 · Не найдено 1')
    expect(wrapper.findComponent(ParcelWhFilterSelectors).props('numberLabel')).toBe('Номер отправления')
    expect(api.load).toHaveBeenCalledWith(8, expect.objectContaining({ page: '2', stickerPrefix: '00', parcelFilterId: '9' }))
    expect(api.start).toHaveBeenCalledOnce()

    await wrapper.get('[aria-label="Открыть посылку № 312"]').trigger('click')
    await flushPromises()
    expect(api.push).toHaveBeenCalledWith(expect.objectContaining({ params: { id: 312, registerId: 42 },
      query: { mode: 'modeWarehouse', returnUrl: api.currentRoute.value.fullPath } }))
  })

  it('uses SHK and WBR-N labels, includes unboxed parcels, and handles an older result', async () => {
    api.canOpenParcel = false
    api.load.mockResolvedValue(lookupSnapshot({ registerType: WBRN_REGISTER_ID, status: 20,
      lookupFoundCount: null, lookupRemainingCount: 2,
      lookupPage: { page: 1, totalCount: 1, items: [
        { found: null, parcel: { parcelId: 20, parcelNumber: '001', sticker: 'У01', stickerCode: 'C01',
          productName: 'Чехол', derivedTotalsPending: true } }
      ] } }))
    openMonitor()
    await flushPromises()
    expect(wrapper.findAll('.v-data-table-header-cell').map(cell => cell.text())).toEqual(headerTitles.with(2, 'ШК'))
    expect(wrapper.text()).toContain('Стикер (УИН): У01Код стикера: C01')
    expect(wrapper.text()).toContain('Без коробки')
    expect(wrapper.text()).toContain('Нет данных')
    expect(wrapper.text()).toContain('Осталось найти 2')
    expect(wrapper.text()).toContain('(пересчёт)')
    expect(wrapper.find('button[aria-label^="Открыть посылку"]').exists()).toBe(false)
    expect(api.replace).toHaveBeenCalledWith({ query: expect.objectContaining({ page: '1' }) })
    expect(api.start).not.toHaveBeenCalled()
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
    const filter = wrapper.getComponent(ParcelWhFilterSelectors)
    filter.vm.$emit('update:local-parcel-number-search', '00-1')
    filter.vm.$emit('update:local-box-number-search', '00-BOX')
    filter.vm.$emit('update:local-sticker-search', '00-CODE')
    filter.vm.$emit('update:local-product-name-search', 'Юбка')
    await vi.advanceTimersByTimeAsync(250)
    api.load.mockResolvedValueOnce(lookupSnapshot({ lookupPage: { page: 1, totalCount: 0, items: [] } }))
    finishFirst(lookupSnapshot({ scanJobName: 'Устаревшее задание' }))
    await flushPromises()
    expect(wrapper.text()).not.toContain('Устаревшее задание')
    expect(api.load).toHaveBeenLastCalledWith(8, expect.objectContaining({ page: '1', numberPrefix: '00-1',
      boxNumberPrefix: '00-BOX', stickerPrefix: '00-CODE', productName: 'Юбка' }))
    expect(api.replace).toHaveBeenLastCalledWith({ query: api.load.mock.calls.at(-1)[1] })
  })

  it('presents a rejected page load once, preserves the route and allows retry', async () => {
    api.load.mockRejectedValueOnce(new Error('Invalid fixture token'))
    openMonitor()
    await flushPromises()
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.get('[role="alert"]').text()).toContain('Не удалось загрузить посылки для поиска')
    expect(wrapper.text()).not.toContain('Invalid fixture token')
    expect(api.push).not.toHaveBeenCalled()
    const retry = wrapper.findAll('button').find(button => button.text() === 'Повторить загрузку')
    await retry.trigger('click')
    await flushPromises()
    expect(api.load.mock.calls[1]).toEqual(api.load.mock.calls[0])
    expect(wrapper.findAll('.v-data-table-row')).toHaveLength(2)
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

  it('hides stale parcels when loading the requested page fails and retries that page', async () => {
    openMonitor()
    await flushPromises()
    api.load.mockRejectedValueOnce(new Error('Invalid page response'))
    wrapper.getComponent(PaginationFooter).vm.$emit('update:page', 3)
    await flushPromises()
    expect(wrapper.findAll('.v-data-table-row')).toHaveLength(0)
    expect(wrapper.findComponent(ParcelWhFilterSelectors).exists()).toBe(true)
    expect(wrapper.get('[role="alert"]').text()).toContain('Не удалось загрузить посылки для поиска')
    api.load.mockResolvedValueOnce(lookupSnapshot({ lookupPage: { page: 3, totalCount: 105, items: [] } }))
    await wrapper.findAll('button').find(button => button.text() === 'Повторить загрузку').trigger('click')
    await flushPromises()
    expect(api.load.mock.calls.slice(1)).toEqual(Array(2).fill([8, expect.objectContaining({ page: '3', stickerPrefix: '00' })]))
    expect(wrapper.getComponent(PaginationFooter).props('page')).toBe(3)
  })

  it('combines the shared saved, check, zone and status filters with sorting and page size', async () => {
    openMonitor()
    await flushPromises()
    api.load.mockResolvedValue(lookupSnapshot({ lookupPage: { page: 1, totalCount: 0, items: [] } }))
    const saved = wrapper.getComponent(ParcelSavedFilterSelector).getComponent({ name: 'v-select' })
    saved.vm.$emit('update:modelValue', null)
    const filters = wrapper.getComponent(ParcelWhFilterSelectors)
    filters.vm.$emit('update:parcels-wh-status', 10)
    filters.vm.$emit('update:parcels-wh-check-status-projection', 20)
    filters.vm.$emit('update:parcels-wh-zone', 2)
    wrapper.getComponent({ name: 'v-data-table-server' }).vm.$emit('update:sortBy', [{ key: 'postingNumber', order: 'desc' }])
    wrapper.getComponent(PaginationFooter).vm.$emit('update:itemsPerPage', -1)
    await flushPromises()
    expect(api.load).toHaveBeenLastCalledWith(8, expect.objectContaining({ page: '1', pageSize: '-1',
      sortBy: 'postingNumber', sortOrder: 'desc', statusId: '10', checkStatusProjectionKind: '20', zone: '2' }))
    expect(api.load.mock.lastCall[1]).not.toHaveProperty('parcelFilterId')
    expect(wrapper.getComponent(PaginationFooter).props('maxPage')).toBe(1)
  })

  it('shows the page error once when reconciliation also fails, retaining the saved page', async () => {
    openMonitor()
    await flushPromises()
    api.load.mockRejectedValueOnce(new Error('Invalid snapshot'))
    onConnectionError(new Error('Invalid connection'))
    await flushPromises()
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.get('[role="alert"]').text()).toContain('Не удалось загрузить посылки для поиска')
    expect(wrapper.findAll('.v-data-table-row')).toHaveLength(2)
  })

  it('does not let an abandoned view report a late connection failure or failed disconnect', async () => {
    openMonitor()
    await flushPromises()
    api.stop.mockRejectedValueOnce(new Error('Invalid disconnect'))
    wrapper.unmount()
    wrapper = null
    onConnectionError(new Error('Invalid late connection'))
    await flushPromises()
    expect(console.error).toHaveBeenCalledTimes(2)
    expect(api.load).toHaveBeenCalledOnce()
  })

  it('keeps a final saved page if the job finishes before live observation starts', async () => {
    api.start.mockRejectedValueOnce(new Error('Invalid status'))
    api.load.mockResolvedValueOnce(lookupSnapshot()).mockResolvedValueOnce(lookupSnapshot({ status: 20 }))
    openMonitor()
    await flushPromises()
    expect(api.start).toHaveBeenCalledOnce()
    expect(api.load).toHaveBeenCalledTimes(2)
    expect(api.stop).toHaveBeenCalledOnce()
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper.findAll('.v-data-table-row')).toHaveLength(2)
  })

  it('restores live updates when the operator retries after a connection failure', async () => {
    openMonitor()
    await flushPromises()
    onConnectionError(new Error('Invalid connection'))
    await flushPromises()
    expect(api.load).toHaveBeenCalledTimes(2)
    expect(api.start).toHaveBeenCalledOnce()
    expect(api.stop).toHaveBeenCalledOnce()
    await wrapper.findAll('button').find(button => button.text() === 'Повторить загрузку').trigger('click')
    await flushPromises()
    expect(api.start).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).not.toContain('Повторить загрузку')
  })

  it.each(['start', 'connection', 'options', 'navigation'])('shows the %s failure in the page alert', async failure => {
    const error = new Error('Invalid internal message')
    if (failure === 'start') api.start.mockRejectedValueOnce(error)
    if (failure === 'options') api.statuses.mockRejectedValueOnce(error)
    if (failure === 'navigation') api.push.mockRejectedValueOnce(error)
    openMonitor()
    await flushPromises()
    if (failure === 'connection') onConnectionError(error)
    if (failure === 'navigation') await wrapper.get('[aria-label="Открыть посылку № 312"]').trigger('click')
    await flushPromises()
    await nextTick()
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.get('[role="alert"]').text()).toMatch(/Не удалось/)
    expect(wrapper.text()).not.toContain('Invalid internal message')
    if (failure === 'start') expect(api.stop).toHaveBeenCalledOnce()
  })
})
