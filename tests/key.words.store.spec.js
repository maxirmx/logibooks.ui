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

  describe('upload', () => {
    it('uploads file successfully', async () => {
      const file = new File(['content'], 'keywords.xlsx')
      fetchWrapper.postFile.mockResolvedValue()
      
      await store.upload(file)
      
      expect(fetchWrapper.postFile).toHaveBeenCalledTimes(1)
      const [url, formData] = fetchWrapper.postFile.mock.calls[0]
      expect(url).toBe('http://localhost:3000/api/keywords/upload')
      expect(formData).toBeInstanceOf(FormData)
      expect(formData.get('file')).toBe(file)
      expect(store.loading).toBe(false)
      expect(store.error).toBe(null)
    })

    it('sets loading state during upload', async () => {
      const file = new File(['content'], 'keywords.xlsx')
      let resolveUpload
      const uploadPromise = new Promise((resolve) => {
        resolveUpload = resolve
      })
      fetchWrapper.postFile.mockReturnValue(uploadPromise)

      const uploadCall = store.upload(file)
      expect(store.loading).toBe(true)

      resolveUpload()
      await uploadCall
      expect(store.loading).toBe(false)
    })

    it('handles upload error', async () => {
      const file = new File(['content'], 'keywords.xlsx')
      const error = new Error('Upload failed')
      fetchWrapper.postFile.mockRejectedValue(error)

      await expect(store.upload(file)).rejects.toThrow('Upload failed')
      expect(store.error).toBe(error)
      expect(store.loading).toBe(false)
    })

    it('clears error before upload', async () => {
      const file = new File(['content'], 'keywords.xlsx')
      store.error = new Error('Previous error')
      fetchWrapper.postFile.mockResolvedValue()

      await store.upload(file)

      expect(store.error).toBe(null)
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

