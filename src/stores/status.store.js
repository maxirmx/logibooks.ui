// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'

const baseUrl = `${apiUrl}/status`

export const useStatusStore = defineStore('status', () => {
  const coreVersion = ref('')
  const dbVersion = ref('')
  const exchangeRates = ref([])

  async function fetchStatus() {
    coreVersion.value = undefined
    dbVersion.value = undefined
    exchangeRates.value = []
    const res = await fetchWrapper.get(`${baseUrl}/status`)
    coreVersion.value = res.appVersion
    dbVersion.value = res.dbVersion
    exchangeRates.value = Array.isArray(res.exchangeRates.rates) ? res.exchangeRates.rates : []
  }

  return { coreVersion, dbVersion, exchangeRates, fetchStatus }
})
