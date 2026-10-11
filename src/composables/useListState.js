// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { onScopeDispose } from 'vue'
import { createListRefs } from '@/helpers/list.state.helpers.js'
import { useListStateStore } from '@/stores/list.state.store.js'

export function useListState(key, schema, context) {
  const state = createListRefs(schema)
  const { stop, restored } = useListStateStore().bind(key, state, schema, context)
  onScopeDispose(stop)
  return { ...state, restored }
}
