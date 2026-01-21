// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

/* @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import App from '@/App.vue'
import { useAuthStore } from '@/stores/auth.store.js'
import { useStatusStore } from '@/stores/status.store.js'
import { useOpModeStore, OP_MODE_PAPERWORK, OP_MODE_WAREHOUSE } from '@/stores/op.mode.store.js'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { roleAdmin } from '@/helpers/user.roles.js'

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

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
  directives,
})

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: { template: '<div>Home</div>' } },
    { path: '/login', component: { template: '<div>Login</div>' } },
  ]
})

describe('App operation mode switch', () => {
  let authStore
  let statusStore
  let opModeStore

  beforeEach(async () => {
    setActivePinia(createPinia())
    authStore = useAuthStore()
    statusStore = useStatusStore()
    opModeStore = useOpModeStore()

    statusStore.fetchStatus = vi.fn().mockResolvedValue({})
    authStore.user = {
      id: 1,
      firstName: 'John',
      lastName: 'Doe',
      patronymic: 'Smith',
      email: 'john@example.com',
      roles: [roleAdmin]
    }

    opModeStore.setMode(OP_MODE_PAPERWORK)

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
            template: '<div class="nav-drawer"><slot name="prepend" /><slot /><slot name="append" /></div>'
          },
          'v-list': { template: '<ul><slot /></ul>' },
          'v-list-item': { template: '<li><slot /></li>' },
          'v-list-group': { template: '<div class="list-group"><slot name="activator" :props="{}" /><slot /></div>' },
          'v-main': { template: '<main><slot /></main>' },
          'v-tooltip': {
            template: '<div class="v-tooltip-stub"><slot name="activator" :props="{}" /><slot /></div>'
          },
          'font-awesome-icon': { template: '<span class="fa-icon-stub"></span>' },
          ActionDialog: {
            props: ['actionDialog'],
            template: '<div class="action-dialog-stub" :data-show="actionDialog?.show"></div>'
          }
        }
      }
    })
  }

  it('shows the default operation mode label', async () => {
    const wrapper = mountApp()
    await wrapper.vm.$nextTick()

    const label = wrapper.find('[data-testid="global-op-mode-label"]')
    expect(label.text()).toBe('Режим "Оформление"')
  })

  it('toggles the operation mode when switch is clicked', async () => {
    const wrapper = mountApp()

    const button = wrapper.find('[data-testid="global-op-mode-toggle"]')
    expect(button.exists()).toBe(true)

    await button.trigger('click')

    const label = wrapper.find('[data-testid="global-op-mode-label"]')
    expect(label.text()).toBe('Режим "Склад"')
    expect(opModeStore.globalOpMode).toBe(OP_MODE_WAREHOUSE)
  })
})
