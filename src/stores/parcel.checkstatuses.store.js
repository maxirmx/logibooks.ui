// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'

const baseUrl = `${apiUrl}/parcels`

export const useParcelCheckStatusStore = defineStore('parcelCheckStatus', () => {
  const statuses = ref([])
  const loading = ref(false)
  const error = ref(null)

  // Map for quick lookups
  const statusMap = ref(new Map())

  async function fetchStatuses() {
    loading.value = true
    error.value = null
    try {
      const response = await fetchWrapper.get(`${baseUrl}/checkstatuses`)
      statuses.value = response || []

      // Build a map for quick lookups
      statusMap.value = new Map(statuses.value.map(status => [status.id, status]))
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  function getStatusById(id) {
    return statusMap.value.get(id) || null
  }

  function getStatusTitle(id) {
    const status = getStatusById(id)
    return status ? status.title : `Статус ${id}`
  }

  // Auto-fetch statuses when store is initialized (only once)
  let initialized = false
  async function ensureLoaded() {
    if (!initialized && statuses.value.length === 0 && !loading.value) {
      initialized = true
      await fetchStatuses()
    }
  }

  return {
    statuses,
    loading,
    error,
    statusMap,
    fetchStatuses,
    getStatusById,
    getStatusTitle,
    ensureLoaded
  }
})
