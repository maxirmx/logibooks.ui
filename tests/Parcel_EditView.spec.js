// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks UI application

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import ParcelEditView from '@/views/Parcel_EditView.vue'
import OzonParcelEditDialog from '@/dialogs/OzonParcel_EditDialog.vue'
import WbrParcelEditDialog from '@/dialogs/WbrParcel_EditDialog.vue'
import Wbr2ParcelsEditDialog from '@/dialogs/Wbr2Parcels_EditDialog.vue'
import { OZON_COMPANY_ID, WBR_COMPANY_ID, WBR2_REGISTER_ID } from '@/helpers/company.constants.js'

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
  OzonParcelEditDialog: true,
  WbrParcelEditDialog: true,
  Wbr2ParcelsEditDialog: true,
  Suspense: false
}

describe('Parcel_EditView.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
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
      name: 'maps WBR2_REGISTER_ID to Wbr2ParcelsEditDialog',
      registerType: WBR2_REGISTER_ID,
      expectedComponent: Wbr2ParcelsEditDialog,
      registerId: 3,
      parcelId: 300
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

  it('shows loading state initially', () => {
    // Mock a promise that never resolves to simulate loading state
    mockGet.mockImplementation(() => new Promise(() => {}))

    const wrapper = mount(ParcelEditView, {
      props: { 
        registerId: 1, 
        id: 100 
      }
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
      }
    })

    await flushPromises()
    await nextTick()

    expect(wrapper.text()).toContain('Ошибка загрузки:')
    expect(wrapper.text()).toContain(errorMessage)
  })
})
