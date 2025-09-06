// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'

const baseUrl = `${apiUrl}/parcelviews`

export const useParcelViewsStore = defineStore('parcelViews', () => {
  const prevParcel = ref(null)
  const loading = ref(false)
  const error = ref(null)

  async function add(parcelId) {
    loading.value = true
    error.value = null
    try {
      await fetchWrapper.post(baseUrl, { id: parcelId })
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  async function back() {
    loading.value = true
    error.value = null
    try {
      const response = await fetchWrapper.put(baseUrl)
     
      prevParcel.value = response || null
      return prevParcel.value
    } catch (err) {
      error.value = err
      return null
    } finally {
      loading.value = false
    }
  }

  return {
    prevParcel,
    loading,
    error,
    add,
    back
  }
})
