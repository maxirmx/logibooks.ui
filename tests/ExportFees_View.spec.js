// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import ExportFees_View from '@/views/ExportFees_View.vue'
import ExportFees_List from '@/lists/ExportFees_List.vue'

const vuetify = createVuetify()

vi.mock('@/lists/ExportFees_List.vue', () => ({
  default: {
    name: 'ExportFees_List',
    template: '<div data-test="export-fees-list">ExportFees_List Component</div>'
  }
}))

describe('ExportFees_View', () => {
  let wrapper

  beforeEach(() => {
    wrapper = mount(ExportFees_View, {
      global: {
        plugins: [vuetify]
      }
    })
  })

  it('renders ExportFees_List component', () => {
    const comp = wrapper.findComponent(ExportFees_List)
    expect(comp.exists()).toBe(true)
  })

  it('has simple wrapper structure', () => {
    expect(wrapper.find('[data-test="export-fees-list"]').exists()).toBe(true)
    expect(wrapper.html()).toContain('ExportFees_List Component')
  })
})
