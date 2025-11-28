// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'

const baseUrl = `${apiUrl}/rlcolumnswithmappings`

export const useRlColumnsWithMappingsStore = defineStore('rlColumnsWithMappings', () => {
  const columnsWithMappings = ref([])
  const columnWithMappings = ref({ loading: true })
  const loading = ref(false)
  const error = ref(null)
  const isInitialized = ref(false)

  async function getAll() {
    loading.value = true
    error.value = null
    try {
      const response = await fetchWrapper.get(baseUrl)
      columnsWithMappings.value = response || []
      isInitialized.value = true
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  async function ensureLoaded() {
    if (!isInitialized.value && !loading.value) {
      await getAll()
    }
  }

  async function getById(id, refresh = false) {
    if (refresh) {
      columnWithMappings.value = { loading: true }
    }
    loading.value = true
    error.value = null
    try {
      const response = await fetchWrapper.get(`${baseUrl}/${id}`)
      columnWithMappings.value = response
      return response
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  async function create(data) {
    loading.value = true
    error.value = null
    try {
      const response = await fetchWrapper.post(baseUrl, data)
      await getAll()
      return response
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  async function update(id, data) {
    loading.value = true
    error.value = null
    try {
      const response = await fetchWrapper.put(`${baseUrl}/${id}`, data)
      await getAll()
      return response
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    columnsWithMappings,
    columnWithMappings,
    loading,
    error,
    isInitialized,
    getAll,
    ensureLoaded,
    getById,
    create,
    update
  }
})
