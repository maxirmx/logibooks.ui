// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

/* @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

import App from '@/App.vue'
import { useAuthStore } from '@/stores/auth.store.js'
import { useDecStore } from '@/stores/dec.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { useStatusStore } from '@/stores/status.store.js'
import { DEC_REPORT_UPLOADED_EVENT } from '@/helpers/dec.report.events.js'

// Ensure ResizeObserver is defined for Vuetify components
if (!global.ResizeObserver) {
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn()
  }))
}

// Stub Vuetify's useDisplay composable
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
    { path: '/registers', component: { template: '<div>Registers</div>' } }
  ]
})

describe('App reports upload menu', () => {
  let authStore
  let decStore
  let alertStore
  let statusStore

  function mountApp() {
    return mount(App, {
      global: {
        plugins: [router, vuetify],
        stubs: {
          RouterView: true,
          RouterLink: { template: '<a><slot /></a>' },
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
            template: '<div class="action-dialog-stub" :data-show="actionDialog?.show" :data-title="actionDialog?.title"></div>'
          }
        }
      }
    })
  }

  beforeEach(async () => {
    vi.restoreAllMocks()
    setActivePinia(createPinia())

    authStore = useAuthStore()
    decStore = useDecStore()
    alertStore = useAlertStore()
    statusStore = useStatusStore()

    statusStore.fetchStatus = vi.fn().mockResolvedValue({})

    authStore.user = {
      id: 1,
      firstName: 'John',
      lastName: 'Doe',
      patronymic: 'Smith',
      roles: ['logist']
    }

    decStore.upload = vi.fn().mockResolvedValue({ success: true })

    await router.push('/')
    await router.isReady()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the upload menu item for authorised users', async () => {
    const wrapper = mountApp()
    await flushPromises()

    const trigger = wrapper.find('[data-testid="reports-upload-trigger"]')
    expect(trigger.exists()).toBe(true)
    expect(trigger.text()).toBe('Загрузить')
  })

  it('opens the hidden file input when the menu item is clicked', async () => {
    const wrapper = mountApp()
    await flushPromises()

    const input = wrapper.find('[data-testid="reports-upload-input"]')
    const trigger = wrapper.find('[data-testid="reports-upload-trigger"]')

    const clickSpy = vi.fn()
    Object.defineProperty(input.element, 'click', {
      value: clickSpy,
      writable: true
    })

    await trigger.trigger('click')
    expect(clickSpy).toHaveBeenCalled()
  })

  it('uploads a report and dispatches a refresh event', async () => {
    const wrapper = mountApp()
    await flushPromises()

    const input = wrapper.find('[data-testid="reports-upload-input"]')
    const uploadSpy = decStore.upload
    const alertSpy = vi.spyOn(alertStore, 'error')

    let resolveUpload
    const uploadPromise = new Promise((resolve) => {
      resolveUpload = resolve
    })
    uploadSpy.mockReturnValue(uploadPromise)

    const dispatchSpy = vi.spyOn(window, 'dispatchEvent')

    const file = new File(['dummy'], 'report.csv', { type: 'text/csv' })
    Object.defineProperty(input.element, 'files', {
      value: [file],
      configurable: true
    })
    let assignedInputValue = null
    Object.defineProperty(input.element, 'value', {
      configurable: true,
      get() {
        return assignedInputValue ?? ''
      },
      set(v) {
        assignedInputValue = v
      }
    })

    await input.trigger('change')
    await wrapper.vm.$nextTick()

    expect(uploadSpy).toHaveBeenCalledTimes(1)
    expect(uploadSpy).toHaveBeenCalledWith(file)

    const dialog = wrapper.find('.action-dialog-stub')
    expect(dialog.attributes('data-show')).toBe('true')

    resolveUpload()
    await flushPromises()

    const dispatchedEvent = dispatchSpy.mock.calls.find((call) => call[0] instanceof globalThis.CustomEvent)
    expect(dispatchedEvent?.[0].type).toBe(DEC_REPORT_UPLOADED_EVENT)
    expect(dispatchedEvent?.[0].detail).toEqual({ fileName: 'report.csv' })

    expect(dialog.attributes('data-show')).toBe('false')
    expect(assignedInputValue).toBe('')
    expect(alertSpy).not.toHaveBeenCalled()
  })

  it('reports an error through the alert store when upload fails', async () => {
    const wrapper = mountApp()
    await flushPromises()

    const input = wrapper.find('[data-testid="reports-upload-input"]')
    const uploadSpy = decStore.upload
    const alertSpy = vi.spyOn(alertStore, 'error')

    uploadSpy.mockRejectedValue(new Error('upload failed'))

    const file = new File(['dummy'], 'broken.csv', { type: 'text/csv' })
    Object.defineProperty(input.element, 'files', {
      value: [file],
      configurable: true
    })
    let assignedInputValue = null
    Object.defineProperty(input.element, 'value', {
      configurable: true,
      get() {
        return assignedInputValue ?? ''
      },
      set(v) {
        assignedInputValue = v
      }
    })

    await input.trigger('change')
    await flushPromises()

    expect(uploadSpy).toHaveBeenCalledWith(file)
    expect(alertSpy).toHaveBeenCalledWith('upload failed')

    const dialog = wrapper.find('.action-dialog-stub')
    expect(dialog.attributes('data-show')).toBe('false')
    expect(assignedInputValue).toBe('')
  })
})
