import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import FeacnOrders_View from '@/views/FeacnOrders_View.vue'
import FeacnOrders_List from '@/lists/FeacnOrders_List.vue'

const vuetify = createVuetify()

vi.mock('@/lists/FeacnOrders_List.vue', () => ({
  default: {
    name: 'FeacnOrders_List',
    template: '<div data-test="feacn-orders-list">FeacnOrders_List Component</div>'
  }
}))

describe('FeacnOrders_View', () => {
  let wrapper

  beforeEach(() => {
    wrapper = mount(FeacnOrders_View, {
      global: {
        plugins: [vuetify]
      }
    })
  })

  it('should render FeacnOrders_List component', () => {
    const comp = wrapper.findComponent(FeacnOrders_List)
    expect(comp.exists()).toBe(true)
  })

  it('should have correct component structure', () => {
    expect(wrapper.find('[data-test="feacn-orders-list"]').exists()).toBe(true)
  })

  it('should be a simple wrapper component', () => {
    expect(wrapper.html()).toContain('FeacnOrders_List Component')
  })
})
