import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useTransportationTypesStore } from '@/stores/transportation.types.store.js'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'

vi.mock('@/helpers/fetch.wrapper.js', () => ({
  fetchWrapper: { get: vi.fn() }
}))

vi.mock('@/helpers/config.js', () => ({
  apiUrl: 'http://localhost:8080/api'
}))

describe('transportation types store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('initializes with defaults', () => {
    const store = useTransportationTypesStore()
    expect(store.types).toEqual([])
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('fetches types successfully', async () => {
    const data = [ { id: 1, title: 'Авто' } ]
    fetchWrapper.get.mockResolvedValue(data)

    const store = useTransportationTypesStore()
    await store.getAll()

    expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/transportationtypes`)
    expect(store.types).toEqual(data)
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('handles fetch error', async () => {
    const err = new Error('fail')
    fetchWrapper.get.mockRejectedValue(err)

    const store = useTransportationTypesStore()
    await store.getAll()

    expect(store.error).toBe(err)
    expect(store.loading).toBe(false)
  })

  it('ensureLoaded loads only once', async () => {
    const data = [ { id: 1, title: 'Авто' } ]
    fetchWrapper.get.mockResolvedValue(data)
    const store = useTransportationTypesStore()

    store.ensureLoaded()
    store.ensureLoaded()
    await Promise.resolve()

    expect(fetchWrapper.get).toHaveBeenCalledTimes(1)
  })

  it('getName returns name or fallback', async () => {
    const store = useTransportationTypesStore()
    fetchWrapper.get.mockResolvedValueOnce([{ id: 2, name: 'Авиа' }])
    await store.getAll()

    expect(store.getName(2)).toBe('Авиа')
    expect(store.getName(5)).toBe('Тип 5')
  })
})
