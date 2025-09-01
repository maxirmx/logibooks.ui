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

const baseUrl = `${apiUrl}/feacnprefixes`

export const useFeacnPrefixesStore = defineStore('feacnPrefixes', () => {
  const prefixes = ref([])
  const prefix = ref({ loading: true })
  const loading = ref(false)
  const error = ref(null)
  const isInitialized = ref(false)
  const loadPromise = ref(null)

  async function getAll() {
    loading.value = true
    try {
      const response = await fetchWrapper.get(baseUrl)
      prefixes.value = response || []
      isInitialized.value = true
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  async function ensureLoaded() {
    if (!isInitialized.value && !loading.value) {
      await getAll()
    }
  }

  async function getById(id, refresh = false) {
    prefix.value = refresh ? { loading: true } : { ...prefix.value, loading: true }
    loading.value = true
    try {
      const response = await fetchWrapper.get(`${baseUrl}/${id}`)
      prefix.value = response
      return response
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  async function create(data) {
    loading.value = true
    try {
      const response = await fetchWrapper.post(baseUrl, data)
      await getAll()
      return response
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  async function update(id, data) {
    loading.value = true
    try {
      const response = await fetchWrapper.put(`${baseUrl}/${id}`, data)
      await getAll()
      return response
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  async function remove(id) {
    loading.value = true
    try {
      await fetchWrapper.delete(`${baseUrl}/${id}`)
      await getAll()
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  function reset() {
    prefixes.value = []
    prefix.value = { loading: true }
    loading.value = false
    error.value = null
    isInitialized.value = false
    loadPromise.value = null
  }

  return {
    prefixes,
    prefix,
    loading,
    error,
    isInitialized,
    getAll,
    getById,
    create,
    update,
    remove,
    ensureLoaded,
    $reset: reset
  }
})

