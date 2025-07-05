import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useOrdersStore } from '@/stores/orders.store.js'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'

vi.mock('@/helpers/fetch.wrapper.js', () => ({
  fetchWrapper: { get: vi.fn() }
}))

vi.mock('@/helpers/config.js', () => ({
  apiUrl: 'http://localhost:8080/api'
}))

describe('orders store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('fetches data with default parameters', async () => {
    fetchWrapper.get.mockResolvedValue({
      items: [],
      pagination: { totalCount: 0, hasNextPage: false, hasPreviousPage: false }
    })
    const store = useOrdersStore()
    await store.getAll(1)
    expect(fetchWrapper.get).toHaveBeenCalledWith(
      `${apiUrl}/orders?registerId=1&page=1&pageSize=100&sortBy=id&sortOrder=asc`
    )
  })

  it('fetches data with custom parameters', async () => {
    fetchWrapper.get.mockResolvedValue({ items: [], pagination: {} })
    const store = useOrdersStore()
    await store.getAll(2, 3, 'AA', 4, 50, 'tnVed', 'desc')
    expect(fetchWrapper.get).toHaveBeenCalledWith(
      `${apiUrl}/orders?registerId=2&page=4&pageSize=50&sortBy=tnVed&sortOrder=desc&statusId=3&tnVed=AA`
    )
  })

  it('initializes with default values', () => {
    const store = useOrdersStore()
    expect(store.items).toEqual([])
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
    expect(store.totalCount).toBe(0)
    expect(store.hasNextPage).toBe(false)
    expect(store.hasPreviousPage).toBe(false)
  })
})
