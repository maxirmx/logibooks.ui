// Copyright (C) 2026 Maxim [maxirmx] Samsonov (http://www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h } from 'vue'
import { afterEach, expect, it, vi } from 'vitest'
import { useRegisterHeaderActions } from '@/helpers/register.actions.js'
import { WBRN_REGISTER_ID } from '@/helpers/company.constants.js'
import { CUSTOMS_PROCEDURE_REIMPORT } from '@/helpers/customs.procedure.helpers.js'
import ActionButton2L from '@/components/ActionButton2L.vue'
import PageAlertRegion from '@/components/PageAlertRegion.vue'
import RegisterHeaderActionsBar from '@/components/RegisterHeaderActionsBar.vue'
import { useAlertStore } from '@/stores/alert.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { useRegistersStore } from '@/stores/registers.store.js'
import { vuetifyStubs } from './helpers/test-utils.js'

vi.mock('@/helpers/config.js', () => ({ apiUrl: '/api', enableLog: false }))
vi.mock('vue-router', async (importOriginal) => ({
  ...await importOriginal(),
  useRouter: () => ({ push: vi.fn() })
}))
vi.mock('vuetify-use-dialog', () => ({ useConfirm: () => vi.fn() }))

let wrapper

afterEach(() => {
  wrapper?.unmount()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it('sends the current reimport register ID and displays an API conflict once', async () => {
  const pinia = createPinia()
  setActivePinia(pinia)
  const auth = useAuthStore()
  auth.user = { id: 1, roles: ['wh-manager'] }
  const registers = useRegistersStore()
  const alerts = useAlertStore()
  const alert = vi.spyOn(alerts, 'error')
  vi.spyOn(registers, 'getDownloadFormats').mockResolvedValue({})
  const message = "Не заполнено или некорректно поле 'Сумма в рублях' для посылки '000Ab'"
  const fetch = vi.fn().mockResolvedValue(globalThis.Response.json({ msg: message, errors: {} }, { status: 409 }))
  vi.stubGlobal('fetch', fetch)
  registers.item = {
    id: 42,
    invoiceNumber: 'TJ-42',
    registerType: WBRN_REGISTER_ID,
    customsProcedureCode: CUSTOMS_PROCEDURE_REIMPORT,
    theOtherCountryCode: 762,
    derivedTotalsPending: true
  }

  wrapper = mount(defineComponent({
    setup() {
      const actions = useRegisterHeaderActions({ registersStore: registers, alertStore: alerts })
      return () => [
        h(RegisterHeaderActionsBar, {
          item: registers.item,
          onDownloadTajikistanManifest: actions.downloadTajikistanManifest
        }),
        h('hr', { class: 'hr' }),
        h(PageAlertRegion)
      ]
    }
  }), {
    global: {
      plugins: [pinia],
      stubs: {
        ...vuetifyStubs,
        VTooltip: { template: '<slot name="activator" :props="{}" />' }
      }
    }
  })
  const documentMenu = wrapper.findAllComponents(ActionButton2L)
    .find(menu => menu.props('tooltipText') === 'Сформировать документы')
  const manifest = () => documentMenu.findAll('[role="menuitem"]')
    .find(option => option.text() === 'манифест для Таджикистана (все)')

  await documentMenu.get('button[aria-haspopup="menu"]').trigger('click')
  expect(manifest()).toBeUndefined()
  expect(fetch).not.toHaveBeenCalled()

  auth.user = { id: 2, roles: ['administrator'] }
  await flushPromises()
  expect(manifest().element.disabled).toBe(true)
  await manifest().trigger('click')
  expect(fetch).not.toHaveBeenCalled()

  registers.item.derivedTotalsPending = false
  await flushPromises()
  expect(manifest().element.disabled).toBe(false)
  await manifest().trigger('click')
  await flushPromises()

  expect(fetch).toHaveBeenCalledExactlyOnceWith(
    '/api/registers/42/download-tajikistan-manifest',
    expect.objectContaining({ method: 'GET' })
  )
  expect(registers.error).toMatchObject({ status: 409, data: { msg: message, errors: {} } })
  expect(alert).toHaveBeenCalledTimes(1)
  const messages = wrapper.findAll('[data-testid="page-alert-region"] [role="alert"]')
  expect(messages).toHaveLength(1)
  expect(messages[0].get('span').text()).toBe(message)
})
