// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'

const baseUrl = `${apiUrl}/parcelprocessingevents`

export const useParcelProcessingEventsStore = defineStore('parcelProcessingEvents', () => {
  const events = ref([])
  const event = ref({ loading: true })
  const loading = ref(false)

  async function getAll() {
    loading.value = true
    try {
      const response = await fetchWrapper.get(baseUrl)
      events.value = response || []
    } finally {
      loading.value = false
    }
  }

  async function getById(id, refresh = false) {
    if (refresh) {
      event.value = { loading: true }
    }

    try {
      const response = await fetchWrapper.get(`${baseUrl}/${id}`)
      event.value = response
      return response
    } finally {
      loading.value = false
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

  return {
    events,
    event,
    loading,
    getAll,
    getById,
    update,
    updateMany
  }
})
