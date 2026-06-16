// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

function parseDateValue(dateValue) {
  if (!dateValue) return null
  const date = new Date(dateValue)
  return Number.isNaN(date.getTime()) ? null : date
}

function fallbackDateValue(dateValue) {
  return typeof dateValue === 'string' ? dateValue : String(dateValue)
}

function formatParsedDate(d) {
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}.${mm}.${yyyy}`
}

/**
 * Format date string to DD.MM.YYYY format
 * @param {string|Date|null} dateStr - Date string or Date object to format
 * @returns {string} Formatted date string in DD.MM.YYYY format, or empty string if input is falsy
 */
export function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = parseDateValue(dateStr)
  if (!d) return dateStr
  return formatParsedDate(d)
}

/**
 * Format date-time value with Russian locale.
 * @param {string|Date|null} dateValue - Date-time string or Date object to format
 * @returns {string} Localized date-time string, or empty string if input is falsy
 */
export function formatDateTime(dateValue) {
  if (!dateValue) return ''
  const d = parseDateValue(dateValue)
  if (!d) return fallbackDateValue(dateValue)
  return d.toLocaleString('ru-RU')
}

/**
 * Format date-time value as local time with Russian locale.
 * @param {string|Date|null} dateValue - Date-time string or Date object to format
 * @returns {string} Localized time string, or empty string if input is falsy
 */
export function formatTime(dateValue) {
  if (!dateValue) return ''
  const d = parseDateValue(dateValue)
  if (!d) return fallbackDateValue(dateValue)
  return d.toLocaleTimeString('ru-RU')
}

/**
 * Format date-time value as local date and local time lines.
 * @param {string|Date|null} dateValue - Date-time string or Date object to format
 * @returns {string[]} Date and time lines, or a single fallback line for invalid values
 */
export function formatDateTimeLines(dateValue) {
  if (!dateValue) return []
  const d = parseDateValue(dateValue)
  if (!d) return [fallbackDateValue(dateValue)]
  return [formatParsedDate(d), d.toLocaleTimeString('ru-RU')]
}
