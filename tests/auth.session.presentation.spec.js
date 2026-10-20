// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { RouterView } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { roleLogist } from '@/helpers/user.roles.js'
import router from '@/router'

vi.mock('@/helpers/config.js', () => ({ apiUrl: 'http://localhost/api', enableLog: false }))
vi.mock('@/views/User_RecoverView.vue', () => ({ default: { template: '<div>Восстановление пароля</div>' } }))
vi.mock('@/views/Registers_View.vue', () => ({ default: { template: '<div>Реестры</div>' } }))

describe('authentication failure presentation', () => {
  let wrapper
  let auth
  let alerts
  let request
  const user = { id: 7, email: 'user@example.com', token: 'expired', roles: [roleLogist] }
  const target = '/registers?statusId=5'

  function response(status, payload = {}) {
    return { ok: status < 400, status, text: async () => JSON.stringify(payload) }
  }

  beforeEach(async () => {
    localStorage.clear()
    sessionStorage.clear()
    const pinia = createPinia()
    setActivePinia(pinia)
    localStorage.setItem('user', JSON.stringify(user))
    auth = useAuthStore()
    alerts = useAlertStore()
    request = vi.fn().mockResolvedValue(response(204))
    vi.stubGlobal('fetch', request)
    await router.replace('/recover')
    wrapper = mount({ components: { RouterView }, template: '<RouterView />' }, {
      global: { plugins: [pinia, router], stubs: { 'font-awesome-icon': true } }
    })
    await flushPromises()
  })

  afterEach(() => {
    wrapper.unmount()
    vi.unstubAllGlobals()
    localStorage.clear()
    sessionStorage.clear()
  })

  async function navigateToLogin(path = target) {
    await router.push(path)
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/login')
    expect(wrapper.find('#login_email').exists()).toBe(true)
  }

  it('shows an expired session once and preserves its return URL through the login redirect', async () => {
    alerts.error('Предыдущее сообщение')
    request.mockResolvedValue(response(401, { msg: 'Unauthorized', errors: {} }))
    const published = vi.spyOn(alerts, 'error')
    await navigateToLogin()
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.get('[role="alert"]').text()).toContain('Необходимо войти в систему')
    expect(wrapper.text()).not.toContain('Сервер недоступен')
    expect(auth.user).toBeNull()
    expect(localStorage.getItem('user')).toBeNull()
    expect(auth.returnUrl).toBe(target)
    expect(published).toHaveBeenCalledExactlyOnceWith('Необходимо войти в систему')
    expect(request).toHaveBeenCalledTimes(2)
  })

  it('clears a stale session and shows the same message when login is opened directly', async () => {
    request.mockResolvedValue(response(401, { msg: 'Unauthorized' }))
    await navigateToLogin('/login')
    expect(wrapper.get('[role="alert"]').text()).toContain('Необходимо войти в систему')
    expect(auth.user).toBeNull()
    expect(localStorage.getItem('user')).toBeNull()
  })

  it('does not report an ordinary anonymous visit to login as an expired session', async () => {
    auth.clearSession()
    request.mockResolvedValue(response(401))
    await navigateToLogin('/login')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it.each(['network', 503])('keeps downtime distinct from session expiration for %s failures', async failure => {
    if (failure === 'network') request.mockRejectedValue(new TypeError('Failed to fetch'))
    else request.mockResolvedValue(response(failure, { msg: 'Service unavailable', errors: {} }))
    await navigateToLogin()
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.get('[role="alert"]').text()).toContain('Сервер недоступен')
    expect(wrapper.text()).not.toContain('Необходимо войти в систему')
    expect(auth.returnUrl).toBe(target)
  })

  it.each([400, 403, 429])('presents the actual HTTP %s rejection without calling it downtime or expiration', async status => {
    const message = 'Запрос отклонён сервером'
    request.mockResolvedValue(response(status, { msg: message, errors: {} }))
    await navigateToLogin()
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.get('[role="alert"]').text()).toContain(message)
    expect(wrapper.text()).not.toContain('Сервер недоступен')
    expect(wrapper.text()).not.toContain('Необходимо войти в систему')
  })

  it('returns to the intended page after signing in again and clears the expiration message', async () => {
    request.mockResolvedValue(response(401))
    await navigateToLogin()
    const renewed = { ...user, token: 'renewed' }
    request.mockImplementation(async url => url.endsWith('/auth/login')
      ? response(200, renewed)
      : response(url.endsWith('/auth/check') ? 204 : 200))
    await auth.login(user.email, 'password')
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe(target)
    expect(wrapper.text()).toContain('Реестры')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(auth.returnUrl).toBeNull()
    expect(auth.user.token).toBe('renewed')
    expect(request).toHaveBeenCalledWith('http://localhost/api/auth/login', expect.objectContaining({
      method: 'POST', body: JSON.stringify({ email: user.email, password: 'password' })
    }))
  })
})
