/* @vitest-environment jsdom */
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { Suspense } from 'vue'
import NotificationSettings from '@/dialogs/Notification_Settings.vue'
import { defaultGlobalStubs, createMockStore, resolveAll } from './helpers/test-utils.js'

const mockRouter = vi.hoisted(() => ({ push: vi.fn() }))
const mockNotification = {
  id: 1,
  model: 'Test Model',
  number: 'ABC-123',
  terminationDate: '2025-12-31'
}

let mockNotificationsStore

vi.mock('@/stores/notifications.store.js', () => ({
  useNotificationsStore: () => mockNotificationsStore
}))

vi.mock('@/router', () => ({
  default: mockRouter
}))

vi.mock('vee-validate', () => ({
  Form: {
    name: 'Form',
    props: ['initialValues', 'validationSchema'],
    emits: ['submit'],
    data() {
      return {
        errors: {},
        isSubmitting: false
      }
    },
    methods: {
      handleSubmit() {
        const values = this.initialValues?.value ?? this.initialValues ?? {}
        const actions = {
          setErrors: this.setErrors.bind(this)
        }
        this.$emit('submit', values, actions)
      },
      setErrors(newErrors) {
        this.errors = { ...this.errors, ...newErrors }
      }
    },
    template: `
      <form @submit.prevent="handleSubmit">
        <slot :errors="errors" :isSubmitting="isSubmitting" />
      </form>
    `
  },
  Field: {
    name: 'Field',
    props: ['name', 'id', 'type', 'class', 'placeholder'],
    template: '<input v-bind="$props" />'
  }
}))

const AsyncWrapper = {
  components: { NotificationSettings, Suspense },
  props: ['mode', 'notificationId'],
  template: `
    <Suspense>
      <NotificationSettings :mode="mode" :notification-id="notificationId" />
      <template #fallback>
        <div>Loading...</div>
      </template>
    </Suspense>
  `
}

describe('Notification_Settings.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRouter.push.mockClear()
    mockNotificationsStore = createMockStore({
      notification: mockNotification,
      getById: vi.fn().mockResolvedValue(mockNotification),
      create: vi.fn().mockResolvedValue(mockNotification),
      update: vi.fn().mockResolvedValue()
    })
  })

  it('renders create mode correctly', async () => {
    const wrapper = mount(AsyncWrapper, {
      props: { mode: 'create' },
      global: {
        stubs: defaultGlobalStubs
      }
    })

    await resolveAll()

    expect(wrapper.find('h1').text()).toBe('Регистрация нотификации')
    expect(wrapper.find('button[type="submit"]').text()).toContain('Создать')
    expect(mockNotificationsStore.getById).not.toHaveBeenCalled()
  })

  it('renders edit mode and loads data', async () => {
    const wrapper = mount(AsyncWrapper, {
      props: { mode: 'edit', notificationId: 1 },
      global: {
        stubs: defaultGlobalStubs
      }
    })

    await resolveAll()

    expect(wrapper.find('h1').text()).toBe('Изменить информацию о нотификации')
    expect(wrapper.find('button[type="submit"]').text()).toContain('Сохранить')
    expect(mockNotificationsStore.getById).toHaveBeenCalledWith(1)
  })

  it('submits create form and redirects', async () => {
    const wrapper = mount(AsyncWrapper, {
      props: { mode: 'create' },
      global: {
        stubs: defaultGlobalStubs
      }
    })

    await resolveAll()

    await wrapper.find('form').trigger('submit')
    await resolveAll()

    expect(mockNotificationsStore.create).toHaveBeenCalled()
    expect(mockRouter.push).toHaveBeenCalledWith('/notifications')
  })

  it('submits edit form and redirects', async () => {
    const wrapper = mount(AsyncWrapper, {
      props: { mode: 'edit', notificationId: 1 },
      global: {
        stubs: defaultGlobalStubs
      }
    })

    await resolveAll()

    await wrapper.find('form').trigger('submit')
    await resolveAll()

    expect(mockNotificationsStore.update).toHaveBeenCalledWith(1, expect.any(Object))
    expect(mockRouter.push).toHaveBeenCalledWith('/notifications')
  })

  it('formats date values for input fields', async () => {
    const wrapper = mount(AsyncWrapper, {
      props: { mode: 'create' },
      global: {
        stubs: defaultGlobalStubs
      }
    })

    await resolveAll()

    const vm = wrapper.findComponent(NotificationSettings).vm

    expect(vm.formatDateForInput('2025-01-15')).toBe('2025-01-15')
    expect(vm.formatDateForInput(new Date('2025-01-15'))).toBe('2025-01-15')
    expect(vm.formatDateForInput({ year: 2025, month: 1, day: 15 })).toBe('2025-01-15')
  })

  it('cancel button navigates back to notifications list', async () => {
    const wrapper = mount(AsyncWrapper, {
      props: { mode: 'create' },
      global: {
        stubs: defaultGlobalStubs,
        mocks: {
          $router: mockRouter
        }
      }
    })

    await resolveAll()

    const buttons = wrapper.findAll('button')
    const cancelButton = buttons.find(btn => btn.text().includes('Отменить'))
    
    expect(cancelButton).toBeTruthy()
    await cancelButton.trigger('click')
    
    expect(mockRouter.push).toHaveBeenCalledWith('/notifications')
  })
})
