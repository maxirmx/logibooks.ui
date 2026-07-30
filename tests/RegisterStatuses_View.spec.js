/* @vitest-environment jsdom */
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
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

  describe('Template Structure', () => {

    it('does not add unnecessary wrapper elements', () => {
      // Should directly render the OrderStatuses component
      expect(wrapper.element.tagName.toLowerCase()).toBe('div')
    })
  })
})

