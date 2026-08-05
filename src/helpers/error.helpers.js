// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

const DEFAULT_ERROR_MESSAGE = 'Произошла непредвиденная ошибка'

function nonEmptyString(value) {
  if (typeof value !== 'string') return null
  const result = value.trim()
  return result || null
}

function errorPayload(error) {
  return error?.response?.data ?? error?.data ?? error
}

function normalizeFieldName(name) {
  return String(name)
    .trim()
    .replace(/(^|\.)([A-Z])/g, (_, prefix, letter) => `${prefix}${letter.toLowerCase()}`)
}

function normalizeFieldMessage(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => nonEmptyString(item))
      .filter(Boolean)
      .join(' ')
  }
  return nonEmptyString(value)
}

const GENERAL_ERROR_KEYS = new Set(['', '$', '_error', 'apiError', 'general', 'nonFieldErrors'])

/**
 * Converts the error shapes used by fetchWrapper, API clients and browser APIs
 * into a safe, localized string for user-facing messages.
 */
export function getErrorMessage(error, fallback = DEFAULT_ERROR_MESSAGE) {
  const directMessage = nonEmptyString(error)
  if (directMessage) return directMessage

  const candidates = [
    error?.msg,
    error?.data?.msg,
    error?.data?.message,
    error?.response?.data?.msg,
    error?.response?.data?.message,
    error?.message
  ]

  for (const candidate of candidates) {
    const message = nonEmptyString(candidate)
    if (message) return message
  }

  return nonEmptyString(fallback) || DEFAULT_ERROR_MESSAGE
}

/**
 * Extracts ASP.NET-style validation errors and converts their property names
 * to the camel-case paths used by vee-validate.
 */
export function getServerFieldErrors(error, fieldAliases = {}) {
  const errors = errorPayload(error)?.errors
  if (!errors || typeof errors !== 'object' || Array.isArray(errors)) return {}

  return Object.entries(errors).reduce((result, [rawName, rawMessage]) => {
    const normalizedName = normalizeFieldName(rawName)
    if (GENERAL_ERROR_KEYS.has(normalizedName)) return result

    const message = normalizeFieldMessage(rawMessage)
    if (message) result[fieldAliases[normalizedName] ?? normalizedName] = message
    return result
  }, {})
}

/**
 * Maps structured validation errors beside their fields and publishes only
 * the general remainder. Returns true when at least one field was mapped.
 */
export function reportFormError(
  error,
  { setErrors, alertStore, fallback = DEFAULT_ERROR_MESSAGE, fieldAliases = {} } = {}
) {
  const fieldErrors = getServerFieldErrors(error, fieldAliases)
  const hasFieldErrors = Object.keys(fieldErrors).length > 0

  if (hasFieldErrors && typeof setErrors === 'function') setErrors(fieldErrors)

  const payload = errorPayload(error)
  const generalFromErrors = payload?.errors
    ? Object.entries(payload.errors)
        .filter(([name]) => GENERAL_ERROR_KEYS.has(normalizeFieldName(name)))
        .map(([, value]) => normalizeFieldMessage(value))
        .filter(Boolean)
        .join(' ')
    : ''
  const explicitGeneral =
    generalFromErrors || nonEmptyString(payload?.msg) || nonEmptyString(payload?.message)

  if (!hasFieldErrors || explicitGeneral || typeof setErrors !== 'function') {
    alertStore?.error(explicitGeneral || error, { fallback })
  }

  return hasFieldErrors
}

/**
 * Records a handled technical failure that does not warrant a user message.
 * This is the intentional replacement for silent/empty catches and is the
 * integration point for future external telemetry.
 */
export function reportError(error, { context = 'Unhandled application operation' } = {}) {
  console.error(`[${context}]`, error)
}

export { DEFAULT_ERROR_MESSAGE }
