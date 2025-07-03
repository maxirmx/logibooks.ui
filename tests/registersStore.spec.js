import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useRegistersStore } from '@/stores/registers.store.js'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'

vi.mock('@/helpers/fetch.wrapper.js', () => ({
  fetchWrapper: { get: vi.fn() }
}))

vi.mock('@/helpers/config.js', () => ({
  apiUrl: 'http://localhost:8080/api'
}))

describe('registers store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('getAll fetches data from API', async () => {
    fetchWrapper.get.mockResolvedValue([{ id: 1 }])
    const store = useRegistersStore()
    await store.getAll(2, 5)
    expect(fetchWrapper.get).toHaveBeenCalledWith(
      `${apiUrl}/registers?page=2&pageSize=5&sortBy=id&sortOrder=asc`
    )
    expect(store.items[0].id).toBe(1)
  })

  it('sets error when request fails', async () => {
    fetchWrapper.get.mockRejectedValue(new Error('fail'))
    const store = useRegistersStore()
    await store.getAll()
    expect(store.error.value).toBeTruthy()
  })
})
