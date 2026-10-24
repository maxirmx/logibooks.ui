// Copyright (C) 2026 Maxim [maxirmx] Samsonov (http://www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { createPinia, disposePinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { computed } from 'vue'
import { createPagination, providePagination } from 'vuetify/lib/components/VDataTable/composables/paginate.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { useScanjobsStore } from '@/stores/scanjobs.store.js'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { useAlertStore } from '@/stores/alert.store.js'
import OzonParcelsList from '@/lists/OzonParcels_List.vue'
import OzonParcelsWhList from '@/lists/OzonParcels_WhList.vue'
import RegistersList from '@/lists/Registers_List.vue'
import ScanjobBoxesMonitor from '@/dialogs/Scanjob_Boxes_Monitor.vue'
import OzonParcelEditor from '@/dialogs/OzonParcel_EditDialog.vue'
import ReturnRegisterEditor from '@/dialogs/ReturnRegister_EditDialog.vue'
import RegisterHistoryList from '@/lists/RegisterHistory_List.vue'
import { LIST_STATE_STORAGE_KEY } from '@/helpers/list.state.helpers.js'
import router from '@/router'
import { vuetifyStubs } from './helpers/test-utils.js'

vi.mock('@/router', () => ({ default: { push: vi.fn().mockResolvedValue(), currentRoute: { value: { fullPath: '/registers/4307/parcels?mode=modePaperwork' } } } }))
vi.mock('vue-router', async original => ({ ...await original(), useRoute: () => ({ query: {} }) }))
vi.mock('@/composables/useAppConfirm.js', () => ({ useAppConfirm: () => vi.fn().mockResolvedValue(false) }))
vi.mock('@/helpers/fetch.wrapper.js', () => ({ fetchWrapper: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }))

const wrappers = [], piniaInstances = []
// Exercise the installed table pagination watcher without unrelated table rendering.
const paginatingTable = {
  name: 'v-data-table-server',
  props: ['page', 'itemsPerPage', 'itemsLength', 'sortBy'],
  emits: ['update:page', 'update:itemsPerPage', 'update:sortBy'],
  setup(props) {
    const { page, itemsPerPage } = createPagination(props)
    providePagination({ page, itemsPerPage, itemsLength: computed(() => props.itemsLength) })
    return {}
  },
  template: '<div data-testid="paginating-table" />'
}
function reload() {
  const pinia = createPinia()
  piniaInstances.push(pinia)
  setActivePinia(pinia)
  // Persisted-list-state tests use real stores without a live SignalR server.
  vi.spyOn(useScanjobsStore(), 'createScanJobsListChannel').mockReturnValue({
    start: vi.fn().mockResolvedValue(true), stop: vi.fn().mockResolvedValue(true)
  })
  return useAuthStore()
}
function show(component, props = {}, stubs = {}) {
  const wrapper = mount(component, { props, global: { stubs: {
    ...vuetifyStubs, RegisterHeaderActionsBar: true, RegisterActionsDialogs: true,
    RegisterHeadingWithStats: true, ActionDialog: true, ErrorDialog: true, AssignTnvedDialog: true,
    ParcelStatusBulkChangeDialog: true, 'font-awesome-icon': true, ...stubs
  } } })
  wrappers.push(wrapper)
  return wrapper
}
beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  localStorage.setItem('user', JSON.stringify({ id: 1, roles: ['srlogist'] }))
  vi.clearAllMocks()
  fetchWrapper.get.mockImplementation(async url => {
    const path = new URL(url).pathname
    if (path.endsWith('/scanjobs/ops')) return { types: [], operations: [], modes: [], statuses: [], constants: { inProgressStatus: 15, parcelOnlyType: 10, boxOnlyType: 20, parcelScanSource: 10, lookupOperation: 30 } }
    if (path.endsWith('/ops')) return { customsProcedures: [{ value: 10, name: 'Экспорт' }], transportationTypes: [], incoterms: [{ value: 2, name: 'FCA' }] }
    if (/\/registers\/\d+$/.test(path)) return { id: 4307, customsProcedureCode: 10 }
    if (/\/parcels\/a\/\d+$/.test(path)) return { id: 2, registerId: 4307, statusId: 1, checkStatus: 0 }
    if (path.endsWith('/registers') || path.endsWith('/parcels') || path.endsWith('/parcels/a')) return { items: [], pagination: { totalCount: 1000 } }
    return []
  })
})
afterEach(() => {
  vi.useRealTimers()
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  piniaInstances.splice(0).forEach(pinia => disposePinia(pinia))
})

describe('reloads with real Pinia state and list loading', () => {
  it.each([false, true])('coalesces scope, page, and search resets into one request (failure: %s)', async fail => {
    vi.useFakeTimers()
    const auth = reload()
    auth.parcels_wh_page = 3
    auth.parcels_wh_box_number = 'OLD'
    const get = fetchWrapper.get.getMockImplementation()
    fetchWrapper.get.mockImplementation(url => {
      if (fail && new URL(url).searchParams.get('boxId') === '17') return Promise.reject(new Error('Область недоступна'))
      return get(url)
    })
    const wrapper = show(OzonParcelsWhList, { registerId: 4307 }, { RegisterWhHeaderActionBar: true })
    await flushPromises()
    await flushPromises()
    expect(auth.parcels_wh_page).toBe(3)
    fetchWrapper.get.mockClear()
    await wrapper.setProps({ boxId: 17 })
    await flushPromises()
    await vi.advanceTimersByTimeAsync(500)
    await flushPromises()
    const requests = fetchWrapper.get.mock.calls.filter(([url]) => new URL(url).pathname.endsWith('/parcels/a'))
    expect(requests).toHaveLength(1)
    expect(Object.fromEntries(new URL(requests[0][0]).searchParams)).toMatchObject({ boxId: '17', page: '1' })
    expect(auth.parcels_wh_box_number).toBe('')
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(fail ? 1 : 0)
    if (fail) expect(wrapper.get('[role="alert"]').text()).toContain('Область недоступна')
  })

  it('retains a restored parcel page after a failed initial load and requests it on retry', async () => {
    reload().parcels_page = 3
    const auth = reload()
    const get = fetchWrapper.get.getMockImplementation()
    let fail = true
    fetchWrapper.get.mockImplementation(url => {
      if (fail && new URL(url).pathname.endsWith('/parcels')) return Promise.reject(new Error('Список недоступен'))
      return get(url)
    })
    const wrapper = show(OzonParcelsList, { registerId: 4307 })
    await flushPromises()
    await flushPromises()
    expect(auth.parcels_page).toBe(3)
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.get('[role="alert"]').text()).toContain('Список недоступен')
    fail = false
    const table = wrapper.findComponent({ name: 'v-data-table-server' })
    table.vm.$emit('update:sortBy', [{ key: 'frozenOrder', order: 'desc' }])
    await flushPromises()
    const requests = fetchWrapper.get.mock.calls.filter(([url]) => new URL(url).pathname.endsWith('/parcels'))
    expect(requests).toHaveLength(2)
    expect(requests.map(([url]) => new URL(url).searchParams.get('page'))).toEqual(['3', '3'])
    expect(table.props('page')).toBe(3)
    expect(reload().parcels_page).toBe(3)
  })

  it('clears all visible parcel search mirrors on an account switch before another edit', async () => {
    vi.useFakeTimers()
    const auth = reload()
    auth.parcels_tnved = '4901'
    auth.parcels_number = 'old-number'
    auth.parcels_product_name = 'old-product'
    const wrapper = show(OzonParcelsList, { registerId: 4307 })
    await flushPromises()
    auth.user = { id: 2, roles: ['srlogist'] }
    await wrapper.vm.$nextTick()
    expect(wrapper.findAll('input').some(input => ['4901', 'old-number', 'old-product'].includes(input.element.value))).toBe(false)
    await wrapper.findAll('input')[0].setValue('new-search')
    await vi.advanceTimersByTimeAsync(500)
    expect(auth.parcels_tnved).toBe('new-search')
    expect(auth.parcels_number).toBe('')
    expect(auth.parcels_product_name).toBe('')
    const stored = JSON.parse(sessionStorage.getItem(LIST_STATE_STORAGE_KEY))
    expect(stored.userId).toBe(2)
    expect(JSON.stringify(stored)).not.toMatch(/old-number|old-product|4901/)
    vi.useRealTimers()
  })

  it('restores return source pagination after a delayed pair load using real Vuetify pagination', async () => {
    const context = [1, { customsProcedureCode: 1, parcelSelectionMode: 1, parcelStatusId: null }, '2:3']
    sessionStorage.setItem(LIST_STATE_STORAGE_KEY, JSON.stringify({ version: 1, userId: 1, lists: {
      [JSON.stringify(['returnRegisterSources', context])]: { sourcePage: 3, sourcePerPage: 25 }
    } }))
    reload()
    const get = fetchWrapper.get.getMockImplementation()
    let resolveList
    fetchWrapper.get.mockImplementation(url => {
      const path = new URL(url).pathname
      if (path.endsWith('/warehouses')) return Promise.resolve([{ id: 1, name: 'Warehouse' }])
      if (path.endsWith('/ops')) return Promise.resolve({ customsProcedures: [{ value: 1, name: 'Return' }], transportationTypes: [], incoterms: [{ value: 2, name: 'FCA' }] })
      if (path.endsWith('/return-register/pairs')) return Promise.resolve([{ senderCompanyId: 2, receiverCompanyId: 3 }])
      if (path.endsWith('/registers')) return new Promise(resolve => { resolveList = resolve })
      return get(url)
    })
    const wrapper = show(ReturnRegisterEditor, {}, { 'v-data-table-server': paginatingTable })
    await flushPromises()
    await wrapper.get('[data-testid="pair-select"]').setValue('2:3')
    await flushPromises()
    expect(wrapper.find('[data-testid="paginating-table"]').exists()).toBe(false)
    resolveList({ items: [], pagination: { totalCount: 1000 } })
    await flushPromises()
    const table = wrapper.findComponent(paginatingTable)
    expect(table.props('page')).toBe(3)
    const requests = fetchWrapper.get.mock.calls.filter(([url]) => new URL(url).pathname.endsWith('/registers'))
    expect(requests).toHaveLength(1)
    expect(new URL(requests[0][0]).searchParams.get('page')).toBe('3')
  })

  it('restores history pagination on register changes after data loads using real Vuetify pagination', async () => {
    localStorage.setItem('user', JSON.stringify({ id: 1, roles: ['administrator'] }))
    sessionStorage.setItem(LIST_STATE_STORAGE_KEY, JSON.stringify({ version: 1, userId: 1, lists: {
      [JSON.stringify(['registerHistory', 43])]: { page: 3 }
    } }))
    reload()
    const get = fetchWrapper.get.getMockImplementation()
    let resolveHistory
    fetchWrapper.get.mockImplementation(url => {
      const path = new URL(url).pathname
      if (path.endsWith('/42/history')) return Promise.resolve({ items: [], pagination: { totalCount: 1000 } })
      if (path.endsWith('/43/history')) return new Promise(resolve => { resolveHistory = resolve })
      return get(url)
    })
    const wrapper = show(RegisterHistoryList, { registerId: 42 }, { 'v-data-table-server': paginatingTable })
    await flushPromises()
    expect(wrapper.findComponent(paginatingTable).exists()).toBe(true)
    await wrapper.setProps({ registerId: 43 })
    await flushPromises()
    expect(wrapper.findComponent(paginatingTable).exists()).toBe(false)
    resolveHistory({ items: [], pagination: { totalCount: 1000 } })
    await flushPromises()
    expect(wrapper.findComponent(paginatingTable).props('page')).toBe(3)
    const requests = fetchWrapper.get.mock.calls.filter(([url]) => new URL(url).pathname.endsWith('/43/history'))
    expect(requests).toHaveLength(1)
    expect(new URL(requests[0][0]).searchParams.get('page')).toBe('3')
  })

  it('loads parcel filters and sorting into the visible controls and first API request', async () => {
    const auth = reload()
    auth.setParcelFilterId(23)
    auth.parcels_tnved = '4901'
    auth.parcels_number = 'P-'
    auth.parcels_status = 2
    auth.parcels_sort_by = [{ key: 'frozenOrder', order: 'asc' }]
    auth.parcels_page = 3
    auth.parcels_per_page = 50
    const restored = reload()
    const wrapper = show(OzonParcelsList, { registerId: 4307 })
    await flushPromises()
    await flushPromises()
    const request = fetchWrapper.get.mock.calls.find(([url]) => new URL(url).pathname.endsWith('/parcels'))
    expect(request).toBeDefined()
    const params = new URL(request[0]).searchParams
    expect(Object.fromEntries(params)).toMatchObject({ parcelFilterId: '23', tnVed: '4901', number: 'P-', statusId: '2', sortBy: 'frozenOrder', sortOrder: 'asc', page: '3', pageSize: '50' })
    expect(wrapper.findAll('input').some(input => input.element.value === '4901')).toBe(true)
    const table = wrapper.findComponent({ name: 'v-data-table-server' })
    expect(table.props('sortBy')).toEqual([{ key: 'frozenOrder', order: 'asc' }])
    expect(table.props('page')).toBe(3)
    expect(restored.parcels_page).toBe(3)
    expect(useAlertStore().alert).toBeNull()
  })

  it('restores register filters into the first request before the debounce runs', async () => {
    const auth = reload()
    Object.assign(auth, { registers_search: 'invoice', registers_procedure: 10, registers_status: 7, registers_page: 2, registers_per_page: 50,
      registers_sort_by: [{ key: 'warehouseArrivalDate', order: 'asc' }] })
    reload()
    const wrapper = show(RegistersList)
    await flushPromises()
    await flushPromises()
    const request = fetchWrapper.get.mock.calls.find(([url]) => new URL(url).pathname.endsWith('/registers'))
    expect(Object.fromEntries(new URL(request[0]).searchParams)).toMatchObject({ search: 'invoice', customsProcedureCode: '10', registerStatusId: '7', page: '2', pageSize: '50', sortBy: 'warehouseArrivalDate', sortOrder: 'asc' })
    expect(wrapper.findAll('input').some(input => input.element.value === 'invoice')).toBe(true)
  })

  it('restores scan-job monitor table pagination and sort', () => {
    const auth = reload()
    Object.assign(auth, { scanjobmonitor_boxes_page: 2, scanjobmonitor_boxes_per_page: 10,
      scanjobmonitor_boxes_sort_by: [{ key: 'boxCode', order: 'desc' }] })
    reload()
    const wrapper = show(ScanjobBoxesMonitor, { boxes: [{ id: 1, boxCode: 'B-1' }], loading: false })
    const table = wrapper.findComponent('[data-testid="v-data-table"]')
    expect(table.props('page')).toBe(2)
    expect(table.props('itemsPerPage')).toBe(10)
    expect(table.props('sortBy')).toEqual([{ key: 'boxCode', order: 'desc' }])
  })

  it.each(['save', 'cancel'])('preserves personal and ordinary controls through editor %s and subsequent reload', async action => {
    const auth = reload()
    auth.setParcelFilterId(23)
    auth.parcels_tnved = '4901'
    auth.parcels_sort_by = [{ key: 'frozenOrder', order: 'asc' }]
    auth.parcels_page = 3
    const wrapper = show({
      components: { OzonParcelEditor },
      template: '<Suspense><OzonParcelEditor :register-id="4307" :id="2" /></Suspense>'
    }, {}, {
      Form: { methods: { resetForm() {} }, template: '<div><slot :errors="{}" :values="{ id: 2, statusId: 1, productName: \'draft\' }" :isSubmitting="false" :setFieldValue="() => {}" /></div>' },
      Field: { template: '<input />' },
      ParcelHeaderActionsBar: { template: '<div><button data-testid="save" @click="$emit(\'save\')">Save</button><button data-testid="cancel" @click="$emit(\'cancel\')">Cancel</button></div>' },
      ParcelStatusSection: true, FeacnCodeEditor: true, ParcelNumberExt: true,
      ParcelWeightAutoField: true, OzonFormField: true, ArticleWithH: true,
      DTagSection: true, ProductLinkWithActions: true, ActionButton: true
    })
    await flushPromises()
    await flushPromises()
    if (action === 'save') {
      fetchWrapper.put.mockRejectedValueOnce(new Error('Сохранение недоступно'))
      await wrapper.get('[data-testid="save"]').trigger('click')
      await flushPromises()
      expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
      expect(wrapper.get('[role="alert"]').text()).toContain('Сохранение недоступно')
      expect(router.push).not.toHaveBeenCalled()
      expect(auth.parcels_tnved).toBe('4901')
      fetchWrapper.put.mockResolvedValueOnce({})
    }
    await wrapper.get(`[data-testid="${action}"]`).trigger('click')
    await flushPromises()
    expect(router.push).toHaveBeenCalledWith(expect.objectContaining({ path: '/registers/4307/parcels' }))
    if (action === 'save') expect(fetchWrapper.put).toHaveBeenCalledTimes(2)
    const restored = reload()
    expect(restored.parcels_filter_id).toBe(23)
    expect(restored.parcels_tnved).toBe('4901')
    expect(restored.parcels_sort_by).toEqual([{ key: 'frozenOrder', order: 'asc' }])
    expect(restored.parcels_page).toBe(3)
  })
})
