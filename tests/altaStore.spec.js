import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAltaStore } from '@/stores/alta.store.js'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'

vi.mock('@/helpers/fetch.wrapper.js', () => ({
  fetchWrapper: { get: vi.fn(), post: vi.fn() }
}))

vi.mock('@/helpers/config.js', () => ({
  apiUrl: 'http://localhost:8080/api'
}))

describe('alta store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('fetches items', async () => {
    fetchWrapper.get.mockResolvedValue([{ id: 1 }])
    const store = useAltaStore()
    await store.getItems()
    expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/alta/items`)
    expect(store.items).toEqual([{ id: 1 }])
  })

  it('fetches exceptions', async () => {
    fetchWrapper.get.mockResolvedValue([{ id: 2 }])
    const store = useAltaStore()
    await store.getExceptions()
    expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/alta/exceptions`)
    expect(store.exceptions).toEqual([{ id: 2 }])
  })

  it('parses and refreshes data', async () => {
    fetchWrapper.post.mockResolvedValue()
    fetchWrapper.get
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    const store = useAltaStore()
    await store.parse()

    expect(fetchWrapper.post).toHaveBeenCalledWith(`${apiUrl}/alta/parse`)
    expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/alta/items`)
    expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/alta/exceptions`)
  })
})
