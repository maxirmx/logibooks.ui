/* @vitest-environment jsdom */
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, expect, it, vi } from 'vitest'
import { focusFirstInvalidField } from '@/helpers/form.validation.helpers.js'

describe('focusFirstInvalidField', () => {
  it('focuses the control inside a compound-field validation container', async () => {
    const container = document.createElement('div')
    container.dataset.field = 'scopes'
    const input = document.createElement('input')
    input.name = 'scopes[0].countryIsoNumeric'
    container.append(input)
    document.body.append(container)

    const scrollIntoView = vi.fn()
    input.scrollIntoView = scrollIntoView
    const focus = vi.spyOn(input, 'focus')

    await focusFirstInvalidField({ errors: { scopes: 'Выберите страну' } })

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' })
    expect(focus).toHaveBeenCalledWith({ preventScroll: true })
    expect(document.activeElement).toBe(input)

    container.remove()
  })

  it('does nothing when validation produced no field errors', async () => {
    await expect(focusFirstInvalidField({ errors: {} })).resolves.toBeUndefined()
  })
})
