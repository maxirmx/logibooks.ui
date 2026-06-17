// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { buildParcelsFilterParams } from '@/stores/parcels.store.js'
import { FeacnMatchMode } from '@/models/feacn.match.mode.js'
import { SwValidationMatchMode } from '@/models/sw.validation.match.mode.js'
import { InvoiceOptionalColumns } from '@/models/invoice.optional.columns.js'
import { InvoiceParcelSelection } from '@/models/invoice.parcel.selection.js'

import { OP_MODE_PAPERWORK, OP_MODE_WAREHOUSE } from '@/helpers/op.mode.js'

const baseUrl = `${apiUrl}/registers`

export const useRegistersStore = defineStore('registers', () => {
  const items = ref([])
  const item = ref({})
  const uploadFile = ref(null)
  const loading = ref(false)
  const error = ref(null)
  const totalCount = ref(0)
  const hasNextPage = ref(false)
  const hasPreviousPage = ref(false)
  const ops = ref({
    customsProcedures: [],
    transportationTypes: []
  })
  const opsLoading = ref(false)
  const opsError = ref(null)

  let opsInitialized = false
  let opsPromise = null

  function getOpsLabel(list, value) {
    const num = Number(value)
    const match = list?.find((item) => Number(item.value) === num)
    return match ? match.name : String(value)
  }

  function getTransportationDocument(value) {
    const num = Number(value)
    const type = ops.value?.transportationTypes?.find(t => Number(t.value) === num)
    return type ? type.document : `[Тип ${value}]`
  }

  function isExportProcedure(customsProcedureValue) {
    const num = Number(customsProcedureValue)
    const proc = ops.value?.customsProcedures?.find(p => Number(p.value) === num)
    return proc ? proc.isExport : false
  }

  function setDestinationField(register) {
    if (!register) {
      return
    }
    if (!register.customsProcedureCode) {
      register.destination = 'in'
      return
    }
    if (isExportProcedure(register.customsProcedureCode)) {
      register.destination = 'out'
      register.destCountryCode = register.theOtherCountryCode
      register.origCountryCode = 643 // Russia
      register.recipientId = register.theOtherCompanyId
      register.senderId = register.companyId
    } else {
      register.destination = 'in'
      register.destCountryCode = 643 // Russia
      register.origCountryCode = register.theOtherCountryCode
      register.recipientId = register.companyId
      register.senderId = register.theOtherCompanyId
    }
  }

  async function getOps() {
    opsLoading.value = true
    opsError.value = null
    try {
      const response = await fetchWrapper.get(`${baseUrl}/ops`)
      if (response && Array.isArray(response.customsProcedures) && Array.isArray(response.transportationTypes)) {
        ops.value = response
        opsInitialized = true
      }
      return ops.value
    } catch (err) {
      opsError.value = err
      return null
    } finally {
      opsLoading.value = false
    }
  }

  async function ensureOpsLoaded() {
    if (opsInitialized) {
      return ops.value
    }

    if (!opsPromise) {
      opsPromise = getOps().finally(() => {
        opsPromise = null
      })
    }
    return opsPromise
  }

  function appendDefinedParam(params, name, value) {
    if (value !== undefined && value !== null && value !== '') {
      params.append(name, String(value))
    }
  }

  async function getRegisters({
    page = 1,
    pageSize = 25,
    sortBy = 'id',
    sortOrder = 'desc',
    whOnly = false,
    returnSourceOnly = false,
    warehouseId,
    senderCompanyId,
    receiverCompanyId,
    search = ''
  } = {}) {
    loading.value = true
    error.value = null
    try {
      await ensureOpsLoaded()

      const queryParams = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        sortBy: String(sortBy || 'id'),
        sortOrder: String(sortOrder || 'desc'),
        whOnly: whOnly ? 'true' : 'false'
      })

      if (returnSourceOnly) {
        queryParams.append('returnSourceOnly', 'true')
      }
      appendDefinedParam(queryParams, 'warehouseId', warehouseId)
      appendDefinedParam(queryParams, 'senderCompanyId', senderCompanyId)
      appendDefinedParam(queryParams, 'receiverCompanyId', receiverCompanyId)
      if (search) {
        queryParams.append('search', search)
      }

      const response = await fetchWrapper.get(`${baseUrl}?${queryParams.toString()}`)
      if (Array.isArray(response)) {
        response.forEach(setDestinationField)
      } else if (Array.isArray(response?.items)) {
        response.items.forEach(setDestinationField)
      }
      return response
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  async function getAll({ mode = OP_MODE_PAPERWORK } = {}) {
    const authStore = useAuthStore()
    const warehouseMode = mode === OP_MODE_WAREHOUSE
    const page = warehouseMode ? authStore.registers_wh_page : authStore.registers_page
    const pageSize = warehouseMode ? authStore.registers_wh_per_page : authStore.registers_per_page
    const sortBy = warehouseMode ? authStore.registers_wh_sort_by : authStore.registers_sort_by
    const search = warehouseMode ? authStore.registers_wh_search : authStore.registers_search

    try {
      const response = await getRegisters({
        page,
        pageSize,
        sortBy: sortBy?.[0]?.key || 'id',
        sortOrder: sortBy?.[0]?.order || 'desc',
        whOnly: warehouseMode,
        search
      })

      // API format with pagination metadata
      items.value = response.items || []
      totalCount.value = response.pagination?.totalCount || 0
      hasNextPage.value = response.pagination?.hasNextPage || false
      hasPreviousPage.value = response.pagination?.hasPreviousPage || false
    } catch (err) {
      error.value = err
    }
  }

  async function upload(file, registerType, customsProcedure, checkForDuplicates, transfer2Re = false) {
    loading.value = true
    error.value = null
    try {
      if (typeof checkForDuplicates !== 'boolean') {
        throw new Error('checkForDuplicates parameter is required and must be boolean')
      }
      const formData = new FormData()
      formData.append('file', file)
      
      // Build query parameters - always send all parameters
      const params = new URLSearchParams()
      params.append('registerType', registerType)
      params.append('customsProcedure', customsProcedure)
      params.append('checkForDuplicates', checkForDuplicates ? 'true' : 'false')
      params.append('transfer2Re', transfer2Re ? 'true' : 'false')
      
      const url = `${baseUrl}/upload?${params.toString()}`
      
      return await fetchWrapper.postFile(url, formData)
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  async function getById(id) {
    item.value = { loading: true }
    try {
      await ensureOpsLoaded()
      item.value = await fetchWrapper.get(`${baseUrl}/${id}`)
      setDestinationField(item.value)
    } catch (err) {
      item.value = { error: err }
    }
  }

  async function update(id, data) {
    const res = await fetchWrapper.put(`${baseUrl}/${id}`, data)
    if (item.value && item.value.id === id) {
      item.value = { ...item.value, ...data }
    }
    const idx = items.value.findIndex((r) => r.id === id)
    if (idx !== -1) {
      items.value[idx] = { ...items.value[idx], ...data }
    }
    return res
  }

  async function getReturnRegisterPairs(warehouseId) {
    loading.value = true
    error.value = null
    try {
      const params = new URLSearchParams({ warehouseId: String(warehouseId) })
      return await fetchWrapper.get(`${baseUrl}/return-register/pairs?${params.toString()}`)
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  async function createReturnRegister(payload) {
    loading.value = true
    error.value = null
    try {
      const response = await fetchWrapper.post(`${baseUrl}/return-register`, payload)
      setDestinationField(response)
      return response
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  async function setParcelStatuses(registerId, statusId) {
    loading.value = true
    error.value = null
    try {
      const response = await fetchWrapper.put(
        `${baseUrl}/${registerId}/setparcelstatuses/${statusId}`
      )
      return response
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  async function validate(registerId, sw, swMatchMode = SwValidationMatchMode.NoSwMatch) {
    loading.value = true
    error.value = null
    try {
      const url = sw
        ? `${baseUrl}/${registerId}/validate-sw?withSwMatch=${swMatchMode}`
        : `${baseUrl}/${registerId}/validate-fc`
      const result = await fetchWrapper.post(url)
      return result
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  async function getValidationProgress(handleId) {
    try {
      return await fetchWrapper.get(`${baseUrl}/validate/${handleId}`)
    } catch (err) {
      error.value = err
      throw err
    }
  }

  async function cancelValidation(handleId) {
    try {
      await fetchWrapper.delete(`${baseUrl}/validate/${handleId}`)
    } catch (err) {
      error.value = err
      throw err
    }
  }

  async function lookupFeacnCodes(registerId, withFCMatch = FeacnMatchMode.FCMatch) {
    try {
      const url = `${baseUrl}/${registerId}/lookup-feacn-codes?withFCMatch=${withFCMatch}`
      const result = await fetchWrapper.post(url)
      return result
    } catch (err) {
      error.value = err
      throw err
    }
  }

  async function getLookupFeacnCodesProgress(handleId) {
    try {
      return await fetchWrapper.get(`${baseUrl}/lookup-feacn-codes/${handleId}`)
    } catch (err) {
      error.value = err
      throw err
    }
  }

  async function cancelLookupFeacnCodes(handleId) {
    try {
      await fetchWrapper.delete(`${baseUrl}/lookup-feacn-codes/${handleId}`)
    } catch (err) {
      error.value = err
      throw err
    }
  }

  function buildXmlRequestUrl(id, endpoint, applyWeightCorrection = false) {
    const query = applyWeightCorrection === true ? '?applyWeightCorrection=true' : ''
    return `${baseUrl}/${id}/${endpoint}${query}`
  }

  async function generate(id, invoiceNumber, applyWeightCorrection = false) {
    loading.value = true
    error.value = null
    try {
      let filename
      if (invoiceNumber !== null && invoiceNumber !== undefined) {
        filename = `IndPost_${invoiceNumber}.zip`
      } else {
        filename = `IndPost_${id}.zip`
      }
      return await fetchWrapper.downloadFile(
        buildXmlRequestUrl(id, 'generate', applyWeightCorrection),
        filename
      )
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  async function generateExcise(id, invoiceNumber, applyWeightCorrection = false) {
    loading.value = true
    error.value = null
    try {
      let filename
      if (invoiceNumber !== null && invoiceNumber !== undefined) {
        filename = `IndPost_${invoiceNumber}-акциз.zip`
      } else {
        filename = `IndPost_${id}-акциз.zip`
      }
      return await fetchWrapper.downloadFile(
        buildXmlRequestUrl(id, 'generate-excise', applyWeightCorrection),
        filename
      )
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  async function generateNotifications(id, invoiceNumber, applyWeightCorrection = false) {
    loading.value = true
    error.value = null
    try {
      let filename
      if (invoiceNumber !== null && invoiceNumber !== undefined) {
        filename = `IndPost_${invoiceNumber}-нотификации.zip`
      } else {
        filename = `IndPost_${id}-нотификации.zip`
      }
      return await fetchWrapper.downloadFile(
        buildXmlRequestUrl(id, 'generate-notifications', applyWeightCorrection),
        filename
      )
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  async function generateOrdinary(id, invoiceNumber, applyWeightCorrection = false) {
    loading.value = true
    error.value = null
    try {
      let filename
      if (invoiceNumber !== null && invoiceNumber !== undefined) {
        filename = `IndPost_${invoiceNumber}-без-акциза-и-нотификаций.zip`
      } else {
        filename = `IndPost_${id}-без-акциза-и-нотификаций.zip`
      }
      return await fetchWrapper.downloadFile(
        buildXmlRequestUrl(id, 'generate-ordinary', applyWeightCorrection),
        filename
      )
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  function buildInvoiceFilename(id, invoiceNumber, suffix = '') {
    const hasInvoiceNumber = invoiceNumber !== null && invoiceNumber !== undefined
    const baseName = hasInvoiceNumber ? invoiceNumber : id
    const suffixPart = suffix || ''
    return `Invoice_${baseName}${suffixPart}.xlsx`
  }

  /**
   * Builds the request URL for invoice operations.
   * @param {string|number} id
   * @param {string} endpoint
   * @param {number} optionalColumns
   * @param {boolean} applyWeightCorrection
   * @returns {string}
   */
  function buildInvoiceRequestUrl(id, endpoint, optionalColumns, applyWeightCorrection = true) {
    const params = new URLSearchParams()

    if (optionalColumns !== InvoiceOptionalColumns.None) {
      params.set('optionalColumns', optionalColumns.toString())
    }

    if (applyWeightCorrection === false) {
      params.set('applyWeightCorrection', 'false')
    }

    const query = params.toString()
    return query ? `${baseUrl}/${id}/${endpoint}?${query}` : `${baseUrl}/${id}/${endpoint}`
  }

  const invoiceSelectionConfig = {
    [InvoiceParcelSelection.All]: {
      endpoint: 'download-invoice',
      suffix: ''
    },
    [InvoiceParcelSelection.WithExcise]: {
      endpoint: 'download-invoice-excise',
      suffix: '-акциз'
    },
    [InvoiceParcelSelection.WithNotifications]: {
      endpoint: 'download-invoice-notifications',
      suffix: '-нотификации'
    },
    [InvoiceParcelSelection.Ordinal]: {
      endpoint: 'download-invoice-ordinary',
      suffix: '-без-акциза-и-нотификаций'
    }
  }

  async function downloadInvoiceFile(
    id,
    invoiceNumber,
    selection = InvoiceParcelSelection.All,
    optionalColumns = InvoiceOptionalColumns.None,
    applyWeightCorrection = true
  ) {
    const config = invoiceSelectionConfig[selection]
    if (!config) {
      throw new Error('Неизвестный фильтр посылок для инвойса')
    }

    loading.value = true
    error.value = null
    try {
      const filename = buildInvoiceFilename(id, invoiceNumber, config.suffix)
      return await fetchWrapper.downloadFile(
        buildInvoiceRequestUrl(id, config.endpoint, optionalColumns, applyWeightCorrection),
        filename
      )
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  async function downloadTechdoc(id, invoiceNumber) {
    loading.value = true
    error.value = null
    try {
    const filename = `тех-документация_${invoiceNumber || id}-акциз.docx`
      return await fetchWrapper.downloadFile(
        `${baseUrl}/${id}/download-techdoc`,
        filename
      )
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  async function downloadAdditionalRestrictions(id, invoiceNumber, applyWeightCorrection = false) {
    loading.value = true
    error.value = null
    try {
      const filename = `Дополнительные_изъятия_${invoiceNumber || id}.xlsx`
      const query = applyWeightCorrection === true ? '?applyWeightCorrection=true' : ''
      return await fetchWrapper.downloadFile(
        `${baseUrl}/${id}/download-additional-restrictions${query}`,
        filename
      )
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  async function freezeTnVedOrder(id) {
    loading.value = true
    error.value = null
    try {
      return await fetchWrapper.post(`${baseUrl}/${id}/freeze-tnved-order`)
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  async function freezeCheckStatus(id) {
    loading.value = true
    error.value = null
    try {
      return await fetchWrapper.post(`${baseUrl}/${id}/freeze-check-status`)
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  function normalizeDownloadSuffix(forZone, zoneLabel) {
    if (forZone === null || forZone === undefined || forZone === 0) {
      return ''
    }

    const normalizedLabel = (zoneLabel || '').trim().replaceAll(' ', '_')
    return normalizedLabel ? `_${normalizedLabel}` : ''
  }

  function withZoneSuffix(filename, suffix) {
    if (!suffix) return filename

    const dotIndex = filename.lastIndexOf('.')
    if (dotIndex <= 0) {
      return `${filename}${suffix}`
    }

    return `${filename.slice(0, dotIndex)}${suffix}${filename.slice(dotIndex)}`
  }

  async function download(id, filename, forZone = null, zoneLabel = null, applyWeightCorrection = false) {
    const baseFilename = filename || `register_${id}.xlsx`
    const suffix = normalizeDownloadSuffix(forZone, zoneLabel)
    const targetFilename = withZoneSuffix(baseFilename, suffix)
    const params = new URLSearchParams()

    if (forZone !== null && forZone !== undefined && forZone !== 0) {
      params.set('forZone', forZone)
    }

    if (applyWeightCorrection === true) {
      params.set('applyWeightCorrection', 'true')
    }

    const query = params.toString() ? `?${params.toString()}` : ''

    loading.value = true
    error.value = null
    try {
      // Use downloadFile helper to trigger browser download
      return await fetchWrapper.downloadFile(
        `${baseUrl}/${id}/download${query}`,
        targetFilename
      )
    } catch (err) {
      error.value = err
    }
    finally {
      loading.value = false
    }
    return null
  }

  async function nextParcels(parcelId) {
    const authStore = useAuthStore()
    
    loading.value = true
    error.value = null
    try {
      const params = buildParcelsFilterParams(authStore)

      const result = await fetchWrapper.get(`${baseUrl}/nextparcels/${parcelId}?${params.toString()}`)
      if (!result) {
        return { withoutIssues: null, withIssues: null }
      }
      return {
        withoutIssues: result?.withoutIssues ?? result?.WithoutIssues ?? null,
        withIssues: result?.withIssues ?? result?.WithIssues ?? null
      }
    } catch (err) {
      error.value = err
    }
    finally {
      loading.value = false
    }
    return null
  }


  async function remove(id) {
    loading.value = true
    error.value = null
    try {
      await fetchWrapper.delete(`${baseUrl}/${id}`)
      await getAll()
    } catch (err) {
      error.value = err
    }
    finally {
      loading.value = false
    }
  }

  return {
    items,
    item,
    loading,
    error,
    totalCount,
    hasNextPage,
    hasPreviousPage,
    ops,
    opsLoading,
    opsError,
    getAll,
    getRegisters,
    upload,
    getById,
    update,
    getReturnRegisterPairs,
    createReturnRegister,
    setParcelStatuses,
    validate,
    getValidationProgress,
    cancelValidation,
    lookupFeacnCodes,
    getLookupFeacnCodesProgress,
    cancelLookupFeacnCodes,
    generate,
    generateExcise,
    generateNotifications,
    generateOrdinary,
    downloadInvoiceFile,
    download,
    downloadTechdoc,
    downloadAdditionalRestrictions,
    freezeCheckStatus,
    freezeTnVedOrder,
    nextParcels,
    remove,
    uploadFile,
    getOps,
    ensureOpsLoaded,
    getOpsLabel,
    getTransportationDocument,
    isExportProcedure
  }
})
