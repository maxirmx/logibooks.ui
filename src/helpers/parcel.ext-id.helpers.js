// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks UI application

function boolValue(value) {
  return Boolean(value?.value ?? value)
}

export function canClearParcelExtId(item, authStore) {
  return Boolean(item?.id && item?.extId && boolValue(authStore?.isAdmin))
}

export function getClearParcelExtIdErrorMessage(error) {
  return error?.message || 'Ошибка при очистке номера КГТ'
}
