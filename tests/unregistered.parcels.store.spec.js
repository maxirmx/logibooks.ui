// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUnregisteredParcelsStore } from '@/stores/unregistered.parcels.store.js'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'

vi.mock('@/helpers/fetch.wrapper.js', () => ({
  fetchWrapper: { get: vi.fn(), downloadFile: vi.fn() }
}))

vi.mock('@/helpers/config.js', () => ({
  apiUrl: 'http://localhost:8080/api'
}))

describe('unregistered.parcels store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('loads unregistered parcels by register id', async () => {
    const mockRows = [{ id: 1, registerId: 5, statusId: 2, zone: 9 }]
    fetchWrapper.get.mockResolvedValue(mockRows)

    const store = useUnregisteredParcelsStore()
    const result = await store.getAll(5)

    expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/unregisteredparcels/5`)
    expect(result).toEqual(mockRows)
    expect(store.items).toEqual(mockRows)
    expect(store.error).toBeNull()
    expect(store.loading).toBe(false)
  })

  it('normalizes non-array api response to empty list', async () => {
    fetchWrapper.get.mockResolvedValue({ id: 1 })

    const store = useUnregisteredParcelsStore()
    const result = await store.getAll(3)

    expect(result).toEqual([])
    expect(store.items).toEqual([])
    expect(store.error).toBeNull()
  })

  it('stores error and returns empty list on failure', async () => {
    const err = new Error('boom')
    fetchWrapper.get.mockRejectedValue(err)

    const store = useUnregisteredParcelsStore()
    const result = await store.getAll(7)

    expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/unregisteredparcels/7`)
    expect(result).toEqual([])
    expect(store.items).toEqual([])
    expect(store.error).toBe(err)
    expect(store.loading).toBe(false)
  })

  it('downloads register export with default filename using registerId', async () => {
    fetchWrapper.downloadFile.mockResolvedValue(true)

    const store = useUnregisteredParcelsStore()
    const result = await store.download(8)

    expect(fetchWrapper.downloadFile).toHaveBeenCalledWith(
      `${apiUrl}/unregisteredparcels/8/download`,
      'Unregistered_parcels_8.xlsx'
    )
    expect(result).toBe(true)
    expect(store.error).toBeNull()
    expect(store.loading).toBe(false)
  })

  it('downloads register export with invoiceNumber in filename', async () => {
    fetchWrapper.downloadFile.mockResolvedValue(true)

    const store = useUnregisteredParcelsStore()
    const result = await store.download(8, 'INV-2025-001')

    expect(fetchWrapper.downloadFile).toHaveBeenCalledWith(
      `${apiUrl}/unregisteredparcels/8/download`,
      'Unregistered_parcels_INV-2025-001.xlsx'
    )
    expect(result).toBe(true)
  })

  it('falls back to registerId in filename when invoiceNumber is empty string', async () => {
    fetchWrapper.downloadFile.mockResolvedValue(true)

    const store = useUnregisteredParcelsStore()
    await store.download(8, '')

    expect(fetchWrapper.downloadFile).toHaveBeenCalledWith(
      `${apiUrl}/unregisteredparcels/8/download`,
      'Unregistered_parcels_8.xlsx'
    )
  })

  it('falls back to registerId in filename when invoiceNumber is whitespace', async () => {
    fetchWrapper.downloadFile.mockResolvedValue(true)

    const store = useUnregisteredParcelsStore()
    await store.download(8, '   ')

    expect(fetchWrapper.downloadFile).toHaveBeenCalledWith(
      `${apiUrl}/unregisteredparcels/8/download`,
      'Unregistered_parcels_8.xlsx'
    )
  })

  it('stores error and returns null when export download fails', async () => {
    const err = new Error('download failed')
    fetchWrapper.downloadFile.mockRejectedValue(err)

    const store = useUnregisteredParcelsStore()
    const result = await store.download(8)

    expect(result).toBeNull()
    expect(store.error).toBe(err)
    expect(store.loading).toBe(false)
  })

})
