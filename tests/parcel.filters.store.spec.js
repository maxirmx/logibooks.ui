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
  setActivePinia(createPinia())
  for (const method of Object.values(fetchWrapper)) method.mockReset()
})

describe('parcel filters store', () => {
  it('loads lists and individual filters from the API', async () => {
    const store = useParcelFiltersStore()
    fetchWrapper.get.mockResolvedValueOnce([filter]).mockResolvedValueOnce(filter)
    expect(await store.getAll()).toEqual([filter])
    expect(await store.getById(1)).toEqual(filter)
    expect(store.filters).toEqual([filter])
    expect(fetchWrapper.get.mock.calls.map(call => call[0])).toEqual([
      expect.stringMatching(/\/parcel-filters$/),
      expect.stringMatching(/\/parcel-filters\/1$/)
    ])
  })

  it('updates local state only after successful writes', async () => {
    const store = useParcelFiltersStore()
    fetchWrapper.post.mockResolvedValueOnce(filter)
    await store.create(filter)
    expect(store.filters).toEqual([filter])
    fetchWrapper.put.mockResolvedValueOnce(undefined)
    await store.update(1, { name: 'Изменённый' })
    expect(store.filters[0].name).toBe('Изменённый')
    fetchWrapper.delete.mockResolvedValueOnce(undefined)
    await store.remove(1)
    expect(store.filters).toEqual([])
  })

  it('propagates transport failures and leaves previously loaded state intact', async () => {
    const store = useParcelFiltersStore()
    fetchWrapper.get.mockResolvedValueOnce([filter])
    await store.getAll()
    for (const [operation, method] of [
      [() => store.getAll(), 'get'], [() => store.getById(1), 'get'],
      [() => store.create(filter), 'post'],
      [() => store.update(1, { name: 'Не сохранено' }), 'put'],
      [() => store.remove(1), 'delete']
    ]) {
      const failure = new Error('network')
      fetchWrapper[method].mockRejectedValueOnce(failure)
      await expect(operation()).rejects.toBe(failure)
      expect(store.filters).toEqual([filter])
    }
    store.$reset()
    expect(store.filters).toEqual([])
  })
})
