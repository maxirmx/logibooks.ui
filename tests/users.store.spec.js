import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUsersStore } from '@/stores/users.store.js'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { useAuthStore } from '@/stores/auth.store.js'
import createLocalStorageMock from './__mocks__/localStorage.js'

vi.mock('@/helpers/fetch.wrapper.js', () => ({
  fetchWrapper: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}))

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: vi.fn()
}))

vi.mock('@/helpers/config.js', () => ({
  apiUrl: 'http://localhost:8080/api'
}))

describe('users store', () => {
  const mockAuthStore = {
    user: { id: 1, name: 'Test Admin', roles: ['administrator'] },
    logout: vi.fn()
  }

  // Store original localStorage
  const originalLocalStorage = global.localStorage
  
  beforeEach(() => {
    // Set up localStorage mock before each test
    global.localStorage = createLocalStorageMock()
    setActivePinia(createPinia())
    vi.clearAllMocks()
    localStorage.clear()
    useAuthStore.mockReturnValue(mockAuthStore)
  })
  
  afterEach(() => {
    // Restore original localStorage after each test
    global.localStorage = originalLocalStorage
  })

  describe('state', () => {
    it('initializes with empty objects', () => {
      const store = useUsersStore()
      expect(store.users).toEqual({})
      expect(store.user).toEqual({})
    })
  })

  describe('getters', () => {
    it('getUserById returns the correct user', () => {
      const store = useUsersStore()
      store.users = [
        { id: 1, firstName: 'John', lastName: 'Doe' },
        { id: 2, firstName: 'Jane', lastName: 'Smith' }
      ]
      
      const user = store.getUserById(2)
      expect(user).toEqual({ id: 2, firstName: 'Jane', lastName: 'Smith' })
    })

    it('getUserById returns undefined for non-existent user', () => {
      const store = useUsersStore()
      store.users = [{ id: 1, name: 'Test User' }]
      
      const user = store.getUserById(999)
      expect(user).toBeUndefined()
    })
  })

  describe('actions', () => {
    it('add calls API correctly without translation', async () => {
      fetchWrapper.post.mockResolvedValue({})
      
      const store = useUsersStore()
      const newUser = { firstName: 'John', lastName: 'Doe', email: 'john@example.com' }
      
      await store.add(newUser)
      
      expect(fetchWrapper.post).toHaveBeenCalledWith(
        'http://localhost:8080/api/users',
        newUser
      )
    })

    it('add calls API with translated user when trnslt=true', async () => {
      fetchWrapper.post.mockResolvedValue({})
      
      const store = useUsersStore()
      const newUser = { firstName: 'John', lastName: 'Doe', isAdmin: 'ADMIN', isLogist: 'LOGIST' }
      
      await store.add(newUser, true)
      
      expect(fetchWrapper.post).toHaveBeenCalledWith(
        'http://localhost:8080/api/users',
        expect.objectContaining({
          firstName: 'John',
          lastName: 'Doe',
          roles: expect.arrayContaining(['logist', 'administrator'])
        })
      )
    })

    it('getAll sets loading state and populates users on success', async () => {
      const users = [{ id: 1, name: 'User 1' }, { id: 2, name: 'User 2' }]
      fetchWrapper.get.mockResolvedValue(users)
      
      const store = useUsersStore()
      await store.getAll()
      
      expect(fetchWrapper.get).toHaveBeenCalledWith('http://localhost:8080/api/users')
      expect(store.users).toEqual(users)
    })

    it('getAll handles errors correctly', async () => {
      const error = new Error('Failed to fetch users')
      fetchWrapper.get.mockRejectedValue(error)
      
      const store = useUsersStore()
      await store.getAll()
      
      expect(store.users).toEqual({ error })
    })

    it('getById sets loading state and retrieves single user', async () => {
      const testUser = { id: 5, firstName: 'Jane', lastName: 'Smith' }
      fetchWrapper.get.mockResolvedValue(testUser)
      
      const store = useUsersStore()
      await store.getById(5)
      
      expect(fetchWrapper.get).toHaveBeenCalledWith('http://localhost:8080/api/users/5')
      expect(store.user).toEqual(testUser)
    })

    it('getById translates roles to isAdmin/isLogist when trnslt=true', async () => {
      const testUser = { id: 5, firstName: 'Jane', roles: ['administrator', 'logist'] }
      fetchWrapper.get.mockResolvedValue(testUser)
      
      const store = useUsersStore()
      await store.getById(5, true)
      
      expect(store.user.isAdmin).toBe('ADMIN')
      expect(store.user.isLogist).toBe('LOGIST')
    })

    it('update calls API with correct parameters', async () => {
      fetchWrapper.put.mockResolvedValue({})
      
      const store = useUsersStore()
      const updateData = { firstName: 'Updated', lastName: 'User' }
      
      await store.update(5, updateData)
      
      expect(fetchWrapper.put).toHaveBeenCalledWith(
        'http://localhost:8080/api/users/5',
        updateData
      )
    })

    it('update updates auth store when updating current user', async () => {
      fetchWrapper.put.mockResolvedValue({})
      
      const store = useUsersStore()
      const updateData = { firstName: 'Updated' }
      
      // Use the mocked auth store's user ID (1)
      await store.update(1, updateData)
      
      // Check that localStorage was updated with merged user data
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'user',
        JSON.stringify({ ...mockAuthStore.user, ...updateData })
      )
      
      // Check that authStore.user was updated
      expect(mockAuthStore.user).toEqual({ ...mockAuthStore.user, ...updateData })
    })

    it('delete calls API and logs out current user when deleting self', async () => {
      fetchWrapper.delete.mockResolvedValue({})
      
      const store = useUsersStore()
      
      // Delete the current user (ID 1 from mock auth store)
      await store.delete(1)
      
      expect(fetchWrapper.delete).toHaveBeenCalledWith('http://localhost:8080/api/users/1', {})
      expect(mockAuthStore.logout).toHaveBeenCalled()
    })

    it('delete calls API but does not logout when deleting another user', async () => {
      fetchWrapper.delete.mockResolvedValue({})
      
      const store = useUsersStore()
      
      // Delete a different user
      await store.delete(2)
      
      expect(fetchWrapper.delete).toHaveBeenCalledWith('http://localhost:8080/api/users/2', {})
      expect(mockAuthStore.logout).not.toHaveBeenCalled()
    })

    // Error handling tests
    it('add propagates errors when API call fails', async () => {
      const errorMessage = 'Failed to add user'
      fetchWrapper.post.mockRejectedValue(new Error(errorMessage))
      
      const store = useUsersStore()
      const newUser = { firstName: 'John', lastName: 'Doe', email: 'john@example.com' }
      
      await expect(store.add(newUser)).rejects.toThrow(errorMessage)
      expect(fetchWrapper.post).toHaveBeenCalledWith(
        'http://localhost:8080/api/users',
        newUser
      )
    })

    it('update propagates errors when API call fails', async () => {
      const errorMessage = 'Failed to update user'
      fetchWrapper.put.mockRejectedValue(new Error(errorMessage))
      
      const store = useUsersStore()
      const updateData = { firstName: 'Updated' }
      
      await expect(store.update(5, updateData)).rejects.toThrow(errorMessage)
      expect(fetchWrapper.put).toHaveBeenCalledWith(
        'http://localhost:8080/api/users/5',
        updateData
      )
      // Verify that localStorage and authStore were not updated
      expect(localStorage.setItem).not.toHaveBeenCalled()
    })

    it('delete propagates errors when API call fails', async () => {
      const errorMessage = 'Failed to delete user'
      fetchWrapper.delete.mockRejectedValue(new Error(errorMessage))
      
      const store = useUsersStore()
      
      await expect(store.delete(3)).rejects.toThrow(errorMessage)
      expect(fetchWrapper.delete).toHaveBeenCalledWith('http://localhost:8080/api/users/3', {})
      expect(mockAuthStore.logout).not.toHaveBeenCalled()
    })
  })
})
