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

  function cacheContext(userId) {
    return {
      version: cacheVersion,
      userId: authStore.user?.id,
      personal: userId == null || userId === authStore.user?.id
    }
  }

  function isCurrent(context) {
    return context.personal && context.version === cacheVersion && context.userId === authStore.user?.id
  }

  watch(() => authStore.user?.id, reset, { flush: 'sync' })

  function ownerUrl(path, userId) {
    if (userId == null) return path
    if (!Number.isInteger(userId) || userId <= 0 || userId > 2147483647) {
      throw new Error('Некорректный идентификатор пользователя')
    }
    return `${path}?userId=${userId}`
  }

  async function getAll(userId) {
    const context = cacheContext(userId)
    const version = context.personal ? ++loadVersion : loadVersion
    const result = await fetchWrapper.get(ownerUrl(baseUrl, userId)) ?? []
    if (isCurrent(context) && version === loadVersion) filters.value = result
    return result
  }

  async function getById(id, userId) {
    return fetchWrapper.get(ownerUrl(`${baseUrl}/${id}`, userId))
  }

  async function create(data, userId) {
    const context = cacheContext(userId)
    const result = await fetchWrapper.post(ownerUrl(baseUrl, userId), data)
    if (isCurrent(context)) {
      ++loadVersion
      filters.value = [...filters.value, result]
    }
    return result
  }

  async function update(id, data, userId) {
    const context = cacheContext(userId)
    await fetchWrapper.put(ownerUrl(`${baseUrl}/${id}`, userId), data)
    if (isCurrent(context)) {
      ++loadVersion
      filters.value = filters.value.map(filter => filter.id === id ? { ...filter, ...data } : filter)
    }
  }

  async function remove(id, userId) {
    const context = cacheContext(userId)
    await fetchWrapper.delete(ownerUrl(`${baseUrl}/${id}`, userId))
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
