import { setActivePinia, createPinia } from 'pinia'
import { useKeyWordsStore } from '@/stores/key.words.store.js'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'

vi.mock('@/helpers/fetch.wrapper.js', () => ({
  fetchWrapper: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    postFile: vi.fn()
  }
}))

vi.mock('@/helpers/config.js', () => ({
  apiUrl: 'http://localhost:3000/api'
}))

describe('key.words.store.js', () => {
  let store
  let pinia

  const mockKeyWords = [
    { id: 1, word: 'alpha', matchTypeId: 1 },
    { id: 2, word: 'beta', matchTypeId: 2 }
  ]

  const mockKeyWord = { id: 1, word: 'alpha', matchTypeId: 1 }

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    store = useKeyWordsStore()
    vi.clearAllMocks()
    store.error = null
  })

  describe('initial state', () => {
    it('sets defaults', () => {
      expect(store.keyWords).toEqual([])
      expect(store.keyWord).toEqual({ loading: true })
      expect(store.loading).toBe(false)
    })
  })

  describe('CRUD operations', () => {
    it('getAll retrieves keywords', async () => {
      fetchWrapper.get.mockResolvedValue(mockKeyWords)
      await store.getAll()
      expect(fetchWrapper.get).toHaveBeenCalledWith('http://localhost:3000/api/keywords')
      expect(store.keyWords).toEqual(mockKeyWords)
    })

    it('getById retrieves keyword by id', async () => {
      fetchWrapper.get.mockResolvedValue(mockKeyWord)
      const res = await store.getById(1)
      expect(fetchWrapper.get).toHaveBeenCalledWith('http://localhost:3000/api/keywords/1')
      expect(res).toEqual(mockKeyWord)
      expect(store.keyWord).toEqual(mockKeyWord)
    })

    it('create posts keyword and refreshes list', async () => {
      fetchWrapper.post.mockResolvedValue({})
      fetchWrapper.get.mockResolvedValue(mockKeyWords)
      await store.create(mockKeyWord)
      expect(fetchWrapper.post).toHaveBeenCalledWith('http://localhost:3000/api/keywords', mockKeyWord)
      expect(fetchWrapper.get).toHaveBeenCalledWith('http://localhost:3000/api/keywords')
    })

    it('update puts keyword and refreshes list', async () => {
      fetchWrapper.put.mockResolvedValue({})
      fetchWrapper.get.mockResolvedValue(mockKeyWords)
      await store.update(1, mockKeyWord)
      expect(fetchWrapper.put).toHaveBeenCalledWith('http://localhost:3000/api/keywords/1', mockKeyWord)
      expect(fetchWrapper.get).toHaveBeenCalledWith('http://localhost:3000/api/keywords')
    })

    it('remove deletes keyword and refreshes list', async () => {
      fetchWrapper.delete.mockResolvedValue()
      fetchWrapper.get.mockResolvedValue([])
      await store.remove(1)
      expect(fetchWrapper.delete).toHaveBeenCalledWith('http://localhost:3000/api/keywords/1')
      expect(fetchWrapper.get).toHaveBeenCalledWith('http://localhost:3000/api/keywords')
    })
  })

  describe('download', () => {
    it('uploads file to download endpoint', async () => {
      const file = new File(['content'], 'keywords.xlsx')
      fetchWrapper.postFile.mockResolvedValue()
      await store.download(file)
      expect(fetchWrapper.postFile).toHaveBeenCalled()
      const [url] = fetchWrapper.postFile.mock.calls[0]
      expect(url).toBe('http://localhost:3000/api/keywords/download')
    })
  })

  describe('error handling', () => {
    it('sets error when request fails', async () => {
      const err = new Error('fail')
      fetchWrapper.get.mockRejectedValue(err)
      await expect(store.getAll()).rejects.toThrow('fail')
      expect(store.error).toBe(err)
    })
  })
})

