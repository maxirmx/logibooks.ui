import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCountryCodesStore } from '@/stores/countrycodes.store.js'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'

vi.mock('@/helpers/fetch.wrapper.js', () => ({
  fetchWrapper: { get: vi.fn(), post: vi.fn() }
}))

vi.mock('@/helpers/config.js', () => ({
  apiUrl: 'http://localhost:8080/api'
}))

describe('country codes store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('fetches codes from API', async () => {
    const mockCodes = [{ isoNumeric: 643, isoAlpha2: 'RU', nameEnOfficial: 'Russia', nameRuOfficial: 'Россия' }]
    fetchWrapper.get.mockResolvedValue(mockCodes)

    const store = useCountryCodesStore()
    await store.getAll()

    expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/countrycodes/compact`)
    expect(store.countries).toEqual(mockCodes)
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('calls update endpoint', async () => {
    fetchWrapper.post.mockResolvedValue({})

    const store = useCountryCodesStore()
    await store.update()

    expect(fetchWrapper.post).toHaveBeenCalledWith(`${apiUrl}/countrycodes/update`)
  })
})
