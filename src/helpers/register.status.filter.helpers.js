// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

export const REGISTER_STATUS_FILTER_ALL = 'all'
export const REGISTER_STATUS_FILTER_IN_PROGRESS = 'inProgress'
export const REGISTER_STATUS_FILTER_ALL_ICON = 'fa-solid fa-layer-group'
export const REGISTER_STATUS_FILTER_IN_PROGRESS_ICON = 'fa-solid fa-gears'

const allStatusesOption = {
  id: REGISTER_STATUS_FILTER_ALL,
  title: 'Все',
  icon: REGISTER_STATUS_FILTER_ALL_ICON,
  bkColor: '#EEF2F6',
  fgColor: '#495057'
}

const inProgressStatusesOption = {
  id: REGISTER_STATUS_FILTER_IN_PROGRESS,
  title: 'В работе',
  icon: REGISTER_STATUS_FILTER_IN_PROGRESS_ICON,
  bkColor: '#E7F1FF',
  fgColor: '#0D6EFD'
}

export function normalizeRegisterStatusFilterValue(filterValue) {
  return filterValue === ''
    ? REGISTER_STATUS_FILTER_ALL
    : filterValue ?? REGISTER_STATUS_FILTER_IN_PROGRESS
}

export function buildRegisterStatusFilterOptions(statuses) {
  const concreteStatuses = Array.isArray(statuses)
    ? statuses.map((status) => ({
      id: status.id ?? status.Id,
      title: status.title ?? status.Title,
      icon: status.icon ?? status.Icon ?? null,
      bkColor: status.bkColor ?? status.BkColor ?? null,
      fgColor: status.fgColor ?? status.FgColor ?? null
    }))
    : []

  return [
    allStatusesOption,
    inProgressStatusesOption,
    ...concreteStatuses
  ]
}
