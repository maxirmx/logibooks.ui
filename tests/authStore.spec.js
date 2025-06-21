import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth.store.js'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import router from '@/router'

// Mock localStorage
const localStorageMock = (() => {
  let store = {}
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value.toString()
    }),
    removeItem: vi.fn((key) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    })
  }
})()

// Replace global localStorage with mock
global.localStorage = localStorageMock

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
    push: vi.fn()
  }
}))

describe('auth store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    localStorage.clear()
  })

  describe('state', () => {
    it('initializes with default values', () => {
      const store = useAuthStore()
      expect(store.user).toBeNull()
      // isAdmin should be falsy when there's no user
      expect(store.isAdmin).toBeFalsy()
      expect(store.users_per_page).toBe(10)
      expect(store.users_search).toBe('')
      expect(store.users_sort_by).toEqual(['id'])
      expect(store.users_page).toBe(1)
      expect(store.returnUrl).toBeNull()
      expect(store.re_jwt).toBeNull()
      expect(store.re_tgt).toBeNull()
    })

    it('loads user from localStorage if present', () => {
      const testUser = { id: 1, name: 'Test User', roles: ['administrator'] }
      localStorage.setItem('user', JSON.stringify(testUser))
      vi.spyOn(JSON, 'parse').mockImplementation(() => testUser)
      
      const store = useAuthStore()
      expect(store.user).toEqual(testUser)
      expect(store.isAdmin).toBe(true)
    })
  })

  describe('actions', () => {
    it('check calls the API to check authentication', async () => {
      fetchWrapper.get.mockResolvedValue({})
      
      const store = useAuthStore()
      await store.check()
      
      expect(fetchWrapper.get).toHaveBeenCalledWith(expect.stringContaining('/check'))
    })

    it('register calls the API with user data', async () => {
      fetchWrapper.post.mockResolvedValue({})
      
      const store = useAuthStore()
      const testUser = { email: 'test@example.com', password: 'password' }
      await store.register(testUser)
      
      expect(fetchWrapper.post).toHaveBeenCalledWith(expect.stringContaining('/register'), testUser)
    })

    it('recover calls the API with user data', async () => {
      fetchWrapper.post.mockResolvedValue({})
      
      const store = useAuthStore()
      const testUser = { email: 'test@example.com' }
      await store.recover(testUser)
      
      expect(fetchWrapper.post).toHaveBeenCalledWith(expect.stringContaining('/recover'), testUser)
    })

    it('login authenticates the user and stores in localStorage', async () => {
      const testUser = { id: 1, name: 'Test User', token: 'abc123' }
      fetchWrapper.post.mockResolvedValue(testUser)
      
      const store = useAuthStore()
      await store.login('test@example.com', 'password')
      
      expect(fetchWrapper.post).toHaveBeenCalledWith(
        expect.stringContaining('/login'),
        { email: 'test@example.com', password: 'password' }
      )
      expect(store.user).toEqual(testUser)
      expect(localStorage.setItem).toHaveBeenCalledWith('user', JSON.stringify(testUser))
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

    it('logout removes user from store and localStorage', () => {
      const testUser = { id: 1, name: 'Test User' }
      localStorage.setItem('user', JSON.stringify(testUser))
      
      const store = useAuthStore()
      store.user = testUser
      
      store.logout()
      
      expect(store.user).toBeNull()
      expect(localStorage.removeItem).toHaveBeenCalledWith('user')
      expect(router.push).toHaveBeenCalledWith('/login')
    })

    it('re process updates user with jwt token', async () => {
      const testUser = { id: 1, name: 'Updated User' }
      fetchWrapper.put.mockResolvedValue(testUser)
      
      const store = useAuthStore()
      store.re_jwt = 'jwt-token'
      store.re_tgt = 'reset'
      
      await store.re()
      
      expect(fetchWrapper.put).toHaveBeenCalledWith(
        expect.stringContaining('/reset'),
        { jwt: 'jwt-token' }
      )
      expect(store.user).toEqual(testUser)
      expect(store.re_jwt).toBeNull()
      expect(localStorage.setItem).toHaveBeenCalledWith('user', JSON.stringify(testUser))
    })
  })
})
