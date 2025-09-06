// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'

const baseUrl = `${apiUrl}/keywords`

export const useKeyWordsStore = defineStore('keyWords', () => {
  const keyWords = ref([])
  const keyWord = ref({ loading: true })
  const loading = ref(false)
  const error = ref(null)
  const isInitialized = ref(false)

  async function getAll() {
    loading.value = true
    try {
      const response = await fetchWrapper.get(baseUrl)
      keyWords.value = response || []
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
      keyWord.value = { loading: true }
    }
    loading.value = true
    try {
      const response = await fetchWrapper.get(`${baseUrl}/${id}`)
      keyWord.value = response
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

  async function upload(file) {
    loading.value = true
    error.value = null
    try {
      const formData = new FormData()
      formData.append('file', file)
      await fetchWrapper.postFile(`${baseUrl}/upload`, formData)
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    keyWords,
    keyWord,
    loading,
    error,
    isInitialized,
    getAll,
    getById,
    create,
    update,
    remove,
    upload,
    ensureLoaded
  }
})

