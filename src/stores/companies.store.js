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

const baseUrl = `${apiUrl}/companies`

export const useCompaniesStore = defineStore('companies', () => {
  const companies = ref([])
  const company = ref(null)
  const loading = ref(false)
  const error = ref(null)

  async function getAll() {
    loading.value = true
    error.value = null
    try {
      companies.value = await fetchWrapper.get(baseUrl)
    } catch (err) {
      error.value = err
      console.error('Failed to fetch companies:', err)
    } finally {
      loading.value = false
    }
  }

  async function getById(id) {
    company.value = { loading: true }
    loading.value = true
    error.value = null
    try {
      company.value = await fetchWrapper.get(`${baseUrl}/${id}`)
      return company.value
    } catch (err) {
      error.value = err
      console.error('Failed to fetch company:', err)
      company.value = { error: err }
      return null
    } finally {
      loading.value = false
    }
  }

  async function create(companyData) {
    loading.value = true
    error.value = null
    try {
      const result = await fetchWrapper.post(baseUrl, companyData)
      companies.value.push(result)
      return result
    } catch (err) {
      error.value = err
      console.error('Failed to create company:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function update(id, companyData) {
    loading.value = true
    error.value = null
    try {
      await fetchWrapper.put(`${baseUrl}/${id}`, companyData)
      // Update the company in the list
      const index = companies.value.findIndex(c => c.id === id)
      if (index !== -1) {
        companies.value[index] = { ...companies.value[index], ...companyData }
      }
      return true
    } catch (err) {
      error.value = err
      console.error('Failed to update company:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function remove(id) {
    loading.value = true
    error.value = null
    try {
      await fetchWrapper.delete(`${baseUrl}/${id}`)
      companies.value = companies.value.filter(c => c.id !== id)
      return true
    } catch (err) {
      error.value = err
      console.error('Failed to delete company:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    companies,
    company,
    loading,
    error,
    getAll,
    getById,
    create,
    update,
    remove
  }
})
