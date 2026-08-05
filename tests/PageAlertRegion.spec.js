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

  it('renders errors accessibly and dismisses them', async () => {
    const store = useAlertStore()
    store.error('Ошибка загрузки')
    const wrapper = mount(PageAlertRegion)

    expect(wrapper.get('[role="alert"]').text()).toContain('Ошибка загрузки')
    expect(wrapper.get('[role="alert"]').attributes('aria-live')).toBe('assertive')

    await wrapper.get('[aria-label="Закрыть сообщение"]').trigger('click')
    expect(store.alert).toBeNull()
  })

  it('runs retry actions and removes the failed notification', async () => {
    const retry = vi.fn().mockResolvedValue(undefined)
    const store = useAlertStore()
    store.error('Ошибка загрузки', { action: { label: 'Повторить', handler: retry } })
    const wrapper = mount(PageAlertRegion)

    await wrapper.get('.page-alert-region__action').trigger('click')
    await flushPromises()

    expect(retry).toHaveBeenCalledOnce()
    expect(store.alert).toBeNull()
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
