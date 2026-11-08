// Copyright (C) 2026 Maxim [maxirmx] Samsonov (http://www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { useParcelFiltersStore } from '@/stores/parcel.filters.store.js'
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

  it.each([
    'update'
  ])('does not let an earlier list load undo a successful %s', async operation => {
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
  it.each([
    NaN
  ])('rejects invalid owner %s without a request', async owner => {
    const store = useParcelFiltersStore()
    await expect(store.getAll(owner)).rejects.toThrow('Некорректный идентификатор пользователя')
    expect(fetchWrapper.get).not.toHaveBeenCalled()
  })

})
