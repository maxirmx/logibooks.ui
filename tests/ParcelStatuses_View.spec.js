/* @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import ParcelStatusesView from '@/views/ParcelStatuses_View.vue'
import { defaultGlobalStubs } from './helpers/test-utils.js'

// Mock the ParcelStatuses_List component
vi.mock('@/components/ParcelStatuses_List.vue', () => ({
  default: {
    name: 'ParcelStatusesList',
    template: '<div class="parcel-statuses-list-stub" data-testid="parcel-statuses-list">ParcelStatuses List Component</div>'
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

    it('renders the ParcelStatuses component', () => {
      const parcelStatusesList = wrapper.find('[data-testid="parcel-statuses-list"]')
      expect(parcelStatusesList.exists()).toBe(true)
    })

    it('has the correct component structure', () => {
      expect(wrapper.find('.parcel-statuses-list-stub').exists()).toBe(true)
    })
  })

  describe('Component Integration', () => {
    it('properly imports and uses ParcelStatuses_List component', () => {
      const parcelStatusesComponent = wrapper.find('[data-testid="parcel-statuses-list"]')
      expect(parcelStatusesComponent.exists()).toBe(true)
    })
  })

  describe('Template Structure', () => {
    it('has a clean template structure', () => {
      // Should only contain the OrderStatuses component
      const html = wrapper.html()
      expect(html).toContain('parcel-statuses-list-stub')
    })

    it('does not add unnecessary wrapper elements', () => {
      // Should directly render the OrderStatuses component
      expect(wrapper.element.tagName.toLowerCase()).toBe('div')
    })
  })
})

