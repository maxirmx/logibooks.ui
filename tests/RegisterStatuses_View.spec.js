/* @vitest-environment jsdom */
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import RegisterStatusesView from '@/views/RegisterStatuses_View.vue'
import { defaultGlobalStubs } from './helpers/test-utils.js'

// Mock the RegisterStatuses_List component
vi.mock('@/lists/RegisterStatuses_List.vue', () => ({
  default: {
    name: 'RegisterStatusesList',
    template: '<div class="register-statuses-list-stub" data-testid="register-statuses-list">RegisterStatuses List Component</div>'
  }
}))

describe('RegisterStatuses_View.vue', () => {
  let wrapper

  beforeEach(() => {
    wrapper = mount(RegisterStatusesView, {
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

    it('renders the RegisterStatuses component', () => {
      const registerStatusesList = wrapper.find('[data-testid="register-statuses-list"]')
      expect(registerStatusesList.exists()).toBe(true)
    })

    it('has the correct component structure', () => {
      expect(wrapper.find('.register-statuses-list-stub').exists()).toBe(true)
    })
  })

  describe('Component Integration', () => {
    it('properly imports and uses RegisterStatuses_List component', () => {
      const registerStatusesComponent = wrapper.find('[data-testid="register-statuses-list"]')
      expect(registerStatusesComponent.exists()).toBe(true)
    })
  })

  describe('Template Structure', () => {
    it('has a clean template structure', () => {
      // Should only contain the OrderStatuses component
      const html = wrapper.html()
      expect(html).toContain('register-statuses-list-stub')
    })

    it('does not add unnecessary wrapper elements', () => {
      // Should directly render the OrderStatuses component
      expect(wrapper.element.tagName.toLowerCase()).toBe('div')
    })
  })
})

