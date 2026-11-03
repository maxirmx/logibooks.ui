// Copyright (C) 2026 Maxim [maxirmx] Samsonov (http://www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { useParcelFiltersStore } from '@/stores/parcel.filters.store.js'
import { useAuthStore } from '@/stores/auth.store.js'

vi.mock('@/helpers/fetch.wrapper.js', () => ({
  fetchWrapper: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() }
}))

const filter = {
  id: 1, name: 'Фильтр', excludedParcelStatusIds: [],
  excludedCheckStatuses: { common: [], sw: [], fc: [] },
  excludedPassportCheckStatuses: []
}

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
  for (const method of Object.values(fetchWrapper)) method.mockReset()
})

function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

describe('parcel filters store', () => {
  it.each(['reset', 'account'])('invalidates pending loads on %s and immediately clears old filters', async change => {
    const auth = useAuthStore()
    auth.user = { id: 7 }
    const store = useParcelFiltersStore()
    fetchWrapper.get.mockResolvedValueOnce([filter])
    await store.getAll()
    const old = deferred()
    fetchWrapper.get.mockReturnValueOnce(old.promise)
    const pending = store.getAll()
    if (change === 'reset') store.$reset()
    else auth.user = { id: 8 }
    expect(store.filters).toEqual([])
    const latest = [{ ...filter, id: 2, name: 'Current account' }]
    fetchWrapper.get.mockResolvedValueOnce(latest)
    await store.getAll()
    old.resolve([filter])
    expect(await pending).toEqual([filter])
    expect(store.filters).toEqual(latest)
  })

  it('rejects stale load failures and normalizes null results without repopulating a reset cache', async () => {
    const store = useParcelFiltersStore()
    const old = deferred()
    const failure = new Error('Stale failure')
    fetchWrapper.get.mockReturnValueOnce(old.promise)
    const rejection = expect(store.getAll()).rejects.toBe(failure)
    store.$reset()
    old.reject(failure)
    await rejection
    fetchWrapper.get.mockResolvedValueOnce(null)
    expect(await store.getAll()).toEqual([])
    expect(store.filters).toEqual([])
  })

  it('invalidates an old request even if the original account signs in again', async () => {
    const auth = useAuthStore()
    auth.user = { id: 7 }
    const store = useParcelFiltersStore()
    const old = deferred()
    fetchWrapper.get.mockReturnValueOnce(old.promise)
    const pending = store.getAll()
    auth.user = { id: 8 }
    auth.user = { id: 7 }
    old.resolve([filter])
    await pending
    expect(store.filters).toEqual([])
  })

  it.each(['create', 'update', 'remove'])('does not commit a pending %s after an account change', async operation => {
    const auth = useAuthStore()
    auth.user = { id: 7 }
    const store = useParcelFiltersStore()
    const old = deferred()
    const method = { create: 'post', update: 'put', remove: 'delete' }[operation]
    fetchWrapper[method].mockReturnValueOnce(old.promise)
    const pending = operation === 'create' ? store.create(filter) : operation === 'remove' ? store.remove(1) : store.update(1, { name: 'Stale name' })
    auth.user = { id: 8 }
    const latest = [{ ...filter, name: 'Current account' }]
    fetchWrapper.get.mockResolvedValueOnce(latest)
    await store.getAll()
    old.resolve(filter)
    await pending
    expect(store.filters).toEqual(latest)
  })

  it.each(['create', 'update', 'remove'])('does not let an earlier list load undo a successful %s', async operation => {
    const store = useParcelFiltersStore()
    fetchWrapper.get.mockResolvedValueOnce([filter])
    await store.getAll()
    const old = deferred()
    fetchWrapper.get.mockReturnValueOnce(old.promise)
    const pending = store.getAll()
    const created = { ...filter, id: 2 }
    fetchWrapper.post.mockResolvedValueOnce(created)
    fetchWrapper.put.mockResolvedValueOnce(undefined)
    fetchWrapper.delete.mockResolvedValueOnce(undefined)
    if (operation === 'create') await store.create(created)
    else if (operation === 'remove') await store.remove(1)
    else await store.update(1, { name: 'Changed' })
    const expected = store.filters.map(item => ({ ...item }))
    old.resolve([filter])
    await pending
    expect(store.filters).toEqual(expected)
  })
})


describe('owner-scoped parcel filter requests', () => {
  function invoke(store, operation, owner = 8) {
    if (operation === 'create') return store.create(filter, owner)
    if (operation === 'update') return store.update(1, { name: 'Изменён' }, owner)
    if (operation === 'remove') return store.remove(1, owner)
    if (operation === 'getById') return store.getById(1, owner)
    return store.getAll(owner)
  }
  const operations = ['getAll', 'getById', 'create', 'update', 'remove']
  const methods = { getAll: 'get', getById: 'get', create: 'post', update: 'put', remove: 'delete' }

  it.each(operations)('scopes %s without changing the personal cache or selection', async operation => {
    const auth = useAuthStore()
    auth.user = { id: 7 }
    auth.setParcelFilterId(1)
    const store = useParcelFiltersStore()
    store.filters = [filter]
    const other = { ...filter, id: 2, name: 'Чужой' }
    fetchWrapper[methods[operation]].mockResolvedValue(operation === 'getAll' ? [other] : other)
    await invoke(store, operation)
    const url = fetchWrapper[methods[operation]].mock.calls[0][0]
    expect(url).toMatch(operation === 'getAll' || operation === 'create' ? /parcel-filters\?userId=8$/ : /parcel-filters\/1\?userId=8$/)
    expect(store.filters).toEqual([filter])
    expect(auth.parcels_filter_id).toBe(1)
  })

  it.each(operations)('propagates %s failures without publishing an alert', async operation => {
    const store = useParcelFiltersStore()
    const failure = new Error('Транспорт недоступен')
    fetchWrapper[methods[operation]].mockRejectedValueOnce(failure)
    await expect(invoke(store, operation)).rejects.toBe(failure)
    expect(store.filters).toEqual([])
  })

  it.each([NaN, 0, -1, 1.5, 2147483648])('rejects invalid owner %s without a request', async owner => {
    const store = useParcelFiltersStore()
    await expect(store.getAll(owner)).rejects.toThrow('Некорректный идентификатор пользователя')
    expect(fetchWrapper.get).not.toHaveBeenCalled()
  })

  it('does not invalidate a pending personal list when loading another owner', async () => {
    const auth = useAuthStore()
    auth.user = { id: 7 }
    const store = useParcelFiltersStore()
    const personal = deferred()
    fetchWrapper.get.mockReturnValueOnce(personal.promise).mockResolvedValueOnce([])
    const pending = store.getAll(7)
    await store.getAll(8)
    personal.resolve([filter])
    await pending
    expect(store.filters).toEqual([filter])
  })
})
