// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks UI application

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import ParcelEditView from '@/views/Parcel_EditView.vue'
import OzonParcelEditDialog from '@/dialogs/OzonParcel_EditDialog.vue'
import WbrParcelEditDialog from '@/dialogs/WbrParcel_EditDialog.vue'
import WbrNParcelEditDialog from '@/dialogs/WbrNParcel_EditDialog.vue'
import GtcParcelEditDialog from '@/dialogs/GtcParcel_EditDialog.vue'
import {
  OZON_COMPANY_ID,
  WBR_COMPANY_ID,
  GTC_COMPANY_ID,
  WBRN_REGISTER_ID
} from '@/helpers/company.constants.js'
import { OP_MODE_WAREHOUSE } from '@/helpers/op.mode.js'
import { useAlertStore } from '@/stores/alert.store.js'
import * as errorHelpers from '@/helpers/error.helpers.js'

const router = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock('@/router', () => ({ default: router }))

const subscriptionOptions = vi.hoisted(() => [])
vi.mock('@/composables/useParcelCheckStatusSubscription.js', () => ({
  useParcelCheckStatusSubscription: (options) => subscriptionOptions.push(options)
}))

// Mock fetchWrapper
const mockGet = vi.fn()
vi.mock('@/helpers/fetch.wrapper.js', () => ({
  fetchWrapper: {
    get: (...args) => mockGet(...args)
  }
}))

// Mock config
vi.mock('@/helpers/config.js', () => ({
  apiUrl: 'http://test-api'
}))

const commonStubs = {
  ActionButton: { emits: ['click'], template: '<button @click="$emit(\'click\')">Закрыть</button>' },
  OzonParcelEditDialog: true,
  WbrParcelEditDialog: true,
  WbrNParcelEditDialog: true,
  GtcParcelEditDialog: true,
  Suspense: false
}

describe('Parcel_EditView.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    subscriptionOptions.length = 0
  })

  it('enables passport subscription for an SrLogist Plus import dialog', async () => {
    const { useAuthStore } = await import('@/stores/auth.store.js')
    useAuthStore().user = { roles: ['sr-logist'] }
    mockGet.mockResolvedValue({
      id: 5,
      registerType: WBR_COMPANY_ID,
      customsProcedureCode: 40
    })

    mount(ParcelEditView, {
      props: { registerId: 5, id: 50 },
      global: { stubs: commonStubs }
    })
    await flushPromises()

    expect(subscriptionOptions).toHaveLength(1)
    expect(subscriptionOptions[0].enabled.value).toBe(true)
  })

  it.each([
    ['non-import procedure', 10, ['sr-logist']],
    ['ineligible role', 40, ['logist']]
  ])('does not enable passport subscription for %s', async (_name, customsProcedureCode, roles) => {
    const { useAuthStore } = await import('@/stores/auth.store.js')
    useAuthStore().user = { roles }
    mockGet.mockResolvedValue({
      id: 6,
      registerType: WBR_COMPANY_ID,
      customsProcedureCode
    })

    mount(ParcelEditView, {
      props: { registerId: 6, id: 60 },
      global: { stubs: commonStubs }
    })
    await flushPromises()

    expect(subscriptionOptions[0].enabled.value).toBe(false)
  })

  it.each([
    {
      name: 'maps OZON_COMPANY_ID to OzonParcelEditDialog',
      registerType: OZON_COMPANY_ID,
      expectedComponent: OzonParcelEditDialog,
      registerId: 1,
      parcelId: 100
    },
    {
      name: 'maps WBR_COMPANY_ID to WbrParcelEditDialog',
      registerType: WBR_COMPANY_ID,
      expectedComponent: WbrParcelEditDialog,
      registerId: 2,
      parcelId: 200
    },
    {
      name: 'maps GTC_COMPANY_ID to GtcParcelEditDialog',
      registerType: GTC_COMPANY_ID,
      expectedComponent: GtcParcelEditDialog,
      registerId: 40,
      parcelId: 4000
    },
    {
      name: 'maps WBRN_REGISTER_ID to WbrNParcelEditDialog',
      registerType: WBRN_REGISTER_ID,
      expectedComponent: WbrNParcelEditDialog,
      registerId: 33,
      parcelId: 330
    },
    {
      name: 'returns null for unknown register type',
      registerType: 999,
      expectedComponent: null,
      registerId: 4,
      parcelId: 400
    }
  ])('$name', async ({ registerType, expectedComponent, registerId, parcelId }) => {
    mockGet.mockResolvedValue({
      id: registerId,
      registerType
    })

    const wrapper = mount(ParcelEditView, {
      props: {
        registerId,
        id: parcelId
      },
      global: {
        stubs: commonStubs
      }
    })

    await flushPromises()
    await nextTick()

    expect(mockGet).toHaveBeenCalledWith(`http://test-api/registers/${registerId}`)
    expect(wrapper.vm.editComponent).toBe(expectedComponent)
  })

  it('passes normalized navigation context to the selected parcel editor', async () => {
    mockGet.mockResolvedValue({ id: 12, registerType: WBR_COMPANY_ID })

    const wrapper = mount(ParcelEditView, {
      props: {
        registerId: 12,
        id: 4,
        mode: OP_MODE_WAREHOUSE,
        returnUrl: '/scanjobs/42/monitor/boxes/7',
        boxId: 17
      },
      global: { stubs: commonStubs }
    })

    await flushPromises()
    const editor = wrapper.findComponent({ name: 'WbrParcelEditDialog' })

    expect(editor.props()).toMatchObject({
      registerId: 12,
      id: 4,
      mode: OP_MODE_WAREHOUSE,
      returnUrl: '/scanjobs/42/monitor/boxes/7',
      boxId: 17
    })
  })

  it('shows loading state initially', () => {
    // Mock a promise that never resolves to simulate loading state
    mockGet.mockImplementation(() => new Promise(() => {}))

    const wrapper = mount(ParcelEditView, {
      props: {
        registerId: 1,
        id: 100
      },
      global: { stubs: commonStubs }
    })

    expect(wrapper.text()).toContain('Загрузка...')
  })

  it('shows error state when fetch fails', async () => {
    const errorMessage = 'Failed to fetch register'
    mockGet.mockRejectedValue(new Error(errorMessage))

    const wrapper = mount(ParcelEditView, {
      props: {
        registerId: 1,
        id: 100
      },
      global: { stubs: commonStubs }
    })

    await flushPromises()
    await nextTick()

    expect(wrapper.text()).toContain(errorMessage)
  })

  it('retries a failed register load and keeps Close available throughout', async () => {
    mockGet.mockRejectedValueOnce(new Error('Register unavailable')).mockResolvedValue({ id: 12, registerType: WBR_COMPANY_ID })
    const wrapper = mount(ParcelEditView, { props: { id: 3, registerId: 12 }, global: { stubs: commonStubs } })
    await flushPromises()
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.get('hr').element.nextElementSibling.classList.contains('page-alert-region')).toBe(true)
    expect(wrapper.get('button').text()).toBe('Закрыть')
    await wrapper.get('.page-alert-region__action').trigger('click')
    await flushPromises()
    expect(wrapper.findComponent(WbrParcelEditDialog).exists()).toBe(true)
    expect(mockGet).toHaveBeenCalledTimes(2)
  })

  it.each(['resolve', 'reject'])('ignores stale register responses on a register change (%s)', async (outcome) => {
    const report = vi.spyOn(errorHelpers, 'reportError').mockImplementation(() => {})
    let resolveOld, rejectOld
    mockGet.mockImplementationOnce(() => new Promise((resolve, reject) => { resolveOld = resolve; rejectOld = reject }))
      .mockResolvedValue({ id: 13, registerType: GTC_COMPANY_ID })
    const wrapper = mount(ParcelEditView, { props: { id: 3, registerId: 12 }, global: { stubs: commonStubs } })
    await wrapper.setProps({ id: 4, registerId: 13 })
    await flushPromises()
    if (outcome === 'resolve') resolveOld({ id: 12, registerType: WBR_COMPANY_ID })
    else rejectOld(new Error('Stale register failure'))
    await flushPromises()
    expect(wrapper.findComponent(GtcParcelEditDialog).exists()).toBe(true)
    expect(wrapper.findComponent(WbrParcelEditDialog).exists()).toBe(false)
    expect(useAlertStore().alert).toBeNull()
    expect(mockGet).toHaveBeenCalledWith('http://test-api/registers/13')
    report.mockRestore()
  })

  it('reports disposed register failures without replacing the destination alert', async () => {
    const report = vi.spyOn(errorHelpers, 'reportError').mockImplementation(() => {})
    let rejectLoad
    mockGet.mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectLoad = reject }))
    const wrapper = mount(ParcelEditView, { props: { id: 3, registerId: 12 }, global: { stubs: commonStubs } })
    wrapper.unmount()
    useAlertStore().info('Destination')
    rejectLoad(new Error('Disposed register failure'))
    await flushPromises()
    expect(useAlertStore().alert.message).toBe('Destination')
    expect(report).toHaveBeenCalledTimes(1)
    report.mockRestore()
  })

  it('closes a failed register page with navigation context and reports navigation failures', async () => {
    mockGet.mockRejectedValue(new Error('Register unavailable'))
    router.push.mockRejectedValueOnce(new Error('Close failed')).mockResolvedValue()
    const wrapper = mount(ParcelEditView, {
      props: { id: 3, registerId: 12, mode: OP_MODE_WAREHOUSE, returnUrl: '/scanjobs/42/monitor', boxId: 17 },
      global: { stubs: commonStubs }
    })
    await flushPromises()
    await wrapper.get('button').trigger('click')
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('Close failed')
    await wrapper.get('button').trigger('click')
    await flushPromises()
    expect(router.push).toHaveBeenCalledWith('/scanjobs/42/monitor')
  })
})
