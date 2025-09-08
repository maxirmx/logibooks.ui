// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import FeacnLocalPrefixes_View from '@/views/FeacnLocalPrefixes_View.vue'
import FeacnLocalPrefixes_List from '@/lists/FeacnLocalPrefixes_List.vue'

const vuetify = createVuetify()

vi.mock('@/lists/FeacnLocalPrefixes_List.vue', () => ({
  default: {
    name: 'FeacnLocalPrefixes_List',
    template: '<div data-test="fp-list">FeacnLocalPrefixes_List Component</div>'
  }
}))

describe('FeacnLocalPrefixes_View', () => {
  let wrapper

  beforeEach(() => {
    wrapper = mount(FeacnLocalPrefixes_View, { global: { plugins: [vuetify] } })
  })

  it('renders FeacnLocalPrefixes_List component', () => {
    const list = wrapper.findComponent(FeacnLocalPrefixes_List)
    expect(list.exists()).toBe(true)
  })

  it('has correct structure', () => {
    expect(wrapper.find('[data-test="fp-list"]').exists()).toBe(true)
  })
})

