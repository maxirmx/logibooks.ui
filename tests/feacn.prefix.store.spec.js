import { setActivePinia, createPinia } from 'pinia'
import { useFeacnPrefixesStore } from '@/stores/feacn.prefix.store.js'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'

vi.mock('@/helpers/fetch.wrapper.js', () => ({
  fetchWrapper: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}))

vi.mock('@/helpers/config.js', () => ({
  apiUrl: 'http://localhost:3000/api'
}))

describe('feacn.prefix.store.js', () => {
  let store
  let pinia

  const mockPrefixes = [
    { id: 1, code: '0101', intervalCode: '0', description: 'd1', comment: 'c1', exceptions: ['111'] },
    { id: 2, code: '0202', intervalCode: '0', description: 'd2', comment: 'c2', exceptions: ['222', '333'] }
  ]

  const mockPrefix = { id: 1, code: '0101', intervalCode: '0', description: 'd1', comment: 'c1', exceptions: ['111'] }

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    store = useFeacnPrefixesStore()
    vi.clearAllMocks()
    store.error = null
  })

  describe('initial state', () => {
    it('sets defaults', () => {
      expect(store.prefixes).toEqual([])
      expect(store.prefix).toEqual({ loading: true })
      expect(store.loading).toBe(false)
    })
  })

  describe('CRUD operations', () => {
    it('getAll retrieves prefixes', async () => {
      fetchWrapper.get.mockResolvedValue(mockPrefixes)
      await store.getAll()
      expect(fetchWrapper.get).toHaveBeenCalledWith('http://localhost:3000/api/feacnprefixes')
      expect(store.prefixes).toEqual(mockPrefixes)
    })

    it('getById retrieves prefix by id', async () => {
      fetchWrapper.get.mockResolvedValue(mockPrefix)
      const promise = store.getById(1)
      expect(store.loading).toBe(true)
      expect(store.prefix).toEqual({ loading: true })
      const res = await promise
      expect(fetchWrapper.get).toHaveBeenCalledWith('http://localhost:3000/api/feacnprefixes/1')
      expect(res).toEqual(mockPrefix)
      expect(store.prefix).toEqual(mockPrefix)
      expect(store.loading).toBe(false)
    })

    it('create posts prefix and refreshes list', async () => {
      fetchWrapper.post.mockResolvedValue({})
      fetchWrapper.get.mockResolvedValue(mockPrefixes)
      await store.create(mockPrefix)
      expect(fetchWrapper.post).toHaveBeenCalledWith('http://localhost:3000/api/feacnprefixes', mockPrefix)
      expect(fetchWrapper.get).toHaveBeenCalledWith('http://localhost:3000/api/feacnprefixes')
    })

    it('update puts prefix and refreshes list', async () => {
      fetchWrapper.put.mockResolvedValue({})
      fetchWrapper.get.mockResolvedValue(mockPrefixes)
      await store.update(1, mockPrefix)
      expect(fetchWrapper.put).toHaveBeenCalledWith('http://localhost:3000/api/feacnprefixes/1', mockPrefix)
      expect(fetchWrapper.get).toHaveBeenCalledWith('http://localhost:3000/api/feacnprefixes')
    })

    it('remove deletes prefix and refreshes list', async () => {
      fetchWrapper.delete.mockResolvedValue()
      fetchWrapper.get.mockResolvedValue([])
      await store.remove(1)
      expect(fetchWrapper.delete).toHaveBeenCalledWith('http://localhost:3000/api/feacnprefixes/1')
      expect(fetchWrapper.get).toHaveBeenCalledWith('http://localhost:3000/api/feacnprefixes')
    })

    it('getById refresh flag replaces prefix before fetch', async () => {
      fetchWrapper.get.mockResolvedValue(mockPrefix)
      store.prefix = { id: 99 }
      const promise = store.getById(1, true)
      expect(store.prefix).toEqual({ loading: true })
      await promise
      expect(store.prefix).toEqual(mockPrefix)
    })

    it('getById without refresh preserves existing data while loading', async () => {
      fetchWrapper.get.mockResolvedValue(mockPrefix)
      store.prefix = { id: 99 }
      const promise = store.getById(1)
      expect(store.prefix).toEqual({ id: 99, loading: true })
      await promise
      expect(store.prefix).toEqual(mockPrefix)
    })

    it('ensureLoaded fetches prefixes when not initialized', async () => {
      fetchWrapper.get.mockResolvedValue(mockPrefixes)
      await store.ensureLoaded()
      expect(fetchWrapper.get).toHaveBeenCalledWith('http://localhost:3000/api/feacnprefixes')
      expect(store.prefixes).toEqual(mockPrefixes)
    })

    it('ensureLoaded caches concurrent calls', async () => {
      fetchWrapper.get.mockResolvedValue(mockPrefixes)
      await Promise.all([store.ensureLoaded(), store.ensureLoaded()])
      expect(fetchWrapper.get).toHaveBeenCalledTimes(1)
    })

    it('ensureLoaded skips fetch when already initialized', async () => {
      store.isInitialized = true
      await store.ensureLoaded()
      expect(fetchWrapper.get).not.toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    it('sets error when getAll fails', async () => {
      const err = new Error('fail')
      fetchWrapper.get.mockRejectedValue(err)
      await expect(store.getAll()).rejects.toThrow('fail')
      expect(store.error).toBe(err)
    })

    it('sets error when create fails', async () => {
      const err = new Error('fail')
      fetchWrapper.post.mockRejectedValue(err)
      await expect(store.create(mockPrefix)).rejects.toThrow('fail')
      expect(store.error).toBe(err)
    })

    it('sets error when update fails', async () => {
      const err = new Error('fail')
      fetchWrapper.put.mockRejectedValue(err)
      await expect(store.update(1, mockPrefix)).rejects.toThrow('fail')
      expect(store.error).toBe(err)
    })

    it('sets error when remove fails', async () => {
      const err = new Error('fail')
      fetchWrapper.delete.mockRejectedValue(err)
      await expect(store.remove(1)).rejects.toThrow('fail')
      expect(store.error).toBe(err)
    })
  })
})

