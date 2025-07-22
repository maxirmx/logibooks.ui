/* @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import ParcelsView from '@/views/Parcels_View.vue'
import { OZON_COMPANY_ID, WBR_COMPANY_ID } from '@/helpers/company.constants.js'

vi.mock('@/components/WbrParcels_List.vue', () => ({
  default: {
    name: 'WbrParcels_List',
    props: ['register-id'],
    template: '<div data-test="wbr-list">WBR: {{ registerId }}</div>'
  }
}))

vi.mock('@/components/OzonParcels_List.vue', () => ({
  default: {
    name: 'OzonParcels_List',
    props: ['register-id'],
    template: '<div data-test="ozon-list">OZON: {{ registerId }}</div>'
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

  it('renders WbrParcels_List when register has WBR customerId', async () => {
    mockGet.mockResolvedValue({ customerId: WBR_COMPANY_ID })
    
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

  it('renders OzonParcels_List when register has OZON customerId', async () => {
    mockGet.mockResolvedValue({ customerId: OZON_COMPANY_ID })
    
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

  it('renders nothing when customerId is unknown', async () => {
    mockGet.mockResolvedValue({ customerId: 999 }) // Unknown company ID
    
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
    mockGet.mockResolvedValue({ customerId: WBR_COMPANY_ID })
    
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
