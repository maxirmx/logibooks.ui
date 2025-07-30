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

export const useStopWordsStore = defineStore('stopWords', () => {
  const stopWords = ref([])
  const stopWord = ref({ loading: true })
  const loading = ref(false)

  async function getAll() {
    loading.value = true
    try {
      const response = await fetchWrapper.get(baseUrl)
      stopWords.value = response || []
    } catch (error) {
      console.error('Failed to fetch stop words:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  async function getById(id, refresh = false) {
    if (refresh) {
      stopWord.value = { loading: true }
    }

    try {
      const response = await fetchWrapper.get(`${baseUrl}/${id}`)
      stopWord.value = response
      return response
    } catch (error) {
      console.error('Failed to fetch stop word:', error)
      throw error
    }
  }

  async function create(data) {
    try {
      await fetchWrapper.post(baseUrl, data)
      // Refresh the list after creation
      await getAll()
    } catch (error) {
      console.error('Failed to create stop word:', error)
      throw error
    }
  }

  async function update(id, data) {
    try {
      await fetchWrapper.put(`${baseUrl}/${id}`, data)
      // Refresh the list after update
      await getAll()
    } catch (error) {
      console.error('Failed to update stop word:', error)
      throw error
    }
  }

  async function remove(id) {
    try {
      await fetchWrapper.delete(`${baseUrl}/${id}`)
      // Refresh the list after deletion
      await getAll()
    } catch (error) {
      console.error('Failed to delete stop word:', error)
      throw error
    }
  }


  return {
    stopWords,
    stopWord,
    loading,
    getAll,
    getById,
    create,
    update,
    remove
  }
})
