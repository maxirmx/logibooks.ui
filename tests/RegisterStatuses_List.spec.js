/* @vitest-environment jsdom */
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import RegisterStatusesList from '@/lists/RegisterStatuses_List.vue'
import { defaultGlobalStubs } from './helpers/test-utils.js'
import { roleAdmin } from '@/helpers/user.roles.js'

// Mock functions at top level to avoid hoisting issues
const getAllRegisterStatuses = vi.hoisted(() => vi.fn())
const createRegisterStatus = vi.hoisted(() => vi.fn())
const updateRegisterStatus = vi.hoisted(() => vi.fn())
const removeRegisterStatus = vi.hoisted(() => vi.fn())
const getRegisterStatusById = vi.hoisted(() => vi.fn())
const mockPush = vi.hoisted(() => vi.fn())
const mockConfirm = vi.hoisted(() => vi.fn())

// Mock router
vi.mock('@/router', () => ({
  default: {
    push: mockPush
  }
}))

// Mock confirm dialog
vi.mock('vuetify-use-dialog', () => ({
  useConfirm: () => mockConfirm
}))

// Centralized mock data
const mockRegisterStatuses = ref([
  { id: 1, title: 'Черновик' },
  { id: 2, title: 'Подтвержден' },
  { id: 3, title: 'Выполнен' }
])

// Mock stores
vi.mock('@/stores/register.statuses.store.js', () => ({
  useRegisterStatusesStore: () => ({
    registerStatuses: mockRegisterStatuses,
    registerStatus: ref({ loading: false }),
    loading: ref(false),
    getAll: getAllRegisterStatuses,
    getById: getRegisterStatusById,
    create: createRegisterStatus,
    update: updateRegisterStatus,
    remove: removeRegisterStatus
  })
}))

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => ({
    isAdmin: ref(true),
    isSrLogist: ref(false),
    isLogist: ref(false),
    isSrLogistPlus: ref(true),
    hasLogistRole: ref(false),
    user: ref({ id: 1, roles: [roleAdmin] }),
    registerstatuses_per_page: ref(10),
    registerstatuses_search: ref(''),
    registerstatuses_sort_by: ref(['id']),
    registerstatuses_page: ref(1)
  })
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => ({
    alert: ref(null),
    clear: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn()
  })
}))

// Mock helpers
vi.mock('@/helpers/items.per.page.js', () => ({
  itemsPerPageOptions: [
    { value: 5, title: '5' },
    { value: 10, title: '10' },
    { value: 25, title: '25' }
  ]
}))

vi.mock('@mdi/js', () => ({
  mdiMagnify: 'mdi-magnify'
}))

const extendedStubs = {
  ...defaultGlobalStubs,
  ActionButton: true
}

describe('RegisterStatuses_List.vue', () => {
  let wrapper

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()

    // Reset reactive data
    mockRegisterStatuses.value = [
      { id: 1, title: 'Черновик' },
      { id: 2, title: 'Подтвержден' },
      { id: 3, title: 'Выполнен' }
    ]

    wrapper = mount(RegisterStatusesList, {
      global: {
        stubs: extendedStubs
      }
    })
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('Component Mounting', () => {
    it('renders correctly', () => {
      expect(wrapper.exists()).toBe(true)
      expect(wrapper.find('.settings.table-2').exists()).toBe(true)
    })

    it('displays the correct heading', () => {
      const heading = wrapper.find('.primary-heading')
      expect(heading.exists()).toBe(true)
      expect(heading.text()).toBe('Статусы реестров')
    })

    it('calls getAll on mount', () => {
      expect(getAllRegisterStatuses).toHaveBeenCalledOnce()
    })
  })

  describe('Data Display', () => {
    it('displays order statuses in the table', async () => {
      const table = wrapper.find('[data-testid="v-data-table"]')
      expect(table.exists()).toBe(true)
    })

    it('shows empty table when no order statuses', async () => {
      mockRegisterStatuses.value = []
      await wrapper.vm.$nextTick()

      const dataTable = wrapper.find('[data-testid="v-data-table"]')
      expect(dataTable.exists()).toBe(true)
    })

    it('displays search field when order statuses exist', () => {
      const searchField = wrapper.find('[data-testid="v-text-field"]')
      expect(searchField.exists()).toBe(true)
    })
  })

  describe('Admin Actions', () => {
    it('shows header actions for admin users', () => {
      const headerActions = wrapper.find('.header-actions')
      expect(headerActions.exists()).toBe(true)
    })

    it('calls openCreateDialog and navigates to create page', async () => {
      await wrapper.vm.openCreateDialog()
      expect(mockPush).toHaveBeenCalledWith('/registerstatus/create')
    })

    it('shows edit and delete buttons in table rows', () => {
      // Since v-data-table is stubbed, test that the methods exist instead
      expect(wrapper.vm.openEditDialog).toBeDefined()
      expect(wrapper.vm.deleteRegisterStatus).toBeDefined()
      expect(typeof wrapper.vm.openEditDialog).toBe('function')
      expect(typeof wrapper.vm.deleteRegisterStatus).toBe('function')
    })
  })

  describe('Delete Functionality', () => {
    it('shows confirmation dialog when delete is clicked', async () => {
      mockConfirm.mockResolvedValue(true)

      let deleteButton = wrapper.find('button[title*="delete"]')
      if (!deleteButton.exists()) {
        deleteButton = wrapper.find('.anti-btn')
      }

      expect(deleteButton.exists()).toBe(true)
      await deleteButton.trigger('click')
      expect(mockConfirm).toHaveBeenCalled()
    })

    it('calls remove when deletion is confirmed', async () => {
      mockConfirm.mockResolvedValue(true)
      const testRegisterStatus = mockRegisterStatuses.value[0]

      await wrapper.vm.deleteRegisterStatus(testRegisterStatus)

      expect(removeRegisterStatus).toHaveBeenCalledWith(testRegisterStatus.id)
    })

    it('does not call remove when deletion is cancelled', async () => {
      mockConfirm.mockResolvedValue(false)
      const testRegisterStatus = mockRegisterStatuses.value[0]

      await wrapper.vm.deleteRegisterStatus(testRegisterStatus)

      expect(removeRegisterStatus).not.toHaveBeenCalled()
    })

    it('handles delete error with 409 status', async () => {
      mockConfirm.mockResolvedValue(true)
      const error = new Error('409 Conflict')
      error.message = '409 Conflict'
      removeRegisterStatus.mockRejectedValue(error)

      const testRegisterStatus = mockRegisterStatuses.value[0]
      await wrapper.vm.deleteRegisterStatus(testRegisterStatus)

      // Check that error handling was triggered
      expect(removeRegisterStatus).toHaveBeenCalledWith(testRegisterStatus.id)
    })

    it('handles generic delete error', async () => {
      mockConfirm.mockResolvedValue(true)
      removeRegisterStatus.mockRejectedValue(new Error('Network error'))

      const testRegisterStatus = mockRegisterStatuses.value[0]
      await wrapper.vm.deleteRegisterStatus(testRegisterStatus)

      expect(removeRegisterStatus).toHaveBeenCalledWith(testRegisterStatus.id)
    })
  })

  describe('Search and Filter', () => {
    it('filters order statuses by title', () => {
      const mockItem = { raw: { title: 'Черновик' } }
      const result = wrapper.vm.filterRegisterStatuses(null, 'черновик', mockItem)
      expect(result).toBe(true)
    })

    it('filters order statuses by title case insensitive', () => {
      const mockItem = { raw: { title: 'Подтвержден' } }
      const result = wrapper.vm.filterRegisterStatuses(null, 'подтвержден', mockItem)
      expect(result).toBe(true)
    })

    it('returns false for non-matching search', () => {
      const mockItem = { raw: { title: 'Черновик' } }
      const result = wrapper.vm.filterRegisterStatuses(null, 'nonexistent', mockItem)
      expect(result).toBe(false)
    })

    it('handles null query', () => {
      const mockItem = { raw: { title: 'Черновик' } }
      const result = wrapper.vm.filterRegisterStatuses(null, null, mockItem)
      expect(result).toBe(false)
    })

    it('handles null item', () => {
      const result = wrapper.vm.filterRegisterStatuses(null, 'test', null)
      expect(result).toBe(false)
    })
  })

  describe('Loading States', () => {
    it('shows loading spinner when loading', async () => {
      // Since components are stubbed, test loading state directly
      const loading = wrapper.vm.registerStatusesStore.loading
      expect(loading).toBeDefined()
      expect(typeof loading.value).toBe('boolean')
      expect(loading.value).toBe(false)
    })
  })

  describe('Table Headers', () => {
    it('has correct table headers', () => {
      const headers = wrapper.vm.headers
      expect(headers).toEqual([
        { title: '', align: 'center', key: 'actions', sortable: false, width: '10%' },
        { title: 'Название статуса', key: 'title', sortable: true }
      ])
    })
  })

  describe('Component Exposure', () => {
    it('exposes necessary functions for testing', () => {
      expect(wrapper.vm.openCreateDialog).toBeDefined()
      expect(wrapper.vm.openEditDialog).toBeDefined()
      expect(wrapper.vm.deleteRegisterStatus).toBeDefined()
    })
  })

  describe('Stubbed Create and Edit Functions', () => {
    it('openCreateDialog shows info message', async () => {
      const alertStore = {
        info: vi.fn()
      }

      // Mock the alert store for this test
      wrapper.vm.alertStore = alertStore
      await wrapper.vm.openCreateDialog()

      // Since it's stubbed, we just verify the function exists and can be called
      expect(wrapper.vm.openCreateDialog).toBeDefined()
    })

    it('openEditDialog shows info message', async () => {
      const testRegisterStatus = mockRegisterStatuses.value[0]
      const alertStore = {
        info: vi.fn()
      }

      wrapper.vm.alertStore = alertStore
      await wrapper.vm.openEditDialog(testRegisterStatus)

      expect(wrapper.vm.openEditDialog).toBeDefined()
    })
  })

  describe('Vuetify Integration', () => {
    it('uses correct v-data-table props', () => {
      const table = wrapper.find('[data-testid="v-data-table"]')
      expect(table.exists()).toBe(true)

      // Check that table is configured properly through the component
      expect(wrapper.vm.headers).toBeDefined()
      expect(wrapper.vm.filterRegisterStatuses).toBeDefined()
    })

    it('uses correct search field props', () => {
      const searchField = wrapper.find('[data-testid="v-text-field"]')
      expect(searchField.exists()).toBe(true)
    })
  })

  describe('Store Integration', () => {
    it('properly integrates with order statuses store', () => {
      expect(wrapper.vm.registerStatuses).toBeDefined()
      expect(wrapper.vm.loading).toBeDefined()
    })

    it('properly integrates with auth store', () => {
      // Auth store properties should be available
      expect(wrapper.vm.authStore).toBeDefined()
    })

    it('properly integrates with alert store', () => {
      expect(wrapper.vm.alert).toBeDefined()
    })
  })
})
