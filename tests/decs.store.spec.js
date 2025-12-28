// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useDecsStore } from '@/stores/decs.store.js'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'

vi.mock('@/helpers/fetch.wrapper.js', () => ({
  fetchWrapper: {
    postFile: vi.fn(),
    get: vi.fn(),
    delete: vi.fn()
  }
}))

vi.mock('@/helpers/config.js', () => ({
  apiUrl: 'http://localhost:8080/api'
}))

describe('decs.store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('initializes with default state', () => {
    const store = useDecsStore()
    expect(store.reports).toEqual([])
    expect(store.reportRows).toEqual([])
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('uploads file using fetchWrapper.postFile', async () => {
    const store = useDecsStore()
    const file = new File(['content'], 'dec.xlsx', { type: 'application/vnd.ms-excel' })
    const response = { success: true }
    fetchWrapper.postFile.mockResolvedValue(response)

    const promise = store.upload(file)
    expect(store.loading).toBe(true)
    await expect(promise).resolves.toBe(response)

    expect(fetchWrapper.postFile).toHaveBeenCalledTimes(1)
    const [url, formData] = fetchWrapper.postFile.mock.calls[0]
    expect(url).toBe('http://localhost:8080/api/decs/upload-report')
    expect(formData).toBeInstanceOf(FormData)
    expect(formData.get('file')).toBe(file)
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('stores error and rethrows when upload fails', async () => {
    const store = useDecsStore()
    const file = new File(['bad'], 'dec.xlsx')
    const error = new Error('upload failed')
    fetchWrapper.postFile.mockRejectedValue(error)

    await expect(store.upload(file)).rejects.toThrow('upload failed')
    expect(store.error).toBe(error)
    expect(store.loading).toBe(false)
  })

  it('fetches reports using fetchWrapper.get', async () => {
    const store = useDecsStore()
    const reports = [{ id: 2 }, { id: 1 }]
    fetchWrapper.get.mockResolvedValue(reports)

    const promise = store.getReports()
    expect(store.loading).toBe(true)
    await expect(promise).resolves.toBeUndefined()

    expect(fetchWrapper.get).toHaveBeenCalledTimes(1)
    expect(fetchWrapper.get).toHaveBeenCalledWith('http://localhost:8080/api/decs')
    expect(store.reports).toEqual(reports)
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('stores error when getReports fails', async () => {
    const store = useDecsStore()
    const error = new Error('fetch failed')
    fetchWrapper.get.mockRejectedValue(error)

    const promise = store.getReports()
    expect(store.loading).toBe(true)
    await expect(promise).resolves.toBeUndefined()

    expect(store.error).toBe(error)
    expect(store.reports).toEqual([])
    expect(store.loading).toBe(false)
  })

  it('remove calls API and refreshes reports on success', async () => {
    fetchWrapper.delete.mockResolvedValue({})
    fetchWrapper.get.mockResolvedValue([])

    const store = useDecsStore()

    await store.remove(10)

    expect(fetchWrapper.delete).toHaveBeenCalledWith('http://localhost:8080/api/decs/10')
    expect(fetchWrapper.get).toHaveBeenCalledWith('http://localhost:8080/api/decs')
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('remove propagates 404 error and sets error', async () => {
    const err = { status: 404, message: 'Not found' }
    fetchWrapper.delete.mockRejectedValue(err)

    const store = useDecsStore()

    await expect(store.remove(999)).rejects.toEqual(err)
    expect(fetchWrapper.delete).toHaveBeenCalledWith('http://localhost:8080/api/decs/999')
    expect(store.loading).toBe(false)
    expect(store.error).toEqual(err)
  })

  it('fetches report rows using fetchWrapper.get', async () => {
    const store = useDecsStore()
    const rows = [
      { rowNumber: 1, trackingNumber: 'TRACK001', decision: 'Выпуск разрешён' },
      { rowNumber: 2, trackingNumber: 'TRACK002', decision: 'Запрет выпуска' }
    ]
    fetchWrapper.get.mockResolvedValue(rows)

    const promise = store.getReportRows(5)
    expect(store.loading).toBe(true)
    await expect(promise).resolves.toBeUndefined()

    expect(fetchWrapper.get).toHaveBeenCalledTimes(1)
    expect(fetchWrapper.get).toHaveBeenCalledWith('http://localhost:8080/api/decs/5/rows?page=1&pageSize=100&sortBy=id&sortOrder=asc')
    expect(store.reportRows).toEqual(rows)
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('stores error when getReportRows fails', async () => {
    const store = useDecsStore()
    const error = new Error('fetch rows failed')
    fetchWrapper.get.mockRejectedValue(error)

    const promise = store.getReportRows(10)
    expect(store.loading).toBe(true)
    await expect(promise).resolves.toBeUndefined()

    expect(store.error).toBe(error)
    expect(store.reportRows).toEqual([])
    expect(store.loading).toBe(false)
  })
})
