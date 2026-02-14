/* @vitest-environment jsdom */
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import UserSettings from '@/dialogs/User_Settings.vue'
import { defaultGlobalStubs, createMockStore } from './helpers/test-utils.js'
import { resolveAll } from './helpers/test-utils'
import { roleLogist } from '@/helpers/user.roles.js'

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
const mockUser = ref({ id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com', roles: [roleLogist] })
const mockHotKeyActionSchemes = ref([
  { id: 1, name: 'Scheme 1' },
  { id: 2, name: 'Scheme 2' }
])
const getById = vi.hoisted(() => vi.fn(() => Promise.resolve()))
const addUser = vi.hoisted(() => vi.fn(() => Promise.resolve()))
const updateUser = vi.hoisted(() => vi.fn(() => Promise.resolve()))
const registerUser = vi.hoisted(() => vi.fn(() => Promise.resolve()))
const ensureLoaded = vi.hoisted(() => vi.fn(() => Promise.resolve()))
const routerPush = vi.hoisted(() => vi.fn(() => Promise.resolve()))
const successAlert = vi.hoisted(() => vi.fn())
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
      // Otherwise return user store refs
      return { user: mockUser }
    }
  }
})

vi.mock('@/stores/users.store.js', () => ({
  useUsersStore: () => createMockStore({
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

vi.mock('@/stores/hotkey.action.schemes.store.js', () => ({
  useHotKeyActionSchemesStore: () => createMockStore({
    hotKeyActionSchemes: mockHotKeyActionSchemes,
    loading: ref(false),
    error: ref(null),
    ensureLoaded
  })
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
  mockUser.value = { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com', roles: [roleLogist] }
  mockHotKeyActionSchemes.value = [
    { id: 1, name: 'Scheme 1' },
    { id: 2, name: 'Scheme 2' }
  ]
})

describe('User_Settings.vue real component', () => {
  it('fetches user by id when editing', async () => {
    mount(Parent, {
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
    expect(getById).toHaveBeenCalledWith(5, true)
  })

  it('calls auth register when registering as non-admin', async () => {
    Object.defineProperty(window, 'location', { writable: true, value: { href: 'http://localhost/path' } })
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

  it('calls add when registering as admin', async () => {
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
    await child.vm.$.setupState.onSubmit({ firstName: 'B' }, { setErrors: vi.fn() })
    await resolveAll()
    expect(addUser).toHaveBeenCalledWith(expect.any(Object), true)
    expect(routerPush).toHaveBeenCalledWith('/users')
  })

  it('updates user when editing as admin', async () => {
    isAdmin = true
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
    await child.vm.$.setupState.onSubmit({ firstName: 'C' }, { setErrors: vi.fn() })
    await resolveAll()
    expect(updateUser).toHaveBeenCalledWith(7, expect.any(Object), true)
    expect(routerPush).toHaveBeenCalledWith('/users')
  })

  it('updates user roles when editing as non-admin', async () => {
    mockUser.value.roles = [roleLogist]
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
    const child = wrapper.findComponent(UserSettings)
    await child.vm.$.setupState.onSubmit({ firstName: 'D' }, { setErrors: vi.fn() })
    await resolveAll()
    expect(updateUser).toHaveBeenCalled()
    const args = updateUser.mock.calls[0]
    expect(args[1].roles).toEqual([roleLogist])
    expect(routerPush).toHaveBeenCalledWith('/user/edit/2')
  })

  // Error handling tests
  it('sets errors when addUser rejects', async () => {
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
    expect(setErrorsMock).toHaveBeenCalledWith({ apiError: errorMessage })
    expect(routerPush).not.toHaveBeenCalled()
  })

  it('sets errors when updateUser rejects', async () => {
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
    expect(setErrorsMock).toHaveBeenCalledWith({ apiError: errorMessage })
    expect(routerPush).not.toHaveBeenCalled()
    expect(successAlert).not.toHaveBeenCalled()
  })

  // Hotkey action scheme selector tests
  it('calls ensureLoaded on hotkey action schemes store', async () => {
    mount(Parent, {
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
    expect(ensureLoaded).toHaveBeenCalled()
  })

  it('renders schemeId selector with default option', async () => {
    const wrapper = mount(Parent, {
      props: { register: true },
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
    const options = select.findAll('option')
    expect(options.length).toBe(3) // "Без схемы" + 2 schemes
    expect(options[0].text()).toBe('Без схемы')
    expect(options[0].element.value).toBe('0')
  })

  it('renders schemeId selector with all schemes from store', async () => {
    const wrapper = mount(Parent, {
      props: { register: true },
      global: { 
        stubs: { 
          ...defaultGlobalStubs,
          Form: FormStub
        } 
      }
    })
    await resolveAll()
    
    const select = wrapper.find('#schemeId')
    const options = select.findAll('option')
    expect(options[1].text()).toBe('Scheme 1')
    expect(options[1].element.value).toBe('1')
    expect(options[2].text()).toBe('Scheme 2')
    expect(options[2].element.value).toBe('2')
  })

  it('submits schemeId value when registering as admin', async () => {
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
    await child.vm.$.setupState.onSubmit({ firstName: 'Test', schemeId: 1 }, { setErrors: vi.fn() })
    await resolveAll()
    
    expect(addUser).toHaveBeenCalledWith(expect.objectContaining({ schemeId: 1 }), true)
  })

  it('submits schemeId value when updating user as admin', async () => {
    isAdmin = true
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
    await child.vm.$.setupState.onSubmit({ firstName: 'Test', schemeId: 2 }, { setErrors: vi.fn() })
    await resolveAll()
    
    expect(updateUser).toHaveBeenCalledWith(5, expect.objectContaining({ schemeId: 2 }), true)
  })

  it('submits schemeId value 0 for "Без схемы" option', async () => {
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
    await child.vm.$.setupState.onSubmit({ firstName: 'Test', schemeId: 0 }, { setErrors: vi.fn() })
    await resolveAll()
    
    expect(addUser).toHaveBeenCalledWith(expect.objectContaining({ schemeId: 0 }), true)
  })

  it('handles empty schemes list gracefully', async () => {
    mockHotKeyActionSchemes.value = []
    const wrapper = mount(Parent, {
      props: { register: true },
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
    const options = select.findAll('option')
    expect(options.length).toBe(1) // Only "Без схемы"
    expect(options[0].text()).toBe('Без схемы')
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

  it('submits schemeId when registering as non-admin', async () => {
    isAdmin = false
    Object.defineProperty(window, 'location', { writable: true, value: { href: 'http://localhost/path' } })
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
    await child.vm.$.setupState.onSubmit({ firstName: 'Test', schemeId: 2 }, { setErrors: vi.fn() })
    await resolveAll()
    
    expect(registerUser).toHaveBeenCalledWith(expect.objectContaining({ schemeId: 2 }))
  })

  it('submits schemeId when updating as non-admin', async () => {
    isAdmin = false
    mockUser.value.roles = [roleLogist]
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
    const child = wrapper.findComponent(UserSettings)
    await child.vm.$.setupState.onSubmit({ firstName: 'Test', schemeId: 1 }, { setErrors: vi.fn() })
    await resolveAll()
    
    expect(updateUser).toHaveBeenCalledWith(1, expect.objectContaining({ schemeId: 1 }), true)
  })
})

