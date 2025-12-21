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
  articles: [
    {
      id: 10,
      notificationId: 1,
      article: 'Test Article'
    }
  ],
  number: 'ABC-123',
  terminationDate: '2025-12-31',
  publicationDate: '2025-11-30',
  registrationDate: '2025-11-01'
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
  },
  FieldArray: {
    name: 'FieldArray',
    props: ['name'],
    data() {
      return {
        fields: [{ key: 0 }]
      }
    },
    methods: {
      pushField(value) {
        this.fields.push({ key: this.fields.length, value })
      },
      removeField(index) {
        if (this.fields.length > 1) {
          this.fields.splice(index, 1)
        }
      }
    },
    template: `
      <div>
        <slot :fields="fields" :push="pushField" :remove="removeField" />
      </div>
    `
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

    const vm = wrapper.findComponent(NotificationSettings).vm

    await vm.onSubmit(
      {
        articles: ['Created Article'],
        number: '',
        terminationDate: '',
        publicationDate: '',
        registrationDate: ''
      },
      { setErrors: vi.fn() }
    )

    expect(mockNotificationsStore.create).toHaveBeenCalledWith({
      articles: [{ article: 'Created Article' }],
      number: '',
      terminationDate: '',
      publicationDate: '',
      registrationDate: ''
    })
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

    expect(mockNotificationsStore.update).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        id: 1,
        articles: [{ article: mockNotification.articles[0].article }],
        number: mockNotification.number,
        terminationDate: mockNotification.terminationDate,
        publicationDate: mockNotification.publicationDate,
        registrationDate: mockNotification.registrationDate
      })
    )
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
    expect(vm.formatDateForInput('2025-01-15T12:00:00Z')).toBe('2025-01-15')
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

  it('renders updated labels and placeholders', async () => {
    const wrapper = mount(AsyncWrapper, {
      props: { mode: 'create' },
      global: {
        stubs: defaultGlobalStubs
      }
    })

    await resolveAll()

    const labels = wrapper.findAll('label').map((label) => label.text())
    expect(labels).toContain('Артикул:')
    expect(labels).toContain('Срок действия:')

    const articleInput = wrapper.find('input#articles_0')
    expect(articleInput.attributes('placeholder')).toBe('Артикул')
  })

  it('validates required fields with new messages', async () => {
    const wrapper = mount(AsyncWrapper, {
      props: { mode: 'create' },
      global: {
        stubs: defaultGlobalStubs
      }
    })

    await resolveAll()

    const vm = wrapper.findComponent(NotificationSettings).vm

    await expect(
      vm.schema.validateAt('articles[0]', { articles: [''] })
    ).rejects.toThrow('Необходимо ввести артикул')
    await expect(vm.schema.validateAt('terminationDate', { terminationDate: '' })).rejects.toThrow('Необходимо ввести срок действия')
    await expect(vm.schema.validateAt('publicationDate', { publicationDate: '' })).rejects.toThrow('Необходимо ввести дату публикации')
    await expect(vm.schema.validateAt('registrationDate', { registrationDate: '' })).rejects.toThrow('Необходимо ввести дату регистрации')
  })
})
