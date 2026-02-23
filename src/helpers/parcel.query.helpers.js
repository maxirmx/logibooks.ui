// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

/**
 * Parses selectedParcelId from route query parameters
 * Handles both single values and arrays (Vue Router can return either)
 * @param {string|string[]|undefined} value - The query parameter value
 * @returns {number|null} - Parsed parcel ID or null if invalid
 */
export function parseSelectedParcelIdFromQuery(value) {
  const rawValue = Array.isArray(value) ? value[0] : value
  const parsedValue = Number(rawValue)
  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : null
}
