// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { shallowRef } from 'vue'

export function useParcelSelectionRequest() {
  const activeOperation = shallowRef(null)

  function beginOperation(scope) {
    activeOperation.value = scope
    return scope
  }

  function isCurrent(scope) {
    return activeOperation.value === scope
  }

  function finishOperation(scope) {
    if (isCurrent(scope)) invalidateOperation()
  }

  function invalidateOperation() {
    activeOperation.value = null
  }

  return { activeOperation, beginOperation, isCurrent, finishOperation, invalidateOperation }
}
