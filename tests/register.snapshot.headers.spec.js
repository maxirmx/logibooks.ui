// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, defineComponent, reactive, ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import RegisterHeaderActionsBar from '@/components/RegisterHeaderActionsBar.vue'
import RegisterWhHeaderActionBar from '@/components/RegisterWhHeaderActionBar.vue'
import RegisterHeadingWithStats from '@/components/RegisterHeadingWithStats.vue'
import CorrectedWeightDisplay from '@/components/CorrectedWeightDisplay.vue'
import PageAlertRegion from '@/components/PageAlertRegion.vue'
import { useRegistersStore } from '@/stores/registers.store.js'
import { useParcelsStore } from '@/stores/parcels.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'

const router = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock('@/router', () => ({ default: router }))
vi.mock('vue-router', () => ({ useRouter: () => router }))
vi.mock('vuetify-use-dialog', () => ({ useConfirm: () => vi.fn().mockResolvedValue(true) }))
vi.mock('@/helpers/config.js', () => ({ apiUrl: '/api' }))
vi.mock('@/helpers/fetch.wrapper.js', () => ({ fetchWrapper: { get: vi.fn(), post: vi.fn() } }))

const wrappers = []
let registers, parcels, alerts, serverRegister, serverParcel
const exportButton = wrapper => wrapper.get('button[aria-label="Экспортировать реестр"]')

function open(warehouse) {
  const wrapper = mount(defineComponent({
    components: { RegisterActions: warehouse ? RegisterWhHeaderActionBar : RegisterHeaderActionsBar, PageAlertRegion, CorrectedWeightDisplay },
    setup() {
      const controls = reactive({ disabled: false, loading: false })
      const headerProps = computed(() => ({ [warehouse ? 'register' : 'item']: registers.item, ...controls }))
      return { headerProps, controls, parcels, draft: ref('Исходный фильтр') }
    },
    template: '<div><h1>Посылки</h1><hr class="hr"><PageAlertRegion /><input aria-label="Фильтр" v-model="draft"><RegisterActions v-bind="headerProps" /><CorrectedWeightDisplay v-for="parcel in parcels.items" :key="parcel.id" :weight="parcel.weightKg" :adjusted-weight="parcel.adjustedWeightKg" :derived-totals-pending="parcel.derivedTotalsPending" /></div>'
  }), {
    global: { stubs: {
      'font-awesome-icon': true,
      ActionButton: {
        props: ['tooltipText', 'disabled'], emits: ['click'],
        template: '<button type="button" :aria-label="tooltipText" :disabled="disabled" @click="$emit(\'click\')" />'
      },
      ActionButton2L: {
        props: ['tooltipText', 'disabled', 'options'],
        template: '<div><button :aria-label="tooltipText" :disabled="disabled" /><button v-for="option in options" :key="option.label" :aria-label="option.label" :disabled="disabled || option.disabled" /></div>'
      }
    } }
  })
  wrappers.push(wrapper)
  return wrapper
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  setActivePinia(createPinia())
  useAuthStore().user = { roles: ['administrator'] }
  registers = useRegistersStore()
  parcels = useParcelsStore()
  alerts = useAlertStore()
  serverRegister = { id: 12, customsProcedureCode: 10, derivedTotalsPending: false }
  serverParcel = { id: 1, registerId: 12, statusId: 1, weightKg: 1, adjustedWeightKg: 1 }
  registers.item = { ...serverRegister }
  registers.items = [{ ...serverRegister }]
  fetchWrapper.get.mockImplementation(async url => {
    if (url === '/api/registers/12') return { ...serverRegister }
    if (url.includes('/parcels?') || url.includes('/parcels/a?')) {
      return { items: [{ ...serverParcel, derivedTotalsPending: serverRegister.derivedTotalsPending }], pagination: {} }
    }
    throw new Error(`Unexpected GET ${url}`)
  })
  fetchWrapper.post.mockImplementation(async () => {
    serverParcel.statusId = 2
    serverRegister.derivedTotalsPending = true
    return { updatedCount: 1, skippedCount: 0 }
  })
})
afterEach(() => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  vi.restoreAllMocks()
})

it.each([null, 0, 7])('shows saved place count %s while a register is pending', async placesTotal => {
  registers.item = { ...serverRegister, parcelsTotal: 3, placesTotal, derivedTotalsPending: true }
  vi.spyOn(registers, 'getById').mockResolvedValue(undefined)
  const wrapper = mount(RegisterHeadingWithStats, {
    props: { registerId: 12, register: registers.item, heading: 'Посылки реестра' },
    global: { stubs: {
      'v-tooltip': { template: '<section><slot name="activator" :props="{}" /><slot /></section>' }
    } }
  })
  wrappers.push(wrapper)
  await flushPromises()
  expect(wrapper.text()).toContain(`Всего посылок: ${placesTotal ?? 0}`)
  expect(wrapper.text()).not.toContain('пересчитываются')
})

describe.each([false, true])('saved register snapshots in warehouse mode %s', warehouse => {
  it.each([[false, false], [true, false], [false, true], [true, true]])(
    'preserves the pre-refresh spinner for loading=%s independently of pending=%s', async (loading, pending) => {
      registers.item.derivedTotalsPending = pending
      const wrapper = open(warehouse)
      wrapper.vm.controls.loading = loading
      await flushPromises()
      expect(wrapper.findAll('.spinner-border')).toHaveLength(loading ? 1 : 0)
      expect(wrapper.find('button[aria-label="Обновить итоги"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="register-totals-actions"]').exists()).toBe(false)
      if (loading) {
        const group = wrapper.get('.spinner-border').element.parentElement
        expect(group.className).toBe('header-actions header-actions-group')
        expect(wrapper.get('.header-actions-bar').element.firstElementChild).toBe(group)
        expect(group.querySelector('button')).toBeNull()
      }
      wrapper.vm.controls.loading = false
      await flushPromises()
      expect(wrapper.find('.spinner-border').exists()).toBe(false)
      expect(alerts.alert).toBeNull()
    })

  it('keeps corrected output guarded while showing the current page without refresh controls', async () => {
    registers.item.derivedTotalsPending = true
    const wrapper = open(warehouse)
    expect(exportButton(wrapper).element.disabled).toBe(true)
    expect(wrapper.find('.spinner-border').exists()).toBe(false)
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(fetchWrapper.get).not.toHaveBeenCalled()
  })

  it.each([0, .625])('reloads ready adjusted weights (%s) once after a completed mutation', async weight => {
    const auth = useAuthStore()
    if (warehouse) auth.parcels_wh_page = 3
    else auth.parcels_page = 3
    await parcels.getAll(12, { showMarkedByPartner: warehouse, boxId: 17 })
    const wrapper = open(warehouse)
    await wrapper.get('input').setValue('Сохранённый фильтр')
    fetchWrapper.post.mockImplementationOnce(async () => {
      serverParcel.statusId = 2
      serverParcel.adjustedWeightKg = weight
      return { updatedCount: 1, skippedCount: 0 }
    })
    await parcels.updateStatusSelection(12, 2, [1])
    await flushPromises()
    expect(parcels.items[0].adjustedWeightKg).toBe(weight)
    expect(wrapper.get('.corrected-weight-display').text()).toContain(weight.toFixed(3))
    expect(wrapper.get('input').element.value).toBe('Сохранённый фильтр')
    expect(exportButton(wrapper).element.disabled).toBe(false)
    const url = fetchWrapper.get.mock.calls.filter(([url]) => url.includes('/parcels?') || url.includes('/parcels/a?')).at(-1)[0]
    expect(url).toContain('page=3')
    expect(url).toContain('boxId=17')
    expect(fetchWrapper.post).toHaveBeenCalledOnce()
    expect(router.push).not.toHaveBeenCalled()
  })
})
