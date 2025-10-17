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

  it('shows current date with both rates when they are for today', async () => {
    const today = new Date()
    const isoToday = today.toISOString()
  const ruDate = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' }).format(today)
    statusStore.exchangeRates = [
      { alphabeticCode: 'USD', rate: 92.1234, date: isoToday },
      { alphabeticCode: 'EUR', rate: 101.9876, date: isoToday },
    ]

    const wrapper = mountApp()
    await wrapper.vm.$nextTick()

    const line = wrapper.find('.exchange-rates').text()
    expect(line).toBe(`${ruDate} USD 92,1234 EUR 101,9876`)
  })

  it('shows failure text when rate date is stale', async () => {
    const today = new Date()
  const ruDate = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' }).format(today)
    const yesterday = new Date(today.getTime() - 24*60*60*1000).toISOString()
    statusStore.exchangeRates = [
      { alphabeticCode: 'USD', rate: 95.5, date: yesterday },
    ]

    const wrapper = mountApp()
    await wrapper.vm.$nextTick()

    const line = wrapper.find('.exchange-rates').text()
    expect(line).toBe(`${ruDate} USD не удалось получить курс EUR не удалось получить курс`)
  })
})
