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

export const PassportCheckStatusPresentation = Object.freeze({
  HasIssues: Object.freeze({
    name: 'HasIssues',
    colorClass: 'passport-check-status__dot--color-has-issues',
    borderClass: 'passport-check-status__dot--border-has-issues'
  }),
  NoIssues: Object.freeze({
    name: 'NoIssues',
    colorClass: 'passport-check-status__dot--color-no-issues',
    borderClass: 'passport-check-status__dot--border-no-issues'
  }),
  NotChecked: Object.freeze({
    name: 'NotChecked',
    colorClass: 'passport-check-status__dot--color-not-checked',
    borderClass: 'passport-check-status__dot--border-not-checked'
  }),
  CheckError: Object.freeze({
    name: 'CheckError',
    colorClass: 'passport-check-status__dot--color-not-checked',
    borderClass: 'passport-check-status__dot--border-has-issues'
  }),
  InProgress: Object.freeze({
    name: 'InProgress',
    colorClass: 'passport-check-status__dot--color-not-checked',
    borderClass: 'passport-check-status__dot--border-no-issues'
  })
})

export const PassportCheckStatusPresentationByCode = Object.freeze({
  [PassportCheckStatusCode.Invalid]: PassportCheckStatusPresentation.HasIssues,
  [PassportCheckStatusCode.NotExists]: PassportCheckStatusPresentation.HasIssues,
  [PassportCheckStatusCode.Checked]: PassportCheckStatusPresentation.NoIssues,
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

export function getPassportCheckStatusPresentation(statusOrCode) {
  const code = typeof statusOrCode === 'string'
    ? statusOrCode
    : statusOrCode?.code
  return PassportCheckStatusPresentationByCode[code] ?? PassportCheckStatusPresentation.NotChecked
}

export function createPassportCheckStatusOptions(statuses = []) {
  return [
    { value: null, title: 'Все' },
    ...(Array.isArray(statuses)
      ? statuses.map((status) => ({
          value: status.value,
          title: status.name
        }))
      : [])
  ]
}
