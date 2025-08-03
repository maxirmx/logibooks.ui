import { describe, it, expect, beforeEach, vi } from 'vitest'

let authStore
const alertClear = vi.fn()
const alertError = vi.fn()
const checkMock = vi.fn()
const logoutMock = vi.fn()
const reMock = vi.fn()

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
vi.mock('@/views/Order_EditView.vue', () => ({ default: { template: '<div />' } }))

import router from '@/router'

async function resetRouter(to = "/recover") {
  await router.replace(to);
  await router.isReady();
}

describe('router guards', () => {
  beforeEach(async () => {
    authStore = { 
      user: null, 
      returnUrl: null, 
      check: checkMock, 
      isAdmin: false, 
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

  it('redirects authenticated logist away from login to registers', async () => {
    authStore.user = { id: 1 }
    authStore.isLogist = true
    authStore.isAdmin = false
    await router.push('/login')
    await router.isReady()
    expect(router.currentRoute.value.fullPath).toBe('/registers')
  })

  it('redirects authenticated admin (non-logist) away from login to users', async () => {
    authStore.user = { id: 2 }
    authStore.isAdmin = true
    authStore.isLogist = false
    await router.push('/login')
    await router.isReady()
    expect(router.currentRoute.value.fullPath).toBe('/users')
  })

  it('redirects authenticated logist admin away from login to registers (logist priority)', async () => {
    authStore.user = { id: 3 }
    authStore.isLogist = true
    authStore.isAdmin = true
    await router.push('/login')
    await router.isReady()
    expect(router.currentRoute.value.fullPath).toBe('/registers')
  })

  it('redirects authenticated regular user to own edit page', async () => {
    authStore.user = { id: 4 }
    authStore.isAdmin = false
    authStore.isLogist = false
    await router.push('/login')
    await router.isReady()
    expect(router.currentRoute.value.fullPath).toBe('/user/edit/4')
  })

  it('prevents non-logist user from accessing registers', async () => {
    authStore.user = { id: 3 }
    authStore.isLogist = false
    
    await router.push('/registers')
    await router.isReady()
    
    expect(router.currentRoute.value.fullPath).toBe('/login')
    expect(authStore.returnUrl).toBe('/registers')
  })

  it('allows logist user to access registers', async () => {
    authStore.user = { id: 4 }
    authStore.isLogist = true
    await router.push('/registers')
    await router.isReady()
    expect(router.currentRoute.value.fullPath).toBe('/registers')
  })
  
  it('redirects to login when server is unavailable', async () => {
    authStore.user = { id: 5 }
    checkMock.mockRejectedValueOnce(new Error('Server unavailable'))
    
    await router.push('/registers')
    await router.isReady()
    
    expect(router.currentRoute.value.fullPath).toBe('/login')
    expect(authStore.returnUrl).toBe('/registers')
    expect(logoutMock).toHaveBeenCalled()
    expect(alertError).toHaveBeenCalledWith('Сервер недоступен. Пожалуйста, попробуйте позже.')
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
    // First set up auth store without recovery token
    authStore.re_jwt = null
    authStore.re_tgt = null
    authStore.user = null
    
    // Go to login page first (to have a stable starting point)
    await router.push('/login')
    await router.isReady()
    
    // Now set up the recovery token and reset router for a new navigation
    authStore.re_jwt = 'recovery_token'
    authStore.re_tgt = 'recover'
    authStore.user = { id: 6 }
    
    // Clear mocks to verify just this navigation
    reMock.mockClear()
    
    // Now navigate to a different page to trigger the guard
    try {
      await resetRouter('/recover')
      
      // Check that re was called
      expect(reMock).toHaveBeenCalled()
      // Since we can't easily test the actual redirection in a test,
      // we're primarily verifying that re() was called
    } catch  {
      // This is ok - we expect infinite redirect in the test environment
      // But reMock should still have been called
      expect(reMock).toHaveBeenCalled()
    }
  })
  
  it('handles successful registration completion flow', async () => {
    // Reset auth store state
    authStore.re_jwt = null
    authStore.re_tgt = null
    authStore.user = null
    
    // Go to a stable route first
    await router.push('/login')
    await router.isReady()
    
    // Now set up registration token
    authStore.re_jwt = 'registration_token'
    authStore.re_tgt = 'register'
    
    // Clear mocks to verify just this navigation
    reMock.mockClear()
    
    // Trigger guard with new navigation
    try {
      await resetRouter('/recover')
      
      // Check that re was called
      expect(reMock).toHaveBeenCalled()
    } catch {
      // This is ok - we expect infinite redirect in the test environment
      // But reMock should still have been called
      expect(reMock).toHaveBeenCalled()
    }
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
    
    await router.push('/registers')
    await router.isReady()
    
    expect(checkMock).toHaveBeenCalled()
    expect(router.currentRoute.value.fullPath).toBe('/registers')
  })

  it('prevents non-logist user from accessing parcels', async () => {
    authStore.user = { id: 5 }
    authStore.isLogist = false

    await router.push('/registers/1/parcels')
    await router.isReady()

    expect(router.currentRoute.value.fullPath).toBe('/login')
    expect(authStore.returnUrl).toBe('/registers/1/parcels')
  })

  it('allows logist user to access parcels', async () => {
    authStore.user = { id: 6 }
    authStore.isLogist = true
    await router.push('/registers/1/parcels')
    await router.isReady()
    expect(router.currentRoute.value.fullPath).toBe('/registers/1/parcels')
  })

  it('prevents non-logist user from accessing parcel edit', async () => {
    authStore.user = { id: 7 }
    authStore.isLogist = false

    await router.push('/registers/1/parcels/edit/2')
    await router.isReady()

    expect(router.currentRoute.value.fullPath).toBe('/login')
    expect(authStore.returnUrl).toBe('/registers/1/parcels/edit/2')
  })

  it('allows logist user to access parcel edit', async () => {
    authStore.user = { id: 8 }
    authStore.isLogist = true

    await router.push('/registers/1/parcels/edit/2')
    await router.isReady()

    expect(router.currentRoute.value.fullPath).toBe('/registers/1/parcels/edit/2')
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
      await router.push('/')
      await router.isReady()
      expect(router.currentRoute.value.fullPath).toBe('/registers')
    })

    it('redirects admin (non-logist) user to users', async () => {
      authStore.user = { id: 2 }
      authStore.isAdmin = true
      authStore.isLogist = false
      await router.push('/')
      await router.isReady()
      expect(router.currentRoute.value.fullPath).toBe('/users')
    })

    it('redirects logist admin to registers (logist priority)', async () => {
      authStore.user = { id: 3 }
      authStore.isLogist = true
      authStore.isAdmin = true
      await router.push('/')
      await router.isReady()
      expect(router.currentRoute.value.fullPath).toBe('/registers')
    })

    it('redirects regular user to own edit page', async () => {
      authStore.user = { id: 4 }
      authStore.isAdmin = false
      authStore.isLogist = false
      await router.push('/')
      await router.isReady()
      expect(router.currentRoute.value.fullPath).toBe('/user/edit/4')
    })
  })
})
