// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { createPinia } from 'pinia'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import HotKeysActionSchemesView from '@/views/HotKeysActionSchemes_View.vue'

vi.mock('@/lists/HotKeysActionSchemes_List.vue', () => ({
  default: {
    name: 'HotKeysActionSchemes_List',
    template: '<div data-testid="schemes-list">Schemes List</div>'
  }
}))

describe('HotKeysActionSchemes_View.vue', () => {
  let vuetify
  let pinia

  beforeEach(() => {
    vuetify = createVuetify({ components, directives })
    pinia = createPinia()
  })

  it('renders list', () => {
    const wrapper = mount(HotKeysActionSchemesView, {
      global: { plugins: [vuetify, pinia] }
    })

    expect(wrapper.find('[data-testid="schemes-list"]').exists()).toBe(true)
  })
})
