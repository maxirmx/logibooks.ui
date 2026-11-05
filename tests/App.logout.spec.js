// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

/* @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import router from '@/router'
import { createPinia, setActivePinia } from 'pinia'
import App from '@/App.vue'
import { useAuthStore } from '@/stores/auth.store.js'
import { useRegistersStore } from '@/stores/registers.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { OP_MODE_PAPERWORK, OP_MODE_WAREHOUSE } from '@/helpers/op.mode.js'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { roleAdmin } from '@/helpers/user.roles.js'

vi.mock('@/helpers/config.js', () => ({ apiUrl: 'http://localhost/api', enableLog: false }))
vi.mock('vuetify-use-dialog', () => ({ useConfirm: () => vi.fn() }))

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(function MockResizeObserver() {
  return {
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn()
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

// Create a Vuetify instance
const vuetify = createVuetify({
  components,
  directives
})

function response(status, data) {
  return { ok: status < 400, status, text: async () => JSON.stringify(data) }
}

describe('App logout', () => {
  let authStore
  let pinia
  let wrapper
  let fetchMock
  let loadRegisterPage

  beforeEach(async () => {
    localStorage.clear()
    pinia = createPinia()
    setActivePinia(pinia)
    authStore = useAuthStore()
    authStore.user = {
      id: 1,
      firstName: 'John',
      lastName: 'Doe',
      patronymic: 'Smith',
      email: 'john@example.com',
      token: 'token',
      roles: [roleAdmin]
    }
    localStorage.setItem('user', JSON.stringify(authStore.user))
    loadRegisterPage = vi.fn().mockResolvedValue(response(200, { items: [] }))
    fetchMock = vi.fn(async (url, options) => {
      if (url.includes('/registers?')) return loadRegisterPage()
      if (url.endsWith('/auth/check')) {
        return options.headers.Authorization ? response(204) : response(401, {})
      }
      if (url.endsWith('/registers/ops')) {
        return response(200, { customsProcedures: [], transportationTypes: [], incoterms: [{ value: 2 }] })
      }
      if (url.endsWith('/status')) return response(200, {})
      return response(200, [])
    })
    vi.stubGlobal('fetch', fetchMock)
    await router.replace('/registers')
  })

  function mountApp() {
    wrapper = mount(App, {
      global: {
        plugins: [pinia, router, vuetify],
        stubs: {
          CustomsProcessingRegistersTable: true,
          WarehouseRegistersTable: true,
          ParcelStatusBulkChangeDialog: true,
          ResponsiveFilterBar: true,
          'v-app': { template: '<div class="v-app"><slot /></div>' },
          'v-app-bar': { template: '<div class="v-app-bar"><slot name="prepend" /><slot /></div>' },
          'v-app-bar-nav-icon': { template: '<button class="nav-icon" />' },
          'v-app-bar-title': { template: '<div class="primary-heading"><slot /></div>' },
          'v-spacer': { template: '<div class="spacer" />' },
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

  afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    localStorage.clear()
    sessionStorage.clear()
  })

  async function clickLogout() {
    await wrapper.findAll('a.link').find(link => link.text() === 'Выход').trigger('click')
    await flushPromises()
  }

  const alertSelector = '[data-testid="page-alert-region"] [role="alert"]'

  it.each([OP_MODE_PAPERWORK, OP_MODE_WAREHOUSE])(
    'shows one sign-in message when a %s register request rejects after logout',
    async mode => {
      let finishRequest
      loadRegisterPage.mockReturnValueOnce(new Promise(resolve => { finishRequest = resolve }))
      await router.replace({ path: '/registers', query: { mode } })
      const getAll = vi.spyOn(useRegistersStore(), 'getAll')
      const publish = vi.spyOn(useAlertStore(), 'error')
      const diagnostic = vi.spyOn(console, 'error').mockImplementation(() => {})
      mountApp()
      await flushPromises()
      expect(loadRegisterPage).toHaveBeenCalledTimes(1)

      await clickLogout()
      await vi.waitFor(() => expect(wrapper.find('#login_email').exists()).toBe(true))
      expect(router.currentRoute.value.path).toBe('/login')
      expect(authStore.user).toBeNull()
      expect(localStorage.getItem('user')).toBeNull()

      finishRequest(response(401, { msg: 'Необходимо войти в систему' }))
      await expect(getAll.mock.results[0].value).rejects.toMatchObject({ status: 401 })
      await flushPromises()
      expect(wrapper.findAll(alertSelector)).toHaveLength(1)
      expect(wrapper.get(alertSelector).text()).toContain('Необходимо войти в систему')
      expect(publish).toHaveBeenCalledExactlyOnceWith('Необходимо войти в систему')
      expect(diagnostic).not.toHaveBeenCalled()
    }
  )

  it('shows register load failures on the current page and reloads on the next page change', async () => {
    const error = new TypeError('private diagnostic')
    const diagnostic = vi.spyOn(console, 'error').mockImplementation(() => {})
    loadRegisterPage.mockRejectedValueOnce(error)
    mountApp()
    await flushPromises()

    expect(wrapper.get(alertSelector).text()).toContain('Не удалось выполнить запрос к серверу')
    expect(wrapper.text()).not.toContain(error.message)
    expect(diagnostic).toHaveBeenCalledExactlyOnceWith('[register list load]', expect.objectContaining({ cause: error }))
    expect(router.currentRoute.value.path).toBe('/registers')

    authStore.registers_page = 2
    await flushPromises()
    expect(loadRegisterPage).toHaveBeenCalledTimes(2)
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/registers?page=2&'), expect.anything())
  })

  it('reports an unexpected late register failure without replacing the login alert', async () => {
    let rejectRequest
    loadRegisterPage.mockReturnValueOnce(new Promise((_, reject) => { rejectRequest = reject }))
    const diagnostic = vi.spyOn(console, 'error').mockImplementation(() => {})
    mountApp()
    await flushPromises()
    expect(loadRegisterPage).toHaveBeenCalledTimes(1)

    await clickLogout()
    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/login'))
    const error = new TypeError('private diagnostic')
    rejectRequest(error)
    await flushPromises()

    expect(diagnostic).toHaveBeenCalledExactlyOnceWith('[register list load]', expect.objectContaining({ cause: error }))
    expect(wrapper.get(alertSelector).text()).toContain('Необходимо войти в систему')
  })

  it('shows a localized error if navigation during logout rejects', async () => {
    const error = new Error('private navigation failure')
    const diagnostic = vi.spyOn(console, 'error').mockImplementation(() => {})
    mountApp()
    await flushPromises()
    const push = vi.spyOn(router, 'push').mockRejectedValueOnce(error)

    await clickLogout()

    expect(push).toHaveBeenCalledExactlyOnceWith('/login')
    expect(router.currentRoute.value.path).toBe('/registers')
    expect(wrapper.get(alertSelector).text()).toContain('Не удалось завершить выход из системы')
    expect(wrapper.text()).not.toContain(error.message)
    expect(diagnostic).toHaveBeenCalledExactlyOnceWith('[auth.logout navigation]', error)
  })

  it('leaves the sign-in alert unpublished if login navigation is cancelled', async () => {
    mountApp()
    await flushPromises()
    const removeGuard = router.beforeEach(to => to.path !== '/login')
    try {
      await clickLogout()
      expect(router.currentRoute.value.path).toBe('/registers')
      expect(wrapper.find(alertSelector).exists()).toBe(false)
    } finally {
      removeGuard()
    }
  })
})
