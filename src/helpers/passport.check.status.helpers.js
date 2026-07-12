// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

export const PassportCheckStatusCode = Object.freeze({
  NotChecked: 'NotChecked',
  CheckError: 'CheckError',
  InProgress: 'InProgress',
  Checked: 'Checked',
  NotExists: 'NotExists',
  Invalid: 'Invalid'
})

export const PassportCheckStatusFilterValue = Object.freeze({
  Problems: 'problems'
})

export const PassportCheckStatusPresentation = Object.freeze({
  NotChecked: Object.freeze({
    name: 'NotChecked',
    icon: 'fa-solid fa-circle-question',
    colorClass: 'passport-check-status__icon--color-not-checked'
  }),
  CheckError: Object.freeze({
    name: 'CheckError',
    icon: 'fa-solid fa-triangle-exclamation',
    colorClass: 'passport-check-status__icon--color-has-issues'
  }),
  InProgress: Object.freeze({
    name: 'InProgress',
    icon: 'fa-solid fa-arrow-rotate-left',
    colorClass: 'passport-check-status__icon--color-not-checked'
  }),
  Checked: Object.freeze({
    name: 'Checked',
    icon: 'fa-solid fa-circle-check',
    colorClass: 'passport-check-status__icon--color-no-issues'
  }),
  Invalid: Object.freeze({
    name: 'Invalid',
    icon: 'fa-solid fa-circle-exclamation',
    colorClass: 'passport-check-status__icon--color-has-issues'
  }),
  NotExists: Object.freeze({
    name: 'NotExists',
    icon: 'fa-solid fa-circle-xmark',
    colorClass: 'passport-check-status__icon--color-has-issues'
  })
})

export const PassportCheckStatusPresentationByCode = Object.freeze({
  [PassportCheckStatusCode.Invalid]: PassportCheckStatusPresentation.Invalid,
  [PassportCheckStatusCode.NotExists]: PassportCheckStatusPresentation.NotExists,
  [PassportCheckStatusCode.Checked]: PassportCheckStatusPresentation.Checked,
  [PassportCheckStatusCode.NotChecked]: PassportCheckStatusPresentation.NotChecked,
  [PassportCheckStatusCode.CheckError]: PassportCheckStatusPresentation.CheckError,
  [PassportCheckStatusCode.InProgress]: PassportCheckStatusPresentation.InProgress
})

export function resolvePassportCheckStatus(statuses, value) {
  if (!Array.isArray(statuses)) return null
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return null
  return statuses.find((status) => Number(status?.value) === numericValue) ?? null
}

export function resolvePassportCheckStatusByCode(statuses, code) {
  if (!Array.isArray(statuses)) return null
  return statuses.find((status) => status?.code === code) ?? null
}

export function isPassportCheckInProgress(statuses, value) {
  return resolvePassportCheckStatus(statuses, value)?.code === PassportCheckStatusCode.InProgress
}

export function hasPassportIdentityChanged(initialValues, currentValues, fields) {
  if (!Array.isArray(fields)) return false

  return fields.some((field) => normalizeIdentityValue(initialValues?.[field]) !== normalizeIdentityValue(currentValues?.[field]))
}

export function resolveEffectivePassportCheckStatus(statuses, value, initialValues, currentValues, fields) {
  if (hasPassportIdentityChanged(initialValues, currentValues, fields)) {
    return resolvePassportCheckStatusByCode(statuses, PassportCheckStatusCode.NotChecked) ?? { code: PassportCheckStatusCode.NotChecked }
  }

  return resolvePassportCheckStatus(statuses, value)
}

function normalizeIdentityValue(value) {
  return value == null ? '' : String(value).trim()
}

export function getPassportCheckStatusPresentation(statusOrCode) {
  const code = typeof statusOrCode === 'string'
    ? statusOrCode
    : statusOrCode?.code
  return PassportCheckStatusPresentationByCode[code] ?? PassportCheckStatusPresentation.NotChecked
}

export function createPassportCheckStatusOptions(statuses = []) {
  return [
    { value: null, title: 'Все' },
    { value: PassportCheckStatusFilterValue.Problems, title: 'С проблемами' },
    ...(Array.isArray(statuses)
      ? statuses.map((status) => ({
          value: status.value,
          title: status.name
        }))
      : [])
  ]
}
