import { setActivePinia, createPinia } from 'pinia'
import { useFeacnCodesStore } from '@/stores/feacn.codes.store.js'
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

describe('feacn.codes.store.js', () => {
  let store
  let pinia

  const mockCode = { id: 1, code: '1234567890', description: 'test' }
  const mockCodes = [mockCode]
  const mockProgress = { completed: true }

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    store = useFeacnCodesStore()
    vi.clearAllMocks()
    store.error = null
  })

  describe('initial state', () => {
    it('sets defaults', () => {
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
    })
  })

  describe('data retrieval', () => {
    it('getById retrieves code by id', async () => {
      fetchWrapper.get.mockResolvedValue(mockCode)
      const res = await store.getById(1)
      expect(fetchWrapper.get).toHaveBeenCalledWith('http://localhost:3000/api/feacncodes/1')
      expect(res).toEqual(mockCode)
    })

    it('getByCode retrieves code by code', async () => {
      fetchWrapper.get.mockResolvedValue(mockCode)
      const res = await store.getByCode('1234567890')
      expect(fetchWrapper.get).toHaveBeenCalledWith('http://localhost:3000/api/feacncodes/code/1234567890')
      expect(res).toEqual(mockCode)
    })

    it('lookup retrieves codes', async () => {
      fetchWrapper.get.mockResolvedValue(mockCodes)
      const res = await store.lookup('abc')
      expect(fetchWrapper.get).toHaveBeenCalledWith('http://localhost:3000/api/feacncodes/lookup/abc')
      expect(res).toEqual(mockCodes)
    })

    it('getChildren retrieves children codes', async () => {
      fetchWrapper.get.mockResolvedValue(mockCodes)
      const res = await store.getChildren(1)
      expect(fetchWrapper.get).toHaveBeenCalledWith('http://localhost:3000/api/feacncodes/children?id=1')
      expect(res).toEqual(mockCodes)
    })
  })

  describe('upload operations', () => {
    it('uploads file successfully', async () => {
      const file = new File(['content'], 'codes.xlsx')
      fetchWrapper.postFile.mockResolvedValue({ id: 'handle' })

      const res = await store.upload(file)

      expect(fetchWrapper.postFile).toHaveBeenCalledTimes(1)
      const [url, formData] = fetchWrapper.postFile.mock.calls[0]
      expect(url).toBe('http://localhost:3000/api/feacncodes/upload')
      expect(formData).toBeInstanceOf(FormData)
      expect(formData.get('file')).toBe(file)
      expect(res).toEqual({ id: 'handle' })
    })

    it('gets upload progress', async () => {
      fetchWrapper.get.mockResolvedValue(mockProgress)
      const res = await store.getUploadProgress('abcd')
      expect(fetchWrapper.get).toHaveBeenCalledWith('http://localhost:3000/api/feacncodes/upload/abcd')
      expect(res).toEqual(mockProgress)
    })

    it('cancels upload', async () => {
      fetchWrapper.delete.mockResolvedValue()
      await store.cancelUpload('abcd')
      expect(fetchWrapper.delete).toHaveBeenCalledWith('http://localhost:3000/api/feacncodes/upload/abcd')
    })
  })

  describe('error handling', () => {
    it('sets error when request fails', async () => {
      const err = new Error('fail')
      fetchWrapper.get.mockRejectedValue(err)
      await expect(store.getById(1)).rejects.toThrow('fail')
      expect(store.error).toBe(err)
    })

    it('handles upload error', async () => {
      const file = new File(['content'], 'codes.xlsx')
      const err = new Error('upload fail')
      fetchWrapper.postFile.mockRejectedValue(err)
      await expect(store.upload(file)).rejects.toThrow('upload fail')
      expect(store.error).toBe(err)
    })
  })
})
