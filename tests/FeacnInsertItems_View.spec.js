// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import FeacnInsertItems_View from '@/views/FeacnInsertItems_View.vue'
import FeacnInsertItems_List from '@/lists/FeacnInsertItems_List.vue'

const vuetify = createVuetify()

vi.mock('@/lists/FeacnInsertItems_List.vue', () => ({
  default: {
    name: 'FeacnInsertItems_List',
    template: '<div data-test="fi-list">FeacnInsertItems_List Component</div>'
  }
}))

describe('FeacnInsertItems_View', () => {
  let wrapper

  beforeEach(() => {
    wrapper = mount(FeacnInsertItems_View, {
      global: { plugins: [vuetify] }
    })
  })

  it('renders FeacnInsertItems_List component', () => {
    const list = wrapper.findComponent(FeacnInsertItems_List)
    expect(list.exists()).toBe(true)
  })

  it('has correct structure', () => {
    expect(wrapper.find('[data-test="fi-list"]').exists()).toBe(true)
  })
})

