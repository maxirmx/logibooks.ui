/* @vitest-environment jsdom */
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import AutomatedSystemSettings from '@/dialogs/AutomatedSystem_Settings.vue'
import { roleAdapter1C, roleAdapterAlta, roleAdapterRegister, roleLogist } from '@/helpers/user.roles.js'

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

async function mountDialog(props, stubs = {}) {
  const Parent = {
    components: { AutomatedSystemSettings },
    template:
      '<Suspense><AutomatedSystemSettings :register="register" :id="id" /></Suspense>',
    data: () => props
  }
  const wrapper = mount(Parent, { global: { stubs: { ...globalStubs, ...stubs } } })
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

  describe('responsive role controls with real form validation', () => {
    let wrapper

    async function mountRoleForm() {
      const mounted = await mountDialog({ register: true }, {
        Form: false,
        Field: false,
        FieldError: false
      })
      wrapper = mounted.wrapper
      await wrapper.get('#lastName').setValue('Сарафан')
      await wrapper.get('#email').setValue('Sarafan')
      await wrapper.get('#password').setValue('Password1!')
      await wrapper.get('#password2').setValue('Password1!')
    }

    afterEach(() => wrapper?.unmount())

    it.each([
      ['roleAdapter1C', roleAdapter1C, 'Адаптер 1С'],
      ['roleAdapterAlta', roleAdapterAlta, 'Адаптер Альта'],
      ['roleAdapterRegister', roleAdapterRegister, 'Адаптер реестров']
    ])('keeps %s paired with its label and submits its selected value', async (id, role, label) => {
      await mountRoleForm()

      const option = wrapper.get(`#${id}`).element.parentElement
      expect(option.classList.contains('role-option')).toBe(true)
      expect(option.parentElement.classList.contains('role-selection')).toBe(true)
      expect(option.querySelector(`label[for="${id}"]`).textContent).toBe(label)
      expect(wrapper.findAll('.role-option')).toHaveLength(3)

      await wrapper.get(`#${id}`).setValue(true)
      await wrapper.get('.header-actions button').trigger('click')
      await vi.waitFor(() => expect(mocks.push).toHaveBeenCalledExactlyOnceWith('/users'))

      expect(mocks.add).toHaveBeenCalledExactlyOnceWith({
        lastName: 'Сарафан',
        email: 'Sarafan',
        firstName: '',
        patronymic: '',
        password: 'Password1!',
        roles: [role]
      })
      expect(wrapper.findAll('.invalid-feedback')).toHaveLength(0)
    })

    it('renders one role error below the group and retries with the register role', async () => {
      await mountRoleForm()
      await wrapper.get('.header-actions button').trigger('click')
      await vi.waitFor(() => expect(wrapper.findAll('.invalid-feedback')).toHaveLength(1))

      const error = wrapper.get('.role-group > .invalid-feedback')
      expect(error.text()).toBe('Необходимо выбрать роль автоматизированной системы')
      expect(error.attributes('role')).toBe('alert')
      expect(error.element.previousElementSibling).toBe(wrapper.get('.role-selection').element)
      expect(wrapper.findAll('.role-option .invalid-feedback')).toHaveLength(0)
      expect(mocks.add).not.toHaveBeenCalled()
      expect(mocks.push).not.toHaveBeenCalled()

      const serverError = Object.assign(new Error('Ошибка проверки'), {
        data: { errors: { Email: ['Идентификатор уже используется'] } }
      })
      mocks.add.mockRejectedValueOnce(serverError)
      await wrapper.get('#roleAdapterRegister').setValue(true)
      await wrapper.get('.header-actions button').trigger('click')
      await vi.waitFor(() => expect(wrapper.get('#email').classes()).toContain('is-invalid'))

      expect(wrapper.findAll('.invalid-feedback')).toHaveLength(1)
      const emailError = wrapper.get('#email').element.nextElementSibling
      expect(emailError.textContent.trim()).toBe('Идентификатор уже используется')
      expect(emailError.getAttribute('role')).toBe('alert')
      expect(wrapper.get('#lastName').element.value).toBe('Сарафан')
      expect(wrapper.get('#email').element.value).toBe('Sarafan')
      expect(wrapper.get('#password').element.value).toBe('Password1!')
      expect(wrapper.get('#roleAdapterRegister').element.checked).toBe(true)
      expect(mocks.push).not.toHaveBeenCalled()
      expect(mocks.alertError).not.toHaveBeenCalled()

      await wrapper.get('#email').setValue('Sarafan2')
      await wrapper.get('.header-actions button').trigger('click')
      await vi.waitFor(() => expect(mocks.push).toHaveBeenCalledExactlyOnceWith('/users'))

      expect(mocks.add).toHaveBeenCalledTimes(2)
      expect(mocks.add).toHaveBeenLastCalledWith(expect.objectContaining({
        email: 'Sarafan2',
        roles: [roleAdapterRegister]
      }))
      expect(wrapper.findAll('.invalid-feedback')).toHaveLength(0)
    })
  })
})
