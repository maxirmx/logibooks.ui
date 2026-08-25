// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

/* @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import App from '@/App.vue'
import { useStatusStore } from '@/stores/status.store.js'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { mdiChevronDown, mdiChevronUp } from '@mdi/js'

let resizeObserverCallback
const resizeObserverObserve = vi.fn()
const resizeObserverDisconnect = vi.fn()

global.ResizeObserver = vi.fn().mockImplementation(function MockResizeObserver(callback) {
  resizeObserverCallback = callback
  return {
    observe: resizeObserverObserve,
    unobserve: vi.fn(),
    disconnect: resizeObserverDisconnect
  }
})

// Mock Vuetify display composable
vi.mock('vuetify', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useDisplay: () => ({
      height: { value: 600 }
    })
  }
})

const vuetify = createVuetify({
  components,
  directives
})

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: { template: '<div>Home</div>' } },
    { path: '/login', component: { template: '<div>Login</div>' } },
    { path: '/scanjobs', component: { template: '<div>Scanjobs</div>' } },
    { path: '/warehouses', component: { template: '<div>Warehouses</div>' } },
    { path: '/registerstatuses', component: { template: '<div>Register Statuses</div>' } }
  ]
})

describe('App exchange rates display', () => {
  let statusStore

  beforeEach(async () => {
    resizeObserverCallback = undefined
    resizeObserverObserve.mockClear()
    resizeObserverDisconnect.mockClear()
    setActivePinia(createPinia())
    statusStore = useStatusStore()
    statusStore.fetchStatus = vi.fn().mockResolvedValue({})

    await router.push('/')
    await router.isReady()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function mountApp() {
    return mount(App, {
      global: {
        plugins: [router, vuetify],
        stubs: {
          RouterView: true,
          'v-app': { template: '<div class="v-app"><slot /></div>' },
          'v-app-bar': {
            props: ['height'],
            template:
              '<div class="v-app-bar" :data-height="height"><slot name="prepend" /><slot /></div>'
          },
          'v-app-bar-nav-icon': { template: '<button class="nav-icon" />' },
          'v-app-bar-title': { template: '<div class="primary-heading"><slot /></div>' },
          'v-spacer': { template: '<div class="spacer" />' },
          'v-btn': {
            props: ['icon'],
            template: '<button class="v-btn-stub" :data-icon="icon"><slot /></button>'
          },
          'v-navigation-drawer': {
            template:
              '<div class="nav-drawer"><slot name="prepend" /><slot /><slot name="append" /></div>'
          },
          'v-list': { template: '<ul><slot /></ul>' },
          'v-list-item': { template: '<li><slot /></li>' },
          'v-list-group': {
            template: '<div class="list-group"><slot name="activator" :props="{}" /><slot /></div>'
          },
          'v-main': { template: '<main><slot /></main>' },
          ActionDialog: {
            props: ['actionDialog'],
            template: '<div class="action-dialog-stub" :data-show="actionDialog?.show"></div>'
          },
          'font-awesome-icon': { template: '<span class="fa-icon-stub"></span>' }
        }
      }
    })
  }

  function getRateLineText(wrapper) {
    return wrapper.findAll('.exchange-rate-item').map((item) => item.text()).join(' ')
  }

  it('shows current date with direct rates when they are for today', async () => {
    const today = new Date()
    const isoToday = today.toISOString()
    const ruDate = new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    }).format(today)
    const unitFormatter = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 })
    statusStore.exchangeRates = [
      { alphabeticCode: 'USD', rate: 92.1234, date: isoToday },
      { alphabeticCode: 'EUR', rate: 101.9876, date: isoToday },
      { alphabeticCode: 'UZS', rate: 65.4321, units: 10000, date: isoToday },
      { alphabeticCode: 'TJS', rate: 84.8238, units: 10, date: isoToday }
    ]
    statusStore.eurUzs = {
      baseAlphabeticCode: 'EUR',
      quoteAlphabeticCode: 'UZS',
      rate: 20000.1234,
      date: isoToday
    }
    statusStore.eurTjs = {
      baseAlphabeticCode: 'EUR',
      quoteAlphabeticCode: 'TJS',
      rate: 12.0234,
      date: isoToday
    }

    const wrapper = mountApp()
    await wrapper.vm.$nextTick()

    const line = getRateLineText(wrapper)
    expect(line).toBe(
      `${ruDate} USD 92,1234 EUR 101,9876 UZS (за ${unitFormatter.format(10000)}) 65,4321 TJS (за ${unitFormatter.format(10)}) 84,8238`
    )

    const usdRate = wrapper.get('[data-testid="exchange-rate-usd"]')
    expect(usdRate.text()).toBe('USD 92,1234')
    expect(usdRate.classes()).toEqual(
      expect.arrayContaining(['exchange-rate-usd', 'font-weight-bold', 'text-green-darken-3'])
    )

    const eurRate = wrapper.get('[data-testid="exchange-rate-eur"]')
    expect(eurRate.text()).toBe('EUR 101,9876')
    expect(eurRate.classes()).toEqual(
      expect.arrayContaining(['exchange-rate-eur', 'font-weight-bold', 'text-purple-darken-2'])
    )

    expect(wrapper.get('[data-testid="exchange-rate-tjs"]').text()).toBe(
      `TJS (за ${unitFormatter.format(10)}) 84,8238`
    )
  })

  it('renders route content inside the responsive page shell', () => {
    const wrapper = mountApp()

    expect(wrapper.get('main').classes()).toContain('app-main')
    expect(wrapper.get('.app-page-shell').exists()).toBe(true)
  })

  it('shows rates when API returns date-only values for today', async () => {
    vi.useFakeTimers()
    const today = new Date(2024, 5, 24, 12, 0, 0)
    vi.setSystemTime(today)

    const ruDate = new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    }).format(today)
    const unitFormatter = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 })
    statusStore.exchangeRates = [
      { alphabeticCode: 'USD', rate: 92.1234, date: '2024-06-24' },
      { alphabeticCode: 'EUR', rate: 101.9876, date: '2024-06-24' },
      { alphabeticCode: 'UZS', rate: 65.4321, units: 10000, date: '2024-06-24' },
      { alphabeticCode: 'TJS', rate: 84.8238, units: 10, date: '2024-06-24' }
    ]
    statusStore.eurUzs = {
      baseAlphabeticCode: 'EUR',
      quoteAlphabeticCode: 'UZS',
      rate: 20000.1234,
      date: '2024-06-24'
    }

    const wrapper = mountApp()
    await wrapper.vm.$nextTick()

    const line = getRateLineText(wrapper)
    expect(line).toBe(
      `${ruDate} USD 92,1234 EUR 101,9876 UZS (за ${unitFormatter.format(10000)}) 65,4321 TJS (за ${unitFormatter.format(10)}) 84,8238`
    )
  })

  it('shows a compact unavailable marker with an explanatory tooltip for stale rates', async () => {
    const today = new Date()
    const ruDate = new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    }).format(today)
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000).toISOString()
    statusStore.exchangeRates = [{ alphabeticCode: 'USD', rate: 95.5, date: yesterday }]

    const wrapper = mountApp()
    await wrapper.vm.$nextTick()

    const line = getRateLineText(wrapper)
    expect(line).toBe(`${ruDate} USD — EUR — UZS — TJS —`)

    for (const code of ['usd', 'eur', 'uzs', 'tjs']) {
      expect(wrapper.get(`[data-testid="exchange-rate-${code}"]`).attributes('title')).toBe(
        'не удалось получить курс'
      )
    }
  })

  it('keeps one line by default and toggles wrapped rate lines only when they overflow', async () => {
    const wrapper = mountApp()
    const viewport = wrapper.get('.exchange-rates-viewport')
    const content = wrapper.get('.exchange-rates')

    Object.defineProperty(viewport.element, 'clientWidth', {
      configurable: true,
      value: 240
    })
    Object.defineProperty(content.element, 'scrollWidth', {
      configurable: true,
      value: 600
    })
    Object.defineProperty(content.element, 'scrollHeight', {
      configurable: true,
      value: 72
    })

    resizeObserverCallback()
    await wrapper.vm.$nextTick()

    const toggle = wrapper.get('[data-testid="exchange-rates-toggle"]')
    expect(content.classes()).not.toContain('exchange-rates--expanded')
    expect(toggle.attributes('data-icon')).toBe(mdiChevronDown)
    expect(toggle.attributes('aria-expanded')).toBe('false')
    expect(wrapper.get('.v-app-bar').attributes('data-height')).toBe('64')

    await toggle.trigger('click')
    await wrapper.vm.$nextTick()

    expect(content.classes()).toContain('exchange-rates--expanded')
    expect(toggle.attributes('data-icon')).toBe(mdiChevronUp)
    expect(toggle.attributes('aria-expanded')).toBe('true')
    expect(wrapper.get('.v-app-bar').attributes('data-height')).toBe('96')

    Object.defineProperty(viewport.element, 'clientWidth', {
      configurable: true,
      value: 700
    })
    resizeObserverCallback()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="exchange-rates-toggle"]').exists()).toBe(false)
    expect(content.classes()).not.toContain('exchange-rates--expanded')
    expect(wrapper.get('.v-app-bar').attributes('data-height')).toBe('64')

    wrapper.unmount()
    expect(resizeObserverDisconnect).toHaveBeenCalledOnce()
  })
})
