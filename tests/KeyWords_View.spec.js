// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import KeyWords_View from '@/views/KeyWords_View.vue'
import KeyWords_List from '@/lists/KeyWords_List.vue'

const vuetify = createVuetify()

// Mock the KeyWords_List component
vi.mock('@/lists/KeyWords_List.vue', () => ({
  default: {
    name: 'KeyWords_List',
    template: '<div data-test="keywords-list">KeyWords_List Component</div>'
  }
}))

describe('KeyWords_View', () => {
  let wrapper

  beforeEach(() => {
    wrapper = mount(KeyWords_View, {
      global: {
        plugins: [vuetify]
      }
    })
  })

  it('should render KeyWords_List component', () => {
    const stopWordsList = wrapper.findComponent(KeyWords_List)
    expect(stopWordsList.exists()).toBe(true)
  })

  it('should have correct component structure', () => {
    expect(wrapper.find('[data-test="keywords-list"]').exists()).toBe(true)
  })

  it('should be a simple wrapper component', () => {
    expect(wrapper.html()).toContain('KeyWords_List Component')
  })
})
