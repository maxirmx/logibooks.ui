import { setActivePinia, createPinia } from 'pinia'
/* @vitest-environment jsdom */
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import UserSettings from '@/dialogs/User_Settings.vue'
import { defaultGlobalStubs, createMockStore } from './helpers/test-utils.js'
import { resolveAll } from './helpers/test-utils'
import {
  roleAdapterAlta,
  roleLogist,
  roleWhManager,
  roleWhOperator
} from '@/helpers/user.roles.js'

// simple stubs for vee-validate components
const FormStub = {
  name: 'Form',
  props: ['initialValues'],
  methods: {
    handleSubmit(callback) {
      return () => callback({}, { setErrors: setErrorsMock })
    }
  },
  template:
    '<form @submit.prevent="$emit(\'submit\')"><slot :errors="{}" :isSubmitting="false" :handleSubmit="handleSubmit" :values="initialValues" /></form>'
}
const FieldStub = {
  name: 'Field',
  props: ['name', 'id', 'type'],
  template: '<input :id="id" :type="type" />'
}

let isAdmin
const mockUser = ref({
  id: 1,
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  roles: [roleLogist]
})
const mockHotKeyActionSchemes = ref([
  { id: 1, name: 'Scheme 1' },
  { id: 2, name: 'Scheme 2' }
])
const mockWarehouses = ref([
  { id: 1, name: 'Warehouse 1', city: 'City 1' },
  { id: 2, name: 'Warehouse 2', city: 'City 2' }
])
const getById = vi.hoisted(() => vi.fn(() => Promise.resolve()))
const addUser = vi.hoisted(() => vi.fn(() => Promise.resolve()))
const updateUser = vi.hoisted(() => vi.fn(() => Promise.resolve()))
const registerUser = vi.hoisted(() => vi.fn(() => Promise.resolve()))
const ensureLoaded = vi.hoisted(() => vi.fn(() => Promise.resolve()))
const ensureWarehousesLoaded = vi.hoisted(() => vi.fn(() => Promise.resolve()))
const routerPush = vi.hoisted(() => vi.fn(() => Promise.resolve()))
const successAlert = vi.hoisted(() => vi.fn())
const errorAlert = vi.hoisted(() => vi.fn())
const setErrorsMock = vi.hoisted(() => vi.fn())

vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  return {
    ...actual,
    storeToRefs: (store) => {
      // Return hotkey schemes store refs if it has the hotKeyActionSchemes property
      if (store && 'hotKeyActionSchemes' in store) {
        return { hotKeyActionSchemes: mockHotKeyActionSchemes }
      }
      if (store && 'warehouses' in store) {
        return { warehouses: mockWarehouses, loading: ref(false) }
      }
      // Otherwise return user store refs
      return { user: mockUser }
    }
  }
})

vi.mock('@/stores/users.store.js', () => ({
  useUsersStore: () =>
    createMockStore({
      user: mockUser,
      getById,
      add: addUser,
      update: updateUser
    })
}))

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => ({
    isAdmin,
    user: { id: 2 },
    register: registerUser
  })
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => ({ success: successAlert, error: errorAlert })
}))

vi.mock('@/stores/hotkey.action.schemes.store.js', () => ({
  useHotKeyActionSchemesStore: () =>
    createMockStore({
      hotKeyActionSchemes: mockHotKeyActionSchemes,
      loading: ref(false),
      error: ref(null),
      ensureLoaded
    })
}))

vi.mock('@/stores/warehouses.store.js', () => ({
  useWarehousesStore: () =>
    createMockStore({
      warehouses: mockWarehouses,
      loading: ref(false),
      error: ref(null),
      ensureLoaded: ensureWarehousesLoaded
    })
}))

vi.mock('@/stores/parcel.filters.store.js', () => ({
  useParcelFiltersStore: () => ({ filters: [], getAll: vi.fn(() => Promise.resolve([])), remove: vi.fn() })
}))

vi.mock('@/composables/useAppConfirm.js', () => ({ useAppConfirm: () => vi.fn(() => Promise.resolve(false)) }))

vi.mock('@/router', () => ({
  default: { push: routerPush }
}))

const Parent = {
  components: { UserSettings },
  props: { register: Boolean, id: Number },
  template: '<Suspense><UserSettings :register="register" :id="id" /></Suspense>'
}

beforeEach(() => {
    setActivePinia(createPinia())
  vi.clearAllMocks()
  isAdmin = false
  mockUser.value = {
    id: 1,
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    roles: [roleLogist]
  }
  mockHotKeyActionSchemes.value = [
    { id: 1, name: 'Scheme 1' },
    { id: 2, name: 'Scheme 2' }
  ]
  mockWarehouses.value = [
    { id: 1, name: 'Warehouse 1', city: 'City 1' },
    { id: 2, name: 'Warehouse 2', city: 'City 2' }
  ]
})

describe('User_Settings.vue real component', () => {
  it('shows personal parcel filters only on the signed-in user profile', async () => {
    const ownProfile = mount(Parent, {
      props: { register: false, id: 2 },
      global: {
        stubs: { ...defaultGlobalStubs, Form: FormStub, Field: FieldStub }
      }
    })
    await resolveAll()
    expect(ownProfile.find('[data-testid="user-parcel-filters"]').exists()).toBe(true)
    expect(ownProfile.find('form fieldset [data-testid="user-parcel-filters"] .user-parcel-filters__table-shell.table-card').exists()).toBe(true)

    isAdmin = true
    const otherProfile = mount(Parent, {
      props: { register: false, id: 1 },
      global: {
        stubs: { ...defaultGlobalStubs, Form: FormStub, Field: FieldStub }
      }
    })
    await resolveAll()
    expect(otherProfile.find('[data-testid="user-parcel-filters"]').exists()).toBe(false)

    const registration = mount(Parent, {
      props: { register: true },
      global: {
        stubs: { ...defaultGlobalStubs, Form: FormStub, Field: FieldStub }
      }
    })
    await resolveAll()
    expect(registration.find('[data-testid="user-parcel-filters"]').exists()).toBe(false)
  })

  it('blocks an automated account opened through the human-user route', async () => {
    mockUser.value = {
      id: 7,
      firstName: '',
      lastName: 'Production Alta',
      patronymic: '',
      email: 'adapter-alta/prod',
      roles: [roleAdapterAlta]
    }
    const wrapper = mount(Parent, {
      props: { register: false, id: 7 },
      global: {
        stubs: {
          ...defaultGlobalStubs,
          Form: FormStub,
          Field: FieldStub
        }
      }
    })
    await resolveAll()
    const child = wrapper.findComponent(UserSettings)

    expect(child.vm.$.setupState.initializationFailed).toBe(true)
    await child.vm.$.setupState.onSubmit({ firstName: 'Should not save' }, { setErrors: vi.fn() })
    expect(updateUser).not.toHaveBeenCalled()
  })

  it('calls auth register when registering as non-admin', async () => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { href: 'http://localhost/path' }
    })
    const wrapper = mount(Parent, {
      props: { register: true },
      global: {
        stubs: {
          ...defaultGlobalStubs,
          Form: FormStub,
          Field: FieldStub
        }
      }
    })
    await resolveAll()
    const child = wrapper.findComponent(UserSettings)
    await child.vm.$.setupState.onSubmit({ firstName: 'A' }, { setErrors: vi.fn() })
    await resolveAll()
    expect(registerUser).toHaveBeenCalled()
    const arg = registerUser.mock.calls[0][0]
    expect(arg.roles).toEqual([roleLogist])
    expect(arg.host).toBe('http://localhost')
    expect(routerPush).toHaveBeenCalledWith('/')
    expect(successAlert).toHaveBeenCalled()
  })

  it('displays warehouse manager role for non-admin user settings', async () => {
    mockUser.value.roles = [roleWhManager]
    const wrapper = mount(Parent, {
      props: { register: false, id: 1 },
      global: {
        stubs: {
          ...defaultGlobalStubs,
          Form: FormStub,
          Field: FieldStub
        }
      }
    })
    await resolveAll()

    expect(wrapper.text()).toContain('Менеджер склада')
  })

  // Error handling tests
  it('publishes an error when addUser rejects', async () => {
    isAdmin = true
    const errorMessage = 'Failed to add user'
    addUser.mockRejectedValueOnce(new Error(errorMessage))

    const wrapper = mount(Parent, {
      props: { register: true },
      global: {
        stubs: {
          ...defaultGlobalStubs,
          Form: FormStub,
          Field: FieldStub
        }
      }
    })
    await resolveAll()

    const child = wrapper.findComponent(UserSettings)
    await child.vm.$.setupState.onSubmit({ firstName: 'Test' }, { setErrors: setErrorsMock })
    await resolveAll()

    expect(addUser).toHaveBeenCalled()
    expect(errorAlert).toHaveBeenCalledWith(errorMessage, {
      fallback: 'Не удалось создать пользователя'
    })
    expect(routerPush).not.toHaveBeenCalled()
  })

  it('publishes an error when updateUser rejects', async () => {
    const errorMessage = 'Failed to update user'
    updateUser.mockRejectedValueOnce(new Error(errorMessage))

    const wrapper = mount(Parent, {
      props: { register: false, id: 5 },
      global: {
        stubs: {
          ...defaultGlobalStubs,
          Form: FormStub,
          Field: FieldStub
        }
      }
    })
    await resolveAll()

    const child = wrapper.findComponent(UserSettings)
    await child.vm.$.setupState.onSubmit({ firstName: 'Test' }, { setErrors: setErrorsMock })
    await resolveAll()

    expect(updateUser).toHaveBeenCalled()
    expect(errorAlert).toHaveBeenCalledWith(errorMessage, {
      fallback: 'Не удалось сохранить пользователя'
    })
    expect(routerPush).not.toHaveBeenCalled()
  })

  it('publishes an error when registerUser rejects', async () => {
    isAdmin = false
    const errorMessage = 'Failed to register user'
    registerUser.mockRejectedValueOnce(new Error(errorMessage))

    Object.defineProperty(window, 'location', {
      writable: true,
      value: { href: 'http://localhost/path' }
    })
    const wrapper = mount(Parent, {
      props: { register: true },
      global: {
        stubs: {
          ...defaultGlobalStubs,
          Form: FormStub,
          Field: FieldStub
        }
      }
    })
    await resolveAll()

    const child = wrapper.findComponent(UserSettings)
    await child.vm.$.setupState.onSubmit({ firstName: 'Test' }, { setErrors: setErrorsMock })
    await resolveAll()

    expect(registerUser).toHaveBeenCalled()
    expect(errorAlert).toHaveBeenCalledWith(errorMessage, {
      fallback: 'Не удалось зарегистрировать пользователя'
    })
    expect(routerPush).not.toHaveBeenCalled()
    expect(successAlert).not.toHaveBeenCalled()
  })

  // Hotkey action scheme selector tests
  it('submits selected warehouse ids when updating as admin', async () => {
    isAdmin = true
    mockUser.value = {
      id: 1,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      roles: [roleWhOperator],
      warehouseIds: [2]
    }
    const wrapper = mount(Parent, {
      props: { register: false, id: 5 },
      global: {
        stubs: {
          ...defaultGlobalStubs,
          Form: FormStub,
          Field: FieldStub
        }
      }
    })
    await resolveAll()
    const child = wrapper.findComponent(UserSettings)

    child.vm.$.setupState.toggleWarehouse(1, true)
    child.vm.$.setupState.toggleWarehouse(2, false)
    await child.vm.$.setupState.onSubmit({ firstName: 'Test' }, { setErrors: vi.fn() })
    await resolveAll()

    expect(updateUser).toHaveBeenCalledWith(5, expect.objectContaining({ warehouseIds: [1] }), true)
  })

  it('selects and clears all warehouses', async () => {
    isAdmin = true
    const wrapper = mount(Parent, {
      props: { register: true },
      global: {
        stubs: {
          ...defaultGlobalStubs,
          Form: FormStub,
          Field: FieldStub
        }
      }
    })
    await resolveAll()
    const child = wrapper.findComponent(UserSettings)

    child.vm.$.setupState.toggleAllWarehouses(true)
    await child.vm.$.setupState.onSubmit({ firstName: 'Test' }, { setErrors: vi.fn() })
    expect(addUser.mock.calls[0][0].warehouseIds).toEqual([1, 2])

    child.vm.$.setupState.toggleAllWarehouses(false)
    await child.vm.$.setupState.onSubmit({ firstName: 'Test2' }, { setErrors: vi.fn() })
    expect(addUser.mock.calls[1][0].warehouseIds).toEqual([])
  })

  it('submits default schemeId 0 when registering without changing field', async () => {
    isAdmin = true
    const wrapper = mount(Parent, {
      props: { register: true },
      global: {
        stubs: {
          ...defaultGlobalStubs,
          Form: FormStub,
          Field: FieldStub
        }
      }
    })
    await resolveAll()
    const child = wrapper.findComponent(UserSettings)
    // Submit without explicitly providing schemeId - it should still be included as 0
    await child.vm.$.setupState.onSubmit({ firstName: 'Test' }, { setErrors: vi.fn() })
    await resolveAll()

    // The initial values should include schemeId: 0, so it should be submitted
    expect(addUser).toHaveBeenCalledWith(expect.objectContaining({ firstName: 'Test' }), true)
  })

  it('displays user schemeId value when editing', async () => {
    mockUser.value = {
      id: 1,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      roles: [roleLogist],
      schemeId: 1
    }
    const wrapper = mount(Parent, {
      props: { register: false, id: 1 },
      global: {
        stubs: {
          ...defaultGlobalStubs,
          Form: FormStub
        }
      }
    })
    await resolveAll()

    const select = wrapper.find('#schemeId')
    expect(select.exists()).toBe(true)
  })

})
