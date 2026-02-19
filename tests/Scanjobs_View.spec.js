// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { beforeEach, describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import ScanjobsView from '@/views/Scanjobs_View.vue'

vi.mock('@/lists/Scanjobs_List.vue', () => ({
  default: {
    name: 'Scanjobs_List',
    template: '<div data-testid="scanjobs-list">Scanjobs List Component</div>'
  }
}))

describe('Scanjobs_View', () => {
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
    const wrapper = mount(ScanjobsView, {
      global: {
        plugins: [vuetify, pinia]
      }
    })

    expect(wrapper.exists()).toBe(true)
  })

  it('renders Scanjobs_List component', () => {
    const wrapper = mount(ScanjobsView, {
      global: {
        plugins: [vuetify, pinia]
      }
    })

    const listComponent = wrapper.find('[data-testid="scanjobs-list"]')
    expect(listComponent.exists()).toBe(true)
    expect(listComponent.text()).toBe('Scanjobs List Component')
  })

  it('has correct component structure', () => {
    const wrapper = mount(ScanjobsView, {
      global: {
        plugins: [vuetify, pinia]
      }
    })

    expect(wrapper.html()).toContain('Scanjobs List Component')
  })
})
