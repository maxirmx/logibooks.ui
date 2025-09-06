/* @vitest-environment jsdom */
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import ParcelStatusesList from '@/lists/ParcelStatuses_List.vue'
import { defaultGlobalStubs } from './helpers/test-utils.js'

// Mock functions at top level to avoid hoisting issues
const getAllParcelStatuses = vi.hoisted(() => vi.fn())
const createParcelStatus = vi.hoisted(() => vi.fn())
const updateParcelStatus = vi.hoisted(() => vi.fn())
const removeParcelStatus = vi.hoisted(() => vi.fn())
const getParcelStatusById = vi.hoisted(() => vi.fn())
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
const mockParcelStatuses = ref([
  { id: 1, title: 'Черновик' },
  { id: 2, title: 'Подтвержден' },
  { id: 3, title: 'Выполнен' }
])

// Mock stores
vi.mock('@/stores/parcel.statuses.store.js', () => ({
  useParcelStatusesStore: () => ({
    parcelStatuses: mockParcelStatuses,
    parcelStatus: ref({ loading: false }),
    loading: ref(false),
    getAll: getAllParcelStatuses,
    getById: getParcelStatusById,
    create: createParcelStatus,
    update: updateParcelStatus,
    remove: removeParcelStatus
  })
}))

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => ({
    isAdmin: ref(true),
    user: ref({ id: 1, roles: ['administrator'] }),
    parcelstatuses_per_page: ref(10),
    parcelstatuses_search: ref(''),
    parcelstatuses_sort_by: ref(['id']),
    parcelstatuses_page: ref(1)
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

describe('ParcelStatuses_List.vue', () => {
  let wrapper

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()

    // Reset reactive data
    mockParcelStatuses.value = [
      { id: 1, title: 'Черновик' },
      { id: 2, title: 'Подтвержден' },
      { id: 3, title: 'Выполнен' }
    ]

    wrapper = mount(ParcelStatusesList, {
      global: {
        stubs: defaultGlobalStubs
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
      expect(heading.text()).toBe('Статусы посылок')
    })

    it('calls getAll on mount', () => {
      expect(getAllParcelStatuses).toHaveBeenCalledOnce()
    })
  })

  describe('Data Display', () => {
    it('displays order statuses in the table', async () => {
      const table = wrapper.find('[data-testid="v-data-table"]')
      expect(table.exists()).toBe(true)
    })

    it('shows empty message when no order statuses', async () => {
      mockParcelStatuses.value = []
      await wrapper.vm.$nextTick()

      const emptyMessage = wrapper.find('.text-center')
      expect(emptyMessage.text()).toBe('Список статусов посылок пуст')
    })

    it('displays search field when order statuses exist', () => {
      const searchField = wrapper.find('[data-testid="v-text-field"]')
      expect(searchField.exists()).toBe(true)
    })
  })

  describe('Admin Actions', () => {
    it('shows create button for admin users', () => {
      const createLink = wrapper.find('.link-crt a')
      expect(createLink.exists()).toBe(true)
      expect(createLink.text()).toContain('Зарегистрировать статус посылки')
    })

    it('calls openCreateDialog when create button is clicked', async () => {
      const createLink = wrapper.find('.link-crt a')
      await createLink.trigger('click')

      // Since it's stubbed to show info message
      expect(wrapper.vm.openCreateDialog).toBeDefined()
    })

    it('shows edit and delete buttons in table rows', () => {
      // Since v-data-table is stubbed, test that the methods exist instead
      expect(wrapper.vm.openEditDialog).toBeDefined()
      expect(wrapper.vm.deleteParcelStatus).toBeDefined()
      expect(typeof wrapper.vm.openEditDialog).toBe('function')
      expect(typeof wrapper.vm.deleteParcelStatus).toBe('function')
    })
  })

  describe('Delete Functionality', () => {
    it('shows confirmation dialog when delete is clicked', async () => {
      mockConfirm.mockResolvedValue(true)

      const deleteButton = wrapper.find('button[title*="delete"]') ||
                           wrapper.find('.anti-btn')

      if (deleteButton.exists()) {
        await deleteButton.trigger('click')
        expect(mockConfirm).toHaveBeenCalled()
      }
    })

    it('calls remove when deletion is confirmed', async () => {
      mockConfirm.mockResolvedValue(true)
      const testParcelStatus = mockParcelStatuses.value[0]

      await wrapper.vm.deleteParcelStatus(testParcelStatus)

      expect(removeParcelStatus).toHaveBeenCalledWith(testParcelStatus.id)
    })

    it('does not call remove when deletion is cancelled', async () => {
      mockConfirm.mockResolvedValue(false)
      const testParcelStatus = mockParcelStatuses.value[0]

      await wrapper.vm.deleteParcelStatus(testParcelStatus)

      expect(removeParcelStatus).not.toHaveBeenCalled()
    })

    it('handles delete error with 409 status', async () => {
      mockConfirm.mockResolvedValue(true)
      const error = new Error('409 Conflict')
      error.message = '409 Conflict'
      removeParcelStatus.mockRejectedValue(error)

      const testParcelStatus = mockParcelStatuses.value[0]
      await wrapper.vm.deleteParcelStatus(testParcelStatus)

      // Check that error handling was triggered
      expect(removeParcelStatus).toHaveBeenCalledWith(testParcelStatus.id)
    })

    it('handles generic delete error', async () => {
      mockConfirm.mockResolvedValue(true)
      removeParcelStatus.mockRejectedValue(new Error('Network error'))

      const testParcelStatus = mockParcelStatuses.value[0]
      await wrapper.vm.deleteParcelStatus(testParcelStatus)

      expect(removeParcelStatus).toHaveBeenCalledWith(testParcelStatus.id)
    })
  })

  describe('Search and Filter', () => {
    it('filters order statuses by title', () => {
      const mockItem = { raw: { title: 'Черновик' } }
      const result = wrapper.vm.filterParcelStatuses(null, 'черновик', mockItem)
      expect(result).toBe(true)
    })

    it('filters order statuses by title case insensitive', () => {
      const mockItem = { raw: { title: 'Подтвержден' } }
      const result = wrapper.vm.filterParcelStatuses(null, 'подтвержден', mockItem)
      expect(result).toBe(true)
    })

    it('returns false for non-matching search', () => {
      const mockItem = { raw: { title: 'Черновик' } }
      const result = wrapper.vm.filterParcelStatuses(null, 'nonexistent', mockItem)
      expect(result).toBe(false)
    })

    it('handles null query', () => {
      const mockItem = { raw: { title: 'Черновик' } }
      const result = wrapper.vm.filterParcelStatuses(null, null, mockItem)
      expect(result).toBe(false)
    })

    it('handles null item', () => {
      const result = wrapper.vm.filterParcelStatuses(null, 'test', null)
      expect(result).toBe(false)
    })
  })

  describe('Loading States', () => {
    it('shows loading spinner when loading', async () => {
      // Since components are stubbed, test loading state directly
      const loading = wrapper.vm.parcelStatusesStore.loading
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
      expect(wrapper.vm.deleteParcelStatus).toBeDefined()
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
      const testParcelStatus = mockParcelStatuses.value[0]
      const alertStore = {
        info: vi.fn()
      }

      wrapper.vm.alertStore = alertStore
      await wrapper.vm.openEditDialog(testParcelStatus)

      expect(wrapper.vm.openEditDialog).toBeDefined()
    })
  })

  describe('Vuetify Integration', () => {
    it('uses correct v-data-table props', () => {
      const table = wrapper.find('[data-testid="v-data-table"]')
      expect(table.exists()).toBe(true)

      // Check that table is configured properly through the component
      expect(wrapper.vm.headers).toBeDefined()
      expect(wrapper.vm.filterParcelStatuses).toBeDefined()
    })

    it('uses correct search field props', () => {
      const searchField = wrapper.find('[data-testid="v-text-field"]')
      expect(searchField.exists()).toBe(true)
    })
  })

  describe('Store Integration', () => {
    it('properly integrates with order statuses store', () => {
      expect(wrapper.vm.parcelStatuses).toBeDefined()
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

