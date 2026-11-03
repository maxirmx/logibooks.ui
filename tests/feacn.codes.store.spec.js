// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

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

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    store = useFeacnCodesStore()
    vi.clearAllMocks()
    store.error = null
  })

  describe('error handling', () => {
    it('sets error when request fails', async () => {
      const err = new Error('fail')
      fetchWrapper.get.mockRejectedValue(err)
      await expect(store.getById(1)).rejects.toThrow('fail')
      expect(store.error).toBe(err)
      expect(store.loading).toBe(false)
    })

    it('handles upload error', async () => {
      const file = new File(['content'], 'codes.xlsx')
      const err = new Error('upload fail')
      fetchWrapper.postFile.mockRejectedValue(err)
      await expect(store.upload(file)).rejects.toThrow('upload fail')
      expect(store.error).toBe(err)
      expect(store.loading).toBe(false)
    })

    it('handles getByCode error', async () => {
      const err = new Error('code fail')
      fetchWrapper.get.mockRejectedValue(err)
      await expect(store.getByCode('123')).rejects.toThrow('code fail')
      expect(store.error).toBe(err)
      expect(store.loading).toBe(false)
    })

    it('handles lookup error', async () => {
      const err = new Error('lookup fail')
      fetchWrapper.get.mockRejectedValue(err)
      await expect(store.lookup('abc')).rejects.toThrow('lookup fail')
      expect(store.error).toBe(err)
      expect(store.loading).toBe(false)
    })

    it('handles getChildren error', async () => {
      const err = new Error('children fail')
      fetchWrapper.get.mockRejectedValue(err)
      await expect(store.getChildren(1)).rejects.toThrow('children fail')
      expect(store.error).toBe(err)
      expect(store.loading).toBe(false)
    })
  })
})
