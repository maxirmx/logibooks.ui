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
import { roleAdmin } from '@/helpers/user.roles.js'

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

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

// Create a Vuetify instance
const vuetify = createVuetify({
  components,
  directives,
})

// Mock the router with all necessary routes
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: { template: '<div>Home</div>' } },
    { path: '/login', component: { template: '<div>Login</div>' } },
    { path: '/users', component: { template: '<div>Users</div>' } },
    { path: '/companies', component: { template: '<div>Companies</div>' } },
    { path: '/company/create', component: { template: '<div>Create Company</div>' } },
    { path: '/company/edit/:id', component: { template: '<div>Edit Company</div>' } },
    { path: '/registers', component: { template: '<div>Registers</div>' } },
    { path: '/user/edit/:id', component: { template: '<div>Edit User</div>' } },
    { path: '/recover', component: { template: '<div>Recover</div>' } },
    { path: '/register', component: { template: '<div>Register</div>' } },
    { path: '/countries', component: { template: '<div>Countries</div>' } },
    { path: '/parcelstatuses', component: { template: '<div>Parcel Statuses</div>' } },
    { path: '/stopwords', component: { template: '<div>Stop Words</div>' } },
    { path: '/stopword/create', component: { template: '<div>Create Stop Word</div>' } },
    { path: '/stopword/edit/:id', component: { template: '<div>Edit Stop Word</div>' } },
    { path: '/keywords', component: { template: '<div>Keywords</div>' } },
    { path: '/keyword/create', component: { template: '<div>Create Keyword</div>' } },
    { path: '/keyword/edit/:id', component: { template: '<div>Edit Keyword</div>' } },
    { path: '/feacn/codes', component: { template: '<div>Feacn Codes</div>' } },
    { path: '/feacn/orders', component: { template: '<div>Feacn Orders</div>' } },
    { path: '/feacn/prefixes', component: { template: '<div>Feacn Prefixes</div>' } },
    { path: '/feacn/insertitems', component: { template: '<div>Feacn Insert Items</div>' } },
    { path: '/customs-reports', component: { template: '<div>Customs Reports</div>' } },
    { path: '/airports', component: { template: '<div>Airports</div>' } },
    { path: '/notifications', component: { template: '<div>Notifications</div>' } },
    { path: '/scanjobs', component: { template: '<div>Scanjobs</div>' } },
    { path: '/warehouses', component: { template: '<div>Warehouses</div>' } },
    { path: '/registerstatuses', component: { template: '<div>Register Statuses</div>' } },
    { path: '/parceleventprocessing', component: { template: '<div>Parcel Event Processing</div>' } }
  ]
})

describe('App Logout Functionality', () => {
  let authStore
  let statusStore
  let wrapper

  beforeEach(async () => {
    setActivePinia(createPinia())
    authStore = useAuthStore()
    statusStore = useStatusStore()

    // Mock the status store fetchStatus method
    statusStore.fetchStatus = vi.fn().mockResolvedValue({})

    // Set up a logged-in user
    authStore.user = {
      id: 1,
      firstName: 'John',
      lastName: 'Doe',
      patronymic: 'Smith',
      email: 'john@example.com',
      roles: [roleAdmin] 
    }

    // Mock the logout method to properly clear user data
    authStore.logout = vi.fn(() => {
      authStore.user = null
      localStorage.removeItem('user')
    })

    await router.push('/')
    await router.isReady()

    wrapper = mount(App, {
      global: {
        plugins: [router, vuetify], // <-- add vuetify here
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
          ActionDialog: {
            props: ['actionDialog'],
            template: '<div class="action-dialog-stub" :data-show="actionDialog?.show"></div>'
          },
          'font-awesome-icon': { template: '<span class="fa-icon-stub"></span>' }
        }
      }
    })
  })

  it('should display logout link when user is logged in', () => {
    const logoutLinks = wrapper.findAll('a[class="link"]')
    const logoutLink = logoutLinks.find(link => link.text() === 'Выход')
    expect(logoutLink).toBeTruthy()
    expect(logoutLink.text()).toBe('Выход')
  })

  it('should call logout and navigate to login page when logout is clicked', async () => {
    // Find the logout link specifically
    const logoutLinks = wrapper.findAll('a[class="link"]')
    const logoutLink = logoutLinks.find(link => link.text() === 'Выход')
    expect(logoutLink).toBeTruthy()
    expect(logoutLink.text()).toBe('Выход')

    // Click the logout link
    await logoutLink.trigger('click')

    // Verify logout was called
    expect(authStore.logout).toHaveBeenCalled()
  })

  it('should clear user data after logout', async () => {
    // Verify user is initially logged in
    expect(authStore.user).toBeTruthy()
    expect(authStore.isAdmin).toBe(true)

    // Find and click logout link
    const logoutLinks = wrapper.findAll('a[class="link"]')
    const logoutLink = logoutLinks.find(link => link.text() === 'Выход')
    await logoutLink.trigger('click')

    // Verify user data is cleared
    expect(authStore.user).toBeNull()
    // Since these are computed properties based on user.roles, they become falsy when user is null
    expect(authStore.isAdmin).toBeFalsy()
    expect(authStore.isSrLogist).toBeFalsy()
    expect(authStore.isLogist).toBeFalsy()
  })

  it('should display login link when user is not logged in', async () => {
    // Logout the user
    authStore.user = null

    await wrapper.vm.$nextTick()

    // Check that login link is displayed
    const loginLink = wrapper.find('a[class="link"]')
    expect(loginLink.exists()).toBe(true)
    expect(loginLink.text()).toBe('Вход')
  })

  it('should show user name in app bar when logged in', () => {
    const appBarTitle = wrapper.find('.primary-heading')
    expect(appBarTitle.text()).toContain('Logibooks  | Doe John Smith')
  })

  it('should not show user name in app bar when logged out', async () => {
    // Logout the user
    authStore.user = null
    await wrapper.vm.$nextTick()

    const appBarTitle = wrapper.find('.primary-heading')
    expect(appBarTitle.text()).toBe('Logibooks')
  })
})
