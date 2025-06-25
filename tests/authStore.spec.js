import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth.store.js'
import { useStatusStore } from '@/stores/status.store.js'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import router from '@/router'
import createLocalStorageMock from './__mocks__/localStorage.js'

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

// Mock the status store
vi.mock('@/stores/status.store.js', () => {
  const fetchStatusMock = vi.fn().mockResolvedValue({})
  return {
    useStatusStore: vi.fn(() => ({
      fetchStatus: fetchStatusMock
    }))
  }
})

describe('auth store', () => {
  // Store original localStorage
  const originalLocalStorage = global.localStorage
  
  beforeEach(() => {
    // Set up localStorage mock before each test
    global.localStorage = createLocalStorageMock()
    setActivePinia(createPinia())
    vi.clearAllMocks()
    localStorage.clear()
  })
  
  afterEach(() => {
    // Restore original localStorage after each test
    global.localStorage = originalLocalStorage
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
    
    it('check propagates errors when API call fails', async () => {
      const errorMessage = 'Authentication check failed'
      fetchWrapper.get.mockRejectedValue(new Error(errorMessage))
      
      const store = useAuthStore()
      
      await expect(store.check()).rejects.toThrow(errorMessage)
      expect(fetchWrapper.get).toHaveBeenCalledWith(expect.stringContaining('/check'))
    })

    it('register calls the API with user data', async () => {
      fetchWrapper.post.mockResolvedValue({})
      
      const store = useAuthStore()
      const testUser = { email: 'test@example.com', password: 'password' }
      await store.register(testUser)
      
      expect(fetchWrapper.post).toHaveBeenCalledWith(expect.stringContaining('/register'), testUser)
    })
    
    it('register propagates errors when API call fails', async () => {
      const errorMessage = 'Failed to register user'
      fetchWrapper.post.mockRejectedValue(new Error(errorMessage))
      
      const store = useAuthStore()
      const testUser = { email: 'test@example.com', password: 'password' }
      
      await expect(store.register(testUser)).rejects.toThrow(errorMessage)
      expect(fetchWrapper.post).toHaveBeenCalledWith(expect.stringContaining('/register'), testUser)
    })

    it('recover calls the API with user data', async () => {
      fetchWrapper.post.mockResolvedValue({})
      
      const store = useAuthStore()
      const testUser = { email: 'test@example.com' }
      await store.recover(testUser)
      
      expect(fetchWrapper.post).toHaveBeenCalledWith(expect.stringContaining('/recover'), testUser)
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
      
      expect(fetchWrapper.post).toHaveBeenCalledWith(
        expect.stringContaining('/login'),
        { email: 'test@example.com', password: 'password' }
      )
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
      
      expect(fetchWrapper.post).toHaveBeenCalledWith(
        expect.stringContaining('/login'),
        { email: 'test@example.com', password: 'wrong-password' }
      )
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

    it('re process updates user with jwt token and fetches status', async () => {
      const testUser = { id: 1, name: 'Updated User' }
      fetchWrapper.put.mockResolvedValue(testUser)
      
      const statusStore = useStatusStore()
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
      expect(statusStore.fetchStatus).toHaveBeenCalled()
    })
    
    it('fetches status even when re process fails', async () => {
      const errorMessage = 'Invalid token'
      fetchWrapper.put.mockRejectedValue(new Error(errorMessage))
      
      const statusStore = useStatusStore()
      const store = useAuthStore()
      store.re_jwt = 'invalid-token'
      store.re_tgt = 'reset'
      
      await expect(store.re()).rejects.toThrow(errorMessage)
      
      expect(fetchWrapper.put).toHaveBeenCalledWith(
        expect.stringContaining('/reset'),
        { jwt: 'invalid-token' }
      )
      expect(store.re_jwt).toBeNull()
      expect(statusStore.fetchStatus).toHaveBeenCalled()
    })
  })
})
