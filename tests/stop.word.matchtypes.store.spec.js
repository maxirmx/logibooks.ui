import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useStopWordMatchTypesStore } from '@/stores/stop.word.matchtypes.store.js'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'

vi.mock('@/helpers/fetch.wrapper.js', () => ({
  fetchWrapper: { get: vi.fn() }
}))

vi.mock('@/helpers/config.js', () => ({
  apiUrl: 'http://localhost:8080/api'
}))

describe('stop word matchtypes store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('initializes with defaults', () => {
    const store = useStopWordMatchTypesStore()
    expect(store.matchTypes).toEqual([])
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('fetches match types successfully', async () => {
    const data = [{ id: 1, name: 'Exact' }]
    fetchWrapper.get.mockResolvedValue(data)

    const store = useStopWordMatchTypesStore()
    await store.fetchMatchTypes()

    expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/stopwords/matchtypes`)
    expect(store.matchTypes).toEqual(data)
    expect(store.matchTypeMap.size).toBe(1)
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('handles fetch error', async () => {
    const err = new Error('fail')
    fetchWrapper.get.mockRejectedValue(err)

    const store = useStopWordMatchTypesStore()
    await store.fetchMatchTypes()

    expect(store.error).toBe(err)
    expect(store.loading).toBe(false)
  })

  it('ensureLoaded loads only once', async () => {
    const data = [{ id: 1, name: 'Exact' }]
    fetchWrapper.get.mockResolvedValue(data)
    const store = useStopWordMatchTypesStore()

    store.ensureLoaded()
    store.ensureLoaded()
    await Promise.resolve()

    expect(fetchWrapper.get).toHaveBeenCalledTimes(1)
  })

  it('getName returns name or fallback', async () => {
    const store = useStopWordMatchTypesStore()
    fetchWrapper.get.mockResolvedValueOnce([{ id: 2, name: 'Partial' }])
    await store.fetchMatchTypes()

    expect(store.getName(2)).toBe('Partial')
    expect(store.getName(5)).toBe('Тип 5')
  })
})
