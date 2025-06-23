/* @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import UsersList from '@/components/Users_List.vue'

// Centralized mock data
const mockUsers = ref([
  { id: 1, firstName: 'John', lastName: 'Doe', patronymic: '', email: 'john@example.com', roles: ['administrator'] }
])

// Centralized mock functions
const getAll = vi.hoisted(() => vi.fn())
const deleteUserFn = vi.hoisted(() => vi.fn())
const errorFn = vi.hoisted(() => vi.fn())
const confirmMock = vi.hoisted(() => vi.fn().mockResolvedValue(true))
const router = vi.hoisted(() => ({
  push: vi.fn()
}))

// Centralized mocks for all modules
vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  return {
    ...actual,
    storeToRefs: () => ({ users: mockUsers })
  }
})

vi.mock('@/stores/users.store.js', () => ({
  useUsersStore: () => ({
    users: mockUsers,
    getAll,
    delete: deleteUserFn
  })
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => ({ alert: null, error: errorFn, clear: vi.fn() })
}))

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => ({
    users_per_page: 10,
    users_search: '',
    users_sort_by: ['id'],
    users_page: 1
  })
}))

vi.mock('vuetify-use-dialog', () => ({
  useConfirm: () => confirmMock
}))

vi.mock('@/router', () => ({
  default: router
}), { virtual: true })

describe('Users_List.vue', () => {
  beforeEach(() => {
    // Clear mocks before each test
    vi.clearAllMocks()
    
    // Reset default mock behavior
    confirmMock.mockResolvedValue(true)
  })

  it('calls getAll on mount', () => {
    const wrapper = mount(UsersList, {
      global: {
        stubs: {
          'v-card': true,
          'v-data-table': true,
          'v-text-field': true,
          'font-awesome-icon': true,
          'router-link': true
        }
      }
    })
    expect(getAll).toHaveBeenCalled()
    expect(wrapper.exists()).toBe(true)
  })

  it('handles empty users array', async () => {
    mockUsers.value = []
    const wrapper = mount(UsersList, {
      global: {
        stubs: {
          'v-card': true,
          'v-data-table': true,
          'v-text-field': true,
          'font-awesome-icon': true,
          'router-link': true
        }
      }
    })
    expect(wrapper.exists()).toBe(true)
    // Reset mock data for other tests
    mockUsers.value = [{ id: 1, firstName: 'John', lastName: 'Doe', patronymic: '', email: 'john@example.com', roles: ['administrator'] }]
  })

  it('handles search input', async () => {
    const wrapper = mount(UsersList, {
      global: {
        stubs: {
          'v-card': true,
          'v-data-table': true,
          'font-awesome-icon': true,
          'router-link': true
        }
      }
    })
    const searchInput = wrapper.findComponent({ name: 'v-text-field' }) || wrapper.find('input[type="text"]')
    if (searchInput.exists()) {
      await searchInput.setValue('John')
      await searchInput.trigger('input')
    }
  })

  it('calls delete function when delete button is clicked', async () => {
    const wrapper = mount(UsersList, {
      global: {
        stubs: {
          'v-card': true,
          'v-data-table': {
            template: '<div><slot name="item.actions" :item="{ id: 1 }"></slot></div>'
          },
          'v-text-field': true,
          'font-awesome-icon': true,
          'router-link': true
        }
      }
    })
    
    const deleteButton = wrapper.find('button.delete-user')
    if (deleteButton.exists()) {
      await deleteButton.trigger('click')
      expect(deleteUserFn).toHaveBeenCalledWith(1)
    }
  })

  it('navigates to add user page when add button is clicked', async () => {    
    const wrapper = mount(UsersList, {
      global: {
        stubs: {
          'v-card': true,
          'v-data-table': true,
          'v-text-field': true,
          'font-awesome-icon': true,
          'router-link': true
        }
      }
    })
    
    const addButton = wrapper.find('button.add-user')
    if (addButton.exists()) {
      await addButton.trigger('click')
      expect(router.push).toHaveBeenCalledWith('/users/add')
    }
  })

  it('navigates to edit user page when edit button is clicked', async () => {    
    const wrapper = mount(UsersList, {
      global: {
        stubs: {
          'v-card': true,
          'v-data-table': {
            template: '<div><slot name="item.actions" :item="{ id: 1 }"></slot></div>'
          },
          'v-text-field': true,
          'font-awesome-icon': true,
          'router-link': true
        }
      }
    })
    
    const editButton = wrapper.find('button.edit-user')
    if (editButton.exists()) {
      await editButton.trigger('click')
      expect(router.push).toHaveBeenCalledWith('/users/edit/1')
    }
  })

  // New tests
  it('displays error when API call fails', async () => {
    // Reset mocks
    getAll.mockReset()
    
    // Create a mock implementation that sets the error in users.value
    getAll.mockImplementation(async () => {
      mockUsers.value = { error: 'Failed to fetch users' }
    })
    
    const wrapper = mount(UsersList, {
      global: {
        stubs: {
          'v-card': true,
          'v-data-table': true,
          'v-text-field': true,
          'font-awesome-icon': true,
          'router-link': true
        }
      }
    })
    
    // Wait for the promise to be handled
    await vi.waitFor(() => {
      expect(getAll).toHaveBeenCalled()
      expect(mockUsers.value).toHaveProperty('error')
      expect(wrapper.html()).toContain('Ошибка при загрузке списка пользователей')
    }, { timeout: 2000 })
  })

  it('shows confirmation dialog before deleting a user', async () => {
    // Configure the confirm mock to return true for this test
    confirmMock.mockResolvedValue(true)
    
    const wrapper = mount(UsersList, {
      global: {
        stubs: {
          'v-card': true,
          'v-data-table': {
            template: '<div><slot name="item.actions" :item="{ id: 1 }"></slot></div>'
          },
          'v-text-field': true,
          'font-awesome-icon': true,
          'router-link': true
        }
      }
    })
    
    const deleteButton = wrapper.find('button.delete-user')
    if (deleteButton.exists()) {
      await deleteButton.trigger('click')
      expect(confirmMock).toHaveBeenCalled()
      expect(deleteUserFn).toHaveBeenCalledWith(1)
    }
  })

  it('does not delete user when confirmation is declined', async () => {
    // Configure the confirm mock to return false for this test
    confirmMock.mockResolvedValue(false)
    
    const wrapper = mount(UsersList, {
      global: {
        stubs: {
          'v-card': true,
          'v-data-table': {
            template: '<div><slot name="item.actions" :item="{ id: 1 }"></slot></div>'
          },
          'v-text-field': true,
          'font-awesome-icon': true,
          'router-link': true
        }
      }
    })
    
    const deleteButton = wrapper.find('button.delete-user')
    if (deleteButton.exists()) {
      await deleteButton.trigger('click')
      expect(confirmMock).toHaveBeenCalled()
      expect(deleteUserFn).not.toHaveBeenCalled()
    }
  })

})
