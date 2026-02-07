// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'

const baseUrlParcels = `${apiUrl}/events/parcels`
const baseUrlRegisters = `${apiUrl}/events/registers`

export const useEventsStore = defineStore('events', () => {
  // Parcels state
  const parcelEvents = ref([])
  const parcelEvent = ref({ loading: true })
  const parcelLoading = ref(false)

  // Registers state
  const registerEvents = ref([])
  const registerEvent = ref({ loading: true })
  const registerLoading = ref(false)

  // Shared implementation factory
  function createEventOperations(baseUrl, eventsRef, eventRef, loadingRef) {
    async function getAll() {
      loadingRef.value = true
      try {
        const response = await fetchWrapper.get(baseUrl)
        eventsRef.value = response || []
      } finally {
        loadingRef.value = false
      }
    }

    async function getById(id, refresh = false) {
      if (refresh) {
        eventRef.value = { loading: true }
      }
      loadingRef.value = true
      try {
        const response = await fetchWrapper.get(`${baseUrl}/${id}`)
        eventRef.value = response
        return response
      } finally {
        loadingRef.value = false
      }
    }

    async function update(id, data) {
      const payload = { ...data, id }
      const response = await fetchWrapper.put(`${baseUrl}/${id}`, payload)
      await getAll()
      return response
    }

    async function updateMany(items) {
      const payload = items
      const response = await fetchWrapper.put(baseUrl, payload)
      await getAll()
      return response
    }

    return { getAll, getById, update, updateMany }
  }

  // Create operations for each entity type
  const parcelOps = createEventOperations(baseUrlParcels, parcelEvents, parcelEvent, parcelLoading)
  const registerOps = createEventOperations(baseUrlRegisters, registerEvents, registerEvent, registerLoading)

  return {
    // Parcel events
    parcelEvents,
    parcelEvent,
    parcelLoading,
    parcelGetAll: parcelOps.getAll,
    parcelGetById: parcelOps.getById,
    parcelUpdate: parcelOps.update,
    parcelUpdateMany: parcelOps.updateMany,

    // Register events
    registerEvents,
    registerEvent,
    registerLoading,
    registerGetAll: registerOps.getAll,
    registerGetById: registerOps.getById,
    registerUpdate: registerOps.update,
    registerUpdateMany: registerOps.updateMany
  }
})