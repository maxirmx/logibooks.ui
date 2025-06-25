/* @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import UserSettings from '@/components/User_Settings.vue'
import { resolveAll } from './helpers/test-utils'

// simple stubs for vee-validate components
const FormStub = {
  name: 'Form',
  template: '<form @submit.prevent="$emit(\'submit\')"><slot :errors="{}" :isSubmitting="false" /></form>'
}
const FieldStub = {
  name: 'Field',
  props: ['name','id','type'],
  template: '<input :id="id" :type="type" />'
}

let isAdmin
const mockUser = ref({ id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com', roles: ['logist'] })
const getById = vi.hoisted(() => vi.fn(() => Promise.resolve()))
const addUser = vi.hoisted(() => vi.fn(() => Promise.resolve()))
const updateUser = vi.hoisted(() => vi.fn(() => Promise.resolve()))
const registerUser = vi.hoisted(() => vi.fn(() => Promise.resolve()))
const routerPush = vi.hoisted(() => vi.fn(() => Promise.resolve()))
const successAlert = vi.hoisted(() => vi.fn())
const setErrorsMock = vi.hoisted(() => vi.fn())

vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  return { ...actual, storeToRefs: () => ({ user: mockUser }) }
})

vi.mock('@/stores/users.store.js', () => ({
  useUsersStore: () => ({
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
  useAlertStore: () => ({ success: successAlert })
}))

vi.mock('@/router', () => ({
  default: { push: routerPush }
}))

const Parent = {
  components: { UserSettings },
  props: { register: Boolean, id: Number },
  template: '<Suspense><UserSettings :register="register" :id="id" /></Suspense>'
}

beforeEach(() => {
  vi.clearAllMocks()
  isAdmin = false
  mockUser.value = { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com', roles: ['logist'] }
})

describe('User_Settings.vue real component', () => {
  it('fetches user by id when editing', async () => {
    mount(Parent, {
      props: { register: false, id: 5 },
      global: { stubs: { Form: FormStub, Field: FieldStub, 'font-awesome-icon': true } }
    })
    await resolveAll()
    expect(getById).toHaveBeenCalledWith(5, true)
  })

  it('calls auth register when registering as non-admin', async () => {
    Object.defineProperty(window, 'location', { writable: true, value: { href: 'http://localhost/path' } })
    const wrapper = mount(Parent, {
      props: { register: true },
      global: { stubs: { Form: FormStub, Field: FieldStub, 'font-awesome-icon': true } }
    })
    await resolveAll()
    const child = wrapper.findComponent(UserSettings)
    await child.vm.$.setupState.onSubmit({ firstName: 'A' }, { setErrors: vi.fn() })
    await resolveAll()
    expect(registerUser).toHaveBeenCalled()
    const arg = registerUser.mock.calls[0][0]
    expect(arg.roles).toEqual(['logist'])
    expect(arg.host).toBe('http://localhost')
    expect(routerPush).toHaveBeenCalledWith('/')
    expect(successAlert).toHaveBeenCalled()
  })

  it('calls add when registering as admin', async () => {
    isAdmin = true
    const wrapper = mount(Parent, {
      props: { register: true },
      global: { stubs: { Form: FormStub, Field: FieldStub, 'font-awesome-icon': true } }
    })
    await resolveAll()
    const child = wrapper.findComponent(UserSettings)
    await child.vm.$.setupState.onSubmit({ firstName: 'B' }, { setErrors: vi.fn() })
    await resolveAll()
    expect(addUser).toHaveBeenCalledWith(expect.any(Object), true)
    expect(routerPush).toHaveBeenCalledWith('/users')
  })

  it('updates user when editing as admin', async () => {
    isAdmin = true
    const wrapper = mount(Parent, {
      props: { register: false, id: 7 },
      global: { stubs: { Form: FormStub, Field: FieldStub, 'font-awesome-icon': true } }
    })
    await resolveAll()
    const child = wrapper.findComponent(UserSettings)
    await child.vm.$.setupState.onSubmit({ firstName: 'C' }, { setErrors: vi.fn() })
    await resolveAll()
    expect(updateUser).toHaveBeenCalledWith(7, expect.any(Object), true)
    expect(routerPush).toHaveBeenCalledWith('/users')
  })

  it('updates user roles when editing as non-admin', async () => {
    mockUser.value.roles = ['logist']
    const wrapper = mount(Parent, {
      props: { register: false, id: 1 },
      global: { stubs: { Form: FormStub, Field: FieldStub, 'font-awesome-icon': true } }
    })
    await resolveAll()
    const child = wrapper.findComponent(UserSettings)
    await child.vm.$.setupState.onSubmit({ firstName: 'D' }, { setErrors: vi.fn() })
    await resolveAll()
    expect(updateUser).toHaveBeenCalled()
    const args = updateUser.mock.calls[0]
    expect(args[1].roles).toEqual(['logist'])
    expect(routerPush).toHaveBeenCalledWith('/user/edit/2')
  })

  // Error handling tests
  it('sets errors when addUser rejects', async () => {
    isAdmin = true
    const errorMessage = 'Failed to add user'
    addUser.mockRejectedValueOnce(new Error(errorMessage))
    
    const wrapper = mount(Parent, {
      props: { register: true },
      global: { stubs: { Form: FormStub, Field: FieldStub, 'font-awesome-icon': true } }
    })
    await resolveAll()
    
    const child = wrapper.findComponent(UserSettings)
    await child.vm.$.setupState.onSubmit({ firstName: 'Test' }, { setErrors: setErrorsMock })
    await resolveAll()
    
    expect(addUser).toHaveBeenCalled()
    expect(setErrorsMock).toHaveBeenCalledWith({ apiError: errorMessage })
    expect(routerPush).not.toHaveBeenCalled()
  })

  it('sets errors when updateUser rejects', async () => {
    const errorMessage = 'Failed to update user'
    updateUser.mockRejectedValueOnce(new Error(errorMessage))
    
    const wrapper = mount(Parent, {
      props: { register: false, id: 5 },
      global: { stubs: { Form: FormStub, Field: FieldStub, 'font-awesome-icon': true } }
    })
    await resolveAll()
    
    const child = wrapper.findComponent(UserSettings)
    await child.vm.$.setupState.onSubmit({ firstName: 'Test' }, { setErrors: setErrorsMock })
    await resolveAll()
    
    expect(updateUser).toHaveBeenCalled()
    expect(setErrorsMock).toHaveBeenCalledWith({ apiError: errorMessage })
    expect(routerPush).not.toHaveBeenCalled()
  })

  it('sets errors when registerUser rejects', async () => {
    isAdmin = false
    const errorMessage = 'Failed to register user'
    registerUser.mockRejectedValueOnce(new Error(errorMessage))
    
    Object.defineProperty(window, 'location', { writable: true, value: { href: 'http://localhost/path' } })
    const wrapper = mount(Parent, {
      props: { register: true },
      global: { stubs: { Form: FormStub, Field: FieldStub, 'font-awesome-icon': true } }
    })
    await resolveAll()
    
    const child = wrapper.findComponent(UserSettings)
    await child.vm.$.setupState.onSubmit({ firstName: 'Test' }, { setErrors: setErrorsMock })
    await resolveAll()
    
    expect(registerUser).toHaveBeenCalled()
    expect(setErrorsMock).toHaveBeenCalledWith({ apiError: errorMessage })
    expect(routerPush).not.toHaveBeenCalled()
    expect(successAlert).not.toHaveBeenCalled()
  })
})
