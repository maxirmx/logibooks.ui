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
  const userOptions = ref([])
  const reasonOptions = ref([])
  const loading = ref(false)
  const error = ref(null)
  let latestRequestId = 0

  async function getHistory(
    registerId,
    {
      page = 1,
      pageSize = 50,
      sortBy = 'changedAt',
      sortOrder = 'desc',
      userId = null,
      reason = null
    } = {}
  ) {
    const requestId = ++latestRequestId
    loading.value = true
    error.value = null
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        sortBy: String(sortBy || 'changedAt'),
        sortOrder: String(sortOrder || 'desc')
      })
      if (userId !== null && userId !== undefined && userId !== '') {
        params.append('userId', String(userId))
      }
      if (reason !== null && reason !== undefined && reason !== '') {
        params.append('reason', String(reason))
      }
      const result = await fetchWrapper.get(
        `${apiUrl}/registers/${registerId}/history?${params.toString()}`
      )
      if (requestId === latestRequestId) {
        items.value = Array.isArray(result?.items) ? result.items : []
        totalCount.value = Number(result?.pagination?.totalCount) || 0
        userOptions.value = Array.isArray(result?.filterOptions?.users)
          ? result.filterOptions.users
          : []
        reasonOptions.value = Array.isArray(result?.filterOptions?.reasons)
          ? result.filterOptions.reasons
          : []
      }
      return result
    } catch (err) {
      if (requestId === latestRequestId) {
        items.value = []
        totalCount.value = 0
        error.value = err
      }
      throw err
    } finally {
      if (requestId === latestRequestId) {
        loading.value = false
      }
    }
  }

  function reset() {
    latestRequestId += 1
    items.value = []
    totalCount.value = 0
    userOptions.value = []
    reasonOptions.value = []
    loading.value = false
    error.value = null
  }

  return {
    items,
    totalCount,
    userOptions,
    reasonOptions,
    loading,
    error,
    getHistory,
    reset
  }
})
