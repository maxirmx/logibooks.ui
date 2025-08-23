import { setActivePinia, createPinia } from 'pinia'
import { useFeacnInsertItemsStore } from '@/stores/feacn.insert.items.store.js'
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

describe('feacn.insert.items.store.js', () => {
  let store
  let pinia

  const mockItems = [
    { id: 1, code: '1234567890', insertBefore: '111', insertAfter: '222' },
    { id: 2, code: '0987654321', insertBefore: '333', insertAfter: '444' }
  ]

  const mockItem = { id: 1, code: '1234567890', insertBefore: '111', insertAfter: '222' }

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    store = useFeacnInsertItemsStore()
    vi.clearAllMocks()
    store.error = null
  })

  describe('initial state', () => {
    it('sets defaults', () => {
      expect(store.insertItems).toEqual([])
      expect(store.insertItem).toEqual({ loading: true })
      expect(store.loading).toBe(false)
    })
  })

  describe('CRUD operations', () => {
    it('getAll retrieves items', async () => {
      fetchWrapper.get.mockResolvedValue(mockItems)
      await store.getAll()
      expect(fetchWrapper.get).toHaveBeenCalledWith('http://localhost:3000/api/feacninsertitems')
      expect(store.insertItems).toEqual(mockItems)
    })

    it('getById retrieves item by id', async () => {
      fetchWrapper.get.mockResolvedValue(mockItem)
      const res = await store.getById(1)
      expect(fetchWrapper.get).toHaveBeenCalledWith('http://localhost:3000/api/feacninsertitems/1')
      expect(res).toEqual(mockItem)
      expect(store.insertItem).toEqual(mockItem)
    })

    it('create posts item and refreshes list', async () => {
      fetchWrapper.post.mockResolvedValue({})
      fetchWrapper.get.mockResolvedValue(mockItems)
      await store.create(mockItem)
      expect(fetchWrapper.post).toHaveBeenCalledWith('http://localhost:3000/api/feacninsertitems', mockItem)
      expect(fetchWrapper.get).toHaveBeenCalledWith('http://localhost:3000/api/feacninsertitems')
    })

    it('update puts item and refreshes list', async () => {
      fetchWrapper.put.mockResolvedValue({})
      fetchWrapper.get.mockResolvedValue(mockItems)
      await store.update(1, mockItem)
      expect(fetchWrapper.put).toHaveBeenCalledWith('http://localhost:3000/api/feacninsertitems/1', mockItem)
      expect(fetchWrapper.get).toHaveBeenCalledWith('http://localhost:3000/api/feacninsertitems')
    })

    it('remove deletes item and refreshes list', async () => {
      fetchWrapper.delete.mockResolvedValue()
      fetchWrapper.get.mockResolvedValue([])
      await store.remove(1)
      expect(fetchWrapper.delete).toHaveBeenCalledWith('http://localhost:3000/api/feacninsertitems/1')
      expect(fetchWrapper.get).toHaveBeenCalledWith('http://localhost:3000/api/feacninsertitems')
    })

    it('getById refresh flag resets insertItem before fetch', async () => {
      fetchWrapper.get.mockResolvedValue(mockItem)
      store.insertItem = { id: 99 }
      await store.getById(1, true)
      expect(store.insertItem).toEqual(mockItem)
    })

    it('ensureLoaded fetches items when not initialized', async () => {
      fetchWrapper.get.mockResolvedValue(mockItems)
      await store.ensureLoaded()
      expect(fetchWrapper.get).toHaveBeenCalledWith('http://localhost:3000/api/feacninsertitems')
      expect(store.insertItems).toEqual(mockItems)
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
      await expect(store.create(mockItem)).rejects.toThrow('fail')
      expect(store.error).toBe(err)
    })

    it('sets error when update fails', async () => {
      const err = new Error('fail')
      fetchWrapper.put.mockRejectedValue(err)
      await expect(store.update(1, mockItem)).rejects.toThrow('fail')
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

