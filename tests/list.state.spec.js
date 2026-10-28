// Copyright (C) 2026 Maxim [maxirmx] Samsonov (http://www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { createPinia, disposePinia, setActivePinia } from 'pinia'
import { effectScope } from 'vue'
import { mount } from '@vue/test-utils'
import { AUTH_LIST_SCHEMA } from '@/helpers/auth.list.state.js'
import { LIST_STATE_STORAGE_KEY, listField } from '@/helpers/list.state.helpers.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { useListStateStore } from '@/stores/list.state.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { useListState } from '@/composables/useListState.js'
import PageAlertRegion from '@/components/PageAlertRegion.vue'
import { reportError } from '@/helpers/error.helpers.js'

vi.mock('@/router', () => ({ default: { push: vi.fn().mockResolvedValue() } }))
vi.mock('@/helpers/fetch.wrapper.js', () => ({ fetchWrapper: { get: vi.fn().mockResolvedValue({}) } }))
vi.mock('@/helpers/error.helpers.js', async original => ({ ...await original(), reportError: vi.fn() }))

const piniaInstances = []
const scopes = []
function reload() {
  const pinia = createPinia()
  piniaInstances.push(pinia)
  setActivePinia(pinia)
  return useAuthStore()
}
function inScope(fn) {
  const scope = effectScope()
  scopes.push(scope)
  return scope.run(fn)
}
function seed(lists, userId = 1) {
  sessionStorage.setItem(LIST_STATE_STORAGE_KEY, JSON.stringify({ version: 1, userId, lists }))
}
const key = (id, context = '') => JSON.stringify([id, context])
const document = () => JSON.parse(sessionStorage.getItem(LIST_STATE_STORAGE_KEY))

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  localStorage.setItem('user', JSON.stringify({ id: 1, roles: [] }))
  vi.clearAllMocks()
})
afterEach(() => {
  vi.restoreAllMocks()
  scopes.splice(0).forEach(scope => scope.stop())
  piniaInstances.splice(0).forEach(pinia => disposePinia(pinia))
})

describe('registered list controls', () => {
  it.each(Object.entries(AUTH_LIST_SCHEMA))('round-trips %s immediately', (name, field) => {
    const auth = reload()
    expect(auth[name]).toEqual(field.value)
    const value = name.endsWith('_per_page') ? -1 : name.endsWith('_page') ? 4
      : Array.isArray(field.value) ? [{ key: 'id', order: 'desc' }]
        : typeof field.value === 'boolean' ? true
          : field.value === null ? 7 : 'test filter'
    auth[name] = value
    expect(document().lists[key('auth')][name]).toEqual(value)
    expect(reload()[name]).toEqual(value)
  })

})

describe('shared local state and lifecycle', () => {
  it('hydrates controls already bound when authentication initializes', () => {
    seed({ [key('local')]: { search: 'restored' } })
    setActivePinia(createPinia())
    const local = inScope(() => useListState('local', { search: listField('') }))
    useAuthStore()
    expect(local.search.value).toBe('restored')
    useListStateStore().setUser(1)
    expect(local.search.value).toBe('restored')
  })

})

describe('storage failures', () => {
  it.each([false, true])('restores unread storage through normal persistence without overwriting edits (edit: %s)', async edit => {
    seed({ [key('auth')]: { users_search: 'saved search', parcels_tnved: '4901', parcels_page: 3 } })
    const originalRead = Storage.prototype.getItem
    const read = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (key) {
      if (key === LIST_STATE_STORAGE_KEY) throw new Error('Storage unavailable')
      return originalRead.call(this, key)
    })
    const auth = reload()
    const region = mount(PageAlertRegion)
    expect(region.findAll('[role="alert"]')).toHaveLength(1)
    if (edit) auth.users_search = 'new search'
    expect(auth.persistListState()).toBe(false)
    expect(JSON.parse(originalRead.call(sessionStorage, LIST_STATE_STORAGE_KEY)).lists[key('auth')].users_search).toBe('saved search')
    read.mockRestore()
    expect(auth.persistListState()).toBe(true)
    expect(auth.users_search).toBe(edit ? 'new search' : 'saved search')
    expect(auth.parcels_tnved).toBe('4901')
    expect(auth.parcels_page).toBe(3)
    expect(document().lists[key('auth')].parcels_tnved).toBe('4901')
    expect(useAlertStore().alert).not.toHaveProperty('action')
    expect(region.find('.page-alert-region__action').exists()).toBe(false)
    region.unmount()
  })

  it.each(['{broken', 'null', JSON.stringify({ version: 2, lists: {} }), JSON.stringify({ version: 1, lists: [] })])('shows malformed storage once and persists live controls without alert callbacks: %s', async raw => {
    sessionStorage.setItem(LIST_STATE_STORAGE_KEY, raw)
    const auth = reload()
    const region = mount(PageAlertRegion)
    expect(region.findAll('[role="alert"]')).toHaveLength(1)
    expect(region.text()).toContain('Не удалось сохранить или восстановить настройки списков')
    expect(reportError).toHaveBeenCalledOnce()
    expect(auth.persistListState()).toBe(true)
    expect(document().version).toBe(1)
    expect(auth.users_search).toBe('')
    expect(region.find('.page-alert-region__action').exists()).toBe(false)
    region.unmount()
  })

})
