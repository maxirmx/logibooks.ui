// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

/* @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import App from '@/App.vue'
import { useStatusStore } from '@/stores/status.store.js'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

// Mock ResizeObserver
if (!global.ResizeObserver) {
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }))
}

// Mock Vuetify display composable
vi.mock('vuetify', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useDisplay: () => ({
      height: { value: 600 },
    }),
  }
})

const vuetify = createVuetify({
  components,
  directives,
})

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: { template: '<div>Home</div>' } },
    { path: '/login', component: { template: '<div>Login</div>' } },
  ],
})

describe('App exchange rates display', () => {
  let statusStore

  beforeEach(async () => {
    setActivePinia(createPinia())
    statusStore = useStatusStore()
    statusStore.fetchStatus = vi.fn().mockResolvedValue({})

    await router.push('/')
    await router.isReady()
  })

  function mountApp() {
    return mount(App, {
      global: {
        plugins: [router, vuetify],
        stubs: {
          RouterView: true,
          'v-app': { template: '<div class="v-app"><slot /></div>' },
          'v-app-bar': { template: '<div class="v-app-bar"><slot name="prepend" /><slot /></div>' },
          'v-app-bar-nav-icon': { template: '<button class="nav-icon" />' },
          'v-app-bar-title': { template: '<div class="primary-heading"><slot /></div>' },
          'v-spacer': { template: '<div class="spacer" />' },
          'v-navigation-drawer': {
            template: '<div class="nav-drawer"><slot name="prepend" /><slot /><slot name="append" /></div>',
          },
          'v-list': { template: '<ul><slot /></ul>' },
          'v-list-item': { template: '<li><slot /></li>' },
          'v-list-group': { template: '<div class="list-group"><slot name="activator" :props="{}" /><slot /></div>' },
          'v-main': { template: '<main><slot /></main>' },
        },
      },
    })
  }

  it('displays USD and EUR exchange rates when available', async () => {
    statusStore.exchangeRates = [
      { alphabeticCode: 'USD', rate: 92.1234, date: '2024-06-29T00:00:00.000Z' },
      { alphabeticCode: 'EUR', rate: 101.9876, date: '2024-06-30T00:00:00.000Z' },
    ]

    const wrapper = mountApp()
    await wrapper.vm.$nextTick()

    const rateItems = wrapper.findAll('.exchange-rates span')
    expect(rateItems).toHaveLength(2)
    expect(rateItems[0].text()).toBe('USD/RUB 29.06.2024 92,1234')
    expect(rateItems[1].text()).toBe('EUR/RUB 30.06.2024 101,9876')
  })

  it('renders only available exchange rates', async () => {
    statusStore.exchangeRates = [
      { alphabeticCode: 'USD', rate: 95.5, date: '2024-07-01' },
    ]

    const wrapper = mountApp()
    await wrapper.vm.$nextTick()

    const rateItems = wrapper.findAll('.exchange-rates span')
    expect(rateItems).toHaveLength(1)
    expect(rateItems[0].text()).toBe('USD/RUB 01.07.2024 95,5000')
    expect(wrapper.text()).not.toContain('EUR/RUB')
  })
})
