// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'

const baseUrl = `${apiUrl}/warehouses`

export const useWarehousesStore = defineStore('warehouses', () => {
  const warehouses = ref([])
  const warehouse = ref(null)
  const loading = ref(false)
  const error = ref(null)

  async function getAll() {
    loading.value = true
    error.value = null
    try {
      warehouses.value = await fetchWrapper.get(baseUrl)
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  async function getById(id) {
    warehouse.value = { loading: true }
    loading.value = true
    error.value = null
    try {
      warehouse.value = await fetchWrapper.get(`${baseUrl}/${id}`)
      return warehouse.value
    } catch (err) {
      error.value = err
      warehouse.value = { error: err }
      return null
    } finally {
      loading.value = false
    }
  }

  async function create(warehouseData) {
    loading.value = true
    error.value = null
    try {
      const result = await fetchWrapper.post(baseUrl, warehouseData)
      warehouses.value.push(result)
      return result
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  async function update(id, warehouseData) {
    loading.value = true
    error.value = null
    try {
      await fetchWrapper.put(`${baseUrl}/${id}`, warehouseData)
      const index = warehouses.value.findIndex(w => w.id === id)
      if (index !== -1) {
        warehouses.value[index] = { ...warehouses.value[index], ...warehouseData }
      }
      if (warehouse.value?.id === id) {
        warehouse.value = { ...warehouse.value, ...warehouseData }
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
      warehouses.value = warehouses.value.filter(w => w.id !== id)
      return true
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    warehouses,
    warehouse,
    loading,
    error,
    getAll,
    getById,
    create,
    update,
    remove
  }
})
