// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAlertStore } from '@/stores/alert.store.js'
import { getServerFieldErrors, reportFormError } from '@/helpers/error.helpers.js'

describe('single-position alert store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('keeps normalized errors until they are replaced or dismissed', () => {
    const store = useAlertStore()
    const id = store.error(new Error('bad'))

    expect(store.alert).toMatchObject({
      id,
      severity: 'error',
      message: 'bad',
      timeout: null
    })

    vi.advanceTimersByTime(60000)
    expect(store.alert?.id).toBe(id)
  })

  it('normalizes top-level API message payloads', () => {
    const store = useAlertStore()

    store.error({ msg: 'Ошибка API' })

    expect(store.alert.message).toBe('Ошибка API')
  })

  it('replaces the active alert whenever a new message is published', () => {
    const store = useAlertStore()
    const firstId = store.error('bad')
    const secondId = store.warning('new issue')

    expect(secondId).not.toBe(firstId)
    expect(store.alert).toMatchObject({
      id: secondId,
      severity: 'warning',
      message: 'new issue'
    })
  })

  it('expires success messages and supports pause and resume', () => {
    const store = useAlertStore()
    const id = store.success('ok')

    vi.advanceTimersByTime(2000)
    store.pause(id)
    vi.advanceTimersByTime(10000)
    expect(store.alert?.id).toBe(id)

    store.resume(id)
    vi.advanceTimersByTime(2999)
    expect(store.alert?.id).toBe(id)
    vi.advanceTimersByTime(1)
    expect(store.alert).toBeNull()
  })

  it('ignores a stale dismissal id and supports explicit clearing', () => {
    const store = useAlertStore()
    const firstId = store.error('first')
    const secondId = store.success('second')

    store.dismiss(firstId)
    expect(store.alert).toMatchObject({ id: secondId, message: 'second' })

    store.clear()
    expect(store.alert).toBeNull()
  })

  it('tracks page presenters for the app fallback', () => {
    const store = useAlertStore()
    store.registerPageHost()
    store.registerPageHost()
    expect(store.activePageHosts).toBe(2)

    store.unregisterPageHost()
    store.unregisterPageHost()
    store.unregisterPageHost()
    expect(store.activePageHosts).toBe(0)
  })
})

describe('form error normalization', () => {
  it('maps structured server fields without publishing a duplicate general error', () => {
    const setErrors = vi.fn()
    const alertStore = { error: vi.fn() }
    const error = Object.assign(new Error('Ошибка проверки данных'), {
      data: { errors: { Name: ['Введите название'], 'Articles[0].Article': 'Введите артикул' } }
    })

    expect(reportFormError(error, { setErrors, alertStore })).toBe(true)
    expect(setErrors).toHaveBeenCalledWith({
      name: 'Введите название',
      'articles[0].article': 'Введите артикул'
    })
    expect(alertStore.error).not.toHaveBeenCalled()
  })

  it('keeps a general server error in the page notification region', () => {
    const setErrors = vi.fn()
    const alertStore = { error: vi.fn() }
    const error = { data: { msg: 'Исправьте форму', errors: { Number: ['Обязательное поле'] } } }

    reportFormError(error, { setErrors, alertStore, fallback: 'Ошибка сохранения' })

    expect(getServerFieldErrors(error)).toEqual({ number: 'Обязательное поле' })
    expect(alertStore.error).toHaveBeenCalledWith('Исправьте форму', {
      fallback: 'Ошибка сохранения'
    })
  })
})
