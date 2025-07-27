import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useFeacnCodesStore } from '@/stores/feacn.codes.store.js'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'

vi.mock('@/helpers/fetch.wrapper.js', () => ({
  fetchWrapper: { get: vi.fn(), post: vi.fn() }
}))

vi.mock('@/helpers/config.js', () => ({
  apiUrl: 'http://localhost:8080/api'
}))

describe('feacn.codes store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('fetches orders from API', async () => {
    const mockOrders = [{ id: 1, title: 'doc', url: 'u' }]
    fetchWrapper.get.mockResolvedValue(mockOrders)

    const store = useFeacnCodesStore()
    await store.getOrders()

    expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/feacncodes/orders`)
    expect(store.orders).toEqual(mockOrders)
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('fetches prefixes for order', async () => {
    const mockPrefixes = [{ id: 1, code: '1', exceptions: [] }]
    fetchWrapper.get.mockResolvedValue(mockPrefixes)

    const store = useFeacnCodesStore()
    await store.getPrefixes(1)

    expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/feacncodes/orders/1/prefixes`)
    expect(store.prefixes).toEqual(mockPrefixes)
  })

  it('calls update endpoint', async () => {
    fetchWrapper.post.mockResolvedValue({})

    const store = useFeacnCodesStore()
    await store.update()

    expect(fetchWrapper.post).toHaveBeenCalledWith(`${apiUrl}/feacncodes/update`)
  })

  it('calls enable endpoint', async () => {
    fetchWrapper.post.mockResolvedValue({})
    fetchWrapper.get.mockResolvedValue([])

    const store = useFeacnCodesStore()
    await store.enable(3)

    expect(fetchWrapper.post).toHaveBeenCalledWith(`${apiUrl}/feacncodes/orders/3/enable`)
  })

  it('calls disable endpoint', async () => {
    fetchWrapper.post.mockResolvedValue({})
    fetchWrapper.get.mockResolvedValue([])

    const store = useFeacnCodesStore()
    await store.disable(4)

    expect(fetchWrapper.post).toHaveBeenCalledWith(`${apiUrl}/feacncodes/orders/4/disable`)
  })
})
