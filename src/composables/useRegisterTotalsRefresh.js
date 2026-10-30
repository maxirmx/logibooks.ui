// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed, onScopeDispose, ref, toValue } from 'vue'
import { useRegistersStore } from '@/stores/registers.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { reportError } from '@/helpers/error.helpers.js'

export function useRegisterTotalsRefresh(registerId) {
  const registersStore = useRegistersStore()
  const alertStore = useAlertStore()
  const refreshPending = ref(false)
  const refreshingTotals = computed(() => refreshPending.value || registersStore.isRefreshingDerived?.(toValue(registerId)) === true)
  let active = true
  onScopeDispose(() => { active = false })

  async function refreshTotals() {
    if (!active || refreshingTotals.value) return false
    refreshPending.value = true
    try {
      await registersStore.refreshDerived(toValue(registerId))
      return true
    } catch (error) {
      if (active) {
        reportError(error, { context: 'register totals refresh' })
        alertStore.error(error, { fallback: 'Не удалось обновить итоги реестра' })
      } else {
        // The page has gone; retain diagnostics without publishing an alert on another page.
        reportError(error, { context: 'document totals refresh after teardown' })
      }
      return false
    } finally {
      refreshPending.value = false
    }
  }

  return { refreshingTotals, refreshTotals }
}
