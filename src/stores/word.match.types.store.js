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

const baseUrl = `${apiUrl}/stopwords`

export const useWordMatchTypesStore = defineStore('wordMatchTypes', () => {
  const matchTypes = ref([])
  const loading = ref(false)
  const error = ref(null)

  const matchTypeMap = ref(new Map())

  async function fetchMatchTypes() {
    loading.value = true
    error.value = null
    try {
      const response = await fetchWrapper.get(`${baseUrl}/matchtypes`)
      matchTypes.value = response || []
      matchTypeMap.value = new Map(matchTypes.value.map(t => [t.id, t]))
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
      initialized.value = true
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
