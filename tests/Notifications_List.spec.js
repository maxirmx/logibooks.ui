/* @vitest-environment jsdom */
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import NotificationsList from '@/lists/Notifications_List.vue'
import { defaultGlobalStubs } from './helpers/test-utils.js'

const notificationsRef = ref([])
const loadingRef = ref(false)
const alertRef = ref(null)
const getAllMock = vi.hoisted(() => vi.fn())
const removeMock = vi.hoisted(() => vi.fn())
const errorMock = vi.hoisted(() => vi.fn())
const clearMock = vi.hoisted(() => vi.fn())
const confirmMock = vi.hoisted(() => vi.fn().mockResolvedValue(true))
const pushMock = vi.hoisted(() => vi.fn())

let notificationsStoreMock
let authStoreMock
let alertStoreMock

const testStubs = {
  ...defaultGlobalStubs,
  'font-awesome-icon': {
    template: '<i class="fa-icon-stub" />',
    props: ['size', 'icon', 'class']
  },
  'router-link': {
    template: '<a class="router-link-stub"><slot></slot></a>',
    props: ['to']
  }
}

vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  return {
    ...actual,
    storeToRefs: (store) => {
      const refs = {}
      Object.keys(store).forEach((key) => {
        const value = store[key]
        if (value && typeof value === 'object' && 'value' in value) {
          refs[key] = value
        }
      })
      return refs
    }
  }
})

vi.mock('@/stores/notifications.store.js', () => ({
  useNotificationsStore: () => notificationsStoreMock
}))

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => authStoreMock
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => alertStoreMock
}))

vi.mock('vuetify-use-dialog', () => ({
  useConfirm: () => confirmMock
}))

vi.mock('@/router', () => ({
  default: { push: pushMock }
}), { virtual: true })

vi.mock('@/helpers/items.per.page.js', () => ({
  itemsPerPageOptions: [10, 25, 50]
}))

vi.mock('@mdi/js', () => ({
  mdiMagnify: 'mdi-magnify'
}))

describe('Notifications_List.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    pushMock.mockClear()
    confirmMock.mockClear()
    confirmMock.mockResolvedValue(true)

    notificationsRef.value = [
      { id: 1, model: 'Model A', number: 'N-001', terminationDate: '2025-01-31' }
    ]
    loadingRef.value = false
    alertRef.value = null

    notificationsStoreMock = {
      notifications: notificationsRef,
      loading: loadingRef,
      getAll: getAllMock,
      remove: removeMock
    }

    authStoreMock = {
      isAdminOrSrLogist: true,
      notifications_per_page: ref(10),
      notifications_search: ref(''),
      notifications_sort_by: ref(['id']),
      notifications_page: ref(1)
    }

    alertStoreMock = {
      alert: alertRef,
      error: errorMock,
      clear: clearMock
    }
  })

  it('loads notifications on mount', async () => {
    mount(NotificationsList, {
      global: {
        stubs: testStubs
      }
    })

    await Promise.resolve()

    expect(getAllMock).toHaveBeenCalled()
  })

  it('navigates to create view when openCreateDialog is called', async () => {
    const wrapper = mount(NotificationsList, {
      global: {
        stubs: testStubs
      }
    })

    await wrapper.vm.openCreateDialog()

    expect(pushMock).toHaveBeenCalledWith('/notification/create')
  })

  it('navigates to edit view when openEditDialog is called', async () => {
    const wrapper = mount(NotificationsList, {
      global: {
        stubs: testStubs
      }
    })

    await wrapper.vm.openEditDialog({ id: 2 })

    expect(pushMock).toHaveBeenCalledWith('/notification/edit/2')
  })

  it('deletes notification after confirmation', async () => {
    const wrapper = mount(NotificationsList, {
      global: {
        stubs: testStubs
      }
    })

    await wrapper.vm.deleteNotification(notificationsRef.value[0])

    expect(confirmMock).toHaveBeenCalled()
    expect(removeMock).toHaveBeenCalledWith(1)
  })

  it('formats termination dates correctly', async () => {
    const wrapper = mount(NotificationsList, {
      global: {
        stubs: testStubs
      }
    })

    expect(wrapper.vm.formatTerminationDate('2025-02-15')).toBe('15.02.2025')
    expect(wrapper.vm.formatTerminationDate({ year: 2025, month: 2, day: 15 })).toBe('15.02.2025')
  })

  it('renders formatted termination date in the table', async () => {
    authStoreMock.isAdminOrSrLogist = false

    const wrapper = mount(NotificationsList, {
      global: {
        stubs: testStubs
      }
    })

    await wrapper.vm.$nextTick()

    const cells = wrapper.findAll('.v-data-table-cell')
    expect(cells[cells.length - 1].text()).toBe('31.01.2025')
  })

  it('shows empty state message when there are no notifications', async () => {
    notificationsRef.value = []

    const wrapper = mount(NotificationsList, {
      global: {
        stubs: testStubs
      }
    })

    expect(wrapper.text()).toContain('Список нотификаций пуст')
  })
})
