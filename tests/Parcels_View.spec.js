/* @vitest-environment jsdom */
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import ParcelsView from '@/views/Parcels_View.vue'
import {
  OZON_COMPANY_ID,
  WBR_COMPANY_ID,
  GTC_COMPANY_ID,
  WBR2_REGISTER_ID,
  WBRN_REGISTER_ID
} from '@/helpers/company.constants.js'
import { OP_MODE_PAPERWORK, OP_MODE_WAREHOUSE } from '@/helpers/op.mode.js'

const pushMock = vi.hoisted(() => vi.fn())
const replaceMock = vi.hoisted(() => vi.fn())
const backMock = vi.hoisted(() => vi.fn())
const mockGet = vi.hoisted(() => vi.fn())
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

vi.mock('@/lists/WbrParcels_List.vue', () => ({
  default: {
    name: 'WbrParcels_List',
    props: ['register-id'],
    template: '<div data-test="wbr-list">WBR: {{ registerId }}</div>'
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

vi.mock('@/lists/Wbr2Parcels_List.vue', () => ({
  default: {
    name: 'Wbr2Parcels_List',
    props: ['register-id'],
    template: '<div data-test="wbr2-list">WBR2: {{ registerId }}</div>'
  }
}))

vi.mock('@/lists/Wbr2Parcels_WhList.vue', () => ({
  default: {
    name: 'Wbr2Parcels_WhList',
    props: ['register-id'],
    template: '<div data-test="wbr2-wh-list">WBR2 WH: {{ registerId }}</div>'
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
    vi.clearAllMocks()
    subscriptionOptions.length = 0
    currentRouteMock.value = {
      path: '/registers/1/parcels',
      fullPath: '/registers/1/parcels',
      query: {}
    }
    const { fetchWrapper } = await import('@/helpers/fetch.wrapper.js')
    fetchWrapper.get.mockImplementation(mockGet)
  })

  it('enables passport subscriptions only for SrLogist Plus import paperwork', async () => {
    const { useAuthStore } = await import('@/stores/auth.store.js')
    useAuthStore().user = { roles: ['sr-logist'] }
    mockGet.mockResolvedValue({
      registerType: WBR_COMPANY_ID,
      customsProcedureCode: 40
    })

    mount(ParcelsView, { props: { id: 15, mode: OP_MODE_PAPERWORK } })
    await nextTick()
    await nextTick()

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
      await nextTick()
      await nextTick()

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
    ['an unknown rejection shape', {}, 'Не удалось загрузить реестр']
  ])('renders a safe register load error for %s', async (_case, rejection, expectedMessage) => {
    mockGet.mockRejectedValueOnce(rejection)

    const wrapper = mount(ParcelsView, { props: { id: 20 } })
    await flushPromises()

    expect(wrapper.text()).toContain(`Ошибка загрузки: ${expectedMessage}`)
  })

  it('renders WbrParcels_List when register has WBR registerType', async () => {
    mockGet.mockResolvedValue({ registerType: WBR_COMPANY_ID })

    const wrapper = mount(ParcelsView, {
      props: {
        id: 1
      }
    })

    // Wait for async data to load
    await nextTick()
    await nextTick()

    expect(wrapper.find('[data-test="wbr-list"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="ozon-list"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="wbr2-list"]').exists()).toBe(false)
  })

  it('renders WbrParcels_WhList when register has WBR registerType in warehouse mode', async () => {
    mockGet.mockResolvedValue({ registerType: WBR_COMPANY_ID })

    const wrapper = mount(ParcelsView, {
      props: {
        id: 10,
        mode: OP_MODE_WAREHOUSE
      }
    })

    await nextTick()
    await nextTick()

    expect(wrapper.find('[data-test="wbr-wh-list"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="wbr-list"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="ozon-list"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="wbr2-list"]').exists()).toBe(false)
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
    await nextTick()
    await nextTick()

    expect(wrapper.find('[data-test="ozon-list"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="wbr-list"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="wbr2-list"]').exists()).toBe(false)
  })

  it('renders OzonParcels_WhList when register has OZON registerType in warehouse mode', async () => {
    mockGet.mockResolvedValue({ registerType: OZON_COMPANY_ID })

    const wrapper = mount(ParcelsView, {
      props: {
        id: 6,
        mode: OP_MODE_WAREHOUSE
      }
    })

    await nextTick()
    await nextTick()

    expect(wrapper.find('[data-test="ozon-wh-list"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="ozon-list"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="wbr-list"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="wbr2-list"]').exists()).toBe(false)
  })

  it('renders Wbr2Parcels_List when register has WBR2 registerType', async () => {
    mockGet.mockResolvedValue({ registerType: WBR2_REGISTER_ID })

    const wrapper = mount(ParcelsView, {
      props: {
        id: 3
      }
    })

    // Wait for async data to load
    await nextTick()
    await nextTick()

    expect(wrapper.find('[data-test="wbr2-list"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="wbr-list"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="ozon-list"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="wbr2-wh-list"]').exists()).toBe(false)
  })

  it('renders Wbr2Parcels_WhList when register has WBR2 registerType in warehouse mode', async () => {
    mockGet.mockResolvedValue({ registerType: WBR2_REGISTER_ID })

    const wrapper = mount(ParcelsView, {
      props: {
        id: 4,
        mode: OP_MODE_WAREHOUSE
      }
    })

    await nextTick()
    await nextTick()

    expect(wrapper.find('[data-test="wbr2-wh-list"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="wbr2-list"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="wbr-list"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="ozon-list"]').exists()).toBe(false)
  })

  it('renders WbrNParcels_List when register has WBRN registerType', async () => {
    mockGet.mockResolvedValue({ registerType: WBRN_REGISTER_ID })

    const wrapper = mount(ParcelsView, {
      props: {
        id: 7
      }
    })

    await nextTick()
    await nextTick()

    expect(wrapper.find('[data-test="wbrn-list"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="wbr-list"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="wbr2-list"]').exists()).toBe(false)
  })

  it('renders WbrNParcels_WhList when register has WBRN registerType in warehouse mode', async () => {
    mockGet.mockResolvedValue({ registerType: WBRN_REGISTER_ID })

    const wrapper = mount(ParcelsView, {
      props: {
        id: 8,
        mode: OP_MODE_WAREHOUSE
      }
    })

    await nextTick()
    await nextTick()

    expect(wrapper.find('[data-test="wbrn-wh-list"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="wbrn-list"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="wbr2-wh-list"]').exists()).toBe(false)
  })

  it('renders GtcParcels_List when register has GTC registerType', async () => {
    mockGet.mockResolvedValue({ registerType: GTC_COMPANY_ID })

    const wrapper = mount(ParcelsView, {
      props: {
        id: 5
      }
    })

    await nextTick()
    await nextTick()

    expect(wrapper.find('[data-test="gtc-list"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="wbr-list"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="ozon-list"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="wbr2-list"]').exists()).toBe(false)
  })

  it('renders nothing when registerType is unknown', async () => {
    mockGet.mockResolvedValue({ registerType: 999 }) // Unknown register type

    const wrapper = mount(ParcelsView, {
      props: {
        id: 3
      }
    })

    // Wait for async data to load
    await nextTick()
    await nextTick()

    expect(wrapper.find('[data-test="wbr-list"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="ozon-list"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="wbr2-list"]').exists()).toBe(false)
  })

  it('passes the register id prop to the selected component', async () => {
    mockGet.mockResolvedValue({ registerType: WBR_COMPANY_ID })

    const wrapper = mount(ParcelsView, {
      props: {
        id: 123
      }
    })

    // Wait for async data to load
    await nextTick()
    await nextTick()

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

    await nextTick()
    await nextTick()

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

    await nextTick()
    await nextTick()

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
