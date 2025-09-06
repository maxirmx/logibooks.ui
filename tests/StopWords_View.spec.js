// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import StopWords_View from '@/views/StopWords_View.vue'
import StopWords_List from '@/lists/StopWords_List.vue'

const vuetify = createVuetify()

// Mock the StopWords_List component
vi.mock('@/lists/StopWords_List.vue', () => ({
  default: {
    name: 'StopWords_List',
    template: '<div data-test="stopwords-list">StopWords_List Component</div>'
  }
}))

describe('StopWords_View', () => {
  let wrapper

  beforeEach(() => {
    wrapper = mount(StopWords_View, {
      global: {
        plugins: [vuetify]
      }
    })
  })

  it('should render StopWords_List component', () => {
    const stopWordsList = wrapper.findComponent(StopWords_List)
    expect(stopWordsList.exists()).toBe(true)
  })

  it('should have correct component structure', () => {
    expect(wrapper.find('[data-test="stopwords-list"]').exists()).toBe(true)
  })

  it('should be a simple wrapper component', () => {
    expect(wrapper.html()).toContain('StopWords_List Component')
  })
})
