// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks UI application

import { getCurrentScope, ref } from 'vue'
import { runWithAlert } from '@/helpers/notification.helpers.js'

export function useStickerCsvDownload(fallback) {
  const scope = getCurrentScope()
  const busy = ref(false)

  async function download(operation) {
    if (busy.value) return
    busy.value = true
    try {
      await runWithAlert(operation, { fallback, scope })
    } finally {
      busy.value = false
    }
  }

  return { busy, download }
}
