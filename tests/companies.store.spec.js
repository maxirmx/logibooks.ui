import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCompaniesStore } from '@/stores/companies.store.js'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'

vi.mock('@/helpers/fetch.wrapper.js', () => ({
  fetchWrapper: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}))

vi.mock('@/helpers/config.js', () => ({
  apiUrl: 'http://localhost:8080/api'
}))

const mockCompanies = [
  {
    id: 1,
    inn: '1234567890',
    kpp: '123401001',
    name: 'ООО "Тест Компания"',
    shortName: 'Тест Компания',
    countryIsoNumeric: 643,
    postalCode: '123456',
    city: 'Москва',
    street: 'ул. Тестовая, д. 1'
  },
  {
    id: 2,
    inn: '0987654321',
    kpp: '098701001',
    name: 'ЗАО "Другая Компания"',
    shortName: 'Другая Компания',
    countryIsoNumeric: 643,
    postalCode: '654321',
    city: 'Санкт-Петербург',
    street: 'пр. Тестовый, д. 2'
  }
]

const mockCompany = mockCompanies[0]

describe('companies store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('initializes with default values', () => {
    const store = useCompaniesStore()
    expect(store.companies).toEqual([])
    expect(store.company).toBeNull()
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  describe('getAll', () => {
    it('fetches companies successfully', async () => {
      fetchWrapper.get.mockResolvedValue(mockCompanies)
      const store = useCompaniesStore()

      await store.getAll()

      expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/companies`)
      expect(store.companies).toEqual(mockCompanies)
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('handles fetch error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const error = new Error('Network error')
      fetchWrapper.get.mockRejectedValue(error)
      const store = useCompaniesStore()

      await store.getAll()

      expect(store.companies).toEqual([])
      expect(store.loading).toBe(false)
      expect(store.error).toBe(error)
      expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch companies:', error)
      consoleSpy.mockRestore()
    })
  })

  describe('getById', () => {
    it('fetches company by id successfully', async () => {
      fetchWrapper.get.mockResolvedValue(mockCompany)
      const store = useCompaniesStore()

      const result = await store.getById(1)

      expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/companies/1`)
      expect(store.company).toEqual(mockCompany)
      expect(result).toEqual(mockCompany)
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('handles fetch error and returns null', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const error = new Error('Not found')
      fetchWrapper.get.mockRejectedValue(error)
      const store = useCompaniesStore()

      const result = await store.getById(999)

      expect(result).toBeNull()
      expect(store.loading).toBe(false)
      expect(store.error).toBe(error)
      expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch company:', error)
      consoleSpy.mockRestore()
    })
  })

  describe('create', () => {
    it('creates company successfully', async () => {
      const newCompany = { ...mockCompany, id: 3 }
      fetchWrapper.post.mockResolvedValue(newCompany)
      const store = useCompaniesStore()
      store.companies = [...mockCompanies]

      const result = await store.create(mockCompany)

      expect(fetchWrapper.post).toHaveBeenCalledWith(`${apiUrl}/companies`, mockCompany)
      expect(store.companies).toHaveLength(3)
      expect(store.companies[2]).toEqual(newCompany)
      expect(result).toEqual(newCompany)
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('handles create error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const error = new Error('Conflict')
      fetchWrapper.post.mockRejectedValue(error)
      const store = useCompaniesStore()

      await expect(store.create(mockCompany)).rejects.toThrow('Conflict')

      expect(store.loading).toBe(false)
      expect(store.error).toBe(error)
      expect(consoleSpy).toHaveBeenCalledWith('Failed to create company:', error)
      consoleSpy.mockRestore()
    })
  })

  describe('update', () => {
    it('updates company successfully', async () => {
      fetchWrapper.put.mockResolvedValue({})
      const store = useCompaniesStore()
      store.companies = [...mockCompanies]

      const updateData = { name: 'Updated Company' }
      const result = await store.update(1, updateData)

      expect(fetchWrapper.put).toHaveBeenCalledWith(`${apiUrl}/companies/1`, updateData)
      expect(store.companies[0]).toEqual({ ...mockCompanies[0], ...updateData })
      expect(result).toBe(true)
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('handles update error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const error = new Error('Not found')
      fetchWrapper.put.mockRejectedValue(error)
      const store = useCompaniesStore()

      await expect(store.update(999, {})).rejects.toThrow('Not found')

      expect(store.loading).toBe(false)
      expect(store.error).toBe(error)
      expect(consoleSpy).toHaveBeenCalledWith('Failed to update company:', error)
      consoleSpy.mockRestore()
    })
  })

  describe('remove', () => {
    it('removes company successfully', async () => {
      fetchWrapper.delete.mockResolvedValue({})
      const store = useCompaniesStore()
      store.companies = [...mockCompanies]

      const result = await store.remove(1)

      expect(fetchWrapper.delete).toHaveBeenCalledWith(`${apiUrl}/companies/1`)
      expect(store.companies).not.toContain(mockCompanies[0])
      expect(store.companies.length).toBe(1)
      expect(result).toBe(true)
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('handles remove error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const error = new Error('Conflict')
      fetchWrapper.delete.mockRejectedValue(error)
      const store = useCompaniesStore()

      await expect(store.remove(1)).rejects.toThrow('Conflict')

      expect(store.loading).toBe(false)
      expect(store.error).toBe(error)
      expect(consoleSpy).toHaveBeenCalledWith('Failed to delete company:', error)
      consoleSpy.mockRestore()
    })
  })

  it('sets loading state during operations', async () => {
    let resolvePromise
    const promise = new Promise((resolve) => {
      resolvePromise = resolve
    })
    fetchWrapper.get.mockReturnValue(promise)

    const store = useCompaniesStore()
    const getAllPromise = store.getAll()

    expect(store.loading).toBe(true)

    resolvePromise(mockCompanies)
    await getAllPromise

    expect(store.loading).toBe(false)
  })
})
