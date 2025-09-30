// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'

const baseUrl = `${apiUrl}/customsprocedures`

export const useCustomsProceduresStore = defineStore('customsProcedures', () => {
  const procedures = ref([])
  const loading = ref(false)
  const error = ref(null)

  const procedureMap = ref(new Map())
  let initialized = false

  async function getAll() {
    loading.value = true
    error.value = null
    try {
      const res = await fetchWrapper.get(baseUrl)
      procedures.value = res || []
      procedureMap.value = new Map(procedures.value.map(p => [p.id, p]))
      initialized = true
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  async function ensureLoaded() {
    if (!initialized && procedures.value.length === 0 && !loading.value) {
      await getAll()
    }
  }

  function getName(id) {
    const proc = procedureMap.value.get(id)
    return proc ? proc.name : `Процедура ${id}`
  }

  return { procedures, loading, error, getAll, ensureLoaded, getName }
})
