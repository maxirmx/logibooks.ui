import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import FeacnCodes_View from '@/views/FeacnCodes_View.vue'
import FeacnCodes_List from '@/components/FeacnCodes_List.vue'

const vuetify = createVuetify()

vi.mock('@/components/FeacnCodes_List.vue', () => ({
  default: {
    name: 'FeacnCodes_List',
    template: '<div data-test="feacn-codes-list">FeacnCodes_List Component</div>'
  }
}))

describe('FeacnCodes_View', () => {
  let wrapper

  beforeEach(() => {
    wrapper = mount(FeacnCodes_View, {
      global: {
        plugins: [vuetify]
      }
    })
  })

  it('should render FeacnCodes_List component', () => {
    const comp = wrapper.findComponent(FeacnCodes_List)
    expect(comp.exists()).toBe(true)
  })

  it('should have correct component structure', () => {
    expect(wrapper.find('[data-test="feacn-codes-list"]').exists()).toBe(true)
  })

  it('should be a simple wrapper component', () => {
    expect(wrapper.html()).toContain('FeacnCodes_List Component')
  })
})
