/* @vitest-environment jsdom */
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { inject } from 'vue'

import { createPinia, getActivePinia, setActivePinia } from 'pinia'
import ParcelsView from '@/views/Parcels_View.vue'
import PageAlertRegion from '@/components/PageAlertRegion.vue'
import { useParcelsStore } from '@/stores/parcels.store.js'
import { reportError } from '@/helpers/error.helpers.js'
import {
  OZON_COMPANY_ID,
  WBR_COMPANY_ID,
  GTC_COMPANY_ID,
  WBRN_REGISTER_ID
} from '@/helpers/company.constants.js'
import { OP_MODE_PAPERWORK, OP_MODE_WAREHOUSE } from '@/helpers/op.mode.js'

const pushMock = vi.hoisted(() => vi.fn())
const replaceMock = vi.hoisted(() => vi.fn())
const backMock = vi.hoisted(() => vi.fn())
const mockGet = vi.hoisted(() => vi.fn())
const getSavedFilters = vi.hoisted(() => vi.fn())
vi.mock('@/helpers/error.helpers.js', async importOriginal => ({
  ...await importOriginal(),
  reportError: vi.fn()
}))
vi.mock('@/stores/parcel.filters.store.js', () => ({ useParcelFiltersStore: () => ({ getAll: getSavedFilters }) }))
const subscriptionOptions = vi.hoisted(() => [])
const currentRouteMock = vi.hoisted(() => ({
  value: {
    path: '/registers/1/parcels',
    fullPath: '/registers/1/parcels',
    query: {}
  }
}))

vi.mock('@/composables/useParcelCheckStatusSubscription.js', () => ({
  useParcelCheckStatusSubscription: (options) => subscriptionOptions.push(options)
}))

vi.mock('@/lists/WbrParcels_List.vue', async () => ({
  default: {
    name: 'WbrParcels_List',
    props: ['register-id'],
    components: { PageAlertRegion: (await import('@/components/PageAlertRegion.vue')).default },
    setup() {
      return { filter: inject('savedParcelFilter') }
    },
    template: `<div data-test="wbr-list">WBR: {{ registerId }}<hr class="hr"><PageAlertRegion />
      <select data-test="saved-filter" :value="filter.id.value" @change="filter.select($event.target.value)">
        <option v-for="option in filter.options.value" :key="option.value" :value="option.value">{{ option.title }}</option>
      </select></div>`
  }
}))

vi.mock('@/lists/OzonParcels_List.vue', () => ({
  default: {
    name: 'OzonParcels_List',
    props: ['register-id'],
    template: '<div data-test="ozon-list">OZON: {{ registerId }}</div>'
  }
}))

vi.mock('@/lists/OzonParcels_WhList.vue', () => ({
  default: {
    name: 'OzonParcels_WhList',
    props: ['registerId', 'mode', 'boxId', 'boxCode'],
    template: '<div data-test="ozon-wh-list">OZON WH: {{ registerId }}</div>'
  }
}))

vi.mock('@/lists/WbrNParcels_List.vue', () => ({
  default: {
    name: 'WbrNParcels_List',
    props: ['register-id'],
    template: '<div data-test="wbrn-list">WBRN: {{ registerId }}</div>'
  }
}))

vi.mock('@/lists/WbrNParcels_WhList.vue', () => ({
  default: {
    name: 'WbrNParcels_WhList',
    props: ['register-id'],
    template: '<div data-test="wbrn-wh-list">WBRN WH: {{ registerId }}</div>'
  }
}))

vi.mock('@/lists/WbrParcels_WhList.vue', () => ({
  default: {
    name: 'WbrParcels_WhList',
    props: ['registerId', 'mode', 'boxId', 'boxCode'],
    template: '<div data-test="wbr-wh-list">WBR WH: {{ registerId }}</div>'
  }
}))

vi.mock('@/lists/GtcParcels_List.vue', () => ({
  default: {
    name: 'GtcParcels_List',
    props: ['register-id'],
    template: '<div data-test="gtc-list">GTC: {{ registerId }}</div>'
  }
}))

vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useRouter: () => ({
      back: backMock,
      push: pushMock,
      replace: replaceMock,
      currentRoute: currentRouteMock
    })
  }
})

// Mock the fetchWrapper
vi.mock('@/helpers/fetch.wrapper.js', () => ({
  fetchWrapper: {
    get: vi.fn()
  }
}))

describe('Parcels_View', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.clearAllMocks()
    getSavedFilters.mockReset().mockResolvedValue([])
    subscriptionOptions.length = 0
    currentRouteMock.value = {
      path: '/registers/1/parcels',
      fullPath: '/registers/1/parcels',
      query: {}
    }
    const { fetchWrapper } = await import('@/helpers/fetch.wrapper.js')
    fetchWrapper.get.mockImplementation(mockGet)
  })

  it('offers owned filters and retains the chosen filter across registers and modes', async () => {
    const { useAuthStore } = await import('@/stores/auth.store.js')
    const auth = useAuthStore()
    auth.user = { id: 1 }
    getSavedFilters.mockResolvedValue([{ id: 23, name: 'Exclude issues' }])
    mockGet.mockResolvedValue({ registerType: WBR_COMPANY_ID })
    const wrapper = mount(ParcelsView, { props: { id: 1 } })
    await flushPromises()
    expect(wrapper.get('[data-test="saved-filter"]').text()).toContain('Exclude issues')
    await wrapper.get('[data-test="saved-filter"]').setValue('23')
    expect(auth.parcels_filter_id).toBe(23)
    await wrapper.setProps({ id: 2, mode: OP_MODE_WAREHOUSE })
    await flushPromises()
    expect(auth.parcels_filter_id).toBe(23)
    expect(getSavedFilters).toHaveBeenCalledTimes(2)
    expect(mockGet.mock.calls[1][0]).toContain('/registers/2')
    wrapper.unmount()
  })

  it('clears an unavailable remembered filter before mounting the list and displays one warning', async () => {
    const { useAuthStore } = await import('@/stores/auth.store.js')
    const auth = useAuthStore()
    auth.user = { id: 1 }
    auth.setParcelFilterId(23)
    mockGet.mockResolvedValue({ registerType: WBR_COMPANY_ID })
    const wrapper = mount(ParcelsView, { props: { id: 1 } })
    await flushPromises()
    expect(auth.parcels_filter_id).toBeNull()
    expect(wrapper.findAll('[role="status"]')).toHaveLength(1)
    expect(wrapper.get('[role="status"]').text()).toContain('Фильтр сброшен')
    expect(wrapper.find('[data-test="wbr-list"]').exists()).toBe(true)
    wrapper.unmount()
  })

  it('preserves the filter after an options failure and retries the same initialization', async () => {
    const { useAuthStore } = await import('@/stores/auth.store.js')
    const auth = useAuthStore()
    auth.user = { id: 1 }
    auth.setParcelFilterId(23)
    getSavedFilters.mockRejectedValueOnce(new Error('Filters unavailable'))
      .mockResolvedValueOnce([{ id: 23, name: 'Exclude issues' }])
    mockGet.mockResolvedValue({ registerType: WBR_COMPANY_ID })
    const wrapper = mount(ParcelsView, { props: { id: 1 } })
    await flushPromises()
    expect(auth.parcels_filter_id).toBe(23)
    expect(wrapper.find('[data-test="wbr-list"]').exists()).toBe(false)
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.get('[role="alert"]').text()).toContain('Filters unavailable')
    await wrapper.get('.page-alert-region__action').trigger('click')
    await flushPromises()
    expect(getSavedFilters).toHaveBeenCalledTimes(2)
    expect(wrapper.find('[data-test="wbr-list"]').exists()).toBe(true)
    expect(auth.parcels_filter_id).toBe(23)
    wrapper.unmount()
  })

  it('ignores old account results and clears the previous account selection', async () => {
    const { useAuthStore } = await import('@/stores/auth.store.js')
    const auth = useAuthStore()
    auth.user = { id: 1 }
    auth.setParcelFilterId(23)
    let resolveOld
    getSavedFilters.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve }))
      .mockResolvedValueOnce([{ id: 24, name: 'New user filter' }])
    mockGet.mockResolvedValue({ registerType: WBR_COMPANY_ID })
    const wrapper = mount(ParcelsView, { props: { id: 1 } })
    auth.user = { id: 2 }
    await flushPromises()
    resolveOld([{ id: 23, name: 'Old user filter' }])
    await flushPromises()
    expect(auth.parcels_filter_id).toBeNull()
    expect(wrapper.get('[data-test="saved-filter"]').text()).toContain('New user filter')
    expect(wrapper.get('[data-test="saved-filter"]').text()).not.toContain('Old user filter')
    wrapper.unmount()
  })

  it('ignores stale live-refresh results after the saved filter changes', async () => {
    const { useAuthStore } = await import('@/stores/auth.store.js')
    const auth = useAuthStore()
    auth.user = { id: 1 }
    auth.setParcelFilterId(23)
    mockGet.mockResolvedValue({ registerType: WBR_COMPANY_ID })

    const staleResponse = {
      items: [{ id: 101 }],
      pagination: { totalCount: 1, hasNextPage: false, hasPreviousPage: false }
    }
    let resolveRefresh
    const updateItems = vi.spyOn(useParcelsStore(), 'updateItems')
    const getAll = vi.spyOn(useParcelsStore(), 'getAll').mockImplementationOnce(() => new Promise((resolve) => {
      resolveRefresh = resolve
    }))

    const wrapper = mount(ParcelsView, { props: { id: 1 } })
    await flushPromises()
    expect(subscriptionOptions).toHaveLength(1)

    void subscriptionOptions[0].refresh()
    await flushPromises()
    auth.setParcelFilterId(31)
    resolveRefresh(staleResponse)
    await flushPromises()

    expect(getAll).toHaveBeenCalledOnce()
    expect(auth.parcels_filter_id).toBe(31)
    expect(updateItems).not.toHaveBeenCalledWith(staleResponse)
    expect(wrapper.find('[data-test="wbr-list"]').exists()).toBe(true)
    wrapper.unmount()
  })

  it.each([false, true])('ignores initialization completed after unmount (rejected=%s)', async rejected => {
    const { useAlertStore } = await import('@/stores/alert.store.js')
    let finish
    getSavedFilters.mockImplementationOnce(() => new Promise((resolve, reject) => {
      finish = rejected ? reject : resolve
    }))
    mockGet.mockResolvedValue({ registerType: WBR_COMPANY_ID })
    const wrapper = mount(ParcelsView, { props: { id: 1 } })
    wrapper.unmount()
    finish(rejected ? new Error('late load') : [])
    await flushPromises()
    expect(useAlertStore().alert).toBeNull()
  })

  it('enables passport subscriptions only for SrLogist Plus import paperwork', async () => {
    const { useAuthStore } = await import('@/stores/auth.store.js')
    useAuthStore().user = { roles: ['sr-logist'] }
    mockGet.mockResolvedValue({
      registerType: WBR_COMPANY_ID,
      customsProcedureCode: 40
    })

    mount(ParcelsView, { props: { id: 15, mode: OP_MODE_PAPERWORK } })
    await flushPromises()
    await flushPromises()

    expect(subscriptionOptions).toHaveLength(1)
    expect(subscriptionOptions[0].enabled.value).toBe(true)
  })

  it.each([
    ['warehouse mode', OP_MODE_WAREHOUSE, 40, ['sr-logist']],
    ['non-import procedure', OP_MODE_PAPERWORK, 10, ['sr-logist']],
    ['ineligible role', OP_MODE_PAPERWORK, 40, ['logist']]
  ])(
    'does not enable passport subscriptions for %s',
    async (_name, mode, customsProcedureCode, roles) => {
      const { useAuthStore } = await import('@/stores/auth.store.js')
      useAuthStore().user = { roles }
      mockGet.mockResolvedValue({ registerType: WBR_COMPANY_ID, customsProcedureCode })

      mount(ParcelsView, { props: { id: 16, mode } })
      await flushPromises()
      await flushPromises()

      expect(subscriptionOptions[0].enabled.value).toBe(false)
    }
  )

  it('coalesces filtered passport updates into one authoritative refresh', async () => {
    let wrapper
    vi.useFakeTimers()
    try {
      const { useAuthStore } = await import('@/stores/auth.store.js')
      const authStore = useAuthStore()
      authStore.user = { roles: ['sr-logist'] }
      authStore.parcels_passport_check_status = 30
      mockGet
        .mockResolvedValueOnce({ registerType: WBR_COMPANY_ID, customsProcedureCode: 40 })
        .mockResolvedValue({ items: [], pagination: { totalCount: 0 } })

      wrapper = mount(ParcelsView, { props: { id: 17, mode: OP_MODE_PAPERWORK } })
      await flushPromises()
      subscriptionOptions[0].onUpdates({}, [{ checkCode: 'passport' }])
      subscriptionOptions[0].onUpdates({}, [{ checkCode: 'passport' }])
      await vi.runOnlyPendingTimersAsync()

      expect(mockGet).toHaveBeenCalledTimes(2)
    } finally {
      wrapper?.unmount()
      vi.clearAllTimers()
      vi.useRealTimers()
    }
  })

  it.each([false, true])('recomputes saved-filter results after a passport eligibility change (excluded=%s)', async excluded => {
    vi.useFakeTimers()
    const { useAuthStore } = await import('@/stores/auth.store.js')
    const { useParcelsStore } = await import('@/stores/parcels.store.js')
    const auth = useAuthStore()
    auth.user = { id: 1, roles: ['sr-logist'] }
    auth.setParcelFilterId(23)
    auth.parcels_passport_check_status = null
    getSavedFilters.mockResolvedValue([{ id: 23, name: 'Hide invalid passports' }])
    const parcels = useParcelsStore()
    parcels.updateItems({ items: excluded ? [{ id: 101 }] : [], pagination: { totalCount: excluded ? 1 : 0 } })
    const response = { items: excluded ? [] : [{ id: 101 }], pagination: { totalCount: excluded ? 0 : 1 } }
    mockGet.mockResolvedValueOnce({ registerType: WBR_COMPANY_ID, customsProcedureCode: 40 })
      .mockResolvedValueOnce(response)
    const wrapper = mount(ParcelsView, { props: { id: 17 } })
    try {
      await flushPromises()
      subscriptionOptions[0].onUpdates({}, [{ checkCode: 'passport', parcelId: 101, status: excluded ? 40 : 0 }])
      await vi.runOnlyPendingTimersAsync()
      expect(new URL(mockGet.mock.calls[1][0]).searchParams.get('parcelFilterId')).toBe('23')
      expect(parcels.items.map(item => item.id)).toEqual(excluded ? [] : [101])
      expect(parcels.totalCount).toBe(excluded ? 0 : 1)
    } finally {
      wrapper.unmount()
      vi.clearAllTimers()
      vi.useRealTimers()
    }
  })

  it('displays a failed live filtered refresh once and retries it', async () => {
    vi.useFakeTimers()
    const { useAuthStore } = await import('@/stores/auth.store.js')
    const { useParcelsStore } = await import('@/stores/parcels.store.js')
    useAuthStore().parcels_passport_check_status = 30
    mockGet.mockResolvedValue({ registerType: WBR_COMPANY_ID })
    const getParcels = vi.spyOn(useParcelsStore(), 'getAll').mockRejectedValueOnce(new Error('Refresh failed'))
      .mockResolvedValueOnce({ items: [], pagination: { totalCount: 0 } })
    const wrapper = mount(ParcelsView, { props: { id: 17 } })
    try {
      await flushPromises()
      subscriptionOptions[0].onUpdates({}, [{ checkCode: 'passport' }])
      await vi.runOnlyPendingTimersAsync()
      await flushPromises()
      expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
      expect(wrapper.get('[role="alert"]').text()).toContain('Refresh failed')
      await wrapper.get('.page-alert-region__action').trigger('click')
      await flushPromises()
      expect(getParcels).toHaveBeenCalledTimes(2)
      expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    } finally {
      wrapper.unmount()
      vi.clearAllTimers()
      vi.useRealTimers()
    }
  })

  it.each(['register', 'mode', 'account', 'unmount'].flatMap(context =>
    [false, true].map(rejected => [context, rejected])
  ))('ignores a live refresh after %s changes (rejected=%s)', async (context, rejected) => {
    vi.useFakeTimers()
    const { useAuthStore } = await import('@/stores/auth.store.js')
    const { useParcelsStore } = await import('@/stores/parcels.store.js')
    const { useAlertStore } = await import('@/stores/alert.store.js')
    const auth = useAuthStore()
    auth.user = { id: 1, roles: ['sr-logist'] }
    auth.parcels_passport_check_status = 30
    mockGet.mockResolvedValue({ registerType: WBR_COMPANY_ID, customsProcedureCode: 40 })
    const parcels = useParcelsStore()
    let finish
    const getParcels = vi.spyOn(parcels, 'getAll').mockImplementationOnce(() => new Promise((resolve, reject) => {
      finish = rejected ? reject : resolve
    }))
    const wrapper = mount(ParcelsView, { props: { id: 17 } })
    let destination
    try {
      await flushPromises()
      subscriptionOptions[0].onUpdates({}, [{ checkCode: 'passport' }])
      vi.runOnlyPendingTimers()
      await flushPromises()
      expect(getParcels).toHaveBeenCalledTimes(1)

      if (context === 'register') await wrapper.setProps({ id: 18 })
      else if (context === 'mode') await wrapper.setProps({ mode: OP_MODE_WAREHOUSE })
      else if (context === 'account') auth.user = { id: 2, roles: ['sr-logist'] }
      else wrapper.unmount()
      await flushPromises()

      parcels.updateItems({ items: [{ id: 202 }], pagination: { totalCount: 7 } })
      useAlertStore().error('Current page alert')
      destination = mount(PageAlertRegion, { global: { plugins: [getActivePinia()] } })
      const failure = new Error('Old refresh failed')
      finish(rejected ? failure : {
        items: [{ id: 101 }], pagination: { totalCount: 1 }, parcelFilterRemoved: true
      })
      await flushPromises()

      expect(parcels.items.map(item => item.id)).toEqual([202])
      expect(parcels.totalCount).toBe(7)
      expect(destination.get('[role="alert"]').text()).toContain('Current page alert')
      expect(destination.text()).not.toContain('Old refresh failed')
      expect(destination.text()).not.toContain('Фильтр сброшен')
      if (rejected) expect(reportError).toHaveBeenCalledExactlyOnceWith(failure, {
        context: 'parcel list refresh after disposal or replacement'
      })
      else expect(reportError).not.toHaveBeenCalled()
    } finally {
      if (context !== 'unmount') wrapper.unmount()
      destination?.unmount()
      vi.clearAllTimers()
      vi.useRealTimers()
    }
  })

  it('cancels a queued live refresh when the register changes', async () => {
    vi.useFakeTimers()
    const { useAuthStore } = await import('@/stores/auth.store.js')
    const { useParcelsStore } = await import('@/stores/parcels.store.js')
    useAuthStore().parcels_passport_check_status = 30
    mockGet.mockResolvedValue({ registerType: WBR_COMPANY_ID })
    const getParcels = vi.spyOn(useParcelsStore(), 'getAll')
    const wrapper = mount(ParcelsView, { props: { id: 17 } })
    try {
      await flushPromises()
      subscriptionOptions[0].onUpdates({}, [{ checkCode: 'passport' }])
      await wrapper.setProps({ id: 18 })
      await flushPromises()
      await vi.runOnlyPendingTimersAsync()
      expect(getParcels).not.toHaveBeenCalled()
    } finally {
      wrapper.unmount()
      vi.clearAllTimers()
      vi.useRealTimers()
    }
  })

  it.each(['current', 'register', 'unmount'])('handles a resync failure in the %s context', async context => {
    const { useParcelsStore } = await import('@/stores/parcels.store.js')
    const { useRegistersStore } = await import('@/stores/registers.store.js')
    const { useAlertStore } = await import('@/stores/alert.store.js')
    vi.spyOn(useParcelsStore(), 'getAll').mockResolvedValue({ items: [], pagination: { totalCount: 0 } })
    let rejectRegister
    vi.spyOn(useRegistersStore(), 'getById').mockImplementationOnce(() => new Promise((_resolve, reject) => {
      rejectRegister = reject
    }))
    mockGet.mockResolvedValue({ registerType: WBR_COMPANY_ID })
    const wrapper = mount(ParcelsView, { props: { id: 17 } })
    await flushPromises()
    const refresh = subscriptionOptions[0].refresh()
    const failure = new Error('Register resync failed')
    const result = context === 'current'
      ? expect(refresh).rejects.toBe(failure)
      : expect(refresh).resolves.toBeUndefined()
    if (context === 'register') await wrapper.setProps({ id: 18 })
    else if (context === 'unmount') wrapper.unmount()
    await flushPromises()
    useAlertStore().error('Current page alert')
    const destination = mount(PageAlertRegion, { global: { plugins: [getActivePinia()] } })
    rejectRegister(failure)
    await result
    await flushPromises()
    expect(destination.get('[role="alert"]').text()).toContain('Current page alert')
    if (context === 'current') expect(reportError).not.toHaveBeenCalled()
    else expect(reportError).toHaveBeenCalledExactlyOnceWith(failure, {
      context: 'parcel passport refresh after disposal or replacement'
    })
    if (context !== 'unmount') wrapper.unmount()
    destination.unmount()
  })

  it('refreshes register passport state together with visible parcels on resync', async () => {
    const { useParcelsStore } = await import('@/stores/parcels.store.js')
    const { useRegistersStore } = await import('@/stores/registers.store.js')
    const parcelsStore = useParcelsStore()
    const registersStore = useRegistersStore()
    const response = { items: [{ id: 101 }], pagination: { totalCount: 1 } }
    const getParcels = vi.spyOn(parcelsStore, 'getAll').mockResolvedValue(response)
    const updateItems = vi.spyOn(parcelsStore, 'updateItems')
    const getRegister = vi.spyOn(registersStore, 'getById').mockResolvedValue()
    mockGet.mockResolvedValue({
      registerType: WBR_COMPANY_ID,
      customsProcedureCode: 40
    })

    const wrapper = mount(ParcelsView, {
      props: { id: 18, mode: OP_MODE_PAPERWORK }
    })
    await flushPromises()
    await subscriptionOptions[0].refresh()

    expect(getParcels).toHaveBeenCalledWith(18, { updateStore: false })
    expect(updateItems).toHaveBeenCalledWith(response)
    expect(getRegister).toHaveBeenCalledWith(18)
    wrapper.unmount()
  })

  it('refreshes only the selected box in warehouse mode', async () => {
    const { useParcelsStore } = await import('@/stores/parcels.store.js')
    const parcelsStore = useParcelsStore()
    const response = { items: [{ id: 102 }], pagination: { totalCount: 1 } }
    const getParcels = vi.spyOn(parcelsStore, 'getAll').mockResolvedValue(response)
    const updateItems = vi.spyOn(parcelsStore, 'updateItems')
    mockGet.mockResolvedValue({ registerType: WBR_COMPANY_ID, customsProcedureCode: 40 })

    const wrapper = mount(ParcelsView, {
      props: { id: 19, mode: OP_MODE_WAREHOUSE, boxId: 17, boxCode: 'BOX-17' }
    })
    await flushPromises()
    await subscriptionOptions[0].refresh()

    expect(getParcels).toHaveBeenCalledWith(19, {
      updateStore: false,
      showMarkedByPartner: true,
      boxId: 17
    })
    expect(updateItems).toHaveBeenCalledWith(response)

    wrapper.unmount()
  })

  it.each([
    ['a string rejection', 'register load failed', 'register load failed'],
    ['an unknown rejection shape', {}, 'Не удалось загрузить список посылок']
  ])('renders a safe register load error for %s', async (_case, rejection, expectedMessage) => {
    mockGet.mockRejectedValueOnce(rejection)

    const wrapper = mount(ParcelsView, { props: { id: 20 } })
    await flushPromises()

    expect(wrapper.get('[data-testid="page-alert-region"]').text()).toContain(expectedMessage)
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
  })

  it('renders WbrParcels_List when register has WBR registerType', async () => {
    mockGet.mockResolvedValue({ registerType: WBR_COMPANY_ID })

    const wrapper = mount(ParcelsView, {
      props: {
        id: 1
      }
    })

    // Wait for async data to load
    await flushPromises()
    await flushPromises()

    expect(wrapper.find('[data-test="wbr-list"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="ozon-list"]').exists()).toBe(false)
  })

  it('renders WbrParcels_WhList when register has WBR registerType in warehouse mode', async () => {
    mockGet.mockResolvedValue({ registerType: WBR_COMPANY_ID })

    const wrapper = mount(ParcelsView, {
      props: {
        id: 10,
        mode: OP_MODE_WAREHOUSE
      }
    })

    await flushPromises()
    await flushPromises()

    expect(wrapper.find('[data-test="wbr-wh-list"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="wbr-list"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="ozon-list"]').exists()).toBe(false)
  })

  it('passes exact box scope to the selected warehouse list and clears only that scope', async () => {
    mockGet.mockResolvedValue({ registerType: WBR_COMPANY_ID })
    currentRouteMock.value = {
      path: '/registers/10/parcels',
      fullPath:
        '/registers/10/parcels?mode=modeWarehouse&boxId=17&boxCode=BOX-17&returnUrl=/registers/10/boxes',
      query: {
        mode: OP_MODE_WAREHOUSE,
        boxId: '17',
        boxCode: 'BOX-17',
        returnUrl: '/registers/10/boxes',
        statusId: '3'
      }
    }
    const wrapper = mount(ParcelsView, {
      props: {
        id: 10,
        mode: OP_MODE_WAREHOUSE,
        boxId: 17,
        boxCode: 'BOX-17',
        returnUrl: '/registers/10/boxes'
      }
    })
    await flushPromises()

    const list = wrapper.findComponent({ name: 'WbrParcels_WhList' })
    expect(list.props()).toMatchObject({
      registerId: 10,
      mode: OP_MODE_WAREHOUSE,
      boxId: 17,
      boxCode: 'BOX-17'
    })

    list.vm.$emit('clear-box-scope')
    await flushPromises()

    expect(replaceMock).toHaveBeenCalledWith({
      path: '/registers/10/parcels',
      query: {
        mode: OP_MODE_WAREHOUSE,
        returnUrl: '/registers/10/boxes',
        statusId: '3'
      }
    })
  })

  it('reports a box-scope clearing failure and keeps the current route intact', async () => {
    const { useAlertStore } = await import('@/stores/alert.store.js')
    mockGet.mockResolvedValue({ registerType: WBR_COMPANY_ID })
    const query = { mode: OP_MODE_WAREHOUSE, boxId: '17', boxCode: 'BOX-17' }
    currentRouteMock.value = {
      path: '/registers/10/parcels',
      fullPath: '/registers/10/parcels?mode=modeWarehouse&boxId=17&boxCode=BOX-17',
      query
    }
    replaceMock.mockRejectedValueOnce(new Error('replace failed'))
    const wrapper = mount(ParcelsView, {
      props: { id: 10, mode: OP_MODE_WAREHOUSE, boxId: 17, boxCode: 'BOX-17' }
    })
    await flushPromises()

    wrapper.findComponent({ name: 'WbrParcels_WhList' }).vm.$emit('clear-box-scope')
    await flushPromises()

    expect(currentRouteMock.value.query).toBe(query)
    expect(useAlertStore().alert.message).toBe('replace failed')
  })

  it('ignores a clear-scope event when the parcel list is not scoped', async () => {
    mockGet.mockResolvedValue({ registerType: WBR_COMPANY_ID })
    const wrapper = mount(ParcelsView, {
      props: { id: 10, mode: OP_MODE_WAREHOUSE }
    })
    await flushPromises()

    wrapper.findComponent({ name: 'WbrParcels_WhList' }).vm.$emit('clear-box-scope')
    await flushPromises()

    expect(replaceMock).not.toHaveBeenCalled()
  })

  it('renders OzonParcels_List when register has OZON registerType', async () => {
    mockGet.mockResolvedValue({ registerType: OZON_COMPANY_ID })

    const wrapper = mount(ParcelsView, {
      props: {
        id: 2
      }
    })

    // Wait for async data to load
    await flushPromises()
    await flushPromises()

    expect(wrapper.find('[data-test="ozon-list"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="wbr-list"]').exists()).toBe(false)
  })

  it('renders OzonParcels_WhList when register has OZON registerType in warehouse mode', async () => {
    mockGet.mockResolvedValue({ registerType: OZON_COMPANY_ID })

    const wrapper = mount(ParcelsView, {
      props: {
        id: 6,
        mode: OP_MODE_WAREHOUSE
      }
    })

    await flushPromises()
    await flushPromises()

    expect(wrapper.find('[data-test="ozon-wh-list"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="ozon-list"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="wbr-list"]').exists()).toBe(false)
  })

  it('renders WbrNParcels_List when register has WBRN registerType', async () => {
    mockGet.mockResolvedValue({ registerType: WBRN_REGISTER_ID })

    const wrapper = mount(ParcelsView, {
      props: {
        id: 7
      }
    })

    await flushPromises()
    await flushPromises()

    expect(wrapper.find('[data-test="wbrn-list"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="wbr-list"]').exists()).toBe(false)
  })

  it('renders WbrNParcels_WhList when register has WBRN registerType in warehouse mode', async () => {
    mockGet.mockResolvedValue({ registerType: WBRN_REGISTER_ID })

    const wrapper = mount(ParcelsView, {
      props: {
        id: 8,
        mode: OP_MODE_WAREHOUSE
      }
    })

    await flushPromises()
    await flushPromises()

    expect(wrapper.find('[data-test="wbrn-wh-list"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="wbrn-list"]').exists()).toBe(false)
  })

  it('renders GtcParcels_List when register has GTC registerType', async () => {
    mockGet.mockResolvedValue({ registerType: GTC_COMPANY_ID })

    const wrapper = mount(ParcelsView, {
      props: {
        id: 5
      }
    })

    await flushPromises()
    await flushPromises()

    expect(wrapper.find('[data-test="gtc-list"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="wbr-list"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="ozon-list"]').exists()).toBe(false)
  })

  it('renders nothing when registerType is unknown', async () => {
    mockGet.mockResolvedValue({ registerType: 999 }) // Unknown register type

    const wrapper = mount(ParcelsView, {
      props: {
        id: 3
      }
    })

    // Wait for async data to load
    await flushPromises()
    await flushPromises()

    expect(wrapper.find('[data-test="wbr-list"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="ozon-list"]').exists()).toBe(false)
  })

  it('passes the register id prop to the selected component', async () => {
    mockGet.mockResolvedValue({ registerType: WBR_COMPANY_ID })

    const wrapper = mount(ParcelsView, {
      props: {
        id: 123
      }
    })

    // Wait for async data to load
    await flushPromises()
    await flushPromises()

    // Check that the WBR list component is rendered and receives the register-id prop
    const wbrList = wrapper.find('[data-test="wbr-list"]')
    expect(wbrList.exists()).toBe(true)

    // Find the dynamic component and check its props
    const dynamicComponent = wrapper.findComponent({ name: 'WbrParcels_List' })
    expect(dynamicComponent.exists()).toBe(true)
    // Check for both kebab-case and camelCase prop names
    expect(dynamicComponent.props('register-id') || dynamicComponent.props('registerId')).toBe(123)
  })

  it('routes to paperwork registers when selected paperwork list emits close', async () => {
    mockGet.mockResolvedValue({ registerType: WBR_COMPANY_ID })

    const wrapper = mount(ParcelsView, {
      props: {
        id: 123
      }
    })

    await flushPromises()
    await flushPromises()

    wrapper.findComponent({ name: 'WbrParcels_List' }).vm.$emit('close')

    expect(pushMock).toHaveBeenCalledWith({
      path: '/registers',
      query: { mode: OP_MODE_PAPERWORK }
    })
    expect(backMock).not.toHaveBeenCalled()
  })

  it('routes to warehouse registers when selected warehouse list emits close', async () => {
    mockGet.mockResolvedValue({ registerType: OZON_COMPANY_ID })

    const wrapper = mount(ParcelsView, {
      props: {
        id: 321,
        mode: OP_MODE_WAREHOUSE
      }
    })

    await flushPromises()
    await flushPromises()

    wrapper.findComponent({ name: 'OzonParcels_WhList' }).vm.$emit('close')

    expect(pushMock).toHaveBeenCalledWith({
      path: '/registers',
      query: { mode: OP_MODE_WAREHOUSE }
    })
    expect(backMock).not.toHaveBeenCalled()
  })

  it('returns a scoped parcel list to its safe boxes URL', async () => {
    mockGet.mockResolvedValue({ registerType: OZON_COMPANY_ID })
    const wrapper = mount(ParcelsView, {
      props: {
        id: 321,
        mode: OP_MODE_WAREHOUSE,
        boxId: 17,
        returnUrl: '/registers/321/boxes'
      }
    })
    await flushPromises()

    wrapper.findComponent({ name: 'OzonParcels_WhList' }).vm.$emit('close')
    await flushPromises()

    expect(pushMock).toHaveBeenCalledWith('/registers/321/boxes')
  })

  it('reports a scoped close failure and keeps the current scope', async () => {
    const { useAlertStore } = await import('@/stores/alert.store.js')
    mockGet.mockResolvedValue({ registerType: OZON_COMPANY_ID })
    const query = {
      mode: OP_MODE_WAREHOUSE,
      boxId: '17',
      boxCode: 'BOX-17',
      returnUrl: '/registers/321/boxes'
    }
    currentRouteMock.value = {
      path: '/registers/321/parcels',
      fullPath:
        '/registers/321/parcels?mode=modeWarehouse&boxId=17&boxCode=BOX-17&returnUrl=/registers/321/boxes',
      query
    }
    pushMock.mockRejectedValueOnce(new Error('close failed'))
    const wrapper = mount(ParcelsView, {
      props: {
        id: 321,
        mode: OP_MODE_WAREHOUSE,
        boxId: 17,
        boxCode: 'BOX-17',
        returnUrl: '/registers/321/boxes'
      }
    })
    await flushPromises()

    wrapper.findComponent({ name: 'OzonParcels_WhList' }).vm.$emit('close')
    await flushPromises()

    expect(currentRouteMock.value.query).toBe(query)
    expect(useAlertStore().alert.message).toBe('close failed')
  })
})
