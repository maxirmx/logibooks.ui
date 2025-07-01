import { describe, it, expect, beforeEach, vi } from 'vitest'

let authStore
const alertClear = vi.fn()
const alertError = vi.fn()
const checkMock = vi.fn()

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => ({ clear: alertClear, error: alertError })
}))

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => authStore
}))

vi.mock('@/views/User_LoginView.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/views/User_RecoverView.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/views/User_RegisterView.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/views/Users_View.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/views/User_EditView.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/views/Registers_View.vue', () => ({ default: { template: '<div />' } }))

import router from '@/router'

async function resetRouter(to = "/recover") {
  await router.replace(to);
  await router.isReady();
}

describe('router guards', () => {
  beforeEach(async () => {
    authStore = { user: null, returnUrl: null, check: checkMock, isAdmin: false, isLogist: false }
    checkMock.mockResolvedValue()
    alertClear.mockClear()
    alertError.mockClear()
    await resetRouter("/recover")
  })

  it('redirects unauthenticated users to login', async () => {
    await router.push('/users')
    await router.isReady()
    expect(router.currentRoute.value.fullPath).toBe('/login')
    expect(authStore.returnUrl).toBe('/users')
  })

  it('redirects authenticated admin away from login', async () => {
    authStore.user = { id: 1 }
    authStore.isAdmin = true
    await router.push('/login')
    await router.isReady()
    expect(router.currentRoute.value.fullPath).toBe('/users')
  })

  it('redirects authenticated user to own edit page', async () => {
    authStore.user = { id: 2 }
    authStore.isAdmin = false
    await router.push('/login')
    await router.isReady()
    expect(router.currentRoute.value.fullPath).toBe('/user/edit/2')
  })

  it('prevents non-logist user from accessing registers', async () => {
    authStore.user = { id: 3 }
    authStore.isLogist = false
    await router.push('/registers')
    await router.isReady()
    expect(router.currentRoute.value.fullPath).toBe('/login')
  })

  it('allows logist user to access registers', async () => {
    authStore.user = { id: 4 }
    authStore.isLogist = true
    await router.push('/registers')
    await router.isReady()
    expect(router.currentRoute.value.fullPath).toBe('/registers')
  })
})
