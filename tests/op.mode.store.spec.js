// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createApp } from 'vue'
import { nextTick } from 'vue'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { useOpModeStore, OP_MODE_PAPERWORK, OP_MODE_WAREHOUSE } from '@/stores/op.mode.store.js'
import { createLocalStorageMock } from './helpers/test-utils.js'

describe('op mode store', () => {
  const originalLocalStorage = global.localStorage
  let app

  beforeEach(() => {
    global.localStorage = createLocalStorageMock()
    globalThis.localStorage = global.localStorage
    globalThis.window = { localStorage: global.localStorage }
    app = createApp({})
    const pinia = createPinia()
    pinia.use(piniaPluginPersistedstate)
    app.use(pinia)
    setActivePinia(pinia)
    localStorage.clear()
  })

  afterEach(() => {
    global.localStorage = originalLocalStorage
    delete globalThis.localStorage
    delete globalThis.window
  })

  it('defaults to paperwork mode with label', () => {
    const store = useOpModeStore()
    expect(store.globalOpMode).toBe(OP_MODE_PAPERWORK)
    expect(store.modeLabel).toBe('Режим "Оформление"')
  })

  it('toggles between paperwork and warehouse', () => {
    const store = useOpModeStore()
    store.toggleMode()
    expect(store.globalOpMode).toBe(OP_MODE_WAREHOUSE)
    expect(store.modeLabel).toBe('Режим "Склад"')
    store.toggleMode()
    expect(store.globalOpMode).toBe(OP_MODE_PAPERWORK)
  })

  it('ignores invalid modes', () => {
    const store = useOpModeStore()
    store.setMode('invalid-mode')
    expect(store.globalOpMode).toBe(OP_MODE_PAPERWORK)
  })

  it('persists the selected mode to localStorage', async () => {
    const store = useOpModeStore()
    store.setMode(OP_MODE_WAREHOUSE)
    store.$persist?.()
    await nextTick()

    const savedValue = localStorage.getItem('logibooks-global-op-mode')
    expect(savedValue).not.toBeNull()
    expect(savedValue).toContain(OP_MODE_WAREHOUSE)
  })

  it('rehydrates persisted mode on store creation', () => {
    localStorage.setItem(
      'logibooks-global-op-mode',
      JSON.stringify({ globalOpMode: OP_MODE_WAREHOUSE })
    )

    app = createApp({})
    const pinia = createPinia()
    pinia.use(piniaPluginPersistedstate)
    app.use(pinia)
    setActivePinia(pinia)

    const store = useOpModeStore()
    store.$hydrate?.()
    expect(store.globalOpMode).toBe(OP_MODE_WAREHOUSE)
    expect(store.modeLabel).toBe('Режим "Склад"')
  })

  it('returns correct isWarehouseMode for paperwork mode', () => {
    const store = useOpModeStore()
    store.setMode(OP_MODE_PAPERWORK)
    expect(store.isWarehouseMode).toBe(false)
  })

  it('returns correct isWarehouseMode for warehouse mode', () => {
    const store = useOpModeStore()
    store.setMode(OP_MODE_WAREHOUSE)
    expect(store.isWarehouseMode).toBe(true)
  })

  it('returns correct registerNouns for paperwork mode', () => {
    const store = useOpModeStore()
    store.setMode(OP_MODE_PAPERWORK)
    const nouns = store.registerNouns
    expect(nouns.singular).toBe('Реестр')
    expect(nouns.plural).toBe('Реестры')
    expect(nouns.genitivePlural).toBe('реестров')
    expect(nouns.genitivePluralCapitalized).toBe('Реестров')
    expect(nouns.accusative).toBe('реестр')
    expect(nouns.prepositional).toBe('реестре')
    expect(nouns.genitiveSingular).toBe('реестра')
  })

  it('returns correct registerNouns for warehouse mode', () => {
    const store = useOpModeStore()
    store.setMode(OP_MODE_WAREHOUSE)
    const nouns = store.registerNouns
    expect(nouns.singular).toBe('Партия')
    expect(nouns.plural).toBe('Партии')
    expect(nouns.genitivePlural).toBe('партий')
    expect(nouns.genitivePluralCapitalized).toBe('Партий')
    expect(nouns.accusative).toBe('партию')
    expect(nouns.prepositional).toBe('партии')
    expect(nouns.genitiveSingular).toBe('партии')
  })

  it('setMode accepts valid paperwork mode', () => {
    const store = useOpModeStore()
    store.setMode(OP_MODE_WAREHOUSE)
    expect(store.globalOpMode).toBe(OP_MODE_WAREHOUSE)
    store.setMode(OP_MODE_PAPERWORK)
    expect(store.globalOpMode).toBe(OP_MODE_PAPERWORK)
  })

  it('setMode accepts valid warehouse mode', () => {
    const store = useOpModeStore()
    expect(store.globalOpMode).toBe(OP_MODE_PAPERWORK)
    store.setMode(OP_MODE_WAREHOUSE)
    expect(store.globalOpMode).toBe(OP_MODE_WAREHOUSE)
  })
})
