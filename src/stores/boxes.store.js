// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'

const baseUrl = `${apiUrl}/boxes`

export const useBoxesStore = defineStore('boxes', () => {
  const boxes = ref([])
  const box = ref(null)
  const loading = ref(false)
  const error = ref(null)

  async function run(operation) {
    loading.value = true
    error.value = null
    try {
      return await operation()
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  async function getAll(registerId) {
    return run(async () => {
      const response = await fetchWrapper.get(
        `${baseUrl}?registerId=${encodeURIComponent(registerId)}`
      )
      boxes.value = response || []
      return boxes.value
    })
  }

  async function getById(id) {
    return run(async () => {
      box.value = await fetchWrapper.get(`${baseUrl}/${id}`)
      return box.value
    })
  }

  async function create(data) {
    return run(async () => {
      const response = await fetchWrapper.post(baseUrl, data)
      boxes.value.push(response)
      box.value = response
      return response
    })
  }

  async function update(id, data) {
    return run(async () => {
      await fetchWrapper.put(`${baseUrl}/${id}`, data)
      const index = boxes.value.findIndex((item) => Number(item.id) === Number(id))
      if (index !== -1) {
        boxes.value[index] = { ...boxes.value[index], ...data }
      }
      if (Number(box.value?.id) === Number(id)) {
        box.value = { ...box.value, ...data }
      }
      return box.value
    })
  }

  return {
    boxes,
    box,
    loading,
    error,
    getAll,
    getById,
    create,
    update
  }
})
