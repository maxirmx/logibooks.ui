// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { h, nextTick } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import ActionButton from '@/components/ActionButton.vue'
import PageAlertRegion from '@/components/PageAlertRegion.vue'
import RegisterViewToggle from '@/components/RegisterViewToggle.vue'
import { OP_MODE_PAPERWORK, OP_MODE_WAREHOUSE } from '@/helpers/op.mode.js'
import { roleLogist, roleShiftLead, roleWhOperator } from '@/helpers/user.roles.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { vuetifyStubs } from './helpers/test-utils.js'

const routing = vi.hoisted(() => ({ router: null }))
vi.mock('@/router', () => ({
  default: {
    get currentRoute() { return routing.router.currentRoute },
    push: (location) => routing.router.push(location)
  }
}))

const button = (wrapper) => wrapper.get('button.anti-btn')
const currentQuery = () => routing.router.currentRoute.value.query
let pinia
let wrapper

beforeEach(() => {
  pinia = createPinia()
  const routeView = { render: () => h('div') }
  routing.router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/registers', component: routeView },
      { path: '/registers/:id/parcels', component: routeView }
    ]
  })
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  vi.restoreAllMocks()
})

async function mountToggle(location = '/registers', { roles = [roleShiftLead], ...props } = {}) {
  await routing.router.push(location)
  useAuthStore(pinia).user = { id: 1, roles }
  wrapper = mount({
    render: () => [
      h(PageAlertRegion),
      h(RegisterViewToggle, { mode: currentQuery().mode ?? OP_MODE_PAPERWORK, ...props })
    ]
  }, { global: { plugins: [pinia], stubs: vuetifyStubs } })
  return wrapper
}

it.each([
  [OP_MODE_PAPERWORK, roleLogist, 'Склад']
])('disables a switch from %s for %s while keeping its tooltip', async (mode, role, label) => {
  const view = await mountToggle({ path: '/registers', query: { mode } }, { roles: [role] })
  const push = vi.spyOn(routing.router, 'push')
  expect(button(view).element.disabled).toBe(true)
  expect(view.get('[role="button"][aria-disabled="true"]').attributes('aria-label')).toBe(label)
  expect(view.get('.v-tooltip-stub').text()).toBe(label)
  view.getComponent(ActionButton).vm.$emit('click')
  expect(push).not.toHaveBeenCalled()

  useAuthStore(pinia).user.roles.push(mode === OP_MODE_PAPERWORK ? roleWhOperator : roleLogist)
  await nextTick()
  expect(button(view).element.disabled).toBe(false)
})

it('preserves the register, box scope, selected parcel, and internal return path', async () => {
  const query = {
    mode: OP_MODE_WAREHOUSE,
    boxId: '7',
    boxCode: 'BOX-7',
    selectedParcelId: '19',
    returnUrl: '/registers/42/boxes'
  }
  const path = '/registers/42/parcels'
  const view = await mountToggle({ path, query }, { registerId: 42 })
  await button(view).trigger('click')
  await flushPromises()
  expect(routing.router.currentRoute.value.path).toBe(path)
  expect(currentQuery()).toEqual({ ...query, mode: OP_MODE_PAPERWORK })
})

it('shows a navigation abort as a single error and keeps the current mode', async () => {
  const view = await mountToggle()
  const diagnostic = vi.spyOn(console, 'error').mockImplementation(() => {})
  routing.router.beforeEach(() => false)
  await button(view).trigger('click')
  await flushPromises()
  expect(view.get('[role="alert"]').text()).toContain('Не удалось переключить режим просмотра')
  expect(diagnostic).toHaveBeenCalledTimes(1)
  expect(routing.router.currentRoute.value.fullPath).toBe('/registers')
})

it('disables the toggle while navigation is pending and leaves superseded navigation silent', async () => {
  const view = await mountToggle()
  const diagnostic = vi.spyOn(console, 'error').mockImplementation(() => {})
  const pause = Promise.withResolvers()
  routing.router.beforeEach((to) => to.query.mode === OP_MODE_WAREHOUSE ? pause.promise : undefined)

  await button(view).trigger('click')
  await flushPromises()
  expect(button(view).element.disabled).toBe(true)
  await routing.router.push('/registers/42/parcels')
  pause.resolve()
  await flushPromises()

  expect(button(view).element.disabled).toBe(false)
  expect(view.find('[role="alert"]').exists()).toBe(false)
  expect(diagnostic).not.toHaveBeenCalled()
})

it('records a rejection after unmount without publishing a stale page alert', async () => {
  const view = await mountToggle()
  const navigation = Promise.withResolvers()
  const diagnostic = vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(routing.router, 'push').mockReturnValueOnce(navigation.promise)

  await button(view).trigger('click')
  view.unmount()
  wrapper = null
  navigation.reject(new Error('router rejected after unmount'))
  await flushPromises()

  expect(diagnostic).toHaveBeenCalledTimes(1)
  expect(useAlertStore(pinia).alert).toBeNull()
})
