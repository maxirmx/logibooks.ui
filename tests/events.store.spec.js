/* @vitest-environment jsdom */
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useEventsStore } from '@/stores/events.store.js'

const mockGet = vi.hoisted(() => vi.fn())
const mockPut = vi.hoisted(() => vi.fn())

vi.mock('@/helpers/fetch.wrapper.js', () => ({
  fetchWrapper: {
    get: mockGet,
    put: mockPut
  }
}))

vi.mock('@/helpers/config.js', () => ({
  apiUrl: 'http://localhost:3000/api'
}))

describe('events.store.js', () => {
  let store

  const mockEvents = [
    { id: 1, eventId: 'Received', eventName: 'Получена' },
    { id: 2, eventId: 'Processing', eventName: 'Обрабатывается', parcelStatusId: 5 }
  ]

  const mockEvent = { id: 2, eventId: 'Processing', eventName: 'Обрабатывается', parcelStatusId: 5 }

  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)
    store = useEventsStore()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('parcel events', () => {
    describe('parcelGetAll', () => {
      it('handles empty response', async () => {
        mockGet.mockResolvedValue(null)

        await store.parcelGetAll()

        expect(store.parcelEvents).toEqual([])
      })

    })

    describe('parcelGetById', () => {
      it('resets loading state when refresh is true', async () => {
        store.parcelEvent = { id: 9 }
        mockGet.mockResolvedValue(mockEvent)

        await store.parcelGetById(2, true)

        expect(store.parcelEvent).toEqual(mockEvent)
      })

    })

    describe('parcelUpdate', () => {
      it('updates a parcel event and refreshes list', async () => {
        const updatedEvent = { ...mockEvent, parcelStatusId: 7 }
        mockPut.mockResolvedValue(updatedEvent)
        mockGet.mockResolvedValue(mockEvents)

        const result = await store.parcelUpdate(2, { parcelStatusId: 7 })

        expect(mockPut).toHaveBeenCalledWith('http://localhost:3000/api/events/parcels/2', {
          id: 2,
          parcelStatusId: 7
        })
        expect(mockGet).toHaveBeenCalledWith('http://localhost:3000/api/events/parcels')
        expect(result).toEqual(updatedEvent)
      })

    })

  })

  describe('register events', () => {
    describe('registerGetById', () => {
      it('propagates fetch errors', async () => {
        const error = new Error('Not found')
        mockGet.mockRejectedValue(error)

        await expect(store.registerGetById(99)).rejects.toThrow('Not found')
      })
    })

  })

})
