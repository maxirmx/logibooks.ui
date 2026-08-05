// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { beforeEach, describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import CompaniesView from '@/views/Companies_View.vue'

// Mock the Companies_List component
vi.mock('@/lists/Companies_List.vue', () => ({
  default: {
    name: 'Companies_List',
    template: '<div data-testid="companies-list">Companies List Component</div>'
  }
}))

describe('Companies_View', () => {
  let vuetify
  let pinia

  beforeEach(() => {
    vuetify = createVuetify({
      components,
      directives
    })
    pinia = createPinia()
  })

  it('mounts successfully', () => {
    const wrapper = mount(CompaniesView, {
      global: {
        plugins: [vuetify, pinia]
      }
    })

    expect(wrapper.exists()).toBe(true)
  })
})
