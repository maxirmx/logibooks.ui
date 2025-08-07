import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useParcelViewsStore } from '@/stores/parcel.views.store.js'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'

vi.mock('@/helpers/fetch.wrapper.js', () => ({
  fetchWrapper: { post: vi.fn(), put: vi.fn() }
}))

vi.mock('@/helpers/config.js', () => ({
  apiUrl: 'http://localhost:8080/api'
}))

describe('parcel.views store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('adds a parcel view', async () => {
    fetchWrapper.post.mockResolvedValue({})

    const store = useParcelViewsStore()
    await store.add(123)

    expect(fetchWrapper.post).toHaveBeenCalledWith(`${apiUrl}/parcelviews`, { id: 123 })
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('handles error when adding a parcel view', async () => {
    const testError = new Error('API error')
    fetchWrapper.post.mockRejectedValue(testError)

    const store = useParcelViewsStore()
    await store.add(123)

    expect(fetchWrapper.post).toHaveBeenCalledWith(`${apiUrl}/parcelviews`, { id: 123 })
    expect(store.loading).toBe(false)
    expect(store.error).toBe(testError)
  })

  it('retrieves previous parcel view', async () => {
    const mockView = { id: 1 }
    fetchWrapper.put.mockResolvedValue(mockView)

    const store = useParcelViewsStore()
    const result = await store.back()

    expect(fetchWrapper.put).toHaveBeenCalledWith(`${apiUrl}/parcelviews`)
    expect(store.orderView).toEqual(mockView)
    expect(result).toEqual(mockView)
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('handles no content when backing', async () => {
    fetchWrapper.put.mockResolvedValue(undefined)

    const store = useParcelViewsStore()
    const result = await store.back()

    expect(fetchWrapper.put).toHaveBeenCalledWith(`${apiUrl}/parcelviews`)
    expect(store.orderView).toBeNull()
    expect(result).toBeNull()
  })

  it('handles error when backing', async () => {
    const testError = new Error('API error')
    fetchWrapper.put.mockRejectedValue(testError)

    const store = useParcelViewsStore()
    await store.back()

    expect(fetchWrapper.put).toHaveBeenCalledWith(`${apiUrl}/parcelviews`)
    expect(store.loading).toBe(false)
    expect(store.error).toBe(testError)
  })
})
