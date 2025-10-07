// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'

const baseUrl = `${apiUrl}/airports`

export const useAirportsStore = defineStore('airports', () => {
  const airports = ref([])
  const airport = ref(null)
  const loading = ref(false)
  const error = ref(null)

  async function getAll() {
    loading.value = true
    error.value = null
    try {
      airports.value = await fetchWrapper.get(baseUrl)
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  async function getById(id) {
    airport.value = { loading: true }
    loading.value = true
    error.value = null
    try {
      airport.value = await fetchWrapper.get(`${baseUrl}/${id}`)
      return airport.value
    } catch (err) {
      error.value = err
      airport.value = { error: err }
      return null
    } finally {
      loading.value = false
    }
  }

  async function create(airportData) {
    loading.value = true
    error.value = null
    try {
      const result = await fetchWrapper.post(baseUrl, airportData)
      airports.value.push(result)
      return result
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  async function update(id, airportData) {
    loading.value = true
    error.value = null
    try {
      await fetchWrapper.put(`${baseUrl}/${id}`, airportData)
      const index = airports.value.findIndex(a => a.id === id)
      if (index !== -1) {
        airports.value[index] = { ...airports.value[index], ...airportData }
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
      airports.value = airports.value.filter(a => a.id !== id)
      return true
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    airports,
    airport,
    loading,
    error,
    getAll,
    getById,
    create,
    update,
    remove
  }
})
