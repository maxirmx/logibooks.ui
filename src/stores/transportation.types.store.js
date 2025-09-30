// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'

const baseUrl = `${apiUrl}/transportationtypes`

export const useTransportationTypesStore = defineStore('transportationTypes', () => {
  const types = ref([])
  const loading = ref(false)
  const error = ref(null)

  const typeMap = ref(new Map())
  let initialized = false

  async function getAll() {
    loading.value = true
    error.value = null
    try {
      const res = await fetchWrapper.get(baseUrl)
      types.value = res || []
      typeMap.value = new Map(types.value.map(t => [t.id, t]))
      initialized = true
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }
  async function ensureLoaded() {
    if (!initialized && types.value.length === 0 && !loading.value) {
      await getAll()
    }
  }

  function getName(id) {
    const type = typeMap.value.get(id)
    return type ? type.name : `Тип ${id}`
  }

  function getDocument(id) {
    const type = typeMap.value.get(id)
    return type ? type.document : `[Тип ${id}]`
  }

  return { types, loading, error, getAll, ensureLoaded, getName, getDocument }
})
