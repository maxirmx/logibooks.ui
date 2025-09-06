// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { setActivePinia, createPinia } from 'pinia'
import { useFeacnPrefixesStore } from '@/stores/feacn.prefixes.store.js'
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

describe('feacn.prefixes.store.js', () => {
  let store
  let pinia

  const mockPrefixes = [
    { 
      id: 1, 
      code: '0101', 
      intervalCode: '0', 
      description: 'd1', 
      comment: 'c1', 
      exceptions: [{ id: 1, code: '111', feacnPrefixId: 1 }] 
    },
    { 
      id: 2, 
      code: '0202', 
      intervalCode: '0', 
      description: 'd2', 
      comment: 'c2', 
      exceptions: [
        { id: 2, code: '222', feacnPrefixId: 2 }, 
        { id: 3, code: '333', feacnPrefixId: 2 }
      ] 
    }
  ]

  const mockPrefix = { 
    id: 1, 
    code: '0101', 
    intervalCode: '0', 
    description: 'd1', 
    comment: 'c1', 
    exceptions: [{ id: 1, code: '111', feacnPrefixId: 1 }] 
  }

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

    it('handles create DTO format with string exceptions', async () => {
      const createDto = { code: '0404', exceptions: ['444', '555'] }
      fetchWrapper.post.mockResolvedValue({})
      fetchWrapper.get.mockResolvedValue(mockPrefixes)
      await store.create(createDto)
      expect(fetchWrapper.post).toHaveBeenCalledWith('http://localhost:3000/api/feacnprefixes', createDto)
    })

    it('handles update DTO format with string exceptions', async () => {
      const updateDto = { code: '0505', exceptions: ['666'] }
      fetchWrapper.put.mockResolvedValue({})
      fetchWrapper.get.mockResolvedValue(mockPrefixes)
      await store.update(1, updateDto)
      expect(fetchWrapper.put).toHaveBeenCalledWith('http://localhost:3000/api/feacnprefixes/1', updateDto)
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

  describe('reset', () => {
    it('restores initial state', async () => {
      // mutate state
      store.prefixes = [{ id: 99 }]
      store.prefix = { id: 99 }
      store.loading = true
      store.error = new Error('fail')
      store.isInitialized = true

      // reset store
      store.$reset()

      expect(store.prefixes).toEqual([])
      expect(store.prefix).toEqual({ loading: true })
      expect(store.loading).toBe(false)
      expect(store.error).toBe(null)
      expect(store.isInitialized).toBe(false)
    })

    it('allows ensureLoaded to refetch after reset', async () => {
      fetchWrapper.get.mockResolvedValue(mockPrefixes)
      await store.ensureLoaded()
      expect(fetchWrapper.get).toHaveBeenCalledTimes(1)

      store.$reset()

      fetchWrapper.get.mockResolvedValue([])
      await store.ensureLoaded()
      expect(fetchWrapper.get).toHaveBeenCalledTimes(2)
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

