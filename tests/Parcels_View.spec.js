/* @vitest-environment jsdom */
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import ParcelsView from '@/views/Parcels_View.vue'
import { OZON_COMPANY_ID, WBR_COMPANY_ID, WBR2_REGISTER_ID } from '@/helpers/company.constants.js'

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

vi.mock('@/lists/Wbr2Parcels_List.vue', () => ({
  default: {
    name: 'Wbr2Parcels_List',
    props: ['register-id'],
    template: '<div data-test="wbr2-list">WBR2: {{ registerId }}</div>'
  }
}))

// Mock the fetchWrapper
vi.mock('@/helpers/fetch.wrapper.js', () => ({
  fetchWrapper: {
    get: vi.fn()
  }
}))

describe('Parcels_View', () => {
  const mockGet = vi.hoisted(() => vi.fn())
  
  beforeEach(async () => {
    vi.clearAllMocks()
    const { fetchWrapper } = await import('@/helpers/fetch.wrapper.js')
    fetchWrapper.get.mockImplementation(mockGet)
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
})
