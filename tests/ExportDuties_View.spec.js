// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import ExportDuties_View from '@/views/ExportDuties_View.vue'
import ExportDuties_List from '@/lists/ExportDuties_List.vue'

const vuetify = createVuetify()

vi.mock('@/lists/ExportDuties_List.vue', () => ({
  default: {
    name: 'ExportDuties_List',
    template: '<div data-test="export-duties-list">ExportDuties_List Component</div>'
  }
}))

describe('ExportDuties_View', () => {
  let wrapper

  beforeEach(() => {
    wrapper = mount(ExportDuties_View, {
      global: {
        plugins: [vuetify]
      }
    })
  })

  it('renders ExportDuties_List component', () => {
    const comp = wrapper.findComponent(ExportDuties_List)
    expect(comp.exists()).toBe(true)
  })

  it('has simple wrapper structure', () => {
    expect(wrapper.find('[data-test="export-duties-list"]').exists()).toBe(true)
    expect(wrapper.html()).toContain('ExportDuties_List Component')
  })
})
