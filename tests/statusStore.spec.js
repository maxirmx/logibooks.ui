import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useStatusStore } from '@/stores/status.store.js'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'

vi.mock('@/helpers/fetch.wrapper.js', () => ({
  fetchWrapper: {
    get: vi.fn()
  }
}))

vi.mock('@/helpers/config.js', () => ({
  apiUrl: 'http://localhost:8080/api'
}))

describe('status store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('fetchStatus sets versions from API', async () => {
    fetchWrapper.get.mockResolvedValue({
      appVersion: '1.2.3',
      dbVersion: '20240624'
    })

    const store = useStatusStore()
    await store.fetchStatus()

    expect(fetchWrapper.get).toHaveBeenCalledWith(
      `${apiUrl}/status/status`
    )
    expect(store.coreVersion).toBe('1.2.3')
    expect(store.dbVersion).toBe('20240624')
  })
})
