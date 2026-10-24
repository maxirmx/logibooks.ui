// Copyright (C) 2026 Maxim [maxirmx] Samsonov (http://www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

/* @vitest-environment jsdom */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import PageAlertRegion from '@/components/PageAlertRegion.vue'
import { useAlertStore } from '@/stores/alert.store.js'

describe('PageAlertRegion', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('shows messages and dismissal only, even when a caller supplies a recovery action', async () => {
    const handler = vi.fn()
    const store = useAlertStore()
    store.error('Не удалось загрузить данные', { action: { label: 'Повторить', handler } })
    expect(store.alert).not.toHaveProperty('action')
    const page = mount(PageAlertRegion)
    expect(page.get('[role="alert"]').text()).toContain('Не удалось загрузить данные')
    expect(page.text()).not.toContain('Повторить')
    expect(page.findAll('button')).toHaveLength(1)
    await page.get('button[aria-label="Закрыть сообщение"]').trigger('click')
    expect(handler).not.toHaveBeenCalled()
    expect(page.find('[role="alert"]').exists()).toBe(false)
    page.unmount()
  })

  it('hides the app fallback while a page presenter is mounted', async () => {
    const store = useAlertStore()
    store.error('Ошибка')
    const fallback = mount(PageAlertRegion, { props: { fallback: true } })
    const page = mount(PageAlertRegion)
    await flushPromises()

    expect(fallback.find('[data-testid="page-alert-region"]').exists()).toBe(false)
    expect(page.find('[data-testid="page-alert-region"]').exists()).toBe(true)

    page.unmount()
    await flushPromises()
    expect(fallback.find('[data-testid="page-alert-region"]').exists()).toBe(true)
  })
})
