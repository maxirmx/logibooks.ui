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

  describe('getCountryShortName', () => {
    it('returns short or official name for valid code', () => {
      const store = useCountriesStore()
      store.countries = [
        { isoNumeric: 643, isoAlpha2: 'RU', nameRuOfficial: 'Россия', nameRuShort: 'Россия' },
        { isoNumeric: 840, isoAlpha2: 'US', nameRuOfficial: 'США', nameRuShort: 'США' }
      ]

      expect(store.getCountryShortName(643)).toBe('Россия')
      expect(store.getCountryShortName('840')).toBe('США')
    })

    it('returns original code for unknown code', () => {
      const store = useCountriesStore()
      store.countries = []
      expect(store.getCountryShortName(123)).toBe(123)
    })
  })

  describe('ensureLoaded', () => {
    it('calls getAll on first invocation when not initialized and not loading', async () => {
      const mockCountries = [{ isoNumeric: 643, isoAlpha2: 'RU', nameRuShort: 'Россия' }]
      fetchWrapper.get.mockResolvedValueOnce(mockCountries)

      const store = useCountriesStore()
      
      // Initially no API call should have been made
      expect(fetchWrapper.get).not.toHaveBeenCalled()
      
      // Call ensureLoaded
      store.ensureLoaded()
      
      // Should trigger getAll which calls the API
      await vi.waitFor(() => {
        expect(fetchWrapper.get).toHaveBeenCalledOnce()
        expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/countries/compact`)
      })
    })

    it('does not call getAll on second invocation (already initialized)', async () => {
      const mockCountries = [{ isoNumeric: 643, isoAlpha2: 'RU', nameRuShort: 'Россия' }]
      fetchWrapper.get.mockResolvedValue(mockCountries)

      const store = useCountriesStore()
      
      // First call should initialize
      store.ensureLoaded()
      
      await vi.waitFor(() => {
        expect(fetchWrapper.get).toHaveBeenCalledOnce()
      })
      
      // Second call should not call API again
      store.ensureLoaded()
      
      // Should still only have been called once
      expect(fetchWrapper.get).toHaveBeenCalledOnce()
    })

    it('does not call getAll when already loading', async () => {
      const store = useCountriesStore()
      
      // Set loading state to true to simulate ongoing request
      store.loading = true
      
      store.ensureLoaded()
      
      // Should not make any API calls when loading is true
      expect(fetchWrapper.get).not.toHaveBeenCalled()
    })

    it('can be called multiple times safely', async () => {
      const mockCountries = [{ isoNumeric: 643, isoAlpha2: 'RU', nameRuShort: 'Россия' }]
      fetchWrapper.get.mockResolvedValueOnce(mockCountries)
      
      const store = useCountriesStore()
      
      // Call multiple times in quick succession
      store.ensureLoaded()
      store.ensureLoaded()
      store.ensureLoaded()
      
      // Should only trigger one API call
      await vi.waitFor(() => {
        expect(fetchWrapper.get).toHaveBeenCalledOnce()
      })
      
      // Even after loading completes, additional calls should not trigger more API calls
      await vi.waitFor(() => {
        expect(store.countries).toEqual(mockCountries)
      })
      
      store.ensureLoaded()
      store.ensureLoaded()
      
      expect(fetchWrapper.get).toHaveBeenCalledOnce()
    })

    it('works correctly in integration with component lifecycle', async () => {
      const store = useCountriesStore()
      const mockCountries = [
        { isoNumeric: 643, isoAlpha2: 'RU', nameRuShort: 'Россия' },
        { isoNumeric: 840, isoAlpha2: 'US', nameRuShort: 'США' }
      ]
      
      fetchWrapper.get.mockResolvedValueOnce(mockCountries)
      
      // Simulate component mounting and calling ensureLoaded
      store.ensureLoaded()
      
      // Wait for async getAll to complete
      await vi.waitFor(() => {
        expect(store.countries).toEqual(mockCountries)
      })
      
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
      
      // Subsequent calls should not trigger additional API calls
      const initialCallCount = fetchWrapper.get.mock.calls.length
      store.ensureLoaded()
      store.ensureLoaded()
      
      expect(fetchWrapper.get).toHaveBeenCalledTimes(initialCallCount)
    })

    it('handles errors gracefully but does not retry automatically', async () => {
      const store = useCountriesStore()
      
      // First call fails
      fetchWrapper.get.mockRejectedValueOnce(new Error('Network error'))
      
      store.ensureLoaded()
      
      // Wait for the error to be set
      await vi.waitFor(() => {
        expect(store.error).toBeTruthy()
      })
      
      // Reset the mock for a successful call
      fetchWrapper.get.mockResolvedValueOnce([{ isoNumeric: 643, isoAlpha2: 'RU' }])
      
      // ensureLoaded should NOT retry automatically since initialized flag is set
      // This is the expected behavior - once initialized, it won't retry
      store.ensureLoaded()
      
      // Should still only have been called once (the failed call)
      expect(fetchWrapper.get).toHaveBeenCalledOnce()
      
      // To retry, we need to call getAll() directly
      await store.getAll()
      expect(fetchWrapper.get).toHaveBeenCalledTimes(2)
      expect(store.error).toBeNull()
    })
  })
})
