// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'

const baseUrl = `${apiUrl}/parcelstatuses`

export const useParcelStatusesStore = defineStore('parcelStatuses', () => {
  const parcelStatuses = ref([])
  const parcelStatus = ref({ loading: true })
  const loading = ref(false)

  const statusMap = ref(new Map())

  async function getAll() {
    loading.value = true
    try {
      const response = await fetchWrapper.get(baseUrl)
      parcelStatuses.value = response || []
      statusMap.value = new Map(parcelStatuses.value.map(status => [status.id, status]))
      initialized = true
    } finally {
      loading.value = false
    }
  }

  async function getById(id) {
    try {
      loading.value = true
      const response = await fetchWrapper.get(`${baseUrl}/${id}`)
      parcelStatus.value = response
      return response
    } finally {
      loading.value = false
    }
  }

  async function create(data) {
    const response = await fetchWrapper.post(baseUrl, data)
    // Refresh the list after creation
    await getAll()
    return response
  }

  async function update(id, data) {
    const response = await fetchWrapper.put(`${baseUrl}/${id}`, data)
    // Refresh the list after update
    await getAll()
    return response
  }

  async function remove(id) {
    await fetchWrapper.delete(`${baseUrl}/${id}`)
    // Refresh the list after deletion
    await getAll()
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
    if (!initialized && parcelStatuses.value.length === 0 && !loading.value) {
      await getAll()
    }
  }

  return {
    ensureLoaded,
    getStatusById,
    getStatusTitle,
    parcelStatuses,
    parcelStatus,
    loading,
    statusMap,
    getAll,
    getById,
    create,
    update,
    remove
  }
})
