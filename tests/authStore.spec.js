// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { roleAdmin, roleLogist, roleSrLogist, roleWhManager } from '@/helpers/user.roles.js'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import router from '@/router'
import { createLocalStorageMock } from './helpers/test-utils.js'

// Set up sessionStorage mock at module level
let sessionStorageMock = createLocalStorageMock()
global.sessionStorage = sessionStorageMock

// IMPORTANT: Import useAuthStore AFTER setting up the sessionStorage mock
import { useAuthStore } from '@/stores/auth.store.js'
import { useStatusStore } from '@/stores/status.store.js'

vi.mock('@/helpers/fetch.wrapper.js', () => ({
  fetchWrapper: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}))

vi.mock('@/router', () => ({
  default: {
    push: vi.fn().mockResolvedValue(undefined)
  }
}))

// Mock the status store
vi.mock('@/stores/status.store.js', () => {
  const fetchStatusMock = vi.fn().mockResolvedValue({})
  return {
    useStatusStore: vi.fn(() => ({
      fetchStatus: fetchStatusMock
    }))
  }
})

// Create a mock for alert store that we can track
const mockAlertStore = {
  error: vi.fn(),
  success: vi.fn(),
  clear: vi.fn()
}

// Mock the alert store
vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: vi.fn(() => mockAlertStore)
}))

describe('auth store', () => {
  // Store original localStorage
  const originalLocalStorage = global.localStorage

  beforeEach(() => {
    // Set up localStorage mock before each test
    global.localStorage = createLocalStorageMock()
    // Recreate sessionStorage mock for each test to ensure isolation
    sessionStorageMock = createLocalStorageMock()
    global.sessionStorage = sessionStorageMock
    setActivePinia(createPinia())
    vi.clearAllMocks()
    localStorage.clear()
    sessionStorage.clear()
    // Clear alert store mocks
    mockAlertStore.error.mockClear()
    mockAlertStore.success.mockClear()
    mockAlertStore.clear.mockClear()
  })

  afterEach(() => {
    // Restore original localStorage after each test
    global.localStorage = originalLocalStorage
  })

  describe('state', () => {
    it('loads scan job monitor follow user id from localStorage', () => {
      localStorage.setItem('scanjobmonitor_follow_user_id', '17')

      const store = useAuthStore()

      expect(store.scanjobmonitor_follow_user_id).toBe(17)
    })

    it('persists and clears scan job monitor follow user id', () => {
      const store = useAuthStore()

      store.setScanjobMonitorFollowUserId(23)

      expect(store.scanjobmonitor_follow_user_id).toBe(23)
      expect(localStorage.setItem).toHaveBeenCalledWith('scanjobmonitor_follow_user_id', '23')

      store.setScanjobMonitorFollowUserId(null)

      expect(store.scanjobmonitor_follow_user_id).toBeNull()
      expect(localStorage.removeItem).toHaveBeenCalledWith('scanjobmonitor_follow_user_id')
    })

    it('correctly identifies logist users', () => {
      const store = useAuthStore()
      store.user = { id: 1, roles: [roleLogist] }
      expect(store.isSrLogist).toBe(false)
      expect(store.isLogist).toBe(true)

      store.user = { id: 2, roles: [roleAdmin] }
      expect(store.isLogist).toBe(false)

      store.user = { id: 3, roles: [roleAdmin, roleSrLogist] }
      expect(store.isLogist).toBe(false)
      expect(store.isSrLogist).toBe(true)
      expect(store.isAdmin).toBe(true)
    })

    it('treats warehouse manager as a warehouse role', () => {
      const store = useAuthStore()

      store.user = { id: 1, roles: [roleWhManager] }

      expect(store.isWhManager).toBe(true)
      expect(store.hasWhRole).toBe(true)
      expect(store.hasAnyRole).toBe(true)
    })

  })

  describe('actions', () => {
    it('check propagates errors when API call fails', async () => {
      const errorMessage = 'Authentication check failed'
      fetchWrapper.get.mockRejectedValue(new Error(errorMessage))

      const store = useAuthStore()

      await expect(store.check()).rejects.toThrow(errorMessage)
      expect(fetchWrapper.get).toHaveBeenCalledWith(expect.stringContaining('/check'))
    })

    it('register propagates errors when API call fails', async () => {
      const errorMessage = 'Failed to register user'
      fetchWrapper.post.mockRejectedValue(new Error(errorMessage))

      const store = useAuthStore()
      const testUser = { email: 'test@example.com', password: 'password' }

      await expect(store.register(testUser)).rejects.toThrow(errorMessage)
      expect(fetchWrapper.post).toHaveBeenCalledWith(expect.stringContaining('/register'), testUser)
    })

    it('recover propagates errors when API call fails', async () => {
      const errorMessage = 'Failed to recover password'
      fetchWrapper.post.mockRejectedValue(new Error(errorMessage))

      const store = useAuthStore()
      const testUser = { email: 'test@example.com' }

      await expect(store.recover(testUser)).rejects.toThrow(errorMessage)
      expect(fetchWrapper.post).toHaveBeenCalledWith(expect.stringContaining('/recover'), testUser)
    })

    it('login authenticates the user, stores in localStorage, and fetches status', async () => {
      const testUser = { id: 1, name: 'Test User', token: 'abc123' }
      fetchWrapper.post.mockResolvedValue(testUser)

      const statusStore = useStatusStore()
      const store = useAuthStore()
      await store.login('test@example.com', 'password')

      expect(fetchWrapper.post).toHaveBeenCalledWith(expect.stringContaining('/login'), {
        email: 'test@example.com',
        password: 'password'
      })
      expect(store.user).toEqual(testUser)
      expect(localStorage.setItem).toHaveBeenCalledWith('user', JSON.stringify(testUser))
      expect(statusStore.fetchStatus).toHaveBeenCalled()
    })

    it('fetches status even when login fails', async () => {
      const errorMessage = 'Invalid credentials'
      fetchWrapper.post.mockRejectedValue(new Error(errorMessage))

      const statusStore = useStatusStore()
      const store = useAuthStore()

      await expect(store.login('test@example.com', 'wrong-password')).rejects.toThrow(errorMessage)

      expect(fetchWrapper.post).toHaveBeenCalledWith(expect.stringContaining('/login'), {
        email: 'test@example.com',
        password: 'wrong-password'
      })
      expect(statusStore.fetchStatus).toHaveBeenCalled()
    })

    it('login redirects to returnUrl if set', async () => {
      const testUser = { id: 1, name: 'Test User' }
      fetchWrapper.post.mockResolvedValue(testUser)

      const store = useAuthStore()
      store.returnUrl = '/dashboard'

      await store.login('test@example.com', 'password')

      expect(router.push).toHaveBeenCalledWith('/dashboard')
      expect(store.returnUrl).toBeNull()
    })

    it('logout removes user from store, localStorage, and fetches status', () => {
      const testUser = { id: 1, name: 'Test User' }
      localStorage.setItem('user', JSON.stringify(testUser))

      const statusStore = useStatusStore()
      const store = useAuthStore()
      store.user = testUser

      store.logout()

      expect(store.user).toBeNull()
      expect(localStorage.removeItem).toHaveBeenCalledWith('user')
      expect(statusStore.fetchStatus).toHaveBeenCalled()
      expect(router.push).toHaveBeenCalledWith('/login')
    })

    it('fetches status even when re process fails', async () => {
      const errorMessage = 'Invalid token'
      fetchWrapper.put.mockRejectedValue(new Error(errorMessage))

      const statusStore = useStatusStore()
      const store = useAuthStore()
      store.re_jwt = 'invalid-token'
      store.re_tgt = 'reset'

      await expect(store.re()).rejects.toThrow(errorMessage)

      expect(fetchWrapper.put).toHaveBeenCalledWith(expect.stringContaining('/reset'), {
        jwt: 'invalid-token'
      })
      expect(store.re_jwt).toBeNull()
      expect(statusStore.fetchStatus).toHaveBeenCalled()
    })

    it('re process handles register target correctly', async () => {
      const testUser = { id: 1, name: 'Registered User', roles: ['user'] }
      fetchWrapper.put.mockResolvedValue(testUser)

      const statusStore = useStatusStore()
      const store = useAuthStore()
      store.re_jwt = 'register-jwt-token'
      store.re_tgt = 'register'

      await store.re()

      expect(fetchWrapper.put).toHaveBeenCalledWith(expect.stringContaining('/register'), {
        jwt: 'register-jwt-token'
      })
      expect(store.user).toEqual(testUser)
      expect(store.re_jwt).toBeNull()
      expect(localStorage.setItem).toHaveBeenCalledWith('user', JSON.stringify(testUser))
      expect(statusStore.fetchStatus).toHaveBeenCalled()
    })

  })

})
