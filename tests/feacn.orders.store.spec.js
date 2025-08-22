import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useFeacnOrdersStore } from '@/stores/feacn.orders.store.js'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'

vi.mock('@/helpers/fetch.wrapper.js', () => ({
  fetchWrapper: { get: vi.fn(), post: vi.fn() }
}))

vi.mock('@/helpers/config.js', () => ({
  apiUrl: 'http://localhost:8080/api'
}))

describe('feacn.orders store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('fetches orders from API', async () => {
    const mockOrders = [{ id: 1, title: 'doc', url: 'u' }]
    fetchWrapper.get.mockResolvedValue(mockOrders)

    const store = useFeacnOrdersStore()
    await store.getOrders()

    expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/feacncodes/orders`)
    expect(store.orders).toEqual(mockOrders)
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
    expect(store.isInitialized).toBe(true)
  })
  
  it('handles error when fetching orders', async () => {
    const testError = new Error('API error')
    fetchWrapper.get.mockRejectedValue(testError)

    const store = useFeacnOrdersStore()
    await store.getOrders()

    expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/feacncodes/orders`)
    expect(store.orders).toEqual([])
    expect(store.loading).toBe(false)
    expect(store.error).toBe(testError)
    expect(store.isInitialized).toBe(false)
  })

  it('fetches prefixes for order', async () => {
    const mockPrefixes = [{ id: 1, code: '1', exceptions: [] }]
    fetchWrapper.get.mockResolvedValue(mockPrefixes)

    const store = useFeacnOrdersStore()
    await store.getPrefixes(1)

    expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/feacncodes/orders/1/prefixes`)
    expect(store.prefixes).toEqual(mockPrefixes)
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })
  
  it('handles error when fetching prefixes', async () => {
    const testError = new Error('API error')
    fetchWrapper.get.mockRejectedValue(testError)

    const store = useFeacnOrdersStore()
    await store.getPrefixes(1)

    expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/feacncodes/orders/1/prefixes`)
    expect(store.loading).toBe(false)
    expect(store.error).toBe(testError)
  })
  
  it('clears prefixes when no orderId is provided', async () => {
    const store = useFeacnOrdersStore()
    store.prefixes.value = [{ id: 1 }] // Set some initial value
    
    await store.getPrefixes(null)
    
    expect(fetchWrapper.get).not.toHaveBeenCalled()
    expect(store.prefixes).toEqual([])
  })

  it('calls update endpoint', async () => {
    fetchWrapper.post.mockResolvedValue({})
    fetchWrapper.get.mockResolvedValue([])

    const store = useFeacnOrdersStore()
    await store.update()

    expect(fetchWrapper.post).toHaveBeenCalledWith(`${apiUrl}/feacncodes/update`)
    expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/feacncodes/orders`)
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })
  
  it('handles error when updating', async () => {
    const testError = new Error('API error')
    fetchWrapper.post.mockRejectedValue(testError)

    const store = useFeacnOrdersStore()
    await store.update()

    expect(fetchWrapper.post).toHaveBeenCalledWith(`${apiUrl}/feacncodes/update`)
    expect(fetchWrapper.get).not.toHaveBeenCalled()
    expect(store.loading).toBe(false)
    expect(store.error).toBe(testError)
  })

  it('calls enable endpoint', async () => {
    fetchWrapper.post.mockResolvedValue({})
    fetchWrapper.get.mockResolvedValue([])

    const store = useFeacnOrdersStore()
    await store.enable(3)

    expect(fetchWrapper.post).toHaveBeenCalledWith(`${apiUrl}/feacncodes/orders/3/enable`)
    expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/feacncodes/orders`)
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })
  
  it('handles error when enabling order', async () => {
    const testError = new Error('API error')
    fetchWrapper.post.mockRejectedValue(testError)

    const store = useFeacnOrdersStore()
    await store.enable(3)

    expect(fetchWrapper.post).toHaveBeenCalledWith(`${apiUrl}/feacncodes/orders/3/enable`)
    expect(fetchWrapper.get).not.toHaveBeenCalled()
    expect(store.loading).toBe(false)
    expect(store.error).toBe(testError)
  })

  it('calls disable endpoint', async () => {
    fetchWrapper.post.mockResolvedValue({})
    fetchWrapper.get.mockResolvedValue([])

    const store = useFeacnOrdersStore()
    await store.disable(4)

    expect(fetchWrapper.post).toHaveBeenCalledWith(`${apiUrl}/feacncodes/orders/4/disable`)
    expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/feacncodes/orders`)
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })
  
  it('handles error when disabling order', async () => {
    const testError = new Error('API error')
    fetchWrapper.post.mockRejectedValue(testError)

    const store = useFeacnOrdersStore()
    await store.disable(4)

    expect(fetchWrapper.post).toHaveBeenCalledWith(`${apiUrl}/feacncodes/orders/4/disable`)
    expect(fetchWrapper.get).not.toHaveBeenCalled()
    expect(store.loading).toBe(false)
    expect(store.error).toBe(testError)
  })
  
  it('ensures orders are loaded only once', async () => {
    const mockOrders = [{ id: 1, title: 'doc', url: 'u' }]
    fetchWrapper.get.mockResolvedValue(mockOrders)

    const store = useFeacnOrdersStore()
    await store.ensureLoaded()
    
    // First call should call getOrders
    expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/feacncodes/orders`)
    expect(store.isInitialized).toBe(true)
    
    // Reset the mock to verify it's not called again
    fetchWrapper.get.mockClear()
    
    // Second call should not call getOrders since isInitialized is true
    await store.ensureLoaded()
    expect(fetchWrapper.get).not.toHaveBeenCalled()
  })
  
  it('toggleEnabled calls enable when en is true', async () => {
    fetchWrapper.post.mockResolvedValue({})
    fetchWrapper.get.mockResolvedValue([])

    const store = useFeacnOrdersStore()
    await store.toggleEnabled(5, true)

    expect(fetchWrapper.post).toHaveBeenCalledWith(`${apiUrl}/feacncodes/orders/5/enable`)
    expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/feacncodes/orders`)
  })
  
  it('toggleEnabled calls disable when en is false', async () => {
    fetchWrapper.post.mockResolvedValue({})
    fetchWrapper.get.mockResolvedValue([])

    const store = useFeacnOrdersStore()
    await store.toggleEnabled(6, false)

    expect(fetchWrapper.post).toHaveBeenCalledWith(`${apiUrl}/feacncodes/orders/6/disable`)
    expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/feacncodes/orders`)
  })
})
