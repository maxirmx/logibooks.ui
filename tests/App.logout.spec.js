// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks frontend application
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions
// are met:
// 1. Redistributions of source code must retain the above copyright
// notice, this list of conditions and the following disclaimer.
// 2. Redistributions in binary form must reproduce the above copyright
// notice, this list of conditions and the following disclaimer in the
// documentation and/or other materials provided with the distribution.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// ``AS IS'' AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED
// TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
// PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDERS OR CONTRIBUTORS
// BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
// CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
// SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
// INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
// CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE.

/* @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import App from '@/App.vue'
import { useAuthStore } from '@/stores/auth.store.js'
import { useStatusStore } from '@/stores/status.store.js'

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock Vuetify display composable
vi.mock('vuetify', () => ({
  useDisplay: () => ({
    height: { value: 600 }
  })
}))

// Mock the router with all necessary routes
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: { template: '<div>Home</div>' } },
    { path: '/login', component: { template: '<div>Login</div>' } },
    { path: '/users', component: { template: '<div>Users</div>' } },
    { path: '/registers', component: { template: '<div>Registers</div>' } },
    { path: '/user/edit/:id', component: { template: '<div>Edit User</div>' } },
    { path: '/recover', component: { template: '<div>Recover</div>' } },
    { path: '/register', component: { template: '<div>Register</div>' } }
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
      roles: ['administrator'] // Add roles to make isAdmin computed property work
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
        plugins: [router],
        stubs: {
          RouterView: true,
          'v-app': { template: '<div class="v-app"><slot /></div>' },
          'v-app-bar': { template: '<div class="v-app-bar"><slot name="prepend" /><slot /></div>' },
          'v-app-bar-nav-icon': { template: '<button class="nav-icon" />' },
          'v-app-bar-title': { template: '<div class="orange"><slot /></div>' },
          'v-spacer': { template: '<div class="spacer" />' },
          'v-navigation-drawer': { 
            template: '<div class="nav-drawer"><slot name="prepend" /><slot /><slot name="append" /></div>' 
          },
          'v-list': { template: '<ul><slot /></ul>' },
          'v-list-item': { template: '<li><slot /></li>' },
          'v-main': { template: '<main><slot /></main>' }
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
    const appBarTitle = wrapper.find('.orange')
    expect(appBarTitle.text()).toContain('Logibooks  | Doe John Smith')
  })

  it('should not show user name in app bar when logged out', async () => {
    // Logout the user
    authStore.user = null
    await wrapper.vm.$nextTick()

    const appBarTitle = wrapper.find('.orange')
    expect(appBarTitle.text()).toBe('Logibooks')
  })
})
