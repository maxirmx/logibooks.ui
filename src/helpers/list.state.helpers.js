// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { ref, watch } from 'vue'

export const LIST_STATE_STORAGE_KEY = 'logibooks.listState'
const LEGACY_STORAGE_KEY = 'logibooks.parcelsSnapshot'
const clone = value => JSON.parse(JSON.stringify(value))
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value)

export const listField = (value, validate) => ({ value, validate })
export const pageField = (value = 1) => listField(value, v => Number.isInteger(v) && v > 0)
export const pageSizeField = value => listField(value, v => Number.isInteger(v) && (v > 0 || v === -1))
export const scalarField = value => listField(value, v => v === null || typeof v === 'string' || (typeof v === 'number' && Number.isFinite(v)))

function validValue(value, field) {
  if (field.validate) return field.validate(value)
  if (Array.isArray(field.value)) {
    return Array.isArray(value) && value.every(item =>
      typeof item === 'string' || (isRecord(item) && typeof item.key === 'string' && ['asc', 'desc'].includes(item.order))
    )
  }
  return typeof value === typeof field.value
}

export function createListRefs(schema) {
  return Object.fromEntries(Object.entries(schema).map(([key, field]) => [key, ref(clone(field.value))]))
}

/** One tab-wide document; only registered controls can enter the document. */
export function createSessionListState(onError) {
  let userId = null
  let initialized = false
  let values = Object.create(null)
  let updating = false
  let failed = false
  let pendingRead = false
  let pendingEdits = Object.create(null)
  const bindings = new Set()

  function attempt(operation) {
    try {
      operation()
      failed = false
      return true
    } catch (error) {
      if (!failed) onError(error)
      failed = true
      return false
    }
  }

  function capture(binding) {
    if (binding.key !== null) {
      values[binding.key] = Object.fromEntries(Object.entries(binding.refs).map(([key, state]) => [key, clone(state.value)]))
    }
  }

  function restore(binding) {
    const saved = values[binding.key]
    for (const [key, field] of Object.entries(binding.schema)) {
      binding.refs[key].value = clone(isRecord(saved) && validValue(saved[key], field) ? saved[key] : field.value)
    }
    binding.restored.value += 1
  }

  function persist() {
    if (updating) return true
    // Restore unread state before an ordinary persistence attempt can replace it.
    if (pendingRead) return restorePendingState()
    return attempt(() => {
      if (userId == null) {
        sessionStorage.removeItem(LIST_STATE_STORAGE_KEY)
        sessionStorage.removeItem(LEGACY_STORAGE_KEY)
        return
      }
      bindings.forEach(capture)
      sessionStorage.setItem(LIST_STATE_STORAGE_KEY, JSON.stringify({ version: 1, userId, lists: values }))
    })
  }

  function readStoredState() {
    sessionStorage.removeItem(LEGACY_STORAGE_KEY)
    const raw = sessionStorage.getItem(LIST_STATE_STORAGE_KEY)
    pendingRead = false
    if (raw) {
      const saved = JSON.parse(raw)
      if (!isRecord(saved) || saved.version !== 1 || !isRecord(saved.lists)) throw new Error('Некорректные сохранённые настройки списков')
      if (userId != null && saved.userId === userId) values = Object.assign(Object.create(null), saved.lists)
      else sessionStorage.removeItem(LIST_STATE_STORAGE_KEY)
    }
  }

  function restorePendingState() {
    if (!pendingRead) return persist()
    updating = true
    const succeeded = attempt(readStoredState)
    if (succeeded) {
      // Explicit edits made while storage was unavailable win over saved values.
      for (const [key, edits] of Object.entries(pendingEdits)) {
        values[key] = { ...values[key], ...edits }
      }
      pendingEdits = Object.create(null)
      bindings.forEach(restore)
    }
    updating = false
    return succeeded && persist()
  }

  function setUser(id) {
    id = id ?? null
    if (initialized && id === userId) return
    updating = true
    const firstInitialization = !initialized
    initialized = true
    userId = id
    values = Object.create(null)
    pendingEdits = Object.create(null)
    pendingRead = firstInitialization
    attempt(() => {
      // The old snapshot has no account identity and can replay stale filters.
      if (firstInitialization) readStoredState()
      else {
        sessionStorage.removeItem(LEGACY_STORAGE_KEY)
        sessionStorage.removeItem(LIST_STATE_STORAGE_KEY)
      }
    })
    bindings.forEach(restore)
    updating = false
  }

  function bind(id, refs, schema, context = () => '') {
    const binding = { refs, schema, key: null, restored: ref(0) }
    bindings.add(binding)
    const stopContext = watch(context, value => {
      updating = true
      capture(binding)
      binding.key = value == null ? null : JSON.stringify([id, value])
      restore(binding)
      updating = false
    }, { immediate: true, flush: 'sync' })
    const stopState = watch(() => Object.values(refs).map(state => JSON.stringify(state.value)), (current, previous) => {
      if (pendingRead && !updating && binding.key !== null) {
        const edits = pendingEdits[binding.key] ??= {}
        Object.entries(refs).forEach(([key, state], index) => {
          if (current[index] !== previous[index]) edits[key] = clone(state.value)
        })
      }
      persist()
    }, { flush: 'sync' })
    const stop = () => {
      capture(binding)
      stopState()
      stopContext()
      bindings.delete(binding)
    }
    return { stop, restored: binding.restored }
  }

  return { setUser, bind, persist }
}
