// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { useParcelFiltersStore } from '@/stores/parcel.filters.store.js'
import { rawWeightPayload, pendingWeightProjection } from '@/helpers/derived.weights.helpers.js'
import { useRegistersStore } from '@/stores/registers.store.js'
import { reportError } from '@/helpers/error.helpers.js'
import { seedFeacnInfo } from '@/helpers/feacn.info.helpers.js'
import { SwValidationMatchMode } from '@/models/sw.validation.match.mode.js'
import { ParcelApprovalMode } from '@/models/parcel.approval.mode.js'
import { PassportCheckStatusFilterValue } from '@/helpers/passport.check.status.helpers.js'

const baseUrl = `${apiUrl}/parcels`
const parcelCheckStatusPropertyByCode = new Map([['passport', 'passportCheckStatus']])

export function buildParcelsFilterParams(authStore, additionalParams = {}) {
  const params = new URLSearchParams(additionalParams)
  appendIfPresent(params, 'parcelFilterId', authStore.parcels_filter_id)

  // Add sorting parameters
  params.append('sortBy', authStore.parcels_sort_by?.[0]?.key || 'id')
  params.append('sortOrder', authStore.parcels_sort_by?.[0]?.order || 'asc')

  if (authStore.parcels_status !== null && authStore.parcels_status !== undefined) {
    params.append('statusId', authStore.parcels_status.toString())
  }

  if (
    authStore.parcels_check_status_sw !== null &&
    authStore.parcels_check_status_sw !== undefined
  ) {
    params.append('checkStatusSw', authStore.parcels_check_status_sw.toString())
  }

  if (
    authStore.parcels_check_status_fc !== null &&
    authStore.parcels_check_status_fc !== undefined
  ) {
    params.append('checkStatusFc', authStore.parcels_check_status_fc.toString())
  }

  if (
    authStore.parcels_passport_check_status !== null &&
    authStore.parcels_passport_check_status !== undefined
  ) {
    if (authStore.parcels_passport_check_status === PassportCheckStatusFilterValue.Problems) {
      params.append('passportCheckWithProblems', 'true')
    } else {
      params.append('passportCheckStatus', authStore.parcels_passport_check_status.toString())
    }
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
  appendIfPresent(params, 'parcelFilterId', authStore.parcels_filter_id)

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

function buildParcelListParams(authStore, registerId, { showMarkedByPartner = false, boxId } = {}) {
  const additionalParams = {
    registerId: registerId.toString(),
    page: String(showMarkedByPartner ? authStore.parcels_wh_page : authStore.parcels_page),
    pageSize: String(showMarkedByPartner ? authStore.parcels_wh_per_page : authStore.parcels_per_page)
  }
  const normalizedBoxId = Number(boxId)
  if (Number.isInteger(normalizedBoxId) && normalizedBoxId > 0) {
    additionalParams.boxId = normalizedBoxId.toString()
  }
  const buildFilters = showMarkedByPartner ? buildParcelsWhFilterParams : buildParcelsFilterParams
  return buildFilters(authStore, additionalParams)
}

function toListContext(params) {
  const context = Object.fromEntries(params)
  for (const field of ['registerId', 'page', 'pageSize', 'boxId', 'parcelFilterId',
    'statusId', 'checkStatusSw', 'checkStatusFc', 'passportCheckStatus']) {
    if (Object.hasOwn(context, field)) context[field] = Number(context[field])
  }
  for (const field of ['passportCheckWithProblems', 'hideLegacyRestrictions']) {
    if (Object.hasOwn(context, field)) context[field] = context[field] === 'true'
  }
  return context
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
  const itemLoading = ref(false)
  const itemError = ref(null)
  let itemRequestSequence = 0
  let listRequestSequence = 0
  let listScope = 0
  let listReadOnlyConflict = null
  // Background reads supersede data without taking ownership of the visible loading flag.
  let listLoadingRequestSequence = 0
  let projectionRevision = 0
  const invalidatedRegisters = new Map()
  const isProjectionCurrent = (registerId, revision) => (invalidatedRegisters.get(Number(registerId)) ?? 0) <= revision
  let lastListRequest = null
  const loading = ref(false)
  const error = ref(null)
  const totalCount = ref(0)
  const hasNextPage = ref(false)
  const hasPreviousPage = ref(false)
  const extIdRevisionByParcelId = new Map()
  const liveCheckStatusesByParcelId = new Map()
  const responseCheckStatusWatermarks = new WeakMap()
  const responseProjectionMetadata = new WeakMap()
  let liveCheckStatusArrival = 0

  function invalidateDerived(registerId) {
    if (!Number.isInteger(Number(registerId)) || Number(registerId) <= 0) return
    invalidatedRegisters.set(Number(registerId), ++projectionRevision)
    const patch = parcel => Number(parcel?.registerId) === Number(registerId)
      ? pendingWeightProjection(parcel) : parcel
    items.value = items.value.map(patch)
    items_bn.value = items_bn.value.map(patch)
    item.value = patch(item.value)
    useRegistersStore().invalidateDerived(registerId)
  }

  async function refreshCachedDetail(registerId) {
    // A pending detail load owns navigation; refreshing the cached parcel must not supersede it.
    if (itemLoading.value) return
    if (item.value?.id && Number(item.value.registerId) === Number(registerId)) {
      await getById(item.value.id)
    }
  }

  async function refreshCachedCharges(registerId) {
    if (Number(item.value?.registerId) === Number(registerId) &&
        (item.value?.customsFee != null || item.value?.customsDuty != null || item.value?.customsChargeGroup != null)) {
      await refreshCachedDetail(registerId)
    }
  }

  function clearVisibleList() {
    ++listScope
    listReadOnlyConflict = null
    lastListRequest = null
    ++listRequestSequence
    listLoadingRequestSequence = 0
    loading.value = false
  }

  async function refreshVisibleDerived(registerId) {
    if (lastListRequest && Number(lastListRequest.registerId) === Number(registerId)) {
      const result = await getAll(registerId, { ...lastListRequest.options, updateStore: true })
      if (responseProjectionMetadata.get(result).requestSequence !== listRequestSequence) return
      const current = items.value.find(row => Number(row.id) === Number(item.value?.id))
      if (current && (Object.hasOwn(current, 'customsFee') || Object.hasOwn(current, 'customsDuty'))) {
        item.value = { ...item.value, customsFee: current.customsFee, customsDuty: current.customsDuty,
          customsChargeGroup: current.customsChargeGroup ?? null }
      }
    }
  }

  async function refreshDerived(registerId) {
    await useRegistersStore().refreshDerived(registerId)
  }

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
      const property = parcelCheckStatusPropertyByCode.get(checkCode)
      const status = Number(update?.status)
      const revision = Number(update?.revision)
      if (
        !Number.isInteger(parcelId) ||
        parcelId <= 0 ||
        !property ||
        !Number.isFinite(status) ||
        !Number.isSafeInteger(revision) ||
        revision <= 0
      ) {
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

    // Passport-only notifications do not change release eligibility or allocation readiness.
    if (accepted.length > 0) {
      items.value = items.value.map(patchParcel)
      if (item.value?.id != null) item.value = patchParcel(item.value)
    }

    return accepted
  }

  function isListReadOnly(registerId, requestSequence) {
    // Reads already in flight can carry an unlocked snapshot. Later reads can observe an unlock.
    return listReadOnlyConflict?.registerId === Number(registerId) &&
      listReadOnlyConflict.accountId === useAuthStore().user?.id &&
      requestSequence <= listReadOnlyConflict.requestSequence
  }

  async function getAll(registerId, options = {}) {
    const { updateStore = true, showMarkedByPartner = false } = options
    const requestSequence = ++listRequestSequence
    const revision = projectionRevision
    lastListRequest = { registerId, options }
    const authStore = useAuthStore()
    const requestedFilterId = authStore.parcels_filter_id
    const checkStatusWatermark = liveCheckStatusArrival
    if (updateStore) {
      listLoadingRequestSequence = requestSequence
      loading.value = true
    }
    error.value = null
    try {
      const params = buildParcelListParams(authStore, registerId, options)
      const listEndpoint = showMarkedByPartner ? `${baseUrl}/a` : baseUrl
      const response = await fetchWrapper.get(`${listEndpoint}?${params.toString()}`)
      const readOnly = isListReadOnly(registerId, requestSequence)
      const responseItems = (response.items || []).map((parcel) => {
        const contextualParcel = showMarkedByPartner ? { ...parcel, registerId: parcel.registerId ?? Number(registerId) } : parcel
        const row = readOnly ? { ...contextualParcel, readOnly: true } : contextualParcel
        const projection = mergeLiveParcelCheckStatuses(row, checkStatusWatermark)
        return isProjectionCurrent(registerId, revision) ? projection : pendingWeightProjection(projection)
      })

      if (updateStore && requestSequence === listRequestSequence) {
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
      responseProjectionMetadata.set(result, { revision, requestSequence, registerId })
      return result
    } catch (err) {
      if (requestSequence === listRequestSequence && (err?.status ?? err?.response?.status) === 404 &&
          requestedFilterId != null && authStore.parcels_filter_id === requestedFilterId) {
        const filterId = requestedFilterId
        try {
          await useParcelFiltersStore().getById(filterId)
        } catch (filterError) {
          if ((filterError?.status ?? filterError?.response?.status) !== 404) throw filterError
          if (requestSequence === listRequestSequence && authStore.parcels_filter_id === filterId) {
            const previousSelection = authStore.parcels_filter_id
            authStore.setParcelFilterId(null)
            if (previousSelection !== null && authStore.parcels_filter_id === null) {
              const result = await getAll(registerId, options)
              result.parcelFilterRemoved = true
              return result
            }
          }
        }
      }
      if (requestSequence === listRequestSequence) error.value = err
      throw err
    } finally {
      if (updateStore && listLoadingRequestSequence === requestSequence) {
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
      const metadata = responseProjectionMetadata.get(responseData)
      if (metadata && metadata.requestSequence !== listRequestSequence) return
      const checkStatusWatermark =
        responseCheckStatusWatermarks.get(responseData) ?? liveCheckStatusArrival
      const readOnly = metadata && isListReadOnly(metadata.registerId, metadata.requestSequence)
      items.value = (responseData.items || []).map((parcel) => {
        const row = readOnly ? { ...parcel, readOnly: true } : parcel
        const projection = mergeLiveParcelCheckStatuses(row, checkStatusWatermark)
        return metadata && !isProjectionCurrent(metadata.registerId, metadata.revision)
          ? pendingWeightProjection(projection)
          : projection
      })
      totalCount.value = responseData.pagination?.totalCount || 0
      hasNextPage.value = responseData.pagination?.hasNextPage || false
      hasPreviousPage.value = responseData.pagination?.hasPreviousPage || false
    }
    loading.value = false
  }

  function paperworkListKey(registerId, boxId, page) {
    const params = buildParcelListParams(useAuthStore(), registerId, { boxId })
    if (page != null) params.set('page', String(page))
    return params.toString()
  }

  async function updateTnVedFromList(id, tnVed, { registerId, getBoxId, isCurrent, applyPage }) {
    const authStore = useAuthStore()
    const registersStore = useRegistersStore()
    const accountId = authStore.user?.id
    const scope = listScope
    const requestSequence = listRequestSequence
    const revision = projectionRevision
    const checkStatusWatermark = liveCheckStatusArrival
    const chargeWatermark = registersStore.getRegisterSnapshotWatermark()
    const params = buildParcelListParams(authStore, registerId, { boxId: getBoxId() })
    const ownsList = () => scope === listScope && accountId === authStore.user?.id && isCurrent()
    let result
    try {
      result = await fetchWrapper.put(`${baseUrl}/${id}/tnved`, {
        tnVed,
        listContext: toListContext(params)
      })
    } catch (error) {
      if (ownsList() && error?.status === 409 && error.data?.code === 'RegisterReadOnly' &&
          error.data.details?.registerId === registerId) {
        listReadOnlyConflict = { registerId, accountId, requestSequence: listRequestSequence }
        registersStore.markRegisterReadOnly(registerId)
        items.value = items.value.map(row => Number(row.registerId) === registerId ? { ...row, readOnly: true } : row)
      }
      throw error
    }

    if (!ownsList()) return
    const page = result?.page
    if (!Array.isArray(page?.items) || !Number.isInteger(page.pagination?.currentPage)) {
      throw new Error('Не удалось получить обновлённый список посылок')
    }

    registersStore.patchRegisterCharges(result.registerCharges, chargeWatermark)
    const superseded = requestSequence !== listRequestSequence ||
      params.toString() !== paperworkListKey(registerId, getBoxId())
    // Reads started before the write was acknowledged may contain the previous snapshot.
    const nextSequence = ++listRequestSequence
    if (superseded) return 'refresh'

    seedFeacnInfo(result.feacnInfo)
    responseCheckStatusWatermarks.set(page, checkStatusWatermark)
    responseProjectionMetadata.set(page, { revision, requestSequence: nextSequence, registerId })
    applyPage(page.pagination.currentPage)
    updateItems(page)
    return 'applied'
  }

  async function getById(id) {
    const requestSequence = ++itemRequestSequence
    const revision = projectionRevision
    const checkStatusWatermark = liveCheckStatusArrival
    itemLoading.value = true
    itemError.value = null
    try {
      const result = await fetchWrapper.get(`${baseUrl}/a/${id}`)
      const merged = isProjectionCurrent(result?.registerId, revision) ? mergeLiveParcelCheckStatuses(result, checkStatusWatermark) :
        pendingWeightProjection(mergeLiveParcelCheckStatuses(result, checkStatusWatermark))
      if (requestSequence === itemRequestSequence) item.value = merged
      return merged
    } catch (err) {
      if (requestSequence === itemRequestSequence) itemError.value = err
      throw err
    } finally {
      if (requestSequence === itemRequestSequence) itemLoading.value = false
    }
  }

  async function update(id, data, { refreshDetail = true } = {}) {
    const numericId = Number(id)
    const payload = rawWeightPayload(data)
    const originalRegisterId = [item.value, ...items.value].find(p => Number(p?.id) === numericId)?.registerId
    const registerId = data.registerId ?? originalRegisterId
    const affectedRegisters = [...new Set([originalRegisterId, registerId].filter(value => Number.isInteger(Number(value)) && Number(value) > 0))]
    const response = await runParcelMutation(id, () => fetchWrapper.put(`${baseUrl}/${id}`, payload), false)
    const affectsAllocation = ['weightKg', 'quantity', 'statusId', 'checkStatus', 'registerId', 'boxId', 'shk', 'postingNumber', 'tnVed', 'unitPrice', 'cost', 'currency']
      .some(key => Object.hasOwn(payload, key))
    let updatedData = { ...payload }
    if (updatedData.dangerousGoods == null) delete updatedData.dangerousGoods
    if (affectsAllocation && (!refreshDetail || [item.value, ...items.value].some(p => Number(p?.id) === numericId))) {
      affectedRegisters.forEach(invalidateDerived)
      const revision = projectionRevision
      if (Object.hasOwn(payload, 'tnVed')) {
        for (const parcel of [item.value, ...items.value]) {
          if (Number(parcel?.id) === numericId) parcel.matchesExportFeeCategory = undefined
        }
      }
      const detailSequence = refreshDetail ? ++itemRequestSequence : null
      const checkStatusWatermark = liveCheckStatusArrival
      await Promise.all(affectedRegisters.map(refreshDerived))
      // An inline edit is represented by the refreshed page, even when the row moved out of it.
      if (!refreshDetail) return response
      const refreshed = await fetchWrapper.get(`${baseUrl}/a/${id}`)
      updatedData = { ...updatedData, ...(refreshed ?? { adjustedWeightKg: null, derivedTotalsPending: true }) }
      if (Object.hasOwn(payload, 'tnVed')) updatedData.matchesExportFeeCategory = refreshed?.matchesExportFeeCategory === true
      updatedData = mergeLiveParcelCheckStatuses({ ...updatedData, id: numericId }, checkStatusWatermark)
      if (!isProjectionCurrent(updatedData.registerId ?? registerId, revision)) updatedData = pendingWeightProjection(updatedData)
      if (detailSequence !== itemRequestSequence) return response
    }

    if (item.value && Number(item.value.id) === numericId) {
      item.value = { ...item.value, ...updatedData }
    }

    const itemIndex = items.value.findIndex((parcel) => Number(parcel.id) === numericId)
    if (itemIndex !== -1) {
      items.value[itemIndex] = { ...items.value[itemIndex], ...updatedData }
    }

    if (refreshDetail && Number(item.value?.id) !== numericId &&
        affectedRegisters.some(id => Number(id) === Number(item.value?.registerId))) {
      await refreshCachedCharges(item.value.registerId)
    }
    return response
  }

  async function markCurrentParcelReadOnlyOnConflict(id, err) {
    if (
      err?.status !== 409 ||
      !String(err?.message || err?.data?.msg || '').includes('Изменения запрещены')
    )
      return
    const numericId = Number(id)
    let refreshed = null
    if (Number(item.value?.id) === numericId) {
      try {
        refreshed = await fetchWrapper.get(`${baseUrl}/a/${numericId}`)
        item.value = refreshed
      } catch (refreshError) {
        item.value = { ...item.value, readOnly: true }
        reportError(refreshError, { context: 'parcels conflict refresh' })
      }
    }
    const itemIndex = items.value.findIndex((parcel) => Number(parcel.id) === numericId)
    if (itemIndex !== -1) {
      items.value[itemIndex] = refreshed
        ? { ...items.value[itemIndex], ...refreshed }
        : { ...items.value[itemIndex], readOnly: true }
    }
  }

  async function runParcelMutation(id, action, affectsWeights = true) {
    try {
      const response = await action()
      if (affectsWeights) {
        const registerId = [item.value, ...items.value].find(p => Number(p?.id) === Number(id))?.registerId
        invalidateDerived(registerId)
        await refreshDerived(registerId)
        await refreshCachedCharges(registerId)
      }
      return response
    } catch (err) {
      await markCurrentParcelReadOnlyOnConflict(id, err)
      throw err
    }
  }

  async function generate(id, filename, applyWeightCorrection = false) {
    loading.value = true
    error.value = null
    try {
      if (filename == null || filename == undefined) {
        filename = `IndPost_${id}.xml`
      } else {
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
      const registerId = [item.value, ...items.value].find(p => Number(p?.id) === Number(id))?.registerId
      invalidateDerived(registerId)
      await refreshDerived(registerId)
      await refreshCachedCharges(registerId)
      return true
    } catch (err) {
      error.value = err
      await markCurrentParcelReadOnlyOnConflict(id, err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function approve(id, approvalMode = ParcelApprovalMode.SimpleApprove) {
    const query = buildApproveQueryParams(approvalMode)
    const url = `${baseUrl}/${id}/approve?${query}`

    await runParcelMutation(id, () => fetchWrapper.post(url))
    return true
  }

  async function lookupFeacnCode(id) {
    const result = await runParcelMutation(id, () =>
      fetchWrapper.post(`${baseUrl}/${id}/lookup-feacn-code`)
    )
    return result
  }

  async function clearCheckStatus(id) {
    await runParcelMutation(id, () => fetchWrapper.post(`${baseUrl}/${id}/clear`))
    return true
  }

  async function checkForDuplicate(id) {
    await runParcelMutation(id, () => fetchWrapper.post(`${baseUrl}/${id}/check-duplicate`))
    return true
  }

  async function checkPassport(id) {
    await runParcelMutation(id, () => fetchWrapper.post(`${baseUrl}/${id}/check-passport`))
    return true
  }

  async function clearPassportCheck(id) {
    await runParcelMutation(id, () => fetchWrapper.post(`${baseUrl}/${id}/clear-passport-check`))
    return true
  }

  async function setDefect(id) {
    await runParcelMutation(id, () => fetchWrapper.post(`${baseUrl}/${id}/set-defect`))
    return true
  }

  async function clearDefect(id) {
    await runParcelMutation(id, () => fetchWrapper.post(`${baseUrl}/${id}/clear-defect`))
    return true
  }

  function setParcelExtId(id, extId) {
    const numericId = Number(id)
    if (item.value?.id === numericId) {
      item.value = { ...item.value, extId }
    }

    const itemIndex = items.value.findIndex((parcel) => Number(parcel.id) === numericId)
    if (itemIndex !== -1) {
      items.value[itemIndex] = { ...items.value[itemIndex], extId }
    }

    const itemByNumberIndex = items_bn.value.findIndex((parcel) => Number(parcel.id) === numericId)
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
    await runParcelMutation(id, () => fetchWrapper.post(`${baseUrl}/${id}/clear-ext-id`))
    setParcelExtId(id, null)
    return true
  }

  async function bulkAssignTnved(parcelIds, tnVed) {
    const result = await fetchWrapper.post(`${baseUrl}/assign-tnved`, {
      tnVed,
      parcelIds
    })
    return result ?? true
  }

  async function resolveStatusSelection(registerId, numbers, lookupBy = 'number', purpose = null) {
    const query = purpose === 'lookup' ? '?purpose=lookup' : ''
    return await fetchWrapper.post(`${baseUrl}/status-selection/resolve${query}`, {
      registerId,
      numbers,
      ...(lookupBy === 'number' ? {} : { lookupBy })
    })
  }

  async function updateStatusSelection(registerId, statusId, parcelIds) {
    const result = await fetchWrapper.post(`${baseUrl}/status-selection/update`, { registerId, statusId, parcelIds })
    invalidateDerived(registerId)
    await refreshDerived(registerId)
    await refreshCachedCharges(registerId)
    return result
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
      await markCurrentParcelReadOnlyOnConflict(id, err)
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
    itemLoading,
    itemError,
    loading,
    error,
    totalCount,
    hasNextPage,
    hasPreviousPage,
    getAll,
    getById,
    update,
    updateItems,
    updateTnVedFromList,
    paperworkListKey,
    invalidateDerived,
    refreshVisibleDerived,
    clearVisibleList,
    refreshCachedDetail,
    refreshDerived,
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
