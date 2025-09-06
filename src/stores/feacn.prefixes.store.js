// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'

const baseUrl = `${apiUrl}/feacnprefixes`

export const useFeacnPrefixesStore = defineStore('feacnPrefixes', () => {
  const prefixes = ref([])
  const prefix = ref({ loading: true })
  const loading = ref(false)
  const error = ref(null)
  const isInitialized = ref(false)
  const loadPromise = ref(null)

  async function getAll() {
    loading.value = true
    try {
      const response = await fetchWrapper.get(baseUrl)
      prefixes.value = response || []
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
    prefix.value = refresh ? { loading: true } : { ...prefix.value, loading: true }
    loading.value = true
    try {
      const response = await fetchWrapper.get(`${baseUrl}/${id}`)
      prefix.value = response
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

  async function remove(id) {
    loading.value = true
    try {
      await fetchWrapper.delete(`${baseUrl}/${id}`)
      await getAll()
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  function reset() {
    prefixes.value = []
    prefix.value = { loading: true }
    loading.value = false
    error.value = null
    isInitialized.value = false
    loadPromise.value = null
  }

  return {
    prefixes,
    prefix,
    loading,
    error,
    isInitialized,
    getAll,
    getById,
    create,
    update,
    remove,
    ensureLoaded,
    $reset: reset
  }
})

