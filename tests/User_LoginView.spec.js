/* @vitest-environment jsdom */
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import UserLoginView from '@/views/User_LoginView.vue'
import { resolveAll } from './helpers/test-utils'

const routerPush = vi.hoisted(() => vi.fn())
const loginMock = vi.hoisted(() => vi.fn().mockResolvedValue())
const ensureLoadedMock = vi.hoisted(() => vi.fn().mockResolvedValue())
const getAllMock = vi.hoisted(() => vi.fn().mockResolvedValue())
let authStore

vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  return { ...actual, storeToRefs: (store) => store }
})

vi.mock('@/router', () => ({
  default: { push: routerPush }
}))

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => authStore
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => ({ alert: null, clear: vi.fn() })
}))

vi.mock('@/stores/parcel.statuses.store.js', () => ({
  useParcelStatusesStore: () => ({ ensureLoaded: ensureLoadedMock })
}))

vi.mock('@/stores/countries.store.js', () => ({
  useCountriesStore: () => ({ ensureLoaded: ensureLoadedMock })
}))

vi.mock('@/stores/transportation.types.store.js', () => ({
  useTransportationTypesStore: () => ({ ensureLoaded: ensureLoadedMock })
}))

vi.mock('@/stores/customs.procedures.store.js', () => ({
  useCustomsProceduresStore: () => ({ ensureLoaded: ensureLoadedMock })
}))

vi.mock('@/stores/companies.store.js', () => ({
  useCompaniesStore: () => ({ getAll: getAllMock })
}))

vi.mock('@/helpers/login.navigation.js', () => ({
  getHomeRoute: vi.fn()
}))

const FormStub = {
  template: '<form @submit.prevent="$emit(\'submit\')"><slot :errors="{}" :isSubmitting="false" /></form>'
}
const FieldStub = {
  props: ['name', 'id', 'type'],
  template: '<input :id="id" :type="type" />'
}

describe('User_LoginView.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    authStore = { 
      login: loginMock, 
      isAdmin: false, 
      isLogist: false,
      isSrLogist: false,
      user: { id: 1 } 
    }
  })

  it('toggles password visibility', async () => {
    const wrapper = mount(UserLoginView, {
      global: { stubs: { Form: FormStub, Field: FieldStub, 'font-awesome-icon': true } }
    })
    const pwdInput = wrapper.find('#login_password')
    expect(pwdInput.attributes('type')).toBe('password')
    const toggle = wrapper.find('button[type="button"]')
    await toggle.trigger('click')
    expect(wrapper.find('#login_password').attributes('type')).toBe('text')
  })

  it('redirects after successful login', async () => {
    const { getHomeRoute } = await import('@/helpers/login.navigation.js')
    getHomeRoute.mockReturnValue('/users')
    
    authStore.isAdmin = true
    const wrapper = mount(UserLoginView, {
      global: { stubs: { Form: FormStub, Field: FieldStub, 'font-awesome-icon': true } }
    })
    await wrapper.vm.onSubmit({ login_email: 'a', login_password: 'b' }, { setErrors: vi.fn() })
    await resolveAll()
    expect(loginMock).toHaveBeenCalledWith('a', 'b')
    expect(ensureLoadedMock).toHaveBeenCalled()
    expect(getAllMock).toHaveBeenCalled()
    expect(getHomeRoute).toHaveBeenCalled()
    expect(routerPush).toHaveBeenCalledWith('/users')
  })

  it('redirects non-admin to edit page', async () => {
    const { getHomeRoute } = await import('@/helpers/login.navigation.js')
    getHomeRoute.mockReturnValue('/user/edit/1')
    
    authStore.isAdmin = false
    const wrapper = mount(UserLoginView, {
      global: { stubs: { Form: FormStub, Field: FieldStub, 'font-awesome-icon': true } }
    })
    await wrapper.vm.onSubmit({ login_email: 'a', login_password: 'b' }, { setErrors: vi.fn() })
    await resolveAll()
    expect(getHomeRoute).toHaveBeenCalled()
    expect(routerPush).toHaveBeenCalledWith('/user/edit/1')
  })
})
