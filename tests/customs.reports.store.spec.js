// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { SupersededReportsRequestError, useCustomsReportsStore } from '@/stores/customs.reports.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
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

describe('customs.reports.store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetAllMocks()
  })

  it('uploads file using fetchWrapper.postFile', async () => {
    const store = useCustomsReportsStore()
    const file = new File(['content'], 'dec.xlsx', { type: 'application/vnd.ms-excel' })
    const response = { success: true }
    fetchWrapper.postFile.mockResolvedValue(response)

    const promise = store.upload(file)
    expect(store.loading).toBe(true)
    await expect(promise).resolves.toBe(response)

    expect(fetchWrapper.postFile).toHaveBeenCalledTimes(1)
    const [url, formData] = fetchWrapper.postFile.mock.calls[0]
    expect(url).toBe('http://localhost:8080/api/customsreports/upload-report')
    expect(formData).toBeInstanceOf(FormData)
    expect(formData.get('file')).toBe(file)
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('stores error and rethrows when upload fails', async () => {
    const store = useCustomsReportsStore()
    const file = new File(['bad'], 'dec.xlsx')
    const error = new Error('upload failed')
    fetchWrapper.postFile.mockRejectedValue(error)

    await expect(store.upload(file)).rejects.toThrow('upload failed')
    expect(store.error).toBe(error)
    expect(store.loading).toBe(false)
  })

  it('includes search when fetching reports', async () => {
    const authStore = useAuthStore()
    authStore.uploadcustomsreports_page = 2
    authStore.uploadcustomsreports_per_page = 50
    authStore.uploadcustomsreports_sort_by = [{ key: 'errorCount', order: 'desc' }]
    authStore.uploadcustomsreports_search = 'MASTER-001'

    const store = useCustomsReportsStore()
    fetchWrapper.get.mockResolvedValue({ items: [], pagination: { totalCount: 0 } })

    await store.getReports()

    expect(fetchWrapper.get).toHaveBeenCalledWith(
      'http://localhost:8080/api/customsreports?page=2&pageSize=50&sortBy=errorCount&sortOrder=desc&search=MASTER-001'
    )
  })

  it('uses empty report fallbacks when paged response is null', async () => {
    const store = useCustomsReportsStore()
    fetchWrapper.get.mockResolvedValue(null)

    await store.getReports()

    expect(store.reports).toEqual([])
    expect(store.reportsTotalCount).toBe(0)
    expect(store.reportsHasNextPage).toBe(false)
    expect(store.reportsHasPreviousPage).toBe(false)
  })

  it('keeps the refreshed reports and pagination when an older list response arrives last', async () => {
    const store = useCustomsReportsStore()
    const previous = Promise.withResolvers()
    fetchWrapper.get.mockReturnValueOnce(previous.promise).mockResolvedValueOnce({
      items: [{ id: 2 }],
      pagination: { totalCount: 10, hasNextPage: true, hasPreviousPage: true }
    })
    const oldLoad = store.getReports()
    await store.getReports()
    previous.resolve({ items: [{ id: 1 }], pagination: { totalCount: 1 } })
    await oldLoad

    expect(store.reports).toEqual([{ id: 2 }])
    expect(store.reportsTotalCount).toBe(10)
    expect(store.reportsHasNextPage).toBe(true)
    expect(store.reportsHasPreviousPage).toBe(true)
    expect(store.loading).toBe(false)
  })

  it.each([true, false])('ignores a superseded list failure with latest request still pending: %s', async (latestPending) => {
    const store = useCustomsReportsStore()
    const previous = Promise.withResolvers()
    const current = Promise.withResolvers()
    fetchWrapper.get.mockResolvedValueOnce({ items: [{ id: 1 }] })
      .mockReturnValueOnce(previous.promise).mockReturnValueOnce(current.promise)
    await store.getReports()
    const oldLoad = store.getReports()
    const currentLoad = store.getReports()
    if (!latestPending) {
      current.resolve({ items: [{ id: 2 }] })
      await currentLoad
    }

    const error = new Error('Previous request failed')
    previous.reject(error)
    await expect(oldLoad).rejects.toBeInstanceOf(SupersededReportsRequestError)
    await expect(oldLoad).rejects.toHaveProperty('cause', error)
    expect(store.error).toBeNull()
    expect(store.reports).toEqual([{ id: latestPending ? 1 : 2 }])
    expect(store.loading).toBe(latestPending)

    if (latestPending) {
      current.resolve({ items: [{ id: 2 }] })
      await currentLoad
      expect(store.reports).toEqual([{ id: 2 }])
      expect(store.loading).toBe(false)
    }
  })

  it('keeps the spinner active until both the upload and the latest list request settle', async () => {
    const store = useCustomsReportsStore()
    const upload = Promise.withResolvers()
    const list = Promise.withResolvers()
    const refresh = Promise.withResolvers()
    fetchWrapper.postFile.mockReturnValueOnce(upload.promise)
    fetchWrapper.get.mockReturnValueOnce(list.promise).mockReturnValueOnce(refresh.promise)

    const uploading = store.upload(new File(['report'], 'report.xlsx'))
    const loading = store.getReports()
    list.resolve({ items: [{ id: 1 }] })
    await loading
    expect(store.loading).toBe(true)

    const refreshing = store.getReports()
    upload.resolve({ success: true })
    await uploading
    expect(store.loading).toBe(true)

    refresh.resolve({ items: [{ id: 2 }] })
    await refreshing
    expect(store.loading).toBe(false)
  })

  it('does not publish errors or clear loading when the delete refresh is superseded', async () => {
    const store = useCustomsReportsStore()
    const refreshStarted = Promise.withResolvers()
    const refresh = Promise.withResolvers()
    const current = Promise.withResolvers()
    fetchWrapper.delete.mockResolvedValueOnce(undefined)
    fetchWrapper.get.mockImplementationOnce(() => {
      refreshStarted.resolve()
      return refresh.promise
    }).mockReturnValueOnce(current.promise)

    const deleting = store.remove(1)
    await refreshStarted.promise
    const loading = store.getReports()
    const error = new Error('Delete refresh failed')
    refresh.reject(error)
    await expect(deleting).rejects.toBeInstanceOf(SupersededReportsRequestError)
    await expect(deleting).rejects.toHaveProperty('cause', error)
    expect(store.error).toBeNull()
    expect(store.loading).toBe(true)

    current.resolve({ items: [{ id: 2 }] })
    await loading
    expect(store.reports).toEqual([{ id: 2 }])
    expect(store.loading).toBe(false)
  })

  it('stores error when getReports fails', async () => {
    const store = useCustomsReportsStore()
    const error = new Error('fetch failed')
    fetchWrapper.get.mockRejectedValue(error)

    const promise = store.getReports()
    expect(store.loading).toBe(true)
    await expect(promise).rejects.toBe(error)

    expect(store.error).toBe(error)
    expect(store.reports).toEqual([])
    expect(store.reportsTotalCount).toBe(0)
    expect(store.loading).toBe(false)
  })

  it('remove calls API and refreshes reports on success', async () => {
    fetchWrapper.delete.mockResolvedValue({})
    fetchWrapper.get.mockResolvedValue({
      items: [],
      pagination: {
        totalCount: 0,
        hasNextPage: false,
        hasPreviousPage: false
      }
    })

    const store = useCustomsReportsStore()

    await store.remove(10)

    expect(fetchWrapper.delete).toHaveBeenCalledWith('http://localhost:8080/api/customsreports/10')
    expect(fetchWrapper.get).toHaveBeenCalledWith(
      'http://localhost:8080/api/customsreports?page=1&pageSize=100&sortBy=id&sortOrder=desc'
    )
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('remove propagates 404 error and sets error', async () => {
    const err = { status: 404, message: 'Not found' }
    fetchWrapper.delete.mockRejectedValue(err)

    const store = useCustomsReportsStore()

    await expect(store.remove(999)).rejects.toEqual(err)
    expect(fetchWrapper.delete).toHaveBeenCalledWith('http://localhost:8080/api/customsreports/999')
    expect(store.loading).toBe(false)
    expect(store.error).toEqual(err)
  })

  it('fetches report rows using fetchWrapper.get', async () => {
    const store = useCustomsReportsStore()
    const mockResponse = {
      items: [
        {
          rowNumber: 1,
          parcelNumber: 'TRACK001',
          uin: 'UIN-001',
          masterInvoice: 'MASTER-001',
          description: 'УИН:UIN-001; товар',
          customsDutiesAndTaxes: 'пошлины',
          customsFees: 'сборы',
          customsPaymentReservationId: 12345,
          dateTime: '2026-05-07 10:30',
          comments: '10-выпуск'
        },
        { rowNumber: 2, trackingNumber: 'TRACK002', decision: 'Запрет выпуска' }
      ],
      pagination: {
        totalCount: 2,
        hasNextPage: false,
        hasPreviousPage: false
      },
      customsProcedure: 'ИМ 40',
      columns: ['id', 'parcelNumber', 'processingResult', 'uin']
    }
    fetchWrapper.get.mockResolvedValue(mockResponse)

    const promise = store.getReportRows(5)
    expect(store.loading).toBe(true)
    await promise

    expect(fetchWrapper.get).toHaveBeenCalledTimes(1)
    expect(fetchWrapper.get).toHaveBeenCalledWith(
      'http://localhost:8080/api/customsreports/5/rows?page=1&pageSize=100&sortBy=id&sortOrder=asc'
    )
    expect(store.reportRows).toEqual(mockResponse.items)
    expect(store.reportRows[0]).toMatchObject({
      uin: 'UIN-001',
      masterInvoice: 'MASTER-001',
      customsPaymentReservationId: 12345,
      comments: '10-выпуск'
    })
    expect(store.reportRowsTotalCount).toBe(2)
    expect(store.reportRowsHasNextPage).toBe(false)
    expect(store.reportRowsHasPreviousPage).toBe(false)
    expect(store.reportRowsCustomsProcedure).toBe('ИМ 40')
    expect(store.reportRowsColumns).toEqual(['id', 'parcelNumber', 'processingResult', 'uin'])
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('includes search when fetching report rows', async () => {
    const authStore = useAuthStore()
    authStore.customsreportrows_page = 3
    authStore.customsreportrows_per_page = 25
    authStore.customsreportrows_sort_by = [{ key: 'uin', order: 'desc' }]
    authStore.customsreportrows_search = 'UIN-001'

    const store = useCustomsReportsStore()
    fetchWrapper.get.mockResolvedValue({ items: [], pagination: { totalCount: 0 } })

    await store.getReportRows(5)

    expect(fetchWrapper.get).toHaveBeenCalledWith(
      'http://localhost:8080/api/customsreports/5/rows?page=3&pageSize=25&sortBy=uin&sortOrder=desc&search=UIN-001'
    )
  })

  it('uses empty row fallbacks when paged response is null', async () => {
    const store = useCustomsReportsStore()
    fetchWrapper.get.mockResolvedValue(null)

    await store.getReportRows(10)

    expect(store.reportRows).toEqual([])
    expect(store.reportRowsTotalCount).toBe(0)
    expect(store.reportRowsHasNextPage).toBe(false)
    expect(store.reportRowsHasPreviousPage).toBe(false)
    expect(store.reportRowsColumns).toEqual([])
    expect(store.reportRowsCustomsProcedure).toBeNull()
  })

  it.each(['getReports', 'getReportRows'])('discards late data from the previous account for %s', async (load) => {
    const auth = useAuthStore()
    auth.user = { id: 1 }
    const store = useCustomsReportsStore()
    let resolve
    fetchWrapper.get.mockImplementationOnce(() => new Promise(done => { resolve = done }))
    const loading = store[load](5)
    auth.user = { id: 2 }
    resolve({ items: [{ id: 5, uploadedByUserName: 'Previous account' }] })

    await expect(loading).resolves.toBeUndefined()
    expect(store.reports).toEqual([])
    expect(store.reportRows).toEqual([])
  })

  it.each(['getReports', 'getReportRows', 'upload', 'remove'])('keeps stale %s failures out of the active account state', async (method) => {
    const auth = useAuthStore()
    auth.user = { id: 1 }
    const store = useCustomsReportsStore()
    const error = new Error('Previous account')
    fetchWrapper.get.mockRejectedValueOnce(error)
    fetchWrapper.postFile.mockRejectedValueOnce(error)
    fetchWrapper.delete.mockRejectedValueOnce(error)
    const pending = store[method](method === 'upload' ? new File(['file'], 'report.xlsx') : 5)
    auth.user = { id: 2 }
    if (method === 'getReports') {
      await expect(pending).rejects.toBeInstanceOf(SupersededReportsRequestError)
      await expect(pending).rejects.toHaveProperty('cause', error)
    } else {
      await expect(pending).rejects.toBe(error)
    }
    expect(store.error).toBeNull()
    expect(store.loading).toBe(false)
  })

  it('does not refresh reports after a delete completes for the previous account', async () => {
    const auth = useAuthStore()
    auth.user = { id: 1 }
    const store = useCustomsReportsStore()
    fetchWrapper.delete.mockResolvedValueOnce(undefined)
    const pending = store.remove(5)
    auth.user = { id: 2 }
    await pending
    expect(fetchWrapper.get).not.toHaveBeenCalled()
  })

  it('clears the previous report immediately and discards its response before the next load starts', async () => {
    const store = useCustomsReportsStore()
    const oldResponse = {
      items: [{ id: 50 }], columns: ['parcelNumber'], customsProcedure: 'ИМ 40',
      pagination: { totalCount: 2, hasNextPage: true, hasPreviousPage: true }
    }
    fetchWrapper.get.mockResolvedValueOnce(oldResponse)
    await store.getReportRows(5)

    const { promise, resolve } = Promise.withResolvers()
    fetchWrapper.get.mockReturnValueOnce(promise)
    const pending = store.getReportRows(5)
    expect(store.reportRowsLoading).toBe(true)
    store.resetReportRows()
    expect(store.reportRows).toEqual([])
    expect(store.reportRowsColumns).toEqual([])
    expect(store.reportRowsCustomsProcedure).toBeNull()
    expect(store.reportRowsTotalCount).toBe(0)
    expect(store.reportRowsHasNextPage).toBe(false)
    expect(store.reportRowsHasPreviousPage).toBe(false)
    expect(store.reportRowsLoading).toBe(false)

    resolve(oldResponse)
    await expect(pending).resolves.toBeUndefined()
    expect(store.reportRows).toEqual([])
    expect(store.reportRowsCustomsProcedure).toBeNull()
  })

  it('keeps the newer report rows when an older request finishes last', async () => {
    const store = useCustomsReportsStore()
    const { promise, resolve } = Promise.withResolvers()
    const currentResponse = {
      items: [{ id: 60 }], columns: ['id', 'uin'], customsProcedure: 'ЭК 10',
      pagination: { totalCount: 1 }
    }
    fetchWrapper.get.mockReturnValueOnce(promise).mockResolvedValueOnce(currentResponse)
    const old = store.getReportRows(5)
    await expect(store.getReportRows(6)).resolves.toEqual(currentResponse)
    resolve({ items: [{ id: 50 }], columns: ['parcelNumber'], customsProcedure: 'ИМ 40' })
    await expect(old).resolves.toBeUndefined()

    expect(store.reportRows).toEqual(currentResponse.items)
    expect(store.reportRowsColumns).toEqual(currentResponse.columns)
    expect(store.reportRowsCustomsProcedure).toBe(currentResponse.customsProcedure)
    expect(store.reportRowsTotalCount).toBe(1)
    expect(store.reportRowsLoading).toBe(false)
  })

  it('keeps the active loading state when an older request rejects', async () => {
    const store = useCustomsReportsStore()
    const old = Promise.withResolvers()
    const current = Promise.withResolvers()
    fetchWrapper.get.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise)
    const oldLoad = store.getReportRows(5)
    const currentLoad = store.getReportRows(6)
    const staleError = new Error('Previous report')
    old.reject(staleError)
    await expect(oldLoad).rejects.toBe(staleError)
    expect(store.error).toBeNull()
    expect(store.reportRowsLoading).toBe(true)

    current.resolve({ items: [{ id: 60 }] })
    await currentLoad
    expect(store.reportRows).toEqual([{ id: 60 }])
    expect(store.reportRowsLoading).toBe(false)
  })

  it('stores error when getReportRows fails', async () => {
    const store = useCustomsReportsStore()
    store.reportRowsColumns = ['id', 'parcelNumber']
    store.reportRowsCustomsProcedure = 'ЭК 10'
    const error = new Error('fetch rows failed')
    fetchWrapper.get.mockRejectedValue(error)

    const promise = store.getReportRows(10)
    expect(store.loading).toBe(true)
    await expect(promise).rejects.toBe(error)

    expect(store.error).toBe(error)
    expect(store.reportRows).toEqual([])
    expect(store.reportRowsColumns).toEqual([])
    expect(store.reportRowsCustomsProcedure).toBeNull()
    expect(store.loading).toBe(false)
  })
})
