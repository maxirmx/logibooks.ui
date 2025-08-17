import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { nextTick } from 'vue'
import { useParcelCheckStatusStore } from '@/stores/parcel.checkstatuses.store.js'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'

vi.mock('@/helpers/fetch.wrapper.js', () => ({
  fetchWrapper: { get: vi.fn() }
}))

vi.mock('@/helpers/config.js', () => ({
  apiUrl: 'http://localhost:8080/api'
}))

const mockStatuses = [
  { id: 1, title: 'Загружен' },
  { id: 2, title: 'Обработан' },
  { id: 3, title: 'Доставлен' }
]

describe('parcel check status store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('initializes with default values', () => {
    const store = useParcelCheckStatusStore()
    expect(store.statuses).toEqual([])
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
    expect(store.statusMap.size).toBe(0)
  })

  it('fetches statuses successfully', async () => {
    fetchWrapper.get.mockResolvedValue(mockStatuses)
    const store = useParcelCheckStatusStore()

    await store.fetchStatuses()

    expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/parcels/checkstatuses`)
    expect(store.statuses).toEqual(mockStatuses)
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
    expect(store.statusMap.size).toBe(3)
  })

  it('handles fetch error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const error = new Error('Network error')
    fetchWrapper.get.mockRejectedValue(error)
    const store = useParcelCheckStatusStore()

    await store.fetchStatuses()

    expect(store.statuses).toEqual([])
    expect(store.loading).toBe(false)
    expect(store.error).toBe(error)
    expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch parcel check statuses:', error)
    consoleSpy.mockRestore()
  })

  it('gets status by id', async () => {
    fetchWrapper.get.mockResolvedValue(mockStatuses)
    const store = useParcelCheckStatusStore()
    await store.fetchStatuses()

    const status = store.getStatusById(2)
    expect(status).toEqual({ id: 2,  title: 'Обработан' })

    const nonExistentStatus = store.getStatusById(999)
    expect(nonExistentStatus).toBeNull()
  })

  it('gets status title', async () => {
    fetchWrapper.get.mockResolvedValue(mockStatuses)
    const store = useParcelCheckStatusStore()
    await store.fetchStatuses()

    expect(store.getStatusTitle(1)).toBe('Загружен')
    expect(store.getStatusTitle(2)).toBe('Обработан')
    expect(store.getStatusTitle(999)).toBe('Статус 999')
  })

  it('gets status name', async () => {
    fetchWrapper.get.mockResolvedValue(mockStatuses)
    const store = useParcelCheckStatusStore()
    await store.fetchStatuses()
  })

  it('ensures statuses are loaded only once', async () => {
    fetchWrapper.get.mockResolvedValue(mockStatuses)
    const store = useParcelCheckStatusStore()

    // Call ensureLoaded multiple times
    store.ensureLoaded()
    store.ensureLoaded()
    store.ensureLoaded()

    // Wait for async operations
    await nextTick()

    // Should only call fetchWrapper.get once
    expect(fetchWrapper.get).toHaveBeenCalledTimes(1)
  })

  it('handles empty response', async () => {
    fetchWrapper.get.mockResolvedValue([])
    const store = useParcelCheckStatusStore()

    await store.fetchStatuses()

    expect(store.statuses).toEqual([])
    expect(store.statusMap.size).toBe(0)
  })

  it('handles null response', async () => {
    fetchWrapper.get.mockResolvedValue(null)
    const store = useParcelCheckStatusStore()

    await store.fetchStatuses()

    expect(store.statuses).toEqual([])
    expect(store.statusMap.size).toBe(0)
  })
})
