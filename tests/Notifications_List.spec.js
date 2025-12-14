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
  ActionButton: true,
  'font-awesome-icon': {
    template: '<i class="fa-icon-stub" />',
    props: ['size', 'icon', 'class']
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
      {
        id: 1,
        article: 'Article A',
        number: 'N-001',
        registrationDate: '2024-12-15',
        publicationDate: '2025-01-01',
        terminationDate: '2025-01-31'
      }
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
      isSrLogistPlus: true,
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

  it('formats dates correctly', async () => {
    const wrapper = mount(NotificationsList, {
      global: {
        stubs: testStubs
      }
    })

    expect(wrapper.vm.formatDate('2025-02-15')).toBe('15.02.2025')
    expect(wrapper.vm.formatDate({ year: 2025, month: 2, day: 15 })).toBe('15.02.2025')
  })

  it('filters notifications across article and date fields', async () => {
    const wrapper = mount(NotificationsList, {
      global: {
        stubs: testStubs
      }
    })

    const notification = notificationsRef.value[0]
    expect(wrapper.vm.filterNotifications(null, 'article a', { raw: notification })).toBe(true)
    expect(wrapper.vm.filterNotifications(null, '15.12.2024', { raw: notification })).toBe(true)
    expect(wrapper.vm.filterNotifications(null, '01.01.2025', { raw: notification })).toBe(true)
    expect(wrapper.vm.filterNotifications(null, '31.01.2025', { raw: notification })).toBe(true)
    expect(wrapper.vm.filterNotifications(null, 'no-match', { raw: notification })).toBe(false)
  })

  it('renders formatted dates in the table', async () => {
    authStoreMock.isSrLogistPlus = false

    const wrapper = mount(NotificationsList, {
      global: {
        stubs: testStubs
      }
    })

    await wrapper.vm.$nextTick()

    const cells = wrapper.findAll('.v-data-table-cell')
    const cellTexts = cells.map(cell => cell.text())

    expect(cellTexts).toContain('Article A')
    expect(cellTexts).toContain('N-001')
    expect(cellTexts).toContain('15.12.2024')
    expect(cellTexts).toContain('01.01.2025')
    expect(cellTexts).toContain('31.01.2025')
  })

  it('shows empty table when there are no notifications', async () => {
    notificationsRef.value = []

    const wrapper = mount(NotificationsList, {
      global: {
        stubs: testStubs
      }
    })

    expect(wrapper.find('[data-testid="v-data-table"]').exists()).toBe(true)
    expect(wrapper.find('.header-with-actions').exists()).toBe(true)
  })
})
