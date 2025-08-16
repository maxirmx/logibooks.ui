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

/**
 * Helper functions for bulk status change functionality in Registers List
 */

/**
 * Initializes bulk status state for a register if it doesn't exist
 * @param {number} registerId - The register ID
 * @param {Object} bulkStatusState - The reactive bulk status state object
 */
export function initializeBulkStatusState(registerId, bulkStatusState) {
  if (!bulkStatusState[registerId]) {
    bulkStatusState[registerId] = {
      editMode: false,
      selectedStatusId: null
    }
  }
}

/**
 * Toggles edit mode for bulk status change
 * @param {number} registerId - The register ID
 * @param {Object} bulkStatusState - The reactive bulk status state object
 * @param {boolean} loading - Whether the component is in loading state
 */
export function toggleBulkStatusEditMode(registerId, bulkStatusState, loading) {
  // Don't allow interaction while loading
  if (loading) {
    return
  }

  // Initialize state if it doesn't exist
  initializeBulkStatusState(registerId, bulkStatusState)

  // Toggle edit mode
  bulkStatusState[registerId].editMode = !bulkStatusState[registerId].editMode

  // Clear selection when entering edit mode
  if (bulkStatusState[registerId].editMode) {
    bulkStatusState[registerId].selectedStatusId = null
  }
}

/**
 * Cancels status change for a register
 * @param {number} registerId - The register ID
 * @param {Object} bulkStatusState - The reactive bulk status state object
 */
export function cancelBulkStatusChange(registerId, bulkStatusState) {
  if (bulkStatusState[registerId]) {
    bulkStatusState[registerId].editMode = false
    bulkStatusState[registerId].selectedStatusId = null
  }
}

/**
 * Validates the parameters for bulk status change
 * @param {number} registerId - The register ID
 * @param {number|string} statusId - The status ID to apply
 * @returns {Object} Validation result with isValid flag and error message
 */
export function validateBulkStatusParams(registerId, statusId) {
  if (!registerId || !statusId) {
    return {
      isValid: false,
      error: 'Не указан реестр или статус для изменения'
    }
  }

  // Ensure statusId is a number
  const numericStatusId = Number(statusId)
  if (isNaN(numericStatusId) || numericStatusId <= 0) {
    return {
      isValid: false,
      error: 'Некорректный идентификатор статуса'
    }
  }

  return {
    isValid: true,
    numericStatusId
  }
}

/**
 * Resets bulk status state for a register to exit edit mode
 * @param {number} registerId - The register ID
 * @param {Object} bulkStatusState - The reactive bulk status state object
 */
export function resetBulkStatusState(registerId, bulkStatusState) {
  if (bulkStatusState[registerId]) {
    bulkStatusState[registerId].editMode = false
    bulkStatusState[registerId].selectedStatusId = null
  }
}

/**
 * Applies selected status to all orders in register
 * @param {number} registerId - The register ID
 * @param {number|string} statusId - The status ID to apply
 * @param {Object} bulkStatusState - The reactive bulk status state object
 * @param {Object} registersStore - The registers store
 * @param {Object} alertStore - The alert store for showing messages
 * @returns {Promise<void>}
 */
export async function applyBulkStatusToAllOrders(registerId, statusId, bulkStatusState, registersStore, alertStore) {
  // Validate parameters
  const validation = validateBulkStatusParams(registerId, statusId)
  if (!validation.isValid) {
    alertStore.error(validation.error)
    return
  }

  try {
    await registersStore.setParcelStatuses(registerId, validation.numericStatusId)

    // Success: show message and reset state
    alertStore.success('Статус успешно применен ко всем посылкам в реестре')
    resetBulkStatusState(registerId, bulkStatusState)
  } catch (error) {
    // The store already handles setting the error state
    // Just provide user-friendly error message from the store error
    const errorMessage =
      error?.message || registersStore.error?.message || 'Ошибка при обновлении статусов посылок'
    alertStore.error(errorMessage)

    // Exit edit mode on error
    resetBulkStatusState(registerId, bulkStatusState)
  } finally {
    // Reload data to reflect changes
    await registersStore.getAll()
  }
}

/**
 * Gets the current edit mode state for a register
 * @param {number} registerId - The register ID
 * @param {Object} bulkStatusState - The reactive bulk status state object
 * @returns {boolean} Whether the register is in edit mode
 */
export function isBulkStatusEditMode(registerId, bulkStatusState) {
  return bulkStatusState[registerId]?.editMode || false
}

/**
 * Gets the selected status ID for a register
 * @param {number} registerId - The register ID
 * @param {Object} bulkStatusState - The reactive bulk status state object
 * @returns {number|null} The selected status ID or null
 */
export function getBulkStatusSelectedId(registerId, bulkStatusState) {
  return bulkStatusState[registerId]?.selectedStatusId || null
}

/**
 * Sets the selected status ID for a register
 * @param {number} registerId - The register ID
 * @param {number} statusId - The status ID to set
 * @param {Object} bulkStatusState - The reactive bulk status state object
 */
export function setBulkStatusSelectedId(registerId, statusId, bulkStatusState) {
  initializeBulkStatusState(registerId, bulkStatusState)
  bulkStatusState[registerId].selectedStatusId = statusId
}

/**
 * Validation state constants
 */
export const POLLING_INTERVAL_MS = 1000

/**
 * Creates initial validation state object
 * @returns {Object} Initial validation state
 */
export function createValidationState() {
  return {
    show: false,
    handleId: null,
    total: 0,
    processed: 0
  }
}

/**
 * Calculates validation progress percentage
 * @param {Object} validationState - The validation state object
 * @returns {number} Progress percentage (0-100)
 */
export function calculateValidationProgress(validationState) {
  if (!validationState.total || validationState.total <= 0) return 0
  return Math.round((validationState.processed / validationState.total) * 100)
}

/**
 * Polls validation progress and updates state
 * @param {Object} validationState - The validation state object
 * @param {Object} registersStore - The registers store instance
 * @param {Object} alertStore - The alert store instance
 * @param {Function} stopPollingFn - Function to stop polling
 * @returns {Promise<void>}
 */
export async function pollValidation(validationState, registersStore, alertStore, stopPollingFn) {
  if (!validationState.handleId) return
  
  try {
    const progress = await registersStore.getValidationProgress(validationState.handleId)
    validationState.total = progress.total
    validationState.processed = progress.processed
    
    if (progress.finished || progress.total === -1 || progress.processed === -1) {
      validationState.show = false
      stopPollingFn()
      // Only refresh data when validation is complete
      await registersStore.getAll()
    }
  } catch (err) {
    alertStore.error(err.message || String(err))
    validationState.show = false
    stopPollingFn()
    // Refresh data if validation failed
    await registersStore.getAll()
  }
}

/**
 * Starts validation for a register
 * @param {Object} item - The register item to validate
 * @param {Object} validationState - The validation state object
 * @param {Object} registersStore - The registers store instance
 * @param {Object} alertStore - The alert store instance
 * @param {Function} stopPollingFn - Function to stop polling
 * @param {Function} startPollingFn - Function to start polling
 * @returns {Promise<void>}
 */
export async function validateRegister(item, validationState, registersStore, alertStore, stopPollingFn, startPollingFn) {
  try {
    stopPollingFn()
    const res = await registersStore.validate(item.id)
    validationState.handleId = res.id
    validationState.total = 0
    validationState.processed = 0
    validationState.show = true
    await pollValidation(validationState, registersStore, alertStore, stopPollingFn)
    startPollingFn()
  } catch (err) {
    alertStore.error(err.message || String(err))
  }
}

/**
 * Cancels ongoing validation
 * @param {Object} validationState - The validation state object
 * @param {Object} registersStore - The registers store instance
 * @param {Function} stopPollingFn - Function to stop polling
 */
export function cancelValidation(validationState, registersStore, stopPollingFn) {
  if (validationState.handleId) {
    registersStore.cancelValidation(validationState.handleId).catch(() => {})
  }
  validationState.show = false
  stopPollingFn()
}

/**
 * Creates a timer management object for validation polling
 * @param {Function} pollFunction - The function to call on each poll
 * @param {number} interval - Polling interval in milliseconds
 * @returns {Object} Timer management object with start and stop methods
 */
export function createPollingTimer(pollFunction, interval = POLLING_INTERVAL_MS) {
  let timer = null
  
  return {
    start() {
      if (!timer) {
        timer = setInterval(pollFunction, interval)
      }
    },
    stop() {
      if (timer) {
        clearInterval(timer)
        timer = null
      }
    },
    isRunning() {
      return timer !== null
    }
  }
}
