import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import CompaniesView from '@/views/Companies_View.vue'

// Mock the Companies_List component
vi.mock('@/components/Companies_List.vue', () => ({
  default: {
    name: 'Companies_List',
    template: '<div data-testid="companies-list">Companies List Component</div>'
  }
}))

describe('Companies_View', () => {
  let vuetify
  let pinia

  beforeEach(() => {
    vuetify = createVuetify({
      components,
      directives
    })
    pinia = createPinia()
  })

  it('mounts successfully', () => {
    const wrapper = mount(CompaniesView, {
      global: {
        plugins: [vuetify, pinia]
      }
    })

    expect(wrapper.exists()).toBe(true)
  })

  it('renders Companies_List component', () => {
    const wrapper = mount(CompaniesView, {
      global: {
        plugins: [vuetify, pinia]
      }
    })

    const companiesListComponent = wrapper.find('[data-testid="companies-list"]')
    expect(companiesListComponent.exists()).toBe(true)
    expect(companiesListComponent.text()).toBe('Companies List Component')
  })

  it('has correct component structure', () => {
    const wrapper = mount(CompaniesView, {
      global: {
        plugins: [vuetify, pinia]
      }
    })

    // Should be a simple wrapper around Companies_List
    expect(wrapper.html()).toContain('Companies List Component')
  })
})
