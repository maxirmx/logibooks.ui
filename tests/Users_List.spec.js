/* @vitest-environment jsdom */
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import UsersList from '@/lists/Users_List.vue'
import ActionButton2L from '@/components/ActionButton2L.vue'
import { vuetifyStubs } from './helpers/test-utils'
import {
  roleAdapter1C,
  roleAdapterAlta,
  roleAdmin,
  roleLogist,
  roleWhManager,
  roleWhOperator
} from '@/helpers/user.roles.js'

// Centralized mock data
const mockUsers = ref([
  {
    id: 1,
    firstName: 'John',
    lastName: 'Doe',
    patronymic: 'Jr',
    email: 'john@example.com',
    roles: [roleAdmin],
    warehouseIds: [1]
  },
  {
    id: 2,
    firstName: 'Jane',
    lastName: 'Smith',
    patronymic: '',
    email: 'jane@example.com',
    roles: [roleLogist],
    warehouseIds: []
  },
  {
    id: 3,
    firstName: 'Bob',
    lastName: 'Wilson',
    patronymic: 'Sr',
    email: 'bob@example.com',
    roles: [roleAdmin, roleLogist]
  },
  {
    id: 4,
    firstName: 'Alice',
    lastName: 'Brown',
    patronymic: '',
    email: 'alice@example.com',
    roles: []
  }
])

// Mock alert store with reactive alert
const mockAlert = ref(null)
const mockLoading = ref(false)
const mockError = ref(null)
const mockUsersStore = {
  users: mockUsers,
  loading: mockLoading,
  error: mockError,
  getAll: vi.fn(),
  delete: vi.fn(),
  ensureLoaded: vi.fn().mockResolvedValue(undefined)
}

const mockWarehousesStore = {
  ensureLoaded: vi.fn().mockResolvedValue(undefined),
  getWarehouseName: vi.fn((id) => ({ 1: 'Warehouse One', 2: 'Warehouse Two' }[id] || String(id)))
}

const mockAlertStore = {
  get alert() {
    return mockAlert.value
  },
  error: vi.fn(),
  dismiss: vi.fn()
}

const mockAuthStore = {
  users_per_page: 10,
  users_search: '',
  users_sort_by: [{ key: 'id', order: 'asc' }],
  users_page: 1
}

// Centralized mock functions
const confirmMock = vi.hoisted(() => vi.fn().mockResolvedValue(true))
const router = vi.hoisted(() => ({
  push: vi.fn()
}))

// Centralized mocks for all modules
vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  return {
    ...actual,
    storeToRefs: (store) => {
      if (store === mockUsersStore) {
        return { users: mockUsers, loading: mockLoading, error: mockError }
      }
      if (store === mockAuthStore) {
        return {
          users_per_page: ref(mockAuthStore.users_per_page),
          users_search: ref(mockAuthStore.users_search),
          users_sort_by: ref(mockAuthStore.users_sort_by),
          users_page: ref(mockAuthStore.users_page)
        }
      }
      return {}
    }
  }
})

vi.mock('@/stores/users.store.js', () => ({
  useUsersStore: () => mockUsersStore
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => mockAlertStore
}))

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => mockAuthStore
}))

vi.mock('@/stores/warehouses.store.js', () => ({
  useWarehousesStore: () => mockWarehousesStore
}))

vi.mock('vuetify-use-dialog', () => ({
  useConfirm: () => confirmMock
}))

vi.mock(
  '@/router',
  () => ({
    default: router
  }),
  { virtual: true }
)

describe('Users_List.vue', () => {
  let wrapper

  beforeEach(() => {
    // Clear mocks before each test
    vi.clearAllMocks()

    // Reset mock data
    mockUsers.value = [
      {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        patronymic: 'Jr',
        email: 'john@example.com',
        roles: [roleAdmin],
        warehouseIds: [1]
      },
      {
        id: 2,
        firstName: 'Jane',
        lastName: 'Smith',
        patronymic: '',
        email: 'jane@example.com',
        roles: [roleLogist],
        warehouseIds: []
      },
      {
        id: 3,
        firstName: 'Bob',
        lastName: 'Wilson',
        patronymic: 'Sr',
        email: 'bob@example.com',
        roles: [roleAdmin, roleLogist]
      },
      {
        id: 4,
        firstName: 'Alice',
        lastName: 'Brown',
        patronymic: '',
        email: 'alice@example.com',
        roles: []
      }
    ]

    // Reset alert
    mockAlert.value = null

    // Reset default mock behavior
    confirmMock.mockResolvedValue(true)
    mockUsersStore.getAll = vi.fn()
    mockUsersStore.delete = vi.fn().mockResolvedValue()
    mockUsersStore.ensureLoaded = vi.fn().mockResolvedValue(undefined)
    mockWarehousesStore.ensureLoaded = vi.fn().mockResolvedValue(undefined)
    mockWarehousesStore.getWarehouseName = vi.fn(
      (id) => ({ 1: 'Warehouse One', 2: 'Warehouse Two' }[id] || String(id))
    )
    mockAlertStore.error = vi.fn()
    mockAlertStore.dismiss = vi.fn()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    vi.useRealTimers()
  })

  const createWrapper = (props = {}) => {
    wrapper = mount(UsersList, {
      props,
      global: {
        stubs: {
          ...vuetifyStubs,
          'font-awesome-icon': {
            props: ['icon'],
            template: '<i class="fa-icon-stub" :data-icon="icon"></i>'
          },
          ActionButton: {
            template: '<button><slot></slot></button>',
            props: ['item', 'icon', 'tooltipText', 'disabled', 'iconSize']
          }
        }
      }
    })
    return wrapper
  }

  describe('Component Rendering', () => {

    it('prefixes human and automated-system names with their account icons', () => {
      mockUsers.value = [
        {
          id: 1,
          firstName: 'John',
          lastName: 'Doe',
          patronymic: '',
          email: 'john@example.com',
          roles: [roleLogist]
        },
        {
          id: 2,
          firstName: '',
          lastName: 'Production 1C',
          patronymic: '',
          email: 'adapter-1c/prod',
          roles: [roleAdapter1C]
        }
      ]
      createWrapper()

      const accountIcons = wrapper.findAll('.account-type-icon')
      expect(accountIcons).toHaveLength(2)
      expect(accountIcons[0].attributes('data-icon')).toBe('fa-solid fa-user')
      expect(accountIcons[0].attributes('aria-label')).toBe('Пользователь')
      expect(accountIcons[1].attributes('data-icon')).toBe('fa-solid fa-robot')
      expect(accountIcons[1].attributes('aria-label')).toBe('Автоматизированная система')
    })

  })

  describe('User Functions', () => {
    beforeEach(() => {
      createWrapper()
    })

    it('navigates automated systems to their dedicated editor', () => {
      wrapper.vm.userSettings({ id: 321, roles: [roleAdapterAlta] })
      expect(router.push).toHaveBeenCalledWith('/automated-system/edit/321')
    })

    it('exposes both create actions through ActionButton2L', async () => {
      const actionMenu = wrapper.findComponent(ActionButton2L)
      expect(actionMenu.exists()).toBe(true)
      expect(actionMenu.props('disabled')).toBe(false)
      expect(actionMenu.props('options').map((option) => option.label)).toEqual([
        'Зарегистрировать пользователя',
        'Зарегистрировать автоматизированную систему'
      ])

      await actionMenu.props('options')[0].action()
      expect(router.push).toHaveBeenCalledWith('/register')
      await actionMenu.props('options')[1].action()
      expect(router.push).toHaveBeenCalledWith('/automated-system/register')
    })

    it('returns empty string for null/undefined user', () => {
      expect(wrapper.vm.getCredentials(null)).toBe('')
      expect(wrapper.vm.getCredentials(undefined)).toBe('')
    })

    it('returns empty warehouse names for users without associations', () => {
      expect(wrapper.vm.getWarehouseNames({ warehouseIds: [] })).toEqual([])
      expect(wrapper.vm.getWarehouseNames({})).toEqual([])
      expect(wrapper.vm.getWarehouseNames(null)).toEqual([])
    })
  })

  describe('Search Filtering', () => {
    beforeEach(() => {
      createWrapper()
    })

    it('filters users by last name', () => {
      const item = {
        raw: { lastName: 'Smith', firstName: 'John', patronymic: '', email: 'john@test.com' }
      }
      const result = wrapper.vm.filterUsers(null, 'Smith', item)
      expect(result).toBe(true)
    })

    it('filters users by warehouse manager credentials', () => {
      const item = {
        raw: {
          lastName: 'Doe',
          firstName: 'John',
          patronymic: '',
          email: 'john@test.com',
          roles: [roleWhManager]
        }
      }
      const result = wrapper.vm.filterUsers(null, 'Менеджер склада', item)
      expect(result).toBe(true)
    })

    it('filters users by associated warehouse name', () => {
      const item = {
        raw: {
          lastName: 'Doe',
          firstName: 'John',
          patronymic: '',
          email: 'john@test.com',
          roles: [roleWhOperator],
          warehouseIds: [2]
        }
      }
      const result = wrapper.vm.filterUsers(null, 'Warehouse Two', item)
      expect(result).toBe(true)
    })

    it('returns false for null query', () => {
      const item = {
        raw: { lastName: 'Smith', firstName: 'John', patronymic: '', email: 'john@test.com' }
      }
      const result = wrapper.vm.filterUsers(null, null, item)
      expect(result).toBe(false)
    })

    it('returns false for null item.raw', () => {
      const item = { raw: null }
      const result = wrapper.vm.filterUsers(null, 'test', item)
      expect(result).toBe(false)
    })

    it('returns false when no match found', () => {
      const item = {
        raw: { lastName: 'Smith', firstName: 'John', patronymic: '', email: 'john@test.com' }
      }
      const result = wrapper.vm.filterUsers(null, 'nonexistent', item)
      expect(result).toBe(false)
    })
  })

  describe('Delete User Functionality', () => {
    beforeEach(() => {
      createWrapper()
    })

    it('uses the automated-system name in deletion confirmation', async () => {
      confirmMock.mockResolvedValue(true)
      const system = {
        id: 9,
        firstName: '',
        lastName: 'Production 1C',
        patronymic: '',
        roles: [roleAdapter1C]
      }

      await wrapper.vm.deleteUser(system)

      expect(confirmMock).toHaveBeenCalledWith(expect.objectContaining({
        content: 'Удалить автоматизированную систему "Production 1C" ?'
      }))
    })

    it('does not delete user when confirmation is declined', async () => {
      confirmMock.mockResolvedValue(false)
      const userItem = { id: 1, firstName: 'John', lastName: 'Doe' }

      await wrapper.vm.deleteUser(userItem)

      expect(confirmMock).toHaveBeenCalled()
      expect(mockUsersStore.delete).not.toHaveBeenCalled()
    })

    it('handles error when delete fails', async () => {
      confirmMock.mockResolvedValue(true)
      const error = new Error('Delete failed')
      mockUsersStore.delete.mockRejectedValue(error)
      const userItem = { id: 1, firstName: 'John', lastName: 'Doe' }

      await wrapper.vm.deleteUser(userItem)

      // Wait for next tick to allow promise chain to complete
      await vi.waitFor(() => {
        expect(mockUsersStore.delete).toHaveBeenCalledWith(1)
        expect(mockAlertStore.error).toHaveBeenCalledWith(error)
      })
    })
  })

  describe('Template Interactions', () => {
    beforeEach(() => {
      createWrapper()
    })

    it('tests data table item actions for edit user', () => {
      const testUser = { id: 123 }
      wrapper.vm.userSettings(testUser)
      expect(router.push).toHaveBeenCalledWith('/user/edit/123')
    })

  })

})
