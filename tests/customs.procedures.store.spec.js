import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCustomsProceduresStore } from '@/stores/customs.procedures.store.js'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'

vi.mock('@/helpers/fetch.wrapper.js', () => ({
  fetchWrapper: { get: vi.fn() }
}))

vi.mock('@/helpers/config.js', () => ({
  apiUrl: 'http://localhost:8080/api'
}))

describe('customs procedures store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('initializes with defaults', () => {
    const store = useCustomsProceduresStore()
    expect(store.procedures).toEqual([])
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('fetches procedures successfully', async () => {
    const data = [ { id: 1, title: 'Экспорт' } ]
    fetchWrapper.get.mockResolvedValue(data)

    const store = useCustomsProceduresStore()
    await store.getAll()

    expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/customsprocedures`)
    expect(store.procedures).toEqual(data)
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('handles fetch error', async () => {
    const err = new Error('err')
    fetchWrapper.get.mockRejectedValue(err)
    const store = useCustomsProceduresStore()
    await store.getAll()
    expect(store.error).toBe(err)
    expect(store.loading).toBe(false)
  })

  it('ensureLoaded loads only once', async () => {
    const data = [ { id: 1, title: 'Процедура' } ]
    fetchWrapper.get.mockResolvedValue(data)
    const store = useCustomsProceduresStore()
    store.ensureLoaded()
    store.ensureLoaded()
    await Promise.resolve()
    expect(fetchWrapper.get).toHaveBeenCalledTimes(1)
  })

  it('getTitle returns title or fallback', async () => {
    const store = useCustomsProceduresStore()
    fetchWrapper.get.mockResolvedValueOnce([{ id: 3, title: 'Импорт' }])
    await store.getAll()
    expect(store.getTitle(3)).toBe('Импорт')
    expect(store.getTitle(7)).toBe('Процедура 7')
  })
})
