// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'

const baseUrl = `${apiUrl}/feacncodes`

export const useFeacnCodesStore = defineStore('feacnCodes', () => {
  const loading = ref(false)
  const error = ref(null)
  async function getById(id) {
    loading.value = true
    error.value = null
    try {
      return await fetchWrapper.get(`${baseUrl}/${id}`)
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  async function getByCode(code) {
    loading.value = true
    error.value = null
    try {
      return await fetchWrapper.get(`${baseUrl}/code/${code}`)
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  async function lookup(key) {
    loading.value = true
    error.value = null
    try {
      return await fetchWrapper.get(`${baseUrl}/lookup/${key}`)
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  // Bulk lookup FEACN codes
  async function bulkLookup(codes) {
    loading.value = true
    error.value = null
    try {
      return await fetchWrapper.post(`${baseUrl}/bulk-lookup`, { codes })
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  async function getChildren(id = null) {
    loading.value = true
    error.value = null
    try {
      const query = id !== null && id !== undefined ? `?id=${id}` : ''
      return await fetchWrapper.get(`${baseUrl}/children${query}`)
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  async function upload(file) {
    loading.value = true
    error.value = null
    try {
      const formData = new FormData()
      formData.append('file', file)
      await fetchWrapper.postFile(`${baseUrl}/upload`, formData)
      // Upload is now synchronous - success means it's complete
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    getById,
    getByCode,
    lookup,
    bulkLookup,
    getChildren,
    upload
  }
})

