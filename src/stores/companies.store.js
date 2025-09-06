// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

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
