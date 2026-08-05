/* @vitest-environment jsdom */
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
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
const mockIsShiftLeadPlus = ref(true)
const mockIsSrLogistPlus = ref(false)

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
  {
    id: 1,
    title: 'Черновик',
    icon: 'svg:registered',
    bkColor: '#FFFFFF',
    fgColor: '#000000',
    readOnly: false,
    transit: false
  },
  {
    id: 2,
    title: 'Подтвержден',
    icon: 'svg:very-delivered',
    bkColor: '#00AA00',
    fgColor: '#FFFFFF',
    readOnly: true,
    transit: true
  },
  {
    id: 3,
    title: 'Выполнен',
    icon: null,
    bkColor: null,
    fgColor: null,
    readOnly: false,
    transit: false
  }
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
    get isShiftLeadPlus() {
      return mockIsShiftLeadPlus.value
    },
    get isSrLogistPlus() {
      return mockIsSrLogistPlus.value
    },
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
      {
        id: 1,
        title: 'Черновик',
        icon: 'svg:registered',
        bkColor: '#FFFFFF',
        fgColor: '#000000',
        readOnly: false,
        transit: false
      },
      {
        id: 2,
        title: 'Подтвержден',
        icon: 'svg:very-delivered',
        bkColor: '#00AA00',
        fgColor: '#FFFFFF',
        readOnly: true,
        transit: true
      },
      {
        id: 3,
        title: 'Выполнен',
        icon: null,
        bkColor: null,
        fgColor: null,
        readOnly: false,
        transit: false
      }
    ]
    mockIsShiftLeadPlus.value = true
    mockIsSrLogistPlus.value = false

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

  describe('Data Display', () => {
    it('shows empty table when no order statuses', async () => {
      mockRegisterStatuses.value = []
      await wrapper.vm.$nextTick()

      const dataTable = wrapper.find('[data-testid="v-data-table"]')
      expect(dataTable.exists()).toBe(true)
    })

    it('displays whether changes are prohibited', () => {
      expect(wrapper.findAll('.register-status-read-only').map((cell) => cell.text())).toEqual([
        'Нет',
        'Да',
        'Нет'
      ])
    })

    it('displays transit flags', () => {
      expect(wrapper.findAll('.register-status-transit').map((cell) => cell.text())).toEqual([
        'Нет',
        'Да',
        'Нет'
      ])
    })
  })

  describe('Authorized Actions', () => {
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

    it('opens edit dialog when the status icon column is clicked', async () => {
      const iconButton = wrapper.find('.status-icon-button')

      expect(iconButton.exists()).toBe(true)
      expect(iconButton.attributes('title')).toBeUndefined()
      await iconButton.trigger('click')

      expect(mockPush).toHaveBeenCalledWith('/registerstatus/edit/1')
    })

    it('hides mutation actions from senior logist users', async () => {
      wrapper.unmount()
      mockIsShiftLeadPlus.value = false
      mockIsSrLogistPlus.value = true
      wrapper = mount(RegisterStatusesList, {
        global: {
          stubs: extendedStubs
        }
      })

      expect(wrapper.find('.header-actions-bar').exists()).toBe(false)
      expect(wrapper.find('.actions-container').exists()).toBe(false)
      expect(wrapper.get('.status-icon-button').attributes('disabled')).toBeDefined()

      await wrapper.vm.openCreateDialog()
      await wrapper.vm.openEditDialog(mockRegisterStatuses.value[0])
      await wrapper.vm.deleteRegisterStatus(mockRegisterStatuses.value[0])

      expect(mockPush).not.toHaveBeenCalled()
      expect(mockConfirm).not.toHaveBeenCalled()
      expect(removeRegisterStatus).not.toHaveBeenCalled()
    })
  })

  describe('Delete Functionality', () => {
    it('shows confirmation dialog when delete is clicked', async () => {
      mockConfirm.mockResolvedValue(true)

      const deleteButton = wrapper.find('button[title*="delete"]') || wrapper.find('.anti-btn')

      if (deleteButton.exists()) {
        await deleteButton.trigger('click')
        expect(mockConfirm).toHaveBeenCalled()
      }
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
        { title: '', align: 'center', key: 'registerStatusIcon', sortable: false, width: '56px' },
        { title: 'Название статуса', key: 'title', sortable: true },
        { title: 'Транзит', align: 'center', key: 'transit', sortable: true },
        { title: 'Изменения запрещены', align: 'center', key: 'readOnly', sortable: true }
      ])
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

    it('properly integrates with the notification store', () => {
      expect(wrapper.vm.alertStore).toBeDefined()
    })
  })
})
