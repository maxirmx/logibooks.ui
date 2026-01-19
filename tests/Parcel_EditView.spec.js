// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
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

describe('Parcel_EditView.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('maps OZON_COMPANY_ID to OzonParcelEditDialog', async () => {
    mockGet.mockResolvedValue({ 
      id: 1, 
      registerType: OZON_COMPANY_ID 
    })

    const wrapper = mount(ParcelEditView, {
      props: { 
        registerId: 1, 
        id: 100 
      },
      global: {
        stubs: {
          OzonParcelEditDialog: true,
          WbrParcelEditDialog: true,
          Wbr2ParcelsEditDialog: true,
          Suspense: false
        }
      }
    })

    await flushPromises()
    await nextTick()

    expect(mockGet).toHaveBeenCalledWith('http://test-api/registers/1')
    
    // Access the component instance to check the computed property
    const editComponent = wrapper.vm.editComponent
    expect(editComponent).toBe(OzonParcelEditDialog)
  })

  it('maps WBR_COMPANY_ID to WbrParcelEditDialog', async () => {
    mockGet.mockResolvedValue({ 
      id: 2, 
      registerType: WBR_COMPANY_ID 
    })

    const wrapper = mount(ParcelEditView, {
      props: { 
        registerId: 2, 
        id: 200 
      },
      global: {
        stubs: {
          OzonParcelEditDialog: true,
          WbrParcelEditDialog: true,
          Wbr2ParcelsEditDialog: true,
          Suspense: false
        }
      }
    })

    await flushPromises()
    await nextTick()

    expect(mockGet).toHaveBeenCalledWith('http://test-api/registers/2')
    
    // Access the component instance to check the computed property
    const editComponent = wrapper.vm.editComponent
    expect(editComponent).toBe(WbrParcelEditDialog)
  })

  it('maps WBR2_REGISTER_ID to Wbr2ParcelsEditDialog', async () => {
    mockGet.mockResolvedValue({ 
      id: 3, 
      registerType: WBR2_REGISTER_ID 
    })

    const wrapper = mount(ParcelEditView, {
      props: { 
        registerId: 3, 
        id: 300 
      },
      global: {
        stubs: {
          OzonParcelEditDialog: true,
          WbrParcelEditDialog: true,
          Wbr2ParcelsEditDialog: true,
          Suspense: false
        }
      }
    })

    await flushPromises()
    await nextTick()

    expect(mockGet).toHaveBeenCalledWith('http://test-api/registers/3')
    
    // Access the component instance to check the computed property
    const editComponent = wrapper.vm.editComponent
    expect(editComponent).toBe(Wbr2ParcelsEditDialog)
  })

  it('returns null for unknown register type', async () => {
    mockGet.mockResolvedValue({ 
      id: 4, 
      registerType: 999 // Unknown type
    })

    const wrapper = mount(ParcelEditView, {
      props: { 
        registerId: 4, 
        id: 400 
      },
      global: {
        stubs: {
          OzonParcelEditDialog: true,
          WbrParcelEditDialog: true,
          Wbr2ParcelsEditDialog: true,
          Suspense: false
        }
      }
    })

    await flushPromises()
    await nextTick()

    expect(mockGet).toHaveBeenCalledWith('http://test-api/registers/4')
    
    // Access the component instance to check the computed property
    const editComponent = wrapper.vm.editComponent
    expect(editComponent).toBeNull()
  })

  it('shows loading state initially', () => {
    mockGet.mockReturnValue(new Promise(() => {})) // Never resolves

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
