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

})

describe('form error normalization', () => {
  it('maps structured server fields without publishing a duplicate general error', () => {
    const setErrors = vi.fn()
    const alertStore = { error: vi.fn() }
    const error = Object.assign(new Error('Ошибка проверки данных'), {
      data: { msg: 'Некорректные данные запроса', errors: { Name: ['Введите название'], 'Articles[0].Article': 'Введите артикул' } }
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
    const error = {
      data: {
        msg: 'Некорректные данные запроса',
        errors: { Number: ['Обязательное поле'], '': ['Исправьте форму'] }
      }
    }

    reportFormError(error, { setErrors, alertStore, fallback: 'Ошибка сохранения' })

    expect(getServerFieldErrors(error)).toEqual({ number: 'Обязательное поле' })
    expect(alertStore.error).toHaveBeenCalledWith('Исправьте форму', {
      fallback: 'Ошибка сохранения'
    })
  })
})
