import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { nextTick } from 'vue'
import { useOrderCheckStatusStore } from '@/stores/order.checkstatus.store.js'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'

vi.mock('@/helpers/fetch.wrapper.js', () => ({
  fetchWrapper: { get: vi.fn() }
}))

vi.mock('@/helpers/config.js', () => ({
  apiUrl: 'http://localhost:8080/api'
}))

const mockStatuses = [
  { id: 1, name: 'loaded', title: 'Загружен' },
  { id: 2, name: 'processed', title: 'Обработан' },
  { id: 3, name: 'delivered', title: 'Доставлен' }
]

describe('order check status store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('initializes with default values', () => {
    const store = useOrderCheckStatusStore()
    expect(store.statuses).toEqual([])
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
    expect(store.statusMap.size).toBe(0)
  })

  it('fetches statuses successfully', async () => {
    fetchWrapper.get.mockResolvedValue(mockStatuses)
    const store = useOrderCheckStatusStore()

    await store.fetchStatuses()

    expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/orders/checkstatuses`)
    expect(store.statuses).toEqual(mockStatuses)
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
    expect(store.statusMap.size).toBe(3)
  })

  it('handles fetch error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const error = new Error('Network error')
    fetchWrapper.get.mockRejectedValue(error)
    const store = useOrderCheckStatusStore()

    await store.fetchStatuses()

    expect(store.statuses).toEqual([])
    expect(store.loading).toBe(false)
    expect(store.error).toBe(error)
    expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch order check statuses:', error)
    consoleSpy.mockRestore()
  })

  it('gets status by id', async () => {
    fetchWrapper.get.mockResolvedValue(mockStatuses)
    const store = useOrderCheckStatusStore()
    await store.fetchStatuses()

    const status = store.getStatusById(2)
    expect(status).toEqual({ id: 2, name: 'processed', title: 'Обработан' })

    const nonExistentStatus = store.getStatusById(999)
    expect(nonExistentStatus).toBeNull()
  })

  it('gets status title', async () => {
    fetchWrapper.get.mockResolvedValue(mockStatuses)
    const store = useOrderCheckStatusStore()
    await store.fetchStatuses()

    expect(store.getStatusTitle(1)).toBe('Загружен')
    expect(store.getStatusTitle(2)).toBe('Обработан')
    expect(store.getStatusTitle(999)).toBe('Статус 999')
  })

  it('gets status name', async () => {
    fetchWrapper.get.mockResolvedValue(mockStatuses)
    const store = useOrderCheckStatusStore()
    await store.fetchStatuses()

    expect(store.getStatusName(1)).toBe('loaded')
    expect(store.getStatusName(2)).toBe('processed')
    expect(store.getStatusName(999)).toBe('status_999')
  })

  it('ensures statuses are loaded only once', async () => {
    fetchWrapper.get.mockResolvedValue(mockStatuses)
    const store = useOrderCheckStatusStore()

    // Call ensureStatusesLoaded multiple times
    store.ensureStatusesLoaded()
    store.ensureStatusesLoaded()
    store.ensureStatusesLoaded()

    // Wait for async operations
    await nextTick()

    // Should only call fetchWrapper.get once
    expect(fetchWrapper.get).toHaveBeenCalledTimes(1)
  })

  it('handles empty response', async () => {
    fetchWrapper.get.mockResolvedValue([])
    const store = useOrderCheckStatusStore()

    await store.fetchStatuses()

    expect(store.statuses).toEqual([])
    expect(store.statusMap.size).toBe(0)
  })

  it('handles null response', async () => {
    fetchWrapper.get.mockResolvedValue(null)
    const store = useOrderCheckStatusStore()

    await store.fetchStatuses()

    expect(store.statuses).toEqual([])
    expect(store.statusMap.size).toBe(0)
  })
})
