// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'

const baseUrl = `${apiUrl}/wordmatchtypes`

export const useWordMatchTypesStore = defineStore('wordMatchTypes', () => {
  const matchTypes = ref([])
  const loading = ref(false)
  const error = ref(null)

  const matchTypeMap = ref(new Map())

  async function fetchMatchTypes() {
    loading.value = true
    error.value = null
    try {
      const response = await fetchWrapper.get(`${baseUrl}`)
      matchTypes.value = response || []
      matchTypeMap.value = new Map(matchTypes.value.map(t => [t.id, t]))
      initialized.value = true
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  function getName(id) {
    const type = matchTypeMap.value.get(id)
    return type ? type.name : `Тип ${id}`
  }

  const initialized = ref(false)
  async function ensureLoaded() {
    if (!initialized.value && matchTypes.value.length === 0 && !loading.value) {
      await fetchMatchTypes()
    }
  }

  return {
    matchTypes,
    loading,
    error,
    matchTypeMap,
    fetchMatchTypes,
    getName,
    ensureLoaded
  }
})
