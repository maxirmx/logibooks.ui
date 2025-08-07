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
      
      // Ensure the response includes all needed properties
      if (response && !response.registerId && prevParcel.value && prevParcel.value.registerId) {
        // If the new response doesn't have registerId but we have it from before, keep it
        response.registerId = prevParcel.value.registerId
      }
      
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
