// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'

const baseUrl = `${apiUrl}/unregisteredparcels`

export const useUnregisteredParcelsStore = defineStore('unregisteredParcels', () => {
  const items = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function getAll(registerId) {
    loading.value = true
    error.value = null
    try {
      const response = await fetchWrapper.get(`${baseUrl}/${registerId}`)
      items.value = Array.isArray(response) ? response : []
      return items.value
    } catch (err) {
      error.value = err
      items.value = []
      return []
    } finally {
      loading.value = false
    }
  }

  return {
    items,
    loading,
    error,
    getAll
  }
})
