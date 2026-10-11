// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { watch } from 'vue'
import { useListState } from '@/composables/useListState.js'
import { scalarField } from '@/helpers/list.state.helpers.js'

export function useParcelBoxScope({ mode, boxId, page, boxNumber, localBoxNumber, onChange }) {
  const { scope, restored } = useListState('parcelBoxScope', { scope: scalarField(null) }, () => mode)
  let scopeChanging = false
  const context = [boxId, restored]
  watch(context, ([value], previous) => {
    scopeChanging = previous.length > 0
    const id = value ?? null
    if (id !== scope.value) page.value = 1
    scope.value = id
    if (id !== null && boxNumber) {
      boxNumber.value = ''
      localBoxNumber.value = ''
    }
  }, { immediate: true, flush: 'sync' })
  // Run after local filter synchronization so its debounce cannot postpone a scope change.
  watch(context, () => {
    scopeChanging = false
    onChange()
  }, { flush: 'post' })
  // The scope watcher owns the reload when its page reset also changes list controls.
  return () => { if (!scopeChanging) onChange() }
}
