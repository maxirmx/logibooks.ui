// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

export const REMOVED_PARCEL_FILTER_MESSAGE = 'Выбранный пользовательский фильтр недоступен. Фильтр сброшен.'

export function createEmptyParcelFilter() {
  return {
    name: '',
    excludedParcelStatusIds: [],
    excludedCheckStatuses: { common: [], sw: [], fc: [] },
    excludedPassportCheckStatuses: []
  }
}

export function validateParcelFilterName(name, filters, currentId = null) {
  const trimmedName = typeof name === 'string' ? name.trim() : ''
  if (!trimmedName) return 'Укажите название фильтра'
  if (trimmedName.length > 100) return 'Название фильтра не должно превышать 100 символов'
  const normalized = trimmedName.toLocaleLowerCase('ru-RU')
  if (filters.some(filter => filter.id !== currentId && filter.name.trim().toLocaleLowerCase('ru-RU') === normalized)) {
    return 'Фильтр с таким названием уже есть'
  }
  return null
}
