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
      expect(store.isLogist).toBeFalsy()
      expect(store.users_per_page).toBe(10)
      expect(store.users_search).toBe('')
      expect(store.users_sort_by).toEqual(['id'])
      expect(store.users_page).toBe(1)
      expect(store.registers_per_page).toBe(10)
      expect(store.registers_search).toBe('')
      expect(store.registers_sort_by).toEqual([{ key: 'id', order: 'asc' }])
      expect(store.registers_page).toBe(1)
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
      expect(store.isLogist).toBeFalsy()
    })

    it('correctly identifies admin users', () => {
      const store = useAuthStore()
      store.user = { id: 1, roles: ['administrator'] }
      expect(store.isAdmin).toBe(true)
      
      store.user = { id: 2, roles: ['logist'] }
      expect(store.isAdmin).toBe(false)
      
      store.user = { id: 3, roles: ['administrator', 'logist'] }
      expect(store.isAdmin).toBe(true)
    })

    it('correctly identifies logist users', () => {
      const store = useAuthStore()
      store.user = { id: 1, roles: ['logist'] }
      expect(store.isLogist).toBe(true)
      
      store.user = { id: 2, roles: ['administrator'] }
      expect(store.isLogist).toBe(false)
      
      store.user = { id: 3, roles: ['administrator', 'logist'] }
      expect(store.isLogist).toBe(true)
    })

    it('handles register view parameters correctly', () => {
      const store = useAuthStore()
      
      // Test setting re_jwt and re_tgt for registration
      store.re_jwt = 'registration-jwt-token'
      store.re_tgt = 'register'
      
      expect(store.re_jwt).toBe('registration-jwt-token')
      expect(store.re_tgt).toBe('register')
    })

    it('handles password recovery parameters correctly', () => {
      const store = useAuthStore()
      
      // Test setting re_jwt and re_tgt for password recovery
      store.re_jwt = 'recovery-jwt-token'
      store.re_tgt = 'recover'
      
      expect(store.re_jwt).toBe('recovery-jwt-token')
      expect(store.re_tgt).toBe('recover')
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

    it('re process handles register target correctly', async () => {
      const testUser = { id: 1, name: 'Registered User', roles: ['user'] }
      fetchWrapper.put.mockResolvedValue(testUser)
      
      const statusStore = useStatusStore()
      const store = useAuthStore()
      store.re_jwt = 'register-jwt-token'
      store.re_tgt = 'register'
      
      await store.re()
      
      expect(fetchWrapper.put).toHaveBeenCalledWith(
        expect.stringContaining('/register'),
        { jwt: 'register-jwt-token' }
      )
      expect(store.user).toEqual(testUser)
      expect(store.re_jwt).toBeNull()
      expect(localStorage.setItem).toHaveBeenCalledWith('user', JSON.stringify(testUser))
      expect(statusStore.fetchStatus).toHaveBeenCalled()
    })

    it('re process handles recover target correctly', async () => {
      const testUser = { id: 1, name: 'Recovered User', roles: ['user'] }
      fetchWrapper.put.mockResolvedValue(testUser)
      
      const statusStore = useStatusStore()
      const store = useAuthStore()
      store.re_jwt = 'recover-jwt-token'
      store.re_tgt = 'recover'
      
      await store.re()
      
      expect(fetchWrapper.put).toHaveBeenCalledWith(
        expect.stringContaining('/recover'),
        { jwt: 'recover-jwt-token' }
      )
      expect(store.user).toEqual(testUser)
      expect(store.re_jwt).toBeNull()
      expect(localStorage.setItem).toHaveBeenCalledWith('user', JSON.stringify(testUser))
      expect(statusStore.fetchStatus).toHaveBeenCalled()
    })
  })

  describe('registers list parameters', () => {
    it('initializes registers parameters with default values', () => {
      const store = useAuthStore()
      expect(store.registers_per_page).toBe(10)
      expect(store.registers_search).toBe('')
      expect(store.registers_sort_by).toEqual([{ key: 'id', order: 'asc' }])
      expect(store.registers_page).toBe(1)
    })

    it('allows updating registers_per_page', () => {
      const store = useAuthStore()
      store.registers_per_page = 25
      expect(store.registers_per_page).toBe(25)
      
      store.registers_per_page = 50
      expect(store.registers_per_page).toBe(50)
    })

    it('allows updating registers_search', () => {
      const store = useAuthStore()
      store.registers_search = 'test search'
      expect(store.registers_search).toBe('test search')
      
      store.registers_search = 'another search term'
      expect(store.registers_search).toBe('another search term')
      
      // Test clearing search
      store.registers_search = ''
      expect(store.registers_search).toBe('')
    })

    it('allows updating registers_sort_by', () => {
      const store = useAuthStore()
      
      // Test sorting by name ascending
      store.registers_sort_by = [{ key: 'name', order: 'asc' }]
      expect(store.registers_sort_by).toEqual([{ key: 'name', order: 'asc' }])
      
      // Test sorting by name descending
      store.registers_sort_by = [{ key: 'name', order: 'desc' }]
      expect(store.registers_sort_by).toEqual([{ key: 'name', order: 'desc' }])
      
      // Test sorting by date
      store.registers_sort_by = [{ key: 'created_at', order: 'desc' }]
      expect(store.registers_sort_by).toEqual([{ key: 'created_at', order: 'desc' }])
      
      // Test multiple sort criteria
      store.registers_sort_by = [
        { key: 'name', order: 'asc' },
        { key: 'id', order: 'desc' }
      ]
      expect(store.registers_sort_by).toEqual([
        { key: 'name', order: 'asc' },
        { key: 'id', order: 'desc' }
      ])
    })

    it('allows updating registers_page', () => {
      const store = useAuthStore()
      store.registers_page = 2
      expect(store.registers_page).toBe(2)
      
      store.registers_page = 5
      expect(store.registers_page).toBe(5)
      
      // Test resetting to first page
      store.registers_page = 1
      expect(store.registers_page).toBe(1)
    })

    it('maintains registers parameters independently from users parameters', () => {
      const store = useAuthStore()
      
      // Set different values for users and registers parameters
      store.users_per_page = 20
      store.users_search = 'user search'
      store.users_sort_by = ['name']
      store.users_page = 3
      
      store.registers_per_page = 15
      store.registers_search = 'register search'
      store.registers_sort_by = [{ key: 'date', order: 'desc' }]
      store.registers_page = 2
      
      // Verify they are independent
      expect(store.users_per_page).toBe(20)
      expect(store.users_search).toBe('user search')
      expect(store.users_sort_by).toEqual(['name'])
      expect(store.users_page).toBe(3)
      
      expect(store.registers_per_page).toBe(15)
      expect(store.registers_search).toBe('register search')
      expect(store.registers_sort_by).toEqual([{ key: 'date', order: 'desc' }])
      expect(store.registers_page).toBe(2)
    })

    it('handles edge cases for registers parameters', () => {
      const store = useAuthStore()
      
      // Test zero and negative values for per_page
      store.registers_per_page = 0
      expect(store.registers_per_page).toBe(0)
      
      store.registers_per_page = -1
      expect(store.registers_per_page).toBe(-1)
      
      // Test zero and negative values for page
      store.registers_page = 0
      expect(store.registers_page).toBe(0)
      
      store.registers_page = -1
      expect(store.registers_page).toBe(-1)
      
      // Test empty sort_by array
      store.registers_sort_by = []
      expect(store.registers_sort_by).toEqual([])
      
      // Test null values
      store.registers_search = null
      expect(store.registers_search).toBeNull()
    })
  })
})
