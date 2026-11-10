// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { nextTick } from 'vue'
import { reportError } from '@/helpers/error.helpers.js'

export function useInlineTnVed({
  scope, getBoxId = () => null, page, isComponentMounted, isBusy, runningAction, parcelsStore, alertStore, refresh
}) {
  let appliedPageKey = null

  function isPageAlreadyLoaded() {
    if (appliedPageKey === null) return false
    const [, registerId] = scope()
    return appliedPageKey === parcelsStore.paperworkListKey(registerId, getBoxId())
  }

  async function selectTnVed(item, code) {
    if (isBusy() || item.readOnly === true) return
    const origin = scope()
    const [, registerId] = origin
    const isCurrent = () => {
      const current = scope()
      return isComponentMounted.value && origin.every((value, index) => value === current[index])
    }

    function applyPage(currentPage) {
      if (page.value === currentPage) return
      const key = parcelsStore.paperworkListKey(registerId, getBoxId(), currentPage)
      appliedPageKey = key
      page.value = currentPage
      void nextTick(() => {
        if (appliedPageKey === key) appliedPageKey = null
      })
    }

    runningAction.value = true
    try {
      const outcome = await parcelsStore.updateTnVedFromList(item.id, code, {
        registerId, getBoxId, isCurrent, applyPage
      })
      if (outcome === 'refresh' && isCurrent()) refresh()
    } catch (error) {
      if (isCurrent()) {
        alertStore.error(error, { fallback: 'Не удалось обновить код ТН ВЭД' })
      } else {
        // The originating page is gone. Keep diagnostics without alerting the new page.
        reportError(error, { context: 'inline TN VED update after navigation' })
      }
    } finally {
      runningAction.value = false
    }
  }

  return { selectTnVed, isPageAlreadyLoaded }
}
