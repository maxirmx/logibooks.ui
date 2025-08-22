// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks frontend application
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions
// are met:
// 1. Redistributions of source code must retain the above copyright
//    notice, this list of conditions and the following disclaimer.
// 2. Redistributions in binary form must reproduce the above copyright
//    notice, this list of conditions and the following disclaimer in the
//    documentation and/or other materials provided with the distribution.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// ``AS IS'' AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED
// TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
// PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDERS OR CONTRIBUTORS
// BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
// CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
// SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
// INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
// CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE.

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'

const baseUrl = `${apiUrl}/feacncodes`

export const useFeacnOrdersStore = defineStore('feacn.orders', () => {
  const orders = ref([])
  const prefixes = ref([])
  const loading = ref(false)
  const error = ref(null)
  const isInitialized = ref(false)

  async function getOrders() {
    loading.value = true
    error.value = null
    try {
      orders.value = await fetchWrapper.get(`${baseUrl}/orders`)
      isInitialized.value = true
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  async function ensureLoaded() {
    if (!isInitialized.value && !loading.value) {
      await getOrders()
    }
  }

  async function getPrefixes(orderId) {
    if (!orderId) {
      prefixes.value = []
      return
    }
    loading.value = true
    error.value = null
    try {
      prefixes.value = await fetchWrapper.get(`${baseUrl}/orders/${orderId}/prefixes`)
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  async function update() {
    loading.value = true
    error.value = null
    try {
      await fetchWrapper.post(`${baseUrl}/update`)
      // Reload orders after update
      await getOrders()
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  async function enable(orderId) {
    loading.value = true
    error.value = null
    try {
      await fetchWrapper.post(`${baseUrl}/orders/${orderId}/enable`)
      await getOrders()
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  async function disable(orderId) {
    loading.value = true
    error.value = null
    try {
      await fetchWrapper.post(`${baseUrl}/orders/${orderId}/disable`)
      await getOrders()
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }
  async function toggleEnabled(id, en) {
    try {
      loading.value = true
      if (en) {
        await enable(id)
      } else {
        await disable(id)
      }
    } finally {
    loading.value = false
    await getOrders()
    }
  }
 
  return { 
    orders, 
    prefixes, 
    loading, 
    error, 
    isInitialized, 
    getOrders, 
    getPrefixes,
    update,
    enable,
    disable,
    ensureLoaded,
    toggleEnabled
  }
})
