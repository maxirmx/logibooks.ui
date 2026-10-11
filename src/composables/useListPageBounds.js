// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { ref, watch } from 'vue'

// An empty/loading result must not overwrite a page restored from this tab.
export function useListPageBounds(page, maxPage, ready) {
  const loaded = ref(false)
  watch([maxPage, ready, loaded], ([max, ready, succeeded]) => {
    if (ready && succeeded && page.value > max) page.value = max
  })
  return loaded
}
