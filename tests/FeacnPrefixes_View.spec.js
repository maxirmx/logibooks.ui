// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import FeacnPrefixes_View from '@/views/FeacnPrefixes_View.vue'
import FeacnPrefixes_List from '@/lists/FeacnPrefixes_List.vue'

const vuetify = createVuetify()

vi.mock('@/lists/FeacnPrefixes_List.vue', () => ({
  default: {
    name: 'FeacnPrefixes_List',
    template: '<div data-test="fp-list">FeacnPrefixes_List Component</div>'
  }
}))

describe('FeacnPrefixes_View', () => {
  let wrapper

  beforeEach(() => {
    wrapper = mount(FeacnPrefixes_View, { global: { plugins: [vuetify] } })
  })

  it('renders FeacnPrefixes_List component', () => {
    const list = wrapper.findComponent(FeacnPrefixes_List)
    expect(list.exists()).toBe(true)
  })

  it('has correct structure', () => {
    expect(wrapper.find('[data-test="fp-list"]').exists()).toBe(true)
  })
})

