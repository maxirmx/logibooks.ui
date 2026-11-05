// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useBoxesStore } from '@/stores/boxes.store.js'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'

vi.mock('@/helpers/fetch.wrapper.js', () => ({
  fetchWrapper: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    downloadFile: vi.fn()
  }
}))

vi.mock('@/helpers/config.js', () => ({ apiUrl: 'http://localhost:8080/api' }))

const sampleBox = {
  id: 7,
  registerId: 42,
  code: 'BOX-7',
  lengthCm: 10,
  widthCm: 20,
  heightCm: 30,
  weightKg: 4.125
}

describe('boxes store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it.each([
    ['downloadSelectedStickers', [42, [7, 9]], 'register-42-selected-boxes-stickers.csv', {
      method: 'POST', body: { boxIds: [7, 9] }
    }],
    ['downloadRegisterStickers', [42], 'register-42-stickers.csv']
  ])('authenticates %s through the download helper and propagates a rejection', async (method, args, filename, options) => {
    const store = useBoxesStore()
    const error = new Error('Не удалось выгрузить файл')
    fetchWrapper.downloadFile.mockRejectedValueOnce(error)
    await expect(store[method](...args)).rejects.toBe(error)
    const request = [`${apiUrl}/registers/42/boxes/stickers.csv`, filename]
    if (options) request.push(options)
    expect(fetchWrapper.downloadFile).toHaveBeenCalledExactlyOnceWith(...request)
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it.each(['detail', 'list'])('preserves the saved weight when a delayed %s read is superseded', async kind => {
    const store = useBoxesStore()
    store.box = { ...sampleBox }
    store.boxes = [{ ...sampleBox }]
    let complete
    fetchWrapper.get.mockReturnValueOnce(new Promise(resolve => { complete = resolve }))
    const read = kind === 'detail' ? store.getById(7) : store.getAll(42)
    store.invalidateDerived(42)
    expect(store.box.weightKg).toBe(4.125)
    expect(store.boxes[0].weightKg).toBe(4.125)
    complete(kind === 'detail' ? { ...sampleBox, weightKg: 999 } : [{ ...sampleBox, weightKg: 999 }])
    await read
    const result = kind === 'detail' ? store.box : store.boxes[0]
    expect(result).toMatchObject({ weightKg: 4.125, derivedTotalsPending: true })
  })

  it('loads register boxes and a single box', async () => {
    fetchWrapper.get.mockResolvedValueOnce([sampleBox]).mockResolvedValueOnce(sampleBox)
    const store = useBoxesStore()

    expect(await store.getAll(42)).toEqual([sampleBox])
    expect(fetchWrapper.get).toHaveBeenNthCalledWith(1, `${apiUrl}/boxes?registerId=42`)
    expect(await store.getById(7)).toEqual(sampleBox)
    expect(fetchWrapper.get).toHaveBeenNthCalledWith(2, `${apiUrl}/boxes/7`)
    expect(store.box).toEqual(sampleBox)
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it.each([
    ['getAll', () => useBoxesStore().getAll(42)],
    ['getById', () => useBoxesStore().getById(7)]
  ])('rethrows %s failures and records the error', async (_name, operation) => {
    const error = new Error('load failed')
    fetchWrapper.get.mockRejectedValueOnce(error)
    const store = useBoxesStore()

    await expect(operation()).rejects.toBe(error)
    expect(store.error).toBe(error)
    expect(store.loading).toBe(false)
  })

  it('creates a box and updates list and selected state', async () => {
    fetchWrapper.post.mockResolvedValue(sampleBox)
    const store = useBoxesStore()

    const payload = { registerId: 42, code: 'BOX-7' }
    expect(await store.create(payload)).toEqual(sampleBox)
    expect(fetchWrapper.post).toHaveBeenCalledWith(`${apiUrl}/boxes`, payload)
    expect(store.boxes).toEqual([sampleBox])
    expect(store.box).toEqual(sampleBox)
  })

  it('updates box metrics without changing its code', async () => {
    fetchWrapper.put.mockResolvedValue()
    const store = useBoxesStore()
    store.boxes = [{ ...sampleBox }]
    store.box = { ...sampleBox }
    const payload = { lengthCm: 15, weightKg: null }

    await store.update(7, payload)

    expect(fetchWrapper.put).toHaveBeenCalledWith(`${apiUrl}/boxes/7`, payload)
    expect(store.boxes[0]).toEqual({ ...sampleBox, ...payload })
    expect(store.box).toEqual({ ...sampleBox, ...payload })
    expect(store.box.code).toBe('BOX-7')
  })

  it.each([
    ['create', 'post', () => useBoxesStore().create({ registerId: 42, code: 'BOX' })],
    ['update', 'put', () => useBoxesStore().update(7, { lengthCm: 1 })]
  ])('rethrows %s failures and records the error', async (_name, method, operation) => {
    const error = new Error('mutation failed')
    fetchWrapper[method].mockRejectedValueOnce(error)
    const store = useBoxesStore()

    await expect(operation()).rejects.toBe(error)
    expect(store.error).toBe(error)
    expect(store.loading).toBe(false)
  })
})
