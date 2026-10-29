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
  const revisions = new Map()
  let requestSequence = 0
  let detailSequence = 0
  let visibleRegisterId = null

  function invalidateDerived(registerId) {
    revisions.set(Number(registerId), (revisions.get(Number(registerId)) ?? 0) + 1)
    const patch = entry => Number(entry?.registerId) === Number(registerId)
      ? { ...entry, weightKg: null, derivedTotalsPending: true } : entry
    boxes.value = boxes.value.map(patch)
    box.value = patch(box.value)
  }

  async function refreshDerived(registerId) {
    if (Number(visibleRegisterId) === Number(registerId)) await getAll(registerId)
  }

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
    visibleRegisterId = registerId
    const sequence = ++requestSequence
    const snapshot = revisions.get(Number(registerId)) ?? 0
    return run(async () => {
      const response = await fetchWrapper.get(
        `${baseUrl}?registerId=${encodeURIComponent(registerId)}`
      )
      const result = (response || []).map(entry => snapshot === (revisions.get(Number(registerId)) ?? 0) ? entry : { ...entry, weightKg: null, derivedTotalsPending: true })
      if (sequence === requestSequence) boxes.value = result
      return result
    })
  }

  async function getById(id) {
    const sequence = ++detailSequence
    const snapshot = new Map(revisions)
    return run(async () => {
      let response = await fetchWrapper.get(`${baseUrl}/${id}`)
      const registerId = Number(response?.registerId)
      if ((snapshot.get(registerId) ?? 0) !== (revisions.get(registerId) ?? 0)) {
        response = { ...response, weightKg: null, derivedTotalsPending: true }
      }
      if (sequence === detailSequence) box.value = response
      return response
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

  async function downloadStickers(id) {
    return fetchWrapper.downloadFile(`${baseUrl}/${id}/stickers.csv`, `box-${id}-stickers.csv`)
  }

  return {
    boxes,
    box,
    loading,
    error,
    getAll,
    invalidateDerived,
    refreshDerived,
    getById,
    create,
    update,
    downloadStickers
  }
})
