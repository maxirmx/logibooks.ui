// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'

const baseUrl = `${apiUrl}/exportduties`

export const useExportDutiesStore = defineStore('export.duties', () => {
  const duties = ref([])
  const loading = ref(false)
  const error = ref(null)
  const isInitialized = ref(false)

  async function getAll() {
    loading.value = true
    error.value = null
    try {
      duties.value = await fetchWrapper.get(baseUrl)
      isInitialized.value = true
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  async function ensureLoaded() {
    if (!isInitialized.value && !loading.value) {
      await getAll()
    }
  }

  return {
    duties,
    loading,
    error,
    isInitialized,
    getAll,
    ensureLoaded
  }
})
