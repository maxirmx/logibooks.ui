// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h, nextTick, onUnmounted, provide, reactive, ref, toRef, watch } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import FeacnCodeCurrent from '@/components/FeacnCodeCurrent.vue'
import FeacnCodeSelector from '@/components/FeacnCodeSelector.vue'
import PageAlertRegion from '@/components/PageAlertRegion.vue'
import { useDebouncedFilterSync } from '@/composables/useDebouncedFilterSync.js'
import { useInlineTnVed } from '@/composables/useInlineTnVed.js'
import { useTableMultiSelect } from '@/composables/useTableMultiSelect.js'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { clearFeacnInfoCache } from '@/helpers/feacn.info.helpers.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { useParcelsStore } from '@/stores/parcels.store.js'
import { useRegistersStore } from '@/stores/registers.store.js'

vi.mock('@/helpers/config.js', () => ({ apiUrl: '/api' }))
vi.mock('@/helpers/fetch.wrapper.js', () => ({ fetchWrapper: { get: vi.fn(), put: vi.fn(), post: vi.fn() } }))
vi.mock('@/stores/auth.store.js', () => ({ useAuthStore: () => auth }))

const originalCode = '1111111111'
const newCode = '2222222222'
const auth = reactive({})
const row = {
  id: 31, registerId: 12, tnVed: originalCode, passportCheckStatus: 1,
  feacnLookupSuggestions: [{ code: newCode, fromKeywords: true, fromHistory: true }]
}
const register = { id: 12, customsFee: 40, customsDuty: 0, derivedTotalsPending: false }
let wrapper

function deferred() {
  let resolve, reject
  const promise = new Promise((success, failure) => { resolve = success; reject = failure })
  return { promise, resolve, reject }
}

function readOnlyError(registerId) {
  const message = `Изменения запрещены для реестра '${registerId}'`
  return Object.assign(new Error(message), {
    status: 409, data: { code: 'RegisterReadOnly', details: { registerId }, msg: message }
  })
}

function savedPage(currentPage = 3) {
  return {
    page: {
      items: [{ ...row, tnVed: newCode }],
      pagination: { currentPage, totalCount: currentPage, hasPreviousPage: currentPage > 1 }
    },
    registerCharges: { registerId: 12, customsFee: null, customsDuty: null },
    feacnInfo: { [newCode]: { name: 'Название' } }
  }
}

async function startList() {
  const parcels = useParcelsStore()
  const registers = useRegistersStore()
  const alerts = useAlertStore()
  const localSearch = ref('')
  const boxId = ref(5)
  const selected = ref(row.id)
  parcels.items = [row]
  parcels.item = row
  registers.item = { ...register }
  registers.items = [{ ...register }]
  wrapper = mount(defineComponent({
    setup() {
      const active = ref(true)
      const busy = ref(false)
      const page = toRef(auth, 'parcels_page')
      const { triggerLoad } = useDebouncedFilterSync({
        filters: [{ local: localSearch, store: toRef(auth, 'parcels_product_name') }],
        loadFn: () => parcels.getAll(12, { boxId: boxId.value }),
        isComponentMounted: active
      })
      const inline = useInlineTnVed({
        scope: () => [auth.user.id, 12],
        getBoxId: () => boxId.value,
        page,
        isComponentMounted: active,
        isBusy: () => busy.value || registers.item?.readOnly === true,
        runningAction: busy,
        parcelsStore: parcels,
        alertStore: alerts,
        refresh: triggerLoad
      })
      provide('selectTnVed', inline.selectTnVed)
      watch(page, () => { if (!inline.isPageAlreadyLoaded()) triggerLoad() })
      watch(boxId, () => triggerLoad())
      useTableMultiSelect({
        items: toRef(parcels, 'items'), loading: ref(false), page, selectedId: selected,
        isPageAlreadyLoaded: inline.isPageAlreadyLoaded
      })
      onUnmounted(() => { active.value = false })
      return () => [
        h(PageAlertRegion),
        ...parcels.items.flatMap(item => [
          h(FeacnCodeCurrent, { item, key: 'current-' + item.id }),
          h(FeacnCodeSelector, { item, key: 'suggestions-' + item.id })
        ])
      ]
    }
  }), {
    global: {
      stubs: {
        VTooltip: { template: '<slot name="activator" :props="{}" />' },
        FontAwesomeIcon: true
      }
    }
  })
  await flushPromises()
  vi.clearAllMocks()
  return { parcels, registers, alerts, localSearch, selected, boxId }
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.resetAllMocks()
  Object.assign(auth, {
    user: { id: 4 }, parcels_page: 3, parcels_per_page: 1,
    parcels_sort_by: [{ key: 'tnVed', order: 'asc' }],
    parcels_filter_id: 8, parcels_tnved: '11', parcels_product_name: ''
  })
  fetchWrapper.get.mockResolvedValue({ items: [row], pagination: { totalCount: 3 } })
  fetchWrapper.put.mockResolvedValue(savedPage())
  clearFeacnInfoCache()
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('inline TN VED through a suggested-code click', () => {
  it('uses one PUT even with a cold cache and a clamped page', async () => {
    const { parcels, registers, selected } = await startList()
    vi.useFakeTimers()
    fetchWrapper.put.mockResolvedValueOnce(savedPage(2))
    await wrapper.get('.matching-feacn-code-item').trigger('click')
    await nextTick()
    await vi.runAllTimersAsync()

    expect(fetchWrapper.put).toHaveBeenCalledExactlyOnceWith('/api/parcels/31/tnved', {
      tnVed: newCode,
      listContext: {
        registerId: 12, boxId: 5, page: 3, pageSize: 1,
        parcelFilterId: 8, sortBy: 'tnVed', sortOrder: 'asc', tnVed: '11'
      }
    })
    expect(fetchWrapper.get).not.toHaveBeenCalled()
    expect(fetchWrapper.post).not.toHaveBeenCalled()
    expect(wrapper.get('.tnved-cell.matched').text()).toBe(newCode)
    expect(wrapper.findAll('.feacn-code-item')).toHaveLength(1)
    expect(wrapper.get('.matching-feacn-code-item').classes()).toContain('matched')
    expect(auth.parcels_page).toBe(2)
    expect(parcels.totalCount).toBe(2)
    expect(selected.value).toBe(31)
    expect(registers.item).toMatchObject({ customsFee: null, customsDuty: null, derivedTotalsPending: false })
  })

  it('shows a retryable conflict once and allows a manual retry without a recovery read', async () => {
    const { parcels, alerts } = await startList()
    const showError = vi.spyOn(alerts, 'error')
    const message = 'Данные реестра или результаты проверок изменились. Повторите сохранение.'
    fetchWrapper.put.mockRejectedValueOnce(Object.assign(new Error(message), {
      status: 409, data: { code: 'RegisterRestrictionChangeConflict', msg: message }
    }))
    await wrapper.get('.matching-feacn-code-item').trigger('click')
    await flushPromises()
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.get('[role="alert"]').text()).toContain(message)
    expect(showError).toHaveBeenCalledTimes(1)
    expect(parcels.items[0].tnVed).toBe(originalCode)
    expect(fetchWrapper.get).not.toHaveBeenCalled()

    await wrapper.get('.matching-feacn-code-item').trigger('click')
    await flushPromises()
    expect(fetchWrapper.put).toHaveBeenCalledTimes(2)
    expect(parcels.items[0].tnVed).toBe(newCode)
  })

  it('locks the confirmed register and its rows locally after one rejected request', async () => {
    const { parcels, registers, alerts } = await startList()
    const other = { id: 99, readOnly: false }
    registers.items.push(other)
    parcels.items.push({ ...row, id: 32 })
    const showError = vi.spyOn(alerts, 'error')
    fetchWrapper.put.mockRejectedValueOnce(readOnlyError(12))
    await wrapper.findAll('.matching-feacn-code-item')[0].trigger('click')
    await flushPromises()

    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.get('[role="alert"]').text()).toContain("Изменения запрещены для реестра '12'")
    expect(showError).toHaveBeenCalledTimes(1)
    expect(registers.item).toMatchObject({ readOnly: true, customsFee: 40, derivedTotalsPending: false })
    expect(registers.items).toEqual([expect.objectContaining({ id: 12, readOnly: true }), other])
    expect(parcels.items).toEqual([
      expect.objectContaining({ id: 31, readOnly: true, tnVed: originalCode }),
      expect.objectContaining({ id: 32, readOnly: true, tnVed: originalCode })
    ])
    await wrapper.findAll('.matching-feacn-code-item')[1].trigger('click')
    expect(fetchWrapper.put).toHaveBeenCalledTimes(1)
    expect(fetchWrapper.get).not.toHaveBeenCalled()
  })

  it('does not lock the visible register for a read-only conflict belonging to another register', async () => {
    const { parcels, registers } = await startList()
    fetchWrapper.put.mockRejectedValueOnce(readOnlyError(99))
    await wrapper.get('.matching-feacn-code-item').trigger('click')
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain("'99'")
    expect(registers.item.readOnly).not.toBe(true)
    expect(parcels.items[0].readOnly).not.toBe(true)
    expect(fetchWrapper.get).not.toHaveBeenCalled()
  })

  it.each([false, true])('keeps the confirmed lock on earlier reads (immediate store update: %s)', async updateStore => {
    const { parcels, registers } = await startList()
    const write = deferred(), header = deferred(), list = deferred()
    fetchWrapper.put.mockReturnValueOnce(write.promise)
    await wrapper.get('.matching-feacn-code-item').trigger('click')
    fetchWrapper.get.mockImplementation(url => {
      if (url === '/api/registers/12') return header.promise
      if (url.startsWith('/api/parcels?')) return list.promise
      return Promise.resolve({ customsProcedures: [1], transportationTypes: [1], incoterms: [1] })
    })
    const registerRead = registers.getById(12)
    const listRead = parcels.getAll(12, { updateStore })
    const unlockedPage = { items: [{ ...row, readOnly: false }], pagination: { totalCount: 1 } }
    // A page loaded for deferred rendering can already have completed its HTTP read.
    if (!updateStore) {
      list.resolve(unlockedPage)
      await listRead
    }
    write.reject(readOnlyError(12))
    await flushPromises()
    header.resolve({ ...register, readOnly: false, dealNumber: 'CURRENT' })
    await registerRead
    if (updateStore) list.resolve(unlockedPage)
    const page = await listRead
    if (!updateStore) parcels.updateItems(page)

    expect(registers.item).toMatchObject({ readOnly: true, dealNumber: 'CURRENT' })
    expect(parcels.items[0]).toMatchObject({ readOnly: true, tnVed: originalCode })
    fetchWrapper.get.mockResolvedValueOnce(unlockedPage)
    await parcels.getAll(12)
    expect(parcels.items[0].readOnly).toBe(false)
  })

  it('keeps a passport event that arrives during the save and blocks overlapping clicks', async () => {
    const { parcels } = await startList()
    const write = deferred()
    fetchWrapper.put.mockReturnValueOnce(write.promise)
    await wrapper.get('.matching-feacn-code-item').trigger('click')
    await wrapper.get('.matching-feacn-code-item').trigger('click')
    parcels.applyParcelCheckStatusChanges({
      registerId: 12, updates: [{ parcelId: 31, checkCode: 'passport', status: 30, revision: 2 }]
    })
    write.resolve(savedPage())
    await flushPromises()
    expect(fetchWrapper.put).toHaveBeenCalledTimes(1)
    expect(parcels.items[0]).toMatchObject({ tnVed: newCode, passportCheckStatus: 30 })
  })

  it('reports an unusable write response without replacing the visible rows', async () => {
    const { parcels } = await startList()
    fetchWrapper.put.mockResolvedValueOnce(undefined)
    await wrapper.get('.matching-feacn-code-item').trigger('click')
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('Не удалось получить обновлённый список посылок')
    expect(parcels.items[0].tnVed).toBe(originalCode)
    expect(fetchWrapper.get).not.toHaveBeenCalled()
  })

  it('keeps a late rejection from alerting another account', async () => {
    const { parcels, registers } = await startList()
    const write = deferred()
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const failure = readOnlyError(12)
    fetchWrapper.put.mockReturnValueOnce(write.promise)
    await wrapper.get('.matching-feacn-code-item').trigger('click')
    auth.user = { id: 7 }
    write.reject(failure)
    await flushPromises()
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(log).toHaveBeenCalledWith(expect.any(String), failure)
    expect(parcels.items[0].tnVed).toBe(originalCode)
    expect(parcels.items[0].readOnly).not.toBe(true)
    expect(registers.item.readOnly).not.toBe(true)
  })

  it('coalesces a pending filter change and ignores a read started before acknowledgement', async () => {
    const { parcels, localSearch } = await startList()
    vi.useFakeTimers()
    const write = deferred(), read = deferred()
    fetchWrapper.put.mockReturnValueOnce(write.promise)
    await wrapper.get('.matching-feacn-code-item').trigger('click')
    fetchWrapper.get.mockReturnValueOnce(read.promise)
    const old = parcels.getAll(12, { boxId: 5 })
    localSearch.value = 'Пальто'
    await nextTick()
    fetchWrapper.get.mockResolvedValueOnce(savedPage().page)
    write.resolve(savedPage(1))
    await vi.runAllTimersAsync()
    read.resolve({ items: [row], pagination: { totalCount: 3 } })
    await old
    expect(fetchWrapper.get).toHaveBeenCalledTimes(2)
    expect(new URLSearchParams(fetchWrapper.get.mock.lastCall[0].split('?')[1]).get('productName')).toBe('Пальто')
    expect(auth.parcels_page).toBe(3)
    expect(parcels.items[0].tnVed).toBe(newCode)
  })

  it('drops a late save after the originating list is closed', async () => {
    const { parcels, registers } = await startList()
    const write = deferred()
    fetchWrapper.put.mockReturnValueOnce(write.promise)
    await wrapper.get('.matching-feacn-code-item').trigger('click')
    wrapper.unmount()
    wrapper = null
    parcels.clearVisibleList()
    write.resolve(savedPage(1))
    await flushPromises()
    expect(auth.parcels_page).toBe(3)
    expect(parcels.items[0].tnVed).toBe(originalCode)
    expect(registers.item.customsFee).toBe(40)
  })

  it('reads the current register once after a box filter changes during a save', async () => {
    const { parcels, boxId } = await startList()
    const write = deferred()
    fetchWrapper.put.mockReturnValueOnce(write.promise)
    await wrapper.get('.matching-feacn-code-item').trigger('click')
    boxId.value = null
    await flushPromises()
    expect(fetchWrapper.get).toHaveBeenCalledTimes(1)
    expect(parcels.items[0].tnVed).toBe(originalCode)

    fetchWrapper.get.mockResolvedValueOnce(savedPage().page)
    write.resolve(savedPage(1))
    await flushPromises()
    expect(fetchWrapper.get).toHaveBeenCalledTimes(2)
    expect(fetchWrapper.get.mock.lastCall[0]).not.toContain('boxId')
    expect(auth.parcels_page).toBe(3)
    expect(parcels.items[0].tnVed).toBe(newCode)
  })

  it('keeps cleared register charges when older register detail and list responses arrive', async () => {
    const { registers } = await startList()
    vi.spyOn(registers, 'ensureOpsLoaded').mockResolvedValue(undefined)
    const detail = deferred(), list = deferred()
    fetchWrapper.get.mockImplementation(url => {
      if (url === '/api/registers/12') return detail.promise
      if (url.startsWith('/api/registers?')) return list.promise
      return Promise.resolve({ customsProcedures: [1], transportationTypes: [1], incoterms: [1] })
    })
    const reads = [registers.getById(12), registers.getAll()]
    await flushPromises()
    await wrapper.get('.matching-feacn-code-item').trigger('click')
    await flushPromises()
    detail.resolve({ ...register, dealNumber: 'NEW-12' })
    list.resolve({ items: [register], pagination: {} })
    await Promise.all(reads)
    expect(registers.item).toMatchObject({ dealNumber: 'NEW-12', customsFee: null, customsDuty: null })
    expect(registers.items[0]).toMatchObject({ customsFee: null, customsDuty: null })
  })
})
