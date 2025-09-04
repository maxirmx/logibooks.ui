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

import { useFeacnCodesStore } from '@/stores/feacn.codes.store.js'
import { ref } from 'vue'

// Global FEACN info cache - stores objects with name, found status, and loading state
const globalFeacnInfo = ref({})

/**
 * Formats FEACN code name from an item object without making API calls
 * @param {Object} item - FEACN item object with normalizedName, name, and code properties
 * @returns {string} Formatted FEACN name
 */
export function formatFeacnNameFromItem(item) {
  if (!item) return 'Код ТН ВЭД не задан'

  const normalized = item.normalizedName?.trim()
  if (normalized) {
    const lower = normalized.toLowerCase()
    return lower.charAt(0).toUpperCase() + lower.slice(1)
  }

  const name = item.name?.trim()
  if (name) return name

  return `Код ТН ВЭД ${item.code}`
}

/**
 * Formats FEACN code name using data from the store
 * @param {string} code - FEACN code
 * @returns {Promise<{name: string, found: boolean}>} Formatted FEACN name and search status
 */
export async function formatFeacnName(code) {
  const store = useFeacnCodesStore()
  try {
    const info = await store.getByCode(code)
    if (!info) {
      return {
        name: 'Несуществующий код ТН ВЭД',
        found: false
      }
    }
    
    // Create a complete item with the original code
    const item = {
      ...info,
      code: code // Ensure we have the original code
    }
    
    return {
      name: formatFeacnNameFromItem(item),
      found: true
    }
  } catch {
    return {
      name: 'Несуществующий код ТН ВЭД',
      found: false
    }
  }
}

/**
 * Gets FEACN tooltip with caching and lazy loading
 * @param {string} code - FEACN code
 * @param {boolean} showLoadingPlaceholder - Whether to show loading placeholder immediately
 * @returns {Promise<string>} Cached or newly fetched FEACN tooltip (name only for backward compatibility)
 */
export async function getFeacnTooltip(code, showLoadingPlaceholder = false) {
  // Check if we already have the tooltip cached
  if (globalFeacnInfo.value[code] && !globalFeacnInfo.value[code].loading) {
    return globalFeacnInfo.value[code].name
  }
  
  // Set loading placeholder if requested (for hover scenarios)
  if (showLoadingPlaceholder) {
    globalFeacnInfo.value[code] = {
      name: 'Загрузка...',
      found: null, // null indicates loading state
      loading: true
    }
  }
  
  // Get both name and status
  const result = await formatFeacnName(code)
  globalFeacnInfo.value[code] = {
    name: result.name,
    found: result.found,
    loading: false
  }
  
  return result.name
}

/**
 * Gets FEACN information with both name and search status
 * @param {string} code - FEACN code
 * @param {boolean} showLoadingPlaceholder - Whether to show loading placeholder immediately
 * @returns {Promise<{name: string, found: boolean, loading: boolean}>} Complete FEACN information
 */
export async function getFeacnInfo(code, showLoadingPlaceholder = false) {
  // Check if we already have the info cached
  if (globalFeacnInfo.value[code] && !globalFeacnInfo.value[code].loading) {
    return globalFeacnInfo.value[code]
  }
  
  // Set loading placeholder if requested
  if (showLoadingPlaceholder) {
    globalFeacnInfo.value[code] = {
      name: 'Загрузка...',
      found: null,
      loading: true
    }
  }
  
  // Get both name and status
  const result = await formatFeacnName(code)
  const info = {
    name: result.name,
    found: result.found,
    loading: false
  }
  
  globalFeacnInfo.value[code] = info
  return info
}

/**
 * Gets only the search status for a FEACN code
 * @param {string} code - FEACN code
 * @returns {Promise<boolean|null>} Search status (true=found, false=not found, null=loading/unknown)
 */
export async function getFeacnSearchStatus(code) {
  const info = await getFeacnInfo(code, false)
  return info.found
}

/**
 * Checks if a FEACN code is currently loading
 * @param {string} code - FEACN code
 * @returns {boolean} True if currently loading
 */
export function isFeacnLoading(code) {
  return globalFeacnInfo.value[code]?.loading === true
}

/**
 * Convenience function for loading tooltip on hover (shows loading placeholder)
 * @param {string} code - FEACN code
 * @returns {Promise<string>} Cached or newly fetched FEACN tooltip
 */
export async function loadFeacnTooltipOnHover(code) {
  return await getFeacnTooltip(code, true)
}

/**
 * Gets the reactive info cache object
 * @returns {Ref<Object>} Reactive FEACN info cache
 */
export function useFeacnTooltips() {
  return globalFeacnInfo
}

/**
 * Gets the reactive info cache object (new name for clarity)
 * @returns {Ref<Object>} Reactive FEACN info cache
 */
export function useFeacnInfo() {
  return globalFeacnInfo
}

/**
 * Clears the FEACN info cache (useful when data changes)
 */
export function clearFeacnTooltipCache() {
  globalFeacnInfo.value = {}
}

/**
 * Clears the FEACN info cache (new name for clarity)
 */
export function clearFeacnInfoCache() {
  globalFeacnInfo.value = {}
}

/**
 * Preloads FEACN info for an array of codes (new name for clarity)
 * @param {string[]} codes - Array of FEACN codes
 * @returns {Promise<void>}
 */
export async function preloadFeacnInfo(codes) {
  if (!codes || !Array.isArray(codes) || codes.length === 0) return

  // Normalize and deduplicate
  const uniqueCodes = [...new Set(
    codes
      .filter(c => c !== null && c !== undefined)
      .map(c => String(c).trim())
      .filter(c => c.length > 0)
  )]

  // Filter out codes that are already cached (either found or not found)
  const codesToLoad = uniqueCodes.filter(code => !globalFeacnInfo.value[code])

  if (codesToLoad.length === 0) return

  try {
    const store = useFeacnCodesStore()
    
    // Prefer bulk lookup to minimize requests
    const response = await store.bulkLookup(codesToLoad)
    const results = (response && (response.results || response.Results)) || response || {}

    for (const code of codesToLoad) {
      const dto = results?.[code] ?? null
      if (dto) {
        // Use item-based formatter to build display name
        const item = { ...dto, code }
        globalFeacnInfo.value[code] = {
          name: formatFeacnNameFromItem(item),
          found: true,
          loading: false
        }
      } else {
        // Not found case
        globalFeacnInfo.value[code] = {
          name: 'Несуществующий код ТН ВЭД',
          found: false,
          loading: false
        }
      }
    }
  } catch (error) {
    // Handle case when Pinia is not available (e.g., during tests)
    if (error.message && error.message.includes('getActivePinia')) {
      // Mark codes as not found when Pinia is not available
      for (const code of codesToLoad) {
        globalFeacnInfo.value[code] = {
          name: 'Код ТН ВЭД не проверен',
          found: false,
          loading: false
        }
      }
      return
    }
    
    // For other errors, fallback to individual loading
    try {
      await Promise.all(codesToLoad.map(code => getFeacnInfo(code, false)))
    } catch (fallbackError) {
      // If individual loading also fails, mark codes as not checked
      for (const code of codesToLoad) {
        globalFeacnInfo.value[code] = {
          name: 'Ошибка проверки кода ТН ВЭД',
          found: false,
          loading: false
        }
      }
    }
  }
}

/**
 * Gets cached FEACN info without making new requests
 * @param {string} code - FEACN code
 * @returns {{name: string, found: boolean, loading: boolean}|null} Cached info or null if not cached
 */
export function getCachedFeacnInfo(code) {
  return globalFeacnInfo.value[code] || null
}
