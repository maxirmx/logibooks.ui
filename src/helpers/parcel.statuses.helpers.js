// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

export function isCustomsProcessingDisabled(statusId, statusStore) {
  const id = Number(statusId)
  const status =
    typeof statusStore.getStatusById === 'function'
      ? statusStore.getStatusById(id)
      : statusStore.parcelStatuses?.find(s => s.id === id)
  return status?.useAtCustomsProcessing === false
}
