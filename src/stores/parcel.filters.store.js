// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'
import { useAuthStore } from '@/stores/auth.store.js'

const baseUrl = `${apiUrl}/parcel-filters`

export const useParcelFiltersStore = defineStore('parcelFilters', () => {
  const filters = ref([])
  const authStore = useAuthStore()
  let cacheVersion = 0
  let loadVersion = 0

  function cacheContext() {
    return { version: cacheVersion, userId: authStore.user?.id }
  }

  function isCurrent(context) {
    return context.version === cacheVersion && context.userId === authStore.user?.id
  }

  watch(() => authStore.user?.id, reset, { flush: 'sync' })

  async function getAll() {
    const context = cacheContext()
    const version = ++loadVersion
    const result = await fetchWrapper.get(baseUrl) ?? []
    if (isCurrent(context) && version === loadVersion) filters.value = result
    return result
  }

  async function getById(id) {
    return fetchWrapper.get(`${baseUrl}/${id}`)
  }

  async function create(data) {
    const context = cacheContext()
    const result = await fetchWrapper.post(baseUrl, data)
    if (isCurrent(context)) {
      ++loadVersion
      filters.value = [...filters.value, result]
    }
    return result
  }

  async function update(id, data) {
    const context = cacheContext()
    await fetchWrapper.put(`${baseUrl}/${id}`, data)
    if (isCurrent(context)) {
      ++loadVersion
      filters.value = filters.value.map(filter => filter.id === id ? { ...filter, ...data } : filter)
    }
  }

  async function remove(id) {
    const context = cacheContext()
    await fetchWrapper.delete(`${baseUrl}/${id}`)
    if (isCurrent(context)) {
      ++loadVersion
      filters.value = filters.value.filter(filter => filter.id !== id)
    }
  }

  function reset() {
    ++cacheVersion
    ++loadVersion
    filters.value = []
  }

  return { filters, getAll, getById, create, update, remove, $reset: reset }
})
