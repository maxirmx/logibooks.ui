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
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { roleAdmin, roleLogist } from '@/helpers/user.roles.js'
import { OP_MODE_WAREHOUSE, getRegisterNouns } from '@/helpers/op.mode.js'

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
    { path: '/registers', component: { template: '<div>Registers</div>' } },
    { path: '/parcels/by-number', component: { template: '<div>Parcels</div>' } },
    { path: '/user/edit/:id', component: { template: '<div>User Edit</div>' } },
    { path: '/users', component: { template: '<div>Users</div>' } },
    { path: '/customs-reports', component: { template: '<div>Customs Reports</div>' } },
    { path: '/countries', component: { template: '<div>Countries</div>' } },
    { path: '/feacn/codes', component: { template: '<div>FEACN Codes</div>' } },
    { path: '/feacn/orders', component: { template: '<div>FEACN Orders</div>' } },
    { path: '/feacn/prefixes', component: { template: '<div>FEACN Prefixes</div>' } },
    { path: '/keywords', component: { template: '<div>Keywords</div>' } },
    { path: '/feacn/insertitems', component: { template: '<div>FEACN Insert Items</div>' } },
    { path: '/companies', component: { template: '<div>Companies</div>' } },
    { path: '/airports', component: { template: '<div>Airports</div>' } },
    { path: '/notifications', component: { template: '<div>Notifications</div>' } },
    { path: '/parcelstatuses', component: { template: '<div>Parcel Statuses</div>' } },
    { path: '/stopwords', component: { template: '<div>Stop Words</div>' } },
    { path: '/events', component: { template: '<div>Events</div>' } },
    { path: '/scanjobs', component: { template: '<div>Scanjobs</div>' } },
    { path: '/warehouses', component: { template: '<div>Warehouses</div>' } },
    { path: '/registerstatuses', component: { template: '<div>Register Statuses</div>' } },
  ]
})

describe('App navigation for registers', () => {
  let authStore
  let statusStore
  const warehouseRegisterNouns = getRegisterNouns(OP_MODE_WAREHOUSE)

  beforeEach(async () => {
    setActivePinia(createPinia())
    authStore = useAuthStore()
    statusStore = useStatusStore()

    statusStore.fetchStatus = vi.fn().mockResolvedValue({})
    authStore.user = {
      id: 1,
      firstName: 'John',
      lastName: 'Doe',
      patronymic: 'Smith',
      email: 'john@example.com',
      roles: [roleAdmin, roleLogist]
    }

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

  it('renders a warehouse registers link', async () => {
    const wrapper = mountApp()
    await wrapper.vm.$nextTick()

    const link = wrapper.findAll('a').find((item) =>
      item.text().includes(warehouseRegisterNouns.plural)
    )

    expect(link).toBeTruthy()
    expect(link?.attributes('href')).toContain(
      `/registers?mode=${encodeURIComponent(OP_MODE_WAREHOUSE)}`
    )
  })
})
