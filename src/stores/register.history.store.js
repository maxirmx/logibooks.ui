// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiUrl } from '@/helpers/config.js'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'

export const useRegisterHistoryStore = defineStore('register-history', () => {
  const items = ref([])
  const totalCount = ref(0)
  const loading = ref(false)
  const error = ref(null)

  async function getHistory(registerId, { page = 1, pageSize = 50 } = {}) {
    loading.value = true
    error.value = null
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize)
      })
      const result = await fetchWrapper.get(
        `${apiUrl}/registers/${registerId}/history?${params.toString()}`
      )
      items.value = Array.isArray(result?.items) ? result.items : []
      totalCount.value = Number(result?.pagination?.totalCount) || 0
      return result
    } catch (err) {
      items.value = []
      totalCount.value = 0
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    items,
    totalCount,
    loading,
    error,
    getHistory
  }
})
