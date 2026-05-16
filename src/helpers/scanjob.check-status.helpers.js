// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks UI application

export const scanjobCheckStatusProjectionKind = Object.freeze({
  NotChecked: 10,
  Restriction: 20,
  Checked: 30
})

export function scanjobCheckStatusText(projection) {
  return projection?.title || '-'
}

export function scanjobCheckStatusReason(projection) {
  return Number(projection?.kind) === scanjobCheckStatusProjectionKind.Restriction
    ? projection?.restrictionReason || ''
    : ''
}

export function getScanjobCheckStatusClass(projection) {
  switch (Number(projection?.kind)) {
    case scanjobCheckStatusProjectionKind.NotChecked:
      return 'not-checked'
    case scanjobCheckStatusProjectionKind.Restriction:
      return 'has-issues'
    case scanjobCheckStatusProjectionKind.Checked:
      return 'no-issues'
    default:
      return ''
  }
}
