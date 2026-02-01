// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { createPinia } from 'pinia'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import CustomsReportsView from '@/views/CustomsReports_View.vue'

vi.mock('@/lists/CustomsReports_List.vue', () => ({
  default: {
    name: 'CustomsReports_List',
    template: '<div data-testid="upload-customs-reports-list">Reports List</div>'
  }
}))

describe('CustomsReports_View.vue', () => {
  let vuetify
  let pinia

  beforeEach(() => {
    vuetify = createVuetify({
      components,
      directives
    })
    pinia = createPinia()
  })

  it('renders without errors', () => {
    const wrapper = mount(CustomsReportsView, {
      global: {
        plugins: [vuetify, pinia]
      }
    })

    expect(wrapper.exists()).toBe(true)
  })

  it('renders CustomsReports_List component', () => {
    const wrapper = mount(CustomsReportsView, {
      global: {
        plugins: [vuetify, pinia]
      }
    })

    const list = wrapper.find('[data-testid="upload-customs-reports-list"]')
    expect(list.exists()).toBe(true)
    expect(list.text()).toBe('Reports List')
  })
})
