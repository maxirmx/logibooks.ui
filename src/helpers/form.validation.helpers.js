// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { nextTick } from 'vue'

function escapeSelector(value) {
  if (globalThis.CSS?.escape) return globalThis.CSS.escape(value)
  return String(value).replace(/[^a-zA-Z0-9_-]/g, (character) => `\\${character}`)
}

/**
 * Vee-validate invalid-submit handler. Keeps validation errors next to their
 * fields while moving the viewport and keyboard focus to the first one.
 */
export async function focusFirstInvalidField(submission = {}) {
  const errors = submission?.errors ?? submission
  const firstFieldName = Object.keys(errors || {})[0]

  await nextTick()

  const escapedName = firstFieldName ? escapeSelector(firstFieldName) : null
  const target =
    (escapedName &&
      document.querySelector(
        `[name="${escapedName}"], #${escapedName}, [data-field="${escapedName}"]`
      )) ||
    document.querySelector('.is-invalid, [aria-invalid="true"]')

  if (!(target instanceof HTMLElement)) return

  target.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
  target.focus({ preventScroll: true })
}
