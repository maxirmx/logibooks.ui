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

// Global tooltip cache - shared across all components
const globalFeacnTooltips = ref({})

/**
 * Formats FEACN code name from an item object without making API calls
 * @param {Object} item - FEACN item object with normalizedName, name, and code properties
 * @returns {string} Formatted FEACN name
 */
export function formatFeacnNameFromItem(item) {
  if (!item) return 'Код ТН ВЭД не найден'

  const normalized = item?.normalizedName?.trim()
  if (normalized) {
    const lower = normalized.toLowerCase()
    return lower.charAt(0).toUpperCase() + lower.slice(1)
  }

  const name = item?.name?.trim()
  if (name) return name

  return `Код ТН ВЭД ${item.code || ''}`
}

/**
 * Formats FEACN code name using data from the store
 * @param {string} code - FEACN code
 * @returns {Promise<string>} Formatted FEACN name
 */

export async function formatFeacnName(code) {
  const store = useFeacnCodesStore()
  try {
    const info = await store.getByCode(code)
    return formatFeacnNameFromItem(info)
  } catch {
    return 'Код ТН ВЭД не найден'
  }
}

/**
 * Gets FEACN tooltip with caching and lazy loading
 * @param {string} code - FEACN code
 * @param {boolean} showLoadingPlaceholder - Whether to show loading placeholder immediately
 * @returns {Promise<string>} Cached or newly fetched FEACN tooltip
 */
export async function getFeacnTooltip(code, showLoadingPlaceholder = false) {
  // Check if we already have the tooltip cached
  if (globalFeacnTooltips.value[code]) {
    return globalFeacnTooltips.value[code]
  }
  
  // Set loading placeholder if requested (for hover scenarios)
  if (showLoadingPlaceholder) {
    globalFeacnTooltips.value[code] = 'Загрузка...'
  }
  
  // formatFeacnName already handles all error cases gracefully
  const tooltip = await formatFeacnName(code)
  globalFeacnTooltips.value[code] = tooltip
  return tooltip
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
 * Gets the reactive tooltip cache object
 * @returns {Ref<Object>} Reactive tooltip cache
 */
export function useFeacnTooltips() {
  return globalFeacnTooltips
}

/**
 * Clears the tooltip cache (useful when data changes)
 */
export function clearFeacnTooltipCache() {
  globalFeacnTooltips.value = {}
}

/**
 * Preloads tooltips for an array of FEACN codes
 * @param {string[]} codes - Array of FEACN codes
 * @returns {Promise<void>}
 */
export async function preloadFeacnTooltips(codes) {
  const uniqueCodes = [...new Set(codes)]
  await Promise.all(uniqueCodes.map(code => getFeacnTooltip(code, false)))
}
