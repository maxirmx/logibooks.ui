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

const baseUrl = `${apiUrl}/parcels`

export const useParcelCheckStatusStore = defineStore('parcelCheckStatus', () => {
  const statuses = ref([])
  const loading = ref(false)
  const error = ref(null)

  // Map for quick lookups
  const statusMap = ref(new Map())

  async function fetchStatuses() {
    loading.value = true
    error.value = null
    try {
      const response = await fetchWrapper.get(`${baseUrl}/checkstatuses`)
      statuses.value = response || []

      // Build a map for quick lookups
      statusMap.value = new Map(statuses.value.map(status => [status.id, status]))
    } catch (err) {
      error.value = err
      console.error('Failed to fetch parcel check statuses:', err)
    } finally {
      loading.value = false
    }
  }

  function getStatusById(id) {
    return statusMap.value.get(id) || null
  }

  function getStatusTitle(id) {
    const status = getStatusById(id)
    return status ? status.title : `Статус ${id}`
  }

  // Auto-fetch statuses when store is initialized (only once)
  let initialized = false
  async function ensureLoaded() {
    if (!initialized && statuses.value.length === 0 && !loading.value) {
      initialized = true
      await fetchStatuses()
    }
  }

  return {
    statuses,
    loading,
    error,
    statusMap,
    fetchStatuses,
    getStatusById,
    getStatusTitle,
    ensureLoaded
  }
})
