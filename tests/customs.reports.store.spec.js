// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCustomsReportsStore } from '@/stores/customs.reports.store.js'
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
    vi.clearAllMocks()
  })

  it('initializes with default state', () => {
    const store = useCustomsReportsStore()
    expect(store.reports).toEqual([])
    expect(store.reportRows).toEqual([])
    expect(store.reportsTotalCount).toBe(0)
    expect(store.reportRowsTotalCount).toBe(0)
    expect(store.reportRowsColumns).toEqual([])
    expect(store.reportRowsCustomsProcedure).toBeNull()
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
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

  it('fetches reports using fetchWrapper.get', async () => {
    const authStore = useAuthStore()
    authStore.uploadcustomsreports_page = 1
    authStore.uploadcustomsreports_per_page = 100
    authStore.uploadcustomsreports_sort_by = []
    authStore.uploadcustomsreports_search = ''

    const store = useCustomsReportsStore()
    const mockResponse = {
      items: [{ id: 2 }, { id: 1 }],
      pagination: {
        totalCount: 2,
        hasNextPage: false,
        hasPreviousPage: false
      }
    }
    fetchWrapper.get.mockResolvedValue(mockResponse)

    const promise = store.getReports()
    expect(store.loading).toBe(true)
    await expect(promise).resolves.toBeUndefined()

    expect(fetchWrapper.get).toHaveBeenCalledTimes(1)
    expect(fetchWrapper.get).toHaveBeenCalledWith('http://localhost:8080/api/customsreports?page=1&pageSize=100&sortBy=id&sortOrder=desc')
    expect(store.reports).toEqual([{ id: 2 }, { id: 1 }])
    expect(store.reportsTotalCount).toBe(2)
    expect(store.reportsHasNextPage).toBe(false)
    expect(store.reportsHasPreviousPage).toBe(false)
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
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

  it('stores error when getReports fails', async () => {
    const store = useCustomsReportsStore()
    const error = new Error('fetch failed')
    fetchWrapper.get.mockRejectedValue(error)

    const promise = store.getReports()
    expect(store.loading).toBe(true)
    await expect(promise).resolves.toBeUndefined()

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
    expect(fetchWrapper.get).toHaveBeenCalledWith('http://localhost:8080/api/customsreports?page=1&pageSize=100&sortBy=id&sortOrder=desc')
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('hydrates reports from paged responses', async () => {
    const store = useCustomsReportsStore()
    fetchWrapper.get.mockResolvedValue({
      items: [{ id: 3 }],
      pagination: {
        totalCount: 55,
        hasNextPage: true,
        hasPreviousPage: false
      }
    })

    await store.getReports()

    expect(store.reports).toEqual([{ id: 3 }])
    expect(store.reportsTotalCount).toBe(55)
    expect(store.reportsHasNextPage).toBe(true)
    expect(store.reportsHasPreviousPage).toBe(false)
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
    await expect(promise).resolves.toBeUndefined()

    expect(fetchWrapper.get).toHaveBeenCalledTimes(1)
    expect(fetchWrapper.get).toHaveBeenCalledWith('http://localhost:8080/api/customsreports/5/rows?page=1&pageSize=100&sortBy=id&sortOrder=asc')
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

  it('stores error when getReportRows fails', async () => {
    const store = useCustomsReportsStore()
    store.reportRowsColumns = ['id', 'parcelNumber']
    store.reportRowsCustomsProcedure = 'ЭК 10'
    const error = new Error('fetch rows failed')
    fetchWrapper.get.mockRejectedValue(error)

    const promise = store.getReportRows(10)
    expect(store.loading).toBe(true)
    await expect(promise).resolves.toBeUndefined()

    expect(store.error).toBe(error)
    expect(store.reportRows).toEqual([])
    expect(store.reportRowsColumns).toEqual([])
    expect(store.reportRowsCustomsProcedure).toBeNull()
    expect(store.loading).toBe(false)
  })
})
