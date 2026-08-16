// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { scanjobMonitorArea } from '@/helpers/scanjob.monitor.helpers.js'
import { OP_MODE_PAPERWORK, OP_MODE_WAREHOUSE } from '@/helpers/op.mode.js'

let authStore
const alertClear = vi.fn()
const alertError = vi.fn()
const activeAlert = vi.hoisted(() => ({ value: null }))
const checkMock = vi.fn()
const logoutMock = vi.fn()
const reMock = vi.fn()

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => ({
    get alert() {
      return activeAlert.value
    },
    clear: alertClear,
    error: alertError
  })
}))

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => authStore
}))

vi.mock('@/views/User_LoginView.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/views/User_RecoverView.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/views/User_RegisterView.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/views/Users_View.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/views/User_EditView.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/views/AutomatedSystem_SettingsView.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/views/Registers_View.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/views/Parcels_View.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/views/ExportFees_View.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/views/Wd4Scanner_View.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/views/Order_EditView.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/views/Parcel_EditView.vue', () => ({ default: { template: '<div />' } }))

import router from '@/router'

async function resetRouter(to = '/recover') {
  await router.replace(to)
  await router.isReady()
}

describe('router guards', () => {
  let originalConsoleError

  beforeEach(async () => {
    // Set up Pinia for store access
    setActivePinia(createPinia())

    // Mock console.error to suppress router guard error messages in tests
    originalConsoleError = console.error
    console.error = vi.fn()

    authStore = {
      user: null,
      returnUrl: null,
      check: checkMock,
      isAdmin: false,
      isShiftLead: false,
      isShiftLeadPlus: false,
      isLogist: false,
      permissionRedirect: false,
      logout: logoutMock,
      re: reMock,
      re_jwt: null,
      re_tgt: null
    }
    checkMock.mockResolvedValue()
    logoutMock.mockImplementation(() => {
      authStore.user = null
    })
    reMock.mockResolvedValue()
    activeAlert.value = null
    await resetRouter('/recover')
    alertClear.mockClear()
    alertError.mockReset()
  })

  afterEach(() => {
    // Restore console.error
    console.error = originalConsoleError
  })

  it('redirects unauthenticated users to login', async () => {
    await router.push('/users')
    await router.isReady()
    expect(router.currentRoute.value.fullPath).toBe('/login')
    expect(authStore.returnUrl).toBe('/users')
  })

  it('defines dedicated admin-only automated-system routes', () => {
    const createRoute = router.getRoutes().find((route) => route.path === '/automated-system/register')
    const editRoute = router.getRoutes().find((route) => route.path === '/automated-system/edit/:id')

    expect(createRoute?.meta.reqAdmin).toBe(true)
    expect(editRoute?.meta.reqAdmin).toBe(true)
  })

  it('enforces reqAdmin for automated-system management', async () => {
    authStore.user = { id: 2 }
    authStore.isAdmin = false

    await router.push('/automated-system/register')
    await router.isReady()

    expect(router.currentRoute.value.fullPath).toBe('/login')
    expect(authStore.returnUrl).toBe('/automated-system/register')
  })

  it('allows administrators to open automated-system management', async () => {
    authStore.user = { id: 1 }
    authStore.isAdmin = true

    await router.push('/automated-system/edit/7')
    await router.isReady()

    expect(router.currentRoute.value.fullPath).toBe('/automated-system/edit/7')
  })

  it('clears the alert that belonged to the previous route', async () => {
    activeAlert.value = { id: 71, message: 'Старое сообщение' }

    await router.push('/register')
    await router.isReady()

    expect(router.currentRoute.value.fullPath).toBe('/register')
    expect(alertClear).toHaveBeenCalledOnce()
  })

  it('redirects authenticated logist away from login to registers', async () => {
    authStore.user = { id: 1 }
    authStore.isLogist = true
    authStore.isSrLogist = false
    authStore.isAdmin = false
    authStore.isSrLogistPlus = authStore.isAdmin || authStore.isSrLogist
    authStore.hasLogistRole = authStore.isLogist || authStore.isSrLogist
    authStore.hasAnyRole = true

    await router.push('/login')
    await router.isReady()
    expect(router.currentRoute.value.fullPath).toBe('/registers')
  })

  it('redirects authenticated admin (non-logist) away from login to users', async () => {
    authStore.user = { id: 2 }
    authStore.isAdmin = true
    authStore.isLogist = false
    authStore.isSrLogist = false
    authStore.isSrLogistPlus = authStore.isAdmin || authStore.isSrLogist
    authStore.hasLogistRole = authStore.isLogist || authStore.isSrLogist

    await router.push('/login')
    await router.isReady()
    expect(router.currentRoute.value.fullPath).toBe('/users')
  })

  it('redirects authenticated logist admin away from login to registers (logist priority)', async () => {
    authStore.user = { id: 3 }
    authStore.isLogist = true
    authStore.isSrLogist = true
    authStore.isAdmin = true
    authStore.isSrLogistPlus = authStore.isAdmin || authStore.isSrLogist
    authStore.hasLogistRole = authStore.isLogist || authStore.isSrLogist
    authStore.hasAnyRole = true

    await router.push('/login')
    await router.isReady()
    expect(router.currentRoute.value.fullPath).toBe('/registers')
  })

  it('redirects authenticated regular user to own edit page', async () => {
    authStore.user = { id: 4 }
    authStore.isAdmin = false
    authStore.isLogist = false
    authStore.isSrLogist = false
    authStore.isSrLogistPlus = authStore.isAdmin || authStore.isSrLogist
    authStore.hasLogistRole = authStore.isLogist || authStore.isSrLogist

    await router.push('/')
    await router.isReady()
    expect(router.currentRoute.value.fullPath).toBe('/user/edit/4')
  })

  it('prevents non-logist user from accessing registers', async () => {
    authStore.user = { id: 3 }
    authStore.isLogist = false
    authStore.isSrLogist = false
    authStore.isSrLogistPlus = authStore.isAdmin || authStore.isSrLogist
    authStore.hasLogistRole = authStore.isLogist || authStore.isSrLogist

    await router.push('/registers')
    await router.isReady()

    expect(router.currentRoute.value.fullPath).toBe('/login')
    expect(authStore.returnUrl).toBe('/registers')
  })

  it('allows logist user to access registers', async () => {
    authStore.user = { id: 4 }
    authStore.isLogist = true
    authStore.isSrLogist = true
    authStore.isSrLogistPlus = authStore.isAdmin || authStore.isSrLogist
    authStore.hasLogistRole = authStore.isLogist || authStore.isSrLogist
    authStore.hasAnyRole = true
    await router.push('/registers')
    await router.isReady()
    expect(router.currentRoute.value.fullPath).toBe('/registers')
  })

  it('redirects to login when server is unavailable', async () => {
    authStore.user = { id: 5 }
    authStore.hasAnyRole = false
    activeAlert.value = { id: 72, message: 'Старое сообщение' }
    alertError.mockImplementationOnce((message) => {
      activeAlert.value = { id: 73, message }
      return 73
    })
    checkMock.mockRejectedValueOnce(new Error('Server unavailable'))

    await router.push('/registers')
    await router.isReady()

    expect(router.currentRoute.value.fullPath).toBe('/login')
    expect(authStore.returnUrl).toBe('/registers')
    expect(logoutMock).toHaveBeenCalled()
    expect(alertError).toHaveBeenCalledWith('Сервер недоступен. Пожалуйста, попробуйте позже.')
    expect(activeAlert.value).toMatchObject({ id: 73 })
    expect(alertClear).not.toHaveBeenCalled()
  })

  it('allows access to login page when server is unavailable', async () => {
    authStore.user = null
    checkMock.mockRejectedValueOnce(new Error('Server unavailable'))

    await router.push('/login')
    await router.isReady()

    expect(router.currentRoute.value.fullPath).toBe('/login')
    expect(alertError).not.toHaveBeenCalled()
  })

  it('handles successful password recovery flow', async () => {
    // Set up the recovery token and user
    authStore.re_jwt = 'recovery_token'
    authStore.re_tgt = 'recover'
    authStore.user = { id: 6 }

    // Clear mocks to verify just this navigation
    reMock.mockClear()

    // Mock re() to resolve successfully and clear re_jwt as the real implementation does
    reMock.mockImplementationOnce(async () => {
      authStore.re_jwt = null // This is what the real re() method does: clears re_jwt
      return Promise.resolve()
    })

    // Navigate to trigger the guard
    await router.push('/users')
    await router.isReady()

    // Check that re was called
    expect(reMock).toHaveBeenCalled()
    // After successful recovery, user should be redirected to their edit page
    expect(router.currentRoute.value.fullPath).toBe('/user/edit/6')
  })

  it('handles successful registration completion flow', async () => {
    // Set up registration token and admin user
    authStore.re_jwt = 'registration_token'
    authStore.re_tgt = 'register'
    authStore.user = { id: 7 }
    authStore.isAdmin = true // Make sure the user has admin privileges for /users/ access
    authStore.isSrLogist = true
    authStore.isSrLogistPlus = authStore.isAdmin || authStore.isSrLogist
    authStore.hasLogistRole = authStore.isLogist || authStore.isSrLogist

    // Clear mocks to verify just this navigation
    reMock.mockClear()

    // Mock re() to resolve successfully and clear re_jwt as the real implementation does
    reMock.mockImplementationOnce(async () => {
      authStore.re_jwt = null // This is what the real re() method does in the implementation
      return Promise.resolve()
    })

    // Navigate to trigger the guard
    await router.push('/registers')
    await router.isReady()

    // Check that re was called
    expect(reMock).toHaveBeenCalled()
    // After successful registration, user should be redirected to users page
    expect(router.currentRoute.value.fullPath).toBe('/users/')
  })

  it('handles failed password recovery flow', async () => {
    // Reset auth store state
    authStore.re_jwt = null
    authStore.re_tgt = null
    authStore.user = null

    // Go to a stable route first
    await router.push('/login')
    await router.isReady()

    // Now set up failed recovery
    authStore.re_jwt = 'bad_token'
    authStore.re_tgt = 'recover'
    reMock.mockRejectedValueOnce(new Error('Invalid token'))

    // Clear mocks to verify just this navigation
    logoutMock.mockClear()
    alertError.mockClear()

    // Trigger guard with new navigation
    try {
      await resetRouter('/recover')
    } catch {
      // Expected in test environment
    }

    // Verify side effects
    expect(logoutMock).toHaveBeenCalled()
    expect(alertError).toHaveBeenCalledWith('Не удалось восстановить пароль. Error: Invalid token')
  })

  it('handles failed registration completion flow', async () => {
    // Reset auth store state
    authStore.re_jwt = null
    authStore.re_tgt = null
    authStore.user = null

    // Go to a stable route first
    await router.push('/login')
    await router.isReady()

    // Now set up failed registration
    authStore.re_jwt = 'bad_token'
    authStore.re_tgt = 'register'
    reMock.mockRejectedValueOnce(new Error('Invalid token'))

    // Clear mocks to verify just this navigation
    logoutMock.mockClear()
    alertError.mockClear()

    // Trigger guard with new navigation
    try {
      await resetRouter('/recover')
    } catch {
      // Expected in test environment
    }

    // Verify side effects
    expect(logoutMock).toHaveBeenCalled()
    expect(alertError).toHaveBeenCalledWith('Не удалось завершить регистрацию. ')
  })

  it('validates session before allowing access to protected routes', async () => {
    // Initially has user
    authStore.user = { id: 7 }
    authStore.isLogist = true
    authStore.isSrLogist = true
    authStore.isSrLogistPlus = authStore.isAdmin || authStore.isSrLogist
    authStore.hasLogistRole = authStore.isLogist || authStore.isSrLogist

    // But session check will invalidate it
    checkMock.mockImplementationOnce(() => {
      authStore.user = null
      return Promise.resolve()
    })

    await router.push('/registers')
    await router.isReady()

    expect(checkMock).toHaveBeenCalled()
    expect(router.currentRoute.value.fullPath).toBe('/login')
    expect(authStore.returnUrl).toBe('/registers')
  })

  it('allows access to protected route after checking valid session', async () => {
    authStore.user = { id: 8 }
    authStore.isLogist = true
    authStore.isSrLogist = true
    authStore.isSrLogistPlus = authStore.isAdmin || authStore.isSrLogist
    authStore.hasLogistRole = authStore.isLogist || authStore.isSrLogist
    authStore.hasAnyRole = true

    await router.push('/registers')
    await router.isReady()

    expect(checkMock).toHaveBeenCalled()
    expect(router.currentRoute.value.fullPath).toBe('/registers')
  })

  it('allows any authenticated role to access export duties', async () => {
    authStore.user = { id: 9 }
    authStore.hasAnyRole = true

    await router.push('/export-fees')
    await router.isReady()

    expect(router.currentRoute.value.fullPath).toBe('/export-fees')
  })

  it('allows any authenticated role to access the WD4 scanner guide', async () => {
    authStore.user = { id: 10 }
    authStore.hasAnyRole = true

    await router.push('/scanner/wd4')
    await router.isReady()

    expect(router.currentRoute.value.fullPath).toBe('/scanner/wd4')
  })

  it('prevents non-logist user from accessing parcels', async () => {
    authStore.user = { id: 5 }
    authStore.isLogist = false
    authStore.isSrLogist = false // Changed from true to false to make user truly non-logist
    authStore.isSrLogistPlus = authStore.isAdmin || authStore.isSrLogist
    authStore.hasLogistRole = authStore.isLogist || authStore.isSrLogist

    await router.push('/registers/1/parcels')
    await router.isReady()

    expect(router.currentRoute.value.fullPath).toBe('/login')
    expect(authStore.returnUrl).toBe('/registers/1/parcels')
  })

  it('allows logist user to access parcels', async () => {
    authStore.user = { id: 6 }
    authStore.isLogist = true
    authStore.isSrLogist = true
    authStore.isSrLogistPlus = authStore.isAdmin || authStore.isSrLogist
    authStore.hasLogistRole = authStore.isLogist || authStore.isSrLogist
    authStore.hasAnyRole = true

    await router.push('/registers/1/parcels')
    await router.isReady()
    expect(router.currentRoute.value.fullPath).toBe('/registers/1/parcels')
  }, 10000)

  it('prevents non-logist user from accessing parcel edit', async () => {
    authStore.user = { id: 7 }
    authStore.isLogist = false
    authStore.isSrLogist = false
    authStore.isAdmin = true
    authStore.hasAnyRole = true

    authStore.isSrLogistPlus = authStore.isAdmin || authStore.isSrLogist
    authStore.hasLogistRole = authStore.isLogist || authStore.isSrLogist

    await router.push('/registers/1/parcels/edit/2')
    await router.isReady()

    expect(router.currentRoute.value.fullPath).toBe('/login')
    expect(authStore.returnUrl).toBe('/registers/1/parcels/edit/2')
  })

  it('allows logist user to access parcel edit', async () => {
    authStore.user = { id: 8 }
    authStore.isLogist = true
    authStore.isSrLogist = false
    authStore.isSrLogistPlus = authStore.isAdmin || authStore.isSrLogist
    authStore.hasLogistRole = authStore.isLogist || authStore.isSrLogist

    await router.push('/registers/1/parcels/edit/2')
    await router.isReady()

    expect(router.currentRoute.value.fullPath).toBe('/registers/1/parcels/edit/2')
  })

  it('normalizes parcel edit navigation context into route props', () => {
    const routeRecord = router
      .getRoutes()
      .find((route) => route.name === 'Редактирование посылки')

    expect(
      routeRecord.props.default({
        params: { registerId: '12', id: '4' },
        query: {
          mode: OP_MODE_WAREHOUSE,
          returnUrl: '/scanjobs/42/monitor/boxes/7'
        }
      })
    ).toEqual({
      registerId: 12,
      id: 4,
      mode: OP_MODE_WAREHOUSE,
      returnUrl: '/scanjobs/42/monitor/boxes/7'
    })

    expect(
      routeRecord.props.default({
        params: { registerId: '12', id: '4' },
        query: { mode: 'warehouse', returnUrl: '//example.com/phishing' }
      })
    ).toEqual({
      registerId: 12,
      id: 4,
      mode: OP_MODE_PAPERWORK,
      returnUrl: null
    })
  })

  describe('scanjob monitor route props', () => {
    it('maps register monitor route params to props', () => {
      const routeRecord = router
        .getRoutes()
        .find((route) => route.name === 'scanjob-monitor-register')
      const props = routeRecord.props.default({ params: { id: '42' } })

      expect(props).toEqual({
        id: 42,
        monitorScope: {
          area: scanjobMonitorArea.Boxes,
          boxId: null,
          bucketIndex: null
        }
      })
    })

    it('maps box monitor route params to props', () => {
      const routeRecord = router.getRoutes().find((route) => route.name === 'scanjob-monitor-box')
      const props = routeRecord.props.default({ params: { id: '42', boxId: '7' } })

      expect(props).toEqual({
        id: 42,
        monitorScope: {
          area: scanjobMonitorArea.Box,
          boxId: 7,
          bucketIndex: null
        }
      })
    })

    it('maps unassigned monitor route params to props', () => {
      const routeRecord = router
        .getRoutes()
        .find((route) => route.name === 'scanjob-monitor-unassigned')
      const props = routeRecord.props.default({ params: { id: '42', bucketIndex: '1' } })

      expect(props).toEqual({
        id: 42,
        monitorScope: {
          area: scanjobMonitorArea.Unassigned,
          boxId: null,
          bucketIndex: 1
        }
      })
    })
  })

  describe('register box routes', () => {
    it('maps numeric props and requires warehouse access', () => {
      const routes = router.getRoutes()
      const list = routes.find((route) => route.path === '/registers/:registerId/boxes')
      const create = routes.find(
        (route) => route.path === '/registers/:registerId/boxes/create'
      )
      const edit = routes.find(
        (route) => route.path === '/registers/:registerId/boxes/edit/:id'
      )

      expect(list?.props.default({ params: { registerId: '42' } })).toEqual({ registerId: 42 })
      expect(create?.props.default({ params: { registerId: '42' } })).toEqual({ registerId: 42 })
      expect(edit?.props.default({ params: { registerId: '42', id: '7' } })).toEqual({
        registerId: 42,
        id: 7
      })

      for (const route of [list, create, edit]) {
        expect(route?.meta.reqWhRole).toBe(true)
        expect(route?.meta.hideSidebar).toBe(true)
      }
    })
  })

  describe('customs station routes', () => {
    it('exposes the role-protected list and mutation routes', () => {
      const routes = router.getRoutes()
      const list = routes.find((route) => route.path === '/customsstations')
      const create = routes.find((route) => route.path === '/customsstation/create')
      const edit = routes.find((route) => route.path === '/customsstation/edit/:id')

      expect(list?.name).toBe('Таможенные посты')
      expect(list?.meta.reqAnyRole).toBe(true)
      expect(create?.meta.reqAdminOrSrLogist).toBe(true)
      expect(edit?.meta.reqAdminOrSrLogist).toBe(true)
      expect(edit?.props.default({ params: { id: '42' } })).toEqual({ id: 42 })
    })
  })

  describe('register status mutation routes', () => {
    it('requires administrator or shift-lead access', () => {
      const routes = router.getRoutes()
      const create = routes.find((route) => route.path === '/registerstatus/create')
      const edit = routes.find((route) => route.path === '/registerstatus/edit/:id')

      expect(create?.meta.reqShiftLeadPlus).toBe(true)
      expect(create?.meta.reqAdminOrSrLogist).toBeUndefined()
      expect(edit?.meta.reqShiftLeadPlus).toBe(true)
      expect(edit?.meta.reqAdminOrSrLogist).toBeUndefined()
    })

    it('allows a shift lead to open register status mutation routes', async () => {
      authStore.user = { id: 9 }
      authStore.isShiftLead = true
      authStore.isShiftLeadPlus = true
      authStore.isSrLogist = false
      authStore.isSrLogistPlus = true
      authStore.hasAnyRole = true

      await router.push('/registerstatus/create')
      await router.isReady()

      expect(router.currentRoute.value.fullPath).toBe('/registerstatus/create')
    })

    it('redirects a senior logist away from register status mutation routes', async () => {
      authStore.user = { id: 10 }
      authStore.isShiftLead = false
      authStore.isShiftLeadPlus = false
      authStore.isSrLogist = true
      authStore.isSrLogistPlus = true
      authStore.hasAnyRole = true

      await router.push('/registerstatus/create')
      await router.isReady()

      expect(router.currentRoute.value.fullPath).toBe('/login')
      expect(authStore.returnUrl).toBe('/registerstatus/create')
    })
  })

  describe('register history route', () => {
    it('is a separate administrator/shift-lead route with normalized props', () => {
      const route = router
        .getRoutes()
        .find((item) => item.path === '/registers/:registerId/history')

      expect(route?.name).toBe('История изменений реестра')
      expect(route?.meta.reqShiftLeadPlus).toBe(true)
      expect(route?.meta.hideSidebar).toBe(true)
      expect(
        route?.props.default({
          params: { registerId: '42' },
          query: { mode: OP_MODE_WAREHOUSE }
        })
      ).toEqual({
        registerId: 42,
        mode: OP_MODE_WAREHOUSE
      })
    })
  })

  describe('CMR settings route', () => {
    it('uses invoice-equivalent protection and numeric id props', () => {
      const route = router.getRoutes().find((value) => value.name === 'Настройки CMR')

      expect(route?.path).toBe('/register/:id/cmr-settings')
      expect(route?.meta).toMatchObject({
        reqLogistOrSrLogist: true,
        hideSidebar: true
      })
      expect(route?.props.default({ params: { id: '42' } })).toEqual({ id: 42 })
    })
  })

  describe('root path redirects', () => {
    it('redirects unauthenticated user to login', async () => {
      authStore.user = null
      await router.push('/')
      await router.isReady()
      expect(router.currentRoute.value.fullPath).toBe('/login')
    })

    it('redirects logist user to registers', async () => {
      authStore.user = { id: 1 }
      authStore.isLogist = true
      authStore.isAdmin = false
      authStore.isSrLogist = false
      authStore.isSrLogistPlus = authStore.isAdmin || authStore.isSrLogist
      authStore.hasLogistRole = authStore.isLogist || authStore.isSrLogist
      authStore.hasAnyRole = true
      await router.push('/')
      await router.isReady()
      expect(router.currentRoute.value.fullPath).toBe('/registers')
    })

    it('redirects admin (non-logist) user to users', async () => {
      authStore.user = { id: 2 }
      authStore.isAdmin = true
      authStore.isLogist = false
      authStore.isSrLogist = false
      authStore.isSrLogistPlus = authStore.isAdmin || authStore.isSrLogist
      authStore.hasLogistRole = authStore.isLogist || authStore.isSrLogist
      authStore.hasAnyRole = true
      await router.push('/')
      await router.isReady()
      expect(router.currentRoute.value.fullPath).toBe('/users')
    })

    it('redirects logist admin to registers (logist priority)', async () => {
      authStore.user = { id: 3 }
      authStore.isLogist = true
      authStore.isAdmin = true
      authStore.isSrLogist = false
      authStore.isSrLogistPlus = authStore.isAdmin || authStore.isSrLogist
      authStore.hasLogistRole = authStore.isLogist || authStore.isSrLogist
      authStore.hasAnyRole = true
      await router.push('/')
      await router.isReady()
      expect(router.currentRoute.value.fullPath).toBe('/registers')
    })

    it('redirects regular user to own edit page', async () => {
      authStore.user = { id: 4 }
      authStore.isAdmin = false
      authStore.isLogist = false
      authStore.isSrLogist = false
      authStore.isSrLogistPlus = authStore.isAdmin || authStore.isSrLogist
      authStore.hasLogistRole = authStore.isLogist || authStore.isSrLogist
      await router.push('/')
      await router.isReady()
      expect(router.currentRoute.value.fullPath).toBe('/user/edit/4')
    })
  })
})
