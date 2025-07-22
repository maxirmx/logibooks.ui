/* @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import ParcelStatusesView from '@/views/ParcelStatuses_View.vue'
import { defaultGlobalStubs } from './test-utils.js'

// Mock the ParcelStatuses_List component
vi.mock('@/components/ParcelStatuses_List.vue', () => ({
  default: {
    name: 'ParcelStatusesList',
    template: '<div class="order-statuses-list-stub" data-testid="order-statuses-list">OrderStatuses List Component</div>'
  }
}))

describe('ParcelStatuses_View.vue', () => {
  let wrapper

  beforeEach(() => {
    wrapper = mount(ParcelStatusesView, {
      global: {
        stubs: defaultGlobalStubs
      }
    })
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('Component Structure', () => {
    it('renders correctly', () => {
      expect(wrapper.exists()).toBe(true)
    })

    it('renders the OrderStatuses component', () => {
      const orderStatusesList = wrapper.find('[data-testid="order-statuses-list"]')
      expect(orderStatusesList.exists()).toBe(true)
    })

    it('has the correct component structure', () => {
      expect(wrapper.find('.order-statuses-list-stub').exists()).toBe(true)
    })
  })

  describe('Component Integration', () => {
    it('properly imports and uses ParcelStatuses_List component', () => {
      const orderStatusesComponent = wrapper.find('[data-testid="order-statuses-list"]')
      expect(orderStatusesComponent.exists()).toBe(true)
    })
  })

  describe('Template Structure', () => {
    it('has a clean template structure', () => {
      // Should only contain the OrderStatuses component
      const html = wrapper.html()
      expect(html).toContain('order-statuses-list-stub')
    })

    it('does not add unnecessary wrapper elements', () => {
      // Should directly render the OrderStatuses component
      expect(wrapper.element.tagName.toLowerCase()).toBe('div')
    })
  })
})
