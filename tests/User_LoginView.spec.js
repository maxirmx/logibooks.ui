/* @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import UserLoginView from '@/views/User_LoginView.vue'
import { resolveAll } from './helpers/test-utils'

const routerPush = vi.hoisted(() => vi.fn())
const loginMock = vi.hoisted(() => vi.fn().mockResolvedValue())
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

const FormStub = {
  template: '<form @submit.prevent="$emit(\'submit\')"><slot :errors="{}" :isSubmitting="false" /></form>'
}
const FieldStub = {
  props: ['name', 'id', 'type'],
  template: '<input :id="id" :type="type" />'
}

describe('User_LoginView.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authStore = { login: loginMock, isAdmin: false, user: { id: 1 } }
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
    authStore.isAdmin = true
    const wrapper = mount(UserLoginView, {
      global: { stubs: { Form: FormStub, Field: FieldStub, 'font-awesome-icon': true } }
    })
    await wrapper.vm.onSubmit({ login_email: 'a', login_password: 'b' }, { setErrors: vi.fn() })
    await resolveAll()
    expect(loginMock).toHaveBeenCalledWith('a', 'b')
    expect(routerPush).toHaveBeenCalledWith('/users')
  })

  it('redirects non-admin to edit page', async () => {
    authStore.isAdmin = false
    const wrapper = mount(UserLoginView, {
      global: { stubs: { Form: FormStub, Field: FieldStub, 'font-awesome-icon': true } }
    })
    await wrapper.vm.onSubmit({ login_email: 'a', login_password: 'b' }, { setErrors: vi.fn() })
    await resolveAll()
    expect(routerPush).toHaveBeenCalledWith('/user/edit/1')
  })
})
