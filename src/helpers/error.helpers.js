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
      .map((item) => nonEmptyString(item) && getErrorMessage(item, 'Некорректное значение'))
      .filter(Boolean)
      .join(' ')
  }
  return nonEmptyString(value) && getErrorMessage(value, 'Некорректное значение')
}

const GENERAL_ERROR_KEYS = new Set(['', '$', '_error', 'apiError', 'general', 'nonFieldErrors'])

// Parameters can use any language. Inspect the explanation without changing
// quoted values, company names, document names, codes or other identifiers.
function isRussianMessage(message) {
  return /[А-Яа-яЁё]/.test(message.replace(/"[^"\n]*"|'[^'\n]*'|«[^»\n]*»/g, ''))
}

function localizeMessage(message, fallback) {
  // These are technical wrappers formerly used by callers, not entity templates.
  const diagnostic = message.replace(/^(?:Ошибка(?: загрузки| печати| при загрузке файла)?|Произошла непредвиденная ошибка при обращении к серверу):\s*/i, '')
  // Translate known explanations with named parameters without changing the values.
  const missingPrinter = /^Printer not found:\s*(.+)$/i.exec(diagnostic)
  if (missingPrinter) return `Принтер не найден: ${missingPrinter[1]}`
  const printerConnection = /^Failed to connect to printer (.+)$/i.exec(diagnostic)
  if (printerConnection) return `Не удалось подключиться к принтеру ${printerConnection[1]}`
  const technicalPrefix = /^(?:failed to |cannot |could not |unable to |invocation |(?:type|reference|syntax)error\b|unexpected\b|invalid\b|network (?:error|failure)|connection (?:error|closed|lost)|the .*(?:field is required|could not be converted|is not valid))/i.test(diagnostic)
  if (isRussianMessage(diagnostic) && !technicalPrefix) return message
  if (/disconnected|connection.*(?:closed|lost|not.*connected)|cannot.*(?:send|invoke).*connection/i.test(diagnostic)) {
    return 'Соединение с сервером прервано. Обновите страницу и повторите операцию.'
  }
  if (/timeout|timed out/i.test(diagnostic)) return 'Сервер не ответил вовремя. Повторите операцию.'
  if (/failed to fetch|network|load failed|handshake|negotiat/i.test(diagnostic)) {
    return 'Не удалось соединиться с сервером. Пожалуйста, проверьте подключение к сети.'
  }
  if (/abort|cancel/i.test(diagnostic)) return 'Операция отменена.'
  if (/unauthori[sz]ed|authentication/i.test(diagnostic)) return 'Необходима авторизация. Войдите в систему снова.'
  if (/forbidden|access denied/i.test(diagnostic)) return 'Недостаточно прав для выполнения операции.'
  if (/ssl|certificate/i.test(diagnostic)) return 'Не удалось установить защищённое соединение с сервером. Обратитесь к администратору.'
  if (/json|unexpected token/i.test(diagnostic)) return 'Сервер вернул данные в некорректном формате. Обновите страницу и повторите операцию.'
  if (/required|must be provided/i.test(diagnostic)) return 'Обязательное поле'
  return fallback
}

/**
 * Converts the error shapes used by fetchWrapper, API clients and browser APIs
 * into a safe, localized string for user-facing messages.
 */
export function getErrorMessage(error, fallback = DEFAULT_ERROR_MESSAGE) {
  const safeFallback = nonEmptyString(fallback)
  const localizedFallback = safeFallback && isRussianMessage(safeFallback) ? safeFallback : DEFAULT_ERROR_MESSAGE
  const directMessage = nonEmptyString(error)
  if (directMessage) return localizeMessage(directMessage, localizedFallback)

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
    if (message) return localizeMessage(message, localizedFallback)
  }

  return localizedFallback
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
  // ErrMessage.msg summarizes field failures. Only an explicit general error
  // accompanies mapped field errors; the summary remains the fallback for other callers.
  const explicitGeneral =
    generalFromErrors || (!hasFieldErrors && nonEmptyString(payload?.msg)) || nonEmptyString(payload?.message)

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
