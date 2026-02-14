// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'

const baseUrl = `${apiUrl}/hotkeyactionschemes`

export const useHotKeyActionSchemesStore = defineStore('hotKeyActionSchemes', () => {
  const hotKeyActionSchemes = ref([])
  const hotKeyActionScheme = ref(null)
  const loading = ref(false)
  const error = ref(null)

  async function getAll() {
    loading.value = true
    error.value = null
    try {
      hotKeyActionSchemes.value = await fetchWrapper.get(baseUrl)
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  async function getById(id) {
    hotKeyActionScheme.value = { loading: true }
    loading.value = true
    error.value = null
    try {
      hotKeyActionScheme.value = await fetchWrapper.get(`${baseUrl}/${id}`)
      return hotKeyActionScheme.value
    } catch (err) {
      error.value = err
      hotKeyActionScheme.value = { error: err }
      return null
    } finally {
      loading.value = false
    }
  }

  async function create(hotKeyActionSchemeData) {
    loading.value = true
    error.value = null
    try {
      const result = await fetchWrapper.post(baseUrl, hotKeyActionSchemeData)
      hotKeyActionSchemes.value.push(result)
      return result
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  async function update(id, hotKeyActionSchemeData) {
    loading.value = true
    error.value = null
    try {
      await fetchWrapper.put(`${baseUrl}/${id}`, hotKeyActionSchemeData)
      const index = hotKeyActionSchemes.value.findIndex(i => i.id === id)
      if (index !== -1) {
        hotKeyActionSchemes.value[index] = {
          ...hotKeyActionSchemes.value[index],
          ...hotKeyActionSchemeData
        }
      }
      return true
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  async function remove(id) {
    loading.value = true
    error.value = null
    try {
      await fetchWrapper.delete(`${baseUrl}/${id}`)
      hotKeyActionSchemes.value = hotKeyActionSchemes.value.filter(i => i.id !== id)
      return true
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    hotKeyActionSchemes,
    hotKeyActionScheme,
    loading,
    error,
    getAll,
    getById,
    create,
    update,
    remove
  }
})
