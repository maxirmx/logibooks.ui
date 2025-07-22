/* @vitest-environment jsdom */
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
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

describe('Parcels_View', () => {
  it('renders WbrParcels_List when companyId is WBR', () => {
    const wrapper = mount(ParcelsView, {
      props: {
        id: 1,
        companyId: WBR_COMPANY_ID
      }
    })

    expect(wrapper.find('[data-test="wbr-list"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="ozon-list"]').exists()).toBe(false)
  })

  it('renders OzonParcels_List when companyId is OZON', () => {
    const wrapper = mount(ParcelsView, {
      props: {
        id: 2,
        companyId: OZON_COMPANY_ID
      }
    })

    expect(wrapper.find('[data-test="ozon-list"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="wbr-list"]').exists()).toBe(false)
  })

  it('renders nothing when companyId is unknown', () => {
    const wrapper = mount(ParcelsView, {
      props: {
        id: 3,
        companyId: 999 // Unknown company ID
      }
    })

    expect(wrapper.find('[data-test="wbr-list"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="ozon-list"]').exists()).toBe(false)
  })

  it('passes the register id prop to the selected component', () => {
    const wrapper = mount(ParcelsView, {
      props: {
        id: 123,
        companyId: WBR_COMPANY_ID
      }
    })

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
