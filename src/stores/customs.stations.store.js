// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'

const baseUrl = `${apiUrl}/customsstations`

export const useCustomsStationsStore = defineStore('customsStations', () => {
  const customsStations = ref([])
  const customsStation = ref(null)
  const loading = ref(false)
  const error = ref(null)

  async function getAll() {
    loading.value = true
    error.value = null
    try {
      customsStations.value = await fetchWrapper.get(baseUrl)
      return customsStations.value
    } catch (err) {
      error.value = err
      return null
    } finally {
      loading.value = false
    }
  }

  async function getById(id) {
    customsStation.value = { loading: true }
    loading.value = true
    error.value = null
    try {
      customsStation.value = await fetchWrapper.get(`${baseUrl}/${id}`)
      return customsStation.value
    } catch (err) {
      error.value = err
      customsStation.value = { error: err }
      return null
    } finally {
      loading.value = false
    }
  }

  async function create(stationData) {
    loading.value = true
    error.value = null
    try {
      const result = await fetchWrapper.post(baseUrl, stationData)
      customsStations.value.push(result)
      return result
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  async function update(id, stationData) {
    loading.value = true
    error.value = null
    try {
      await fetchWrapper.put(`${baseUrl}/${id}`, stationData)
      const index = customsStations.value.findIndex((station) => station.id === id)
      if (index !== -1) {
        customsStations.value[index] = { ...customsStations.value[index], ...stationData }
      }
      if (customsStation.value?.id === id) {
        customsStation.value = { ...customsStation.value, ...stationData }
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
      customsStations.value = customsStations.value.filter((station) => station.id !== id)
      if (customsStation.value?.id === id) {
        customsStation.value = null
      }
      return true
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    customsStations,
    customsStation,
    loading,
    error,
    getAll,
    getById,
    create,
    update,
    remove
  }
})
