/* @vitest-environment jsdom */

import { beforeEach, describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import PageAlertRegion from '@/components/PageAlertRegion.vue'
import { useAlertStore } from '@/stores/alert.store.js'

describe('PageAlertRegion', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
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
