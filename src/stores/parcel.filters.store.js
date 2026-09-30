// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'

const baseUrl = `${apiUrl}/parcel-filters`

export const useParcelFiltersStore = defineStore('parcelFilters', () => {
  const filters = ref([])

  async function getAll() {
    const result = await fetchWrapper.get(baseUrl)
    filters.value = result ?? []
    return filters.value
  }

  async function getById(id) {
    return fetchWrapper.get(`${baseUrl}/${id}`)
  }

  async function create(data) {
    const result = await fetchWrapper.post(baseUrl, data)
    filters.value = [...filters.value, result]
    return result
  }

  async function update(id, data) {
    await fetchWrapper.put(`${baseUrl}/${id}`, data)
    filters.value = filters.value.map(filter => filter.id === id ? { ...filter, ...data } : filter)
  }

  async function remove(id) {
    await fetchWrapper.delete(`${baseUrl}/${id}`)
    filters.value = filters.value.filter(filter => filter.id !== id)
  }

  function reset() {
    filters.value = []
  }

  return { filters, getAll, getById, create, update, remove, $reset: reset }
})
