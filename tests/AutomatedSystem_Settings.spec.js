/* @vitest-environment jsdom */
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import AutomatedSystemSettings from '@/dialogs/AutomatedSystem_Settings.vue'
import { roleAdapter1C, roleAdapterAlta, roleLogist } from '@/helpers/user.roles.js'

const mocks = vi.hoisted(() => ({
  add: vi.fn(),
  update: vi.fn(),
  getById: vi.fn(),
  push: vi.fn(),
  alertError: vi.fn()
}))

vi.mock('@/stores/users.store.js', () => ({
  useUsersStore: () => ({
    add: mocks.add,
    update: mocks.update,
    getById: mocks.getById
  })
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => ({
    error: mocks.alertError
  })
}))

vi.mock(
  '@/router',
  () => ({
    default: { push: mocks.push }
  }),
  { virtual: true }
)

const FormStub = {
  name: 'Form',
  props: ['initialValues', 'validationSchema'],
  emits: ['submit', 'invalid-submit'],
  methods: {
    handleSubmit(eventOrHandler, maybeHandler) {
      const handler = typeof eventOrHandler === 'function' && !maybeHandler
        ? eventOrHandler
        : maybeHandler
      return handler(this.initialValues, {})
    }
  },
  template: '<form><slot :errors="{}" :isSubmitting="false" :handleSubmit="handleSubmit" /></form>'
}

const FieldStub = {
  name: 'Field',
  props: ['name', 'id', 'type', 'value'],
  template: '<input :name="name" :id="id" :type="type" :value="value" />'
}

const ActionButtonStub = {
  name: 'ActionButton',
  props: ['item', 'disabled'],
  emits: ['click'],
  template: '<button type="button" :disabled="disabled" @click="$emit(\'click\', item)"></button>'
}

const globalStubs = {
  Form: FormStub,
  Field: FieldStub,
  FieldError: true,
  PageAlertRegion: true,
  ActionButton: ActionButtonStub,
  'font-awesome-icon': true
}

async function mountDialog(props) {
  const Parent = {
    components: { AutomatedSystemSettings },
    template:
      '<Suspense><AutomatedSystemSettings :register="register" :id="id" /></Suspense>',
    data: () => props
  }
  const wrapper = mount(Parent, { global: { stubs: globalStubs } })
  await flushPromises()
  return { wrapper, dialog: wrapper.findComponent(AutomatedSystemSettings) }
}

describe('AutomatedSystem_Settings.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.add.mockResolvedValue(undefined)
    mocks.update.mockResolvedValue(undefined)
    mocks.getById.mockResolvedValue({
      id: 7,
      firstName: '',
      lastName: 'Production 1C',
      patronymic: '',
      email: 'adapter-1c/prod',
      roles: [roleAdapter1C]
    })
    mocks.push.mockResolvedValue(undefined)
  })

  it('renders only automated-system identity and role fields without a default role', async () => {
    const { wrapper, dialog } = await mountDialog({ register: true, id: undefined })

    expect(wrapper.text()).toContain('Название:')
    expect(wrapper.text()).toContain('Идентификатор:')
    expect(wrapper.text()).toContain('Адаптер 1С')
    expect(wrapper.text()).toContain('Адаптер Альта')
    expect(wrapper.text()).not.toContain('Фамилия:')
    expect(wrapper.text()).not.toContain('Имя:')
    expect(wrapper.text()).not.toContain('Отчество:')
    expect(wrapper.text()).not.toContain('Схема настройки клавиатуры')
    expect(wrapper.find('#roleAdapter1C').exists()).toBe(true)
    expect(wrapper.find('#roleAdapterAlta').exists()).toBe(true)
    expect(dialog.vm.$.setupState.initialValues.roles).toEqual([])
  })

  it('requires at least one automated-system role and accepts both roles together', async () => {
    const { dialog } = await mountDialog({ register: true, id: undefined })
    const rolesSchema = dialog.vm.$.setupState.schema.fields.roles

    await expect(rolesSchema.validate(undefined)).rejects.toThrow(
      'Необходимо выбрать роль автоматизированной системы'
    )
    await expect(rolesSchema.validate(null)).rejects.toThrow(
      'Необходимо выбрать роль автоматизированной системы'
    )
    await expect(rolesSchema.validate([])).rejects.toThrow(
      'Необходимо выбрать роль автоматизированной системы'
    )
    await expect(rolesSchema.validate([roleAdapter1C, roleAdapterAlta])).resolves.toEqual([
      roleAdapter1C,
      roleAdapterAlta
    ])
  })

  it('creates an Alta automated system with empty human-name fields', async () => {
    const { dialog } = await mountDialog({ register: true, id: undefined })

    await dialog.vm.$.setupState.onSubmit(
      {
        lastName: 'Production Alta',
        email: 'adapter-alta/prod',
        password: 'Password1!',
        password2: 'Password1!',
        roles: [roleAdapterAlta]
      },
      { setErrors: vi.fn() }
    )

    expect(mocks.add).toHaveBeenCalledWith({
      lastName: 'Production Alta',
      email: 'adapter-alta/prod',
      firstName: '',
      patronymic: '',
      password: 'Password1!',
      roles: [roleAdapterAlta]
    })
    expect(mocks.push).toHaveBeenCalledWith('/users')
  })

  it('loads and updates an existing automated system without an empty password', async () => {
    const { dialog } = await mountDialog({ register: false, id: 7 })
    expect(mocks.getById).toHaveBeenCalledWith(7, false, true)

    await dialog.vm.$.setupState.onSubmit(
      {
        lastName: 'Updated adapter',
        email: 'adapter/updated',
        password: '',
        password2: '',
        roles: [roleAdapter1C]
      },
      { setErrors: vi.fn() }
    )

    expect(mocks.update).toHaveBeenCalledWith(7, {
      lastName: 'Updated adapter',
      email: 'adapter/updated',
      firstName: '',
      patronymic: '',
      roles: [roleAdapter1C]
    })
  })

  it('submits from the save action using the Form slot handleSubmit contract', async () => {
    const { dialog } = await mountDialog({ register: false, id: 7 })

    await dialog.findAllComponents(ActionButtonStub)[0].trigger('click')
    await flushPromises()

    expect(mocks.update).toHaveBeenCalledWith(7, {
      lastName: 'Production 1C',
      email: 'adapter-1c/prod',
      firstName: '',
      patronymic: '',
      roles: [roleAdapter1C]
    })
    expect(mocks.push).toHaveBeenCalledWith('/users')
  })

  it('blocks a human account opened through the automated-system route', async () => {
    mocks.getById.mockResolvedValueOnce({
      id: 8,
      firstName: 'Human',
      lastName: 'User',
      email: 'human@example.com',
      roles: [roleLogist]
    })

    const { dialog } = await mountDialog({ register: false, id: 8 })

    expect(dialog.vm.$.setupState.initializationFailed).toBe(true)
    expect(mocks.alertError).toHaveBeenCalledWith(
      'Выбранная учетная запись не является автоматизированной системой'
    )
    expect(dialog.find('fieldset').attributes('disabled')).toBeDefined()

    await dialog.vm.$.setupState.onSubmit({
      lastName: 'Should not save',
      email: 'blocked',
      roles: [roleAdapter1C]
    })
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('keeps the dialog open and maps server validation when save fails', async () => {
    const error = Object.assign(new Error('Ошибка проверки'), {
      data: { errors: { Email: ['Идентификатор уже используется'] } }
    })
    mocks.add.mockRejectedValueOnce(error)
    const setErrors = vi.fn()
    const { dialog } = await mountDialog({ register: true, id: undefined })

    await dialog.vm.$.setupState.onSubmit(
      {
        lastName: 'Adapter',
        email: 'duplicate',
        password: 'Password1!',
        roles: [roleAdapter1C]
      },
      { setErrors }
    )

    expect(setErrors).toHaveBeenCalledWith({ email: 'Идентификатор уже используется' })
    expect(mocks.push).not.toHaveBeenCalled()
  })
})
