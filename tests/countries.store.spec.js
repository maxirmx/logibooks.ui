import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCountriesStore } from '@/stores/countries.store.js'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'

vi.mock('@/helpers/fetch.wrapper.js', () => ({
  fetchWrapper: { get: vi.fn(), post: vi.fn() }
}))

vi.mock('@/helpers/config.js', () => ({
  apiUrl: 'http://localhost:8080/api'
}))

describe('countries store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('fetches codes from API', async () => {
    const mockCodes = [{ isoNumeric: 643, isoAlpha2: 'RU', nameEnOfficial: 'Russia', nameRuOfficial: 'Россия' }]
    fetchWrapper.get.mockResolvedValue(mockCodes)

    const store = useCountriesStore()
    await store.getAll()

    expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/countries/compact`)
    expect(store.countries).toEqual(mockCodes)
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('calls update endpoint', async () => {
    fetchWrapper.post.mockResolvedValue({})

    const store = useCountriesStore()
    await store.update()

    expect(fetchWrapper.post).toHaveBeenCalledWith(`${apiUrl}/countries/update`)
  })

  describe('getCountryAlpha2', () => {
    it('returns alpha2 code for valid numeric code', () => {
      const store = useCountriesStore()
      store.countries = [
        { isoNumeric: 643, isoAlpha2: 'RU', nameEnOfficial: 'Russia', nameRuOfficial: 'Россия' },
        { isoNumeric: 840, isoAlpha2: 'US', nameEnOfficial: 'United States', nameRuOfficial: 'США' },
        { isoNumeric: 276, isoAlpha2: 'DE', nameEnOfficial: 'Germany', nameRuOfficial: 'Германия' }
      ]

      expect(store.getCountryAlpha2(643)).toBe('RU')
      expect(store.getCountryAlpha2('840')).toBe('US')
      expect(store.getCountryAlpha2(276)).toBe('DE')
    })

    it('returns original code for invalid numeric code', () => {
      const store = useCountriesStore()
      store.countries = [
        { isoNumeric: 643, isoAlpha2: 'RU', nameEnOfficial: 'Russia', nameRuOfficial: 'Россия' }
      ]

      expect(store.getCountryAlpha2(999)).toBe(999)
      expect(store.getCountryAlpha2('invalid')).toBe('invalid')
      expect(store.getCountryAlpha2(null)).toBe(null)
      expect(store.getCountryAlpha2(undefined)).toBe(undefined)
    })

    it('returns original code when countries array is empty', () => {
      const store = useCountriesStore()
      store.countries = []

      expect(store.getCountryAlpha2(643)).toBe(643)
      expect(store.getCountryAlpha2('RU')).toBe('RU')
    })

    it('handles string numeric codes correctly', () => {
      const store = useCountriesStore()
      store.countries = [
        { isoNumeric: 643, isoAlpha2: 'RU', nameEnOfficial: 'Russia', nameRuOfficial: 'Россия' }
      ]

      expect(store.getCountryAlpha2('643')).toBe('RU')
    })
  })
})
