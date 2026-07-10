// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { SwValidationMatchMode } from '@/models/sw.validation.match.mode.js'
import { ParcelApprovalMode } from '@/models/parcel.approval.mode.js'

const baseUrl = `${apiUrl}/parcels`
const parcelCheckStatusPropertyByCode = Object.freeze({
  passport: 'passportCheckStatus'
})

export function buildParcelsFilterParams(authStore, additionalParams = {}) {
  const params = new URLSearchParams(additionalParams)
  
  // Add sorting parameters
  params.append('sortBy', authStore.parcels_sort_by?.[0]?.key || 'id')
  params.append('sortOrder', authStore.parcels_sort_by?.[0]?.order || 'asc')
  
  if (authStore.parcels_status !== null && authStore.parcels_status !== undefined) {
    params.append('statusId', authStore.parcels_status.toString())
  }
  
  if (authStore.parcels_check_status_sw !== null && authStore.parcels_check_status_sw !== undefined) {
    params.append('checkStatusSw', authStore.parcels_check_status_sw.toString())
  }
  
  if (authStore.parcels_check_status_fc !== null && authStore.parcels_check_status_fc !== undefined) {
    params.append('checkStatusFc', authStore.parcels_check_status_fc.toString())
  }

  if (authStore.parcels_passport_check_status !== null && authStore.parcels_passport_check_status !== undefined) {
    params.append('passportCheckStatus', authStore.parcels_passport_check_status.toString())
  }

  if (authStore.parcels_hide_legacy_restrictions === true) {
    params.append('hideLegacyRestrictions', 'true')
  }
  
  if (authStore.parcels_tnved) {
    params.append('tnVed', authStore.parcels_tnved)
  }

  if (authStore.parcels_number) {
    params.append('number', authStore.parcels_number)
  }

  if (authStore.parcels_product_name) {
    params.append('productName', authStore.parcels_product_name)
  }

  return params
}

function appendIfPresent(params, name, value) {
  if (value !== null && value !== undefined && value !== '') {
    params.append(name, value.toString())
  }
}

export function buildParcelsWhFilterParams(authStore, additionalParams = {}) {
  const params = new URLSearchParams(additionalParams)

  params.append('sortBy', authStore.parcels_wh_sort_by?.[0]?.key || 'id')
  params.append('sortOrder', authStore.parcels_wh_sort_by?.[0]?.order || 'asc')

  appendIfPresent(params, 'statusId', authStore.parcels_wh_status)
  appendIfPresent(params, 'checkStatusProjectionKind', authStore.parcels_wh_check_status_projection)
  appendIfPresent(params, 'zone', authStore.parcels_wh_zone)
  appendIfPresent(params, 'numberPrefix', authStore.parcels_wh_number)
  appendIfPresent(params, 'boxNumberPrefix', authStore.parcels_wh_box_number)
  appendIfPresent(params, 'stickerPrefix', authStore.parcels_wh_sticker)
  appendIfPresent(params, 'productName', authStore.parcels_wh_product_name)

  return params
}

export function buildParcelsNumberParams(number) {
  const params = new URLSearchParams()
  if (number) {
    params.append('number', number)
  }
  return params
}

function buildApproveQueryParams(approvalMode) {
  const params = new URLSearchParams()
  params.append('approveMode', approvalMode)
  return params.toString()
}

export const useParcelsStore = defineStore('parcels', () => {
  const items = ref([])
  const items_bn = ref([])
  const item = ref({})
  const loading = ref(false)
  const error = ref(null)
  const totalCount = ref(0)
  const hasNextPage = ref(false)
  const hasPreviousPage = ref(false)
  const extIdRevisionByParcelId = new Map()
  const liveCheckStatusesByParcelId = new Map()
  const responseCheckStatusWatermarks = new WeakMap()
  let liveCheckStatusArrival = 0

  function mergeLiveParcelCheckStatuses(parcel, requestWatermark) {
    const parcelId = Number(parcel?.id)
    const changes = liveCheckStatusesByParcelId.get(parcelId)
    if (!changes) return parcel

    let merged = parcel
    for (const change of changes.values()) {
      if (change.arrival <= requestWatermark) continue
      merged = { ...merged, [change.property]: change.status }
    }
    return merged
  }

  function resetLiveParcelCheckStatuses() {
    liveCheckStatusesByParcelId.clear()
  }

  function applyParcelCheckStatusChanges(change) {
    const registerId = Number(change?.registerId)
    if (!Number.isInteger(registerId) || !Array.isArray(change?.updates)) return []

    const accepted = []
    const acceptedByParcelId = new Map()
    for (const update of change.updates) {
      const parcelId = Number(update?.parcelId)
      const checkCode = String(update?.checkCode ?? '')
      const property = parcelCheckStatusPropertyByCode[checkCode]
      const status = Number(update?.status)
      const revision = Number(update?.revision)
      if (!Number.isInteger(parcelId) || parcelId <= 0 || !property ||
          !Number.isFinite(status) || !Number.isSafeInteger(revision) || revision <= 0) {
        continue
      }

      let parcelChanges = liveCheckStatusesByParcelId.get(parcelId)
      if (!parcelChanges) {
        parcelChanges = new Map()
        liveCheckStatusesByParcelId.set(parcelId, parcelChanges)
      }
      const previous = parcelChanges.get(checkCode)
      if (previous && previous.revision >= revision) continue

      const normalized = {
        registerId,
        parcelId,
        checkCode,
        property,
        status,
        revision,
        arrival: ++liveCheckStatusArrival
      }
      parcelChanges.set(checkCode, normalized)
      accepted.push(normalized)

      let parcelUpdates = acceptedByParcelId.get(parcelId)
      if (!parcelUpdates) {
        parcelUpdates = []
        acceptedByParcelId.set(parcelId, parcelUpdates)
      }
      parcelUpdates.push(normalized)
    }

    function patchParcel(parcel) {
      if (Number(parcel?.registerId) !== registerId) return parcel
      const updates = acceptedByParcelId.get(Number(parcel?.id))
      if (!updates) return parcel

      return updates.reduce(
        (current, update) => ({ ...current, [update.property]: update.status }),
        parcel
      )
    }

    if (accepted.length > 0) {
      items.value = items.value.map(patchParcel)
      if (item.value?.id != null) item.value = patchParcel(item.value)
    }

    return accepted
  }

  async function getAll(registerId, options = {}) {
    const {
      updateStore = true,
      showMarkedByPartner = false
    } = options
    const authStore = useAuthStore()
    const checkStatusWatermark = liveCheckStatusArrival
    if (updateStore) {
      loading.value = true
    }
    error.value = null
    try {
      const filterBuilder = showMarkedByPartner
        ? buildParcelsWhFilterParams
        : buildParcelsFilterParams
      const page = showMarkedByPartner ? authStore.parcels_wh_page : authStore.parcels_page
      const pageSize = showMarkedByPartner ? authStore.parcels_wh_per_page : authStore.parcels_per_page
      const params = filterBuilder(authStore, {
        registerId: registerId.toString(),
        page: page.toString(),
        pageSize: pageSize.toString()
      })

      const listEndpoint = showMarkedByPartner ? `${baseUrl}/a` : baseUrl
      const response = await fetchWrapper.get(`${listEndpoint}?${params.toString()}`)
      const responseItems = (response.items || [])
        .map(parcel => mergeLiveParcelCheckStatuses(parcel, checkStatusWatermark))
      
      if (updateStore) {
        items.value = responseItems
        totalCount.value = response.pagination?.totalCount || 0
        hasNextPage.value = response.pagination?.hasNextPage || false
        hasPreviousPage.value = response.pagination?.hasPreviousPage || false
      }
      
      const result = {
        items: responseItems,
        pagination: {
          totalCount: response.pagination?.totalCount || 0,
          hasNextPage: response.pagination?.hasNextPage || false,
          hasPreviousPage: response.pagination?.hasPreviousPage || false
        }
      }
      responseCheckStatusWatermarks.set(result, checkStatusWatermark)
      return result
    } catch (err) {
      error.value = err
      throw err
    } finally {
      if (updateStore) {
        loading.value = false
      }
    }
  }

  async function getByNumber(number) {
    const authStore = useAuthStore()
    const searchNumber = number ?? authStore.parcels_number
    loading.value = true
    error.value = null
    try {
      const params = buildParcelsNumberParams(searchNumber)
      const response = await fetchWrapper.get(`${baseUrl}/by-number?${params.toString()}`)
      items_bn.value = response || []
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  function updateItems(responseData) {
    if (responseData) {
      const checkStatusWatermark = responseCheckStatusWatermarks.get(responseData) ?? liveCheckStatusArrival
      items.value = (responseData.items || [])
        .map(parcel => mergeLiveParcelCheckStatuses(parcel, checkStatusWatermark))
      totalCount.value = responseData.pagination?.totalCount || 0
      hasNextPage.value = responseData.pagination?.hasNextPage || false
      hasPreviousPage.value = responseData.pagination?.hasPreviousPage || false
    }
    loading.value = false
  }

  async function getById(id) {
    const checkStatusWatermark = liveCheckStatusArrival
    item.value = { loading: true }
    try {
      const result = await fetchWrapper.get(`${baseUrl}/a/${id}`)
      const merged = mergeLiveParcelCheckStatuses(result, checkStatusWatermark)
      item.value = merged
      return merged
    } catch (err) {
      item.value = { error: err }
      return null
    }
  }

  async function update(id, data) {
    const response = await fetchWrapper.put(`${baseUrl}/${id}`, data)

    // Update the item in the store if it's currently loaded
    if (item.value && item.value.id === id) {
      // Merge the updated data with the existing item
      item.value = { ...item.value, ...data }
    }

    // Update the item in the items array if it exists
    const itemIndex = items.value.findIndex(parcel => parcel.id === id)
    if (itemIndex !== -1) {
      items.value[itemIndex] = { ...items.value[itemIndex], ...data }
    }
    
    return response
  }

  async function generate(id, filename, applyWeightCorrection = false) {
    loading.value = true
    error.value = null
    try {
      if (filename == null || filename == undefined) {
        filename = `IndPost_${id}.xml`
      }
      else {
        filename = `IndPost_${filename}.xml`
      }
      const query = applyWeightCorrection === true ? '?applyWeightCorrection=true' : ''
      return await fetchWrapper.downloadFile(`${baseUrl}/${id}/generate${query}`, filename)
    } catch (err) {
      error.value = err?.message || 'Ошибка при выгрузке накладной для посылки'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function validate(id, sw, swMatchMode = SwValidationMatchMode.NoSwMatch) {
    loading.value = true
    error.value = null
    try {

      const url = sw
        ? `${baseUrl}/${id}/validate-sw?withSwMatch=${swMatchMode}`
        : `${baseUrl}/${id}/validate-fc`
      await fetchWrapper.post(url)
      return true
    } catch (err) {
      error.value = err
      return false
    } finally {
      loading.value = false
    }
  }

  async function approve(id, approvalMode = ParcelApprovalMode.SimpleApprove) {
    const query = buildApproveQueryParams(approvalMode)
    const url = `${baseUrl}/${id}/approve?${query}`

    await fetchWrapper.post(url)
    return true
  }

  async function lookupFeacnCode(id) {
    const result = await fetchWrapper.post(`${baseUrl}/${id}/lookup-feacn-code`)
    return result
  }

  async function clearCheckStatus(id) {
    await fetchWrapper.post(`${baseUrl}/${id}/clear`)
    return true
  }

  async function checkForDuplicate(id) {
    await fetchWrapper.post(`${baseUrl}/${id}/check-duplicate`)
    return true
  }

  async function checkPassport(id) {
    await fetchWrapper.post(`${baseUrl}/${id}/check-passport`)
    return true
  }

  async function clearPassportCheck(id) {
    await fetchWrapper.post(`${baseUrl}/${id}/clear-passport-check`)
    return true
  }

  async function setDefect(id) {
    await fetchWrapper.post(`${baseUrl}/${id}/set-defect`)
    return true
  }

  async function clearDefect(id) {
    await fetchWrapper.post(`${baseUrl}/${id}/clear-defect`)
    return true
  }

  function setParcelExtId(id, extId) {
    const numericId = Number(id)
    if (item.value?.id === numericId) {
      item.value = { ...item.value, extId }
    }

    const itemIndex = items.value.findIndex(parcel => Number(parcel.id) === numericId)
    if (itemIndex !== -1) {
      items.value[itemIndex] = { ...items.value[itemIndex], extId }
    }

    const itemByNumberIndex = items_bn.value.findIndex(parcel => Number(parcel.id) === numericId)
    if (itemByNumberIndex !== -1) {
      items_bn.value[itemByNumberIndex] = { ...items_bn.value[itemByNumberIndex], extId }
    }
  }

  function applyExtIdChange(change) {
    const parcelId = Number(change?.parcelId)
    const revision = Number(change?.revision ?? 0)
    if (!parcelId || !revision) return false

    const lastRevision = extIdRevisionByParcelId.get(parcelId) || 0
    if (revision <= lastRevision) return false

    extIdRevisionByParcelId.set(parcelId, revision)
    setParcelExtId(parcelId, change.extId ?? null)
    return true
  }

  async function clearExtId(id) {
    await fetchWrapper.post(`${baseUrl}/${id}/clear-ext-id`)
    setParcelExtId(id, null)
    return true
  }

  async function bulkAssignTnved(parcelIds, tnVed) {
    await fetchWrapper.post(`${baseUrl}/assign-tnved`, {
      tnVed,
      parcelIds
    })
    return true
  }

  async function resolveStatusSelection(registerId, numbers) {
    return await fetchWrapper.post(`${baseUrl}/status-selection/resolve`, {
      registerId,
      numbers
    })
  }

  async function updateStatusSelection(registerId, statusId, parcelIds) {
    return await fetchWrapper.post(`${baseUrl}/status-selection/update`, {
      registerId,
      statusId,
      parcelIds
    })
  }

  async function deleteImage(id) {
    // Calls API: DELETE /parcels/{id}/image
    // Defensive check: verify parcel has an image before making API call
    if (item.value && item.value.id === id && !item.value.hasImage) {
      return false
    }
    try {
      await fetchWrapper.delete(getImageProcessingUrl(id))
      // Refresh current item if it's the same id to update hasImage flag
      if (item.value && item.value.id === id) {
        // refetch to update UI
        await getById(id)
      }
      return true
    } catch (err) {
      error.value = err
      throw err
    }
  }

  async function getImageBlob(id) {
    const response = await fetchWrapper.getFile(getImageProcessingUrl(id))
    return response.blob()
  }

  function getImageProcessingUrl(id) {
    return `${baseUrl}/${id}/image`
  }

  return {
    items,
    items_bn,
    item,
    loading,
    error,
    totalCount,
    hasNextPage,
    hasPreviousPage,
    getAll,
    getById,
    update,
    updateItems,
    getByNumber,
    generate,
    validate,
    approve,
    lookupFeacnCode,
    clearCheckStatus,
    checkForDuplicate,
    checkPassport,
    clearPassportCheck,
    setDefect,
    clearDefect,
    clearExtId,
    applyExtIdChange,
    applyParcelCheckStatusChanges,
    resetLiveParcelCheckStatuses,
    bulkAssignTnved,
    resolveStatusSelection,
    updateStatusSelection,
    getImageProcessingUrl,
    getImageBlob,
    deleteImage
  }
})
