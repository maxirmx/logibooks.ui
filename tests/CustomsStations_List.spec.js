/* @vitest-environment jsdom */
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import CustomsStationsList from '@/lists/CustomsStations_List.vue'
import { defaultGlobalStubs, resolveAll } from './helpers/test-utils.js'

const stations = ref([
  {
    id: 1,
    number: '00102030',
    name: 'Центральный пост',
    countryIsoNumeric: 643,
    postalCode: '101000',
    city: 'Москва',
    street: 'ул. Таможенная'
  }
])
const loading = ref(false)
const alert = ref(null)
const runningStore = {
  customsStations: stations,
  loading,
  getAll: vi.fn().mockResolvedValue(),
  remove: vi.fn().mockResolvedValue()
}
const ensureLoaded = vi.hoisted(() => vi.fn())
const countriesStore = {
  ensureLoaded,
  getCountryShortName: vi.fn((code) => code === 643 ? 'Россия' : code)
}
const alertError = vi.hoisted(() => vi.fn())
const alertClear = vi.hoisted(() => vi.fn())
const alertStore = { alert, error: alertError, clear: alertClear }
const authStore = {
  isSrLogistPlus: true,
  customsstations_per_page: 100,
  customsstations_search: '',
  customsstations_sort_by: ['id'],
  customsstations_page: 1
}
const confirm = vi.hoisted(() => vi.fn().mockResolvedValue(true))
const push = vi.hoisted(() => vi.fn())

vi.mock('pinia', () => ({
  storeToRefs: (store) => {
    if (store === runningStore) return { customsStations: stations, loading }
    if (store === alertStore) return { alert }
    return {}
  }
}))

vi.mock('@/stores/customs.stations.store.js', () => ({
  useCustomsStationsStore: () => runningStore
}))
vi.mock('@/stores/countries.store.js', () => ({
  useCountriesStore: () => countriesStore
}))
vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => alertStore
}))
vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => authStore
}))
vi.mock('vuetify-use-dialog', () => ({
  useConfirm: () => confirm
}))
vi.mock('@/router', () => ({
  default: { push }
}))
vi.mock('@mdi/js', () => ({
  mdiMagnify: 'mdi-magnify'
}))
vi.mock('@/helpers/items.per.page.js', () => ({
  itemsPerPageOptions: [10, 25, 50, 100]
}))
vi.mock('@/components/ActionButton.vue', () => ({
  default: {
    name: 'ActionButton',
    props: ['item', 'icon', 'tooltipText', 'disabled', 'iconSize'],
    emits: ['click'],
    template: '<button class="action-button" :title="tooltipText" @click="$emit(\'click\', item)" />'
  }
}))

async function mountList() {
  const wrapper = mount(CustomsStationsList, {
    global: { stubs: defaultGlobalStubs }
  })
  await resolveAll()
  return wrapper
}

beforeEach(() => {
  stations.value = [{
    id: 1,
    number: '00102030',
    name: 'Центральный пост',
    countryIsoNumeric: 643,
    postalCode: '101000',
    city: 'Москва',
    street: 'ул. Таможенная'
  }]
  loading.value = false
  alert.value = null
  authStore.isSrLogistPlus = true
  authStore.customsstations_search = ''
  vi.clearAllMocks()
  runningStore.getAll.mockResolvedValue()
  runningStore.remove.mockResolvedValue()
  confirm.mockResolvedValue(true)
})

describe('CustomsStations_List.vue', () => {
  it('loads stations and countries and renders columns', async () => {
    const wrapper = await mountList()

    expect(runningStore.getAll).toHaveBeenCalled()
    expect(ensureLoaded).toHaveBeenCalled()
    expect(wrapper.text()).toContain('Таможенные посты')
    expect(wrapper.text()).toContain('Код поста')
    expect(wrapper.text()).toContain('Название')
    expect(wrapper.text()).toContain('Страна')
    expect(wrapper.text()).toContain('Город')
    expect(wrapper.text()).toContain('00102030')
    expect(wrapper.text()).toContain('Центральный пост')
    expect(wrapper.text()).toContain('Россия')
  })

  it('filters all station and address fields case-insensitively', async () => {
    const wrapper = await mountList()
    const item = { raw: stations.value[0] }

    for (const query of ['00102', 'центральный', '101000', 'МОСКВА', 'таможенная', 'россия']) {
      expect(wrapper.vm.filterCustomsStations(null, query, item)).toBe(true)
    }
    expect(wrapper.vm.filterCustomsStations(null, 'отсутствует', item)).toBe(false)
    expect(wrapper.vm.filterCustomsStations(null, null, item)).toBe(false)
    expect(wrapper.vm.filterCustomsStations(null, 'x', null)).toBe(false)
    expect(wrapper.vm.filterCustomsStations(null, 'x', { raw: null })).toBe(false)
  })

  it('filters safely when optional address fields are null', async () => {
    const wrapper = await mountList()
    const item = {
      raw: {
        ...stations.value[0],
        postalCode: null,
        city: undefined,
        street: null
      }
    }

    expect(wrapper.vm.filterCustomsStations(null, '00102', item)).toBe(true)
    expect(wrapper.vm.filterCustomsStations(null, 'missing', item)).toBe(false)
  })

  it('navigates to create and edit views', async () => {
    const wrapper = await mountList()

    wrapper.vm.openCreateDialog()
    wrapper.vm.openEditDialog(stations.value[0])

    expect(push).toHaveBeenNthCalledWith(1, '/customsstation/create')
    expect(push).toHaveBeenNthCalledWith(2, '/customsstation/edit/1')
  })

  it('dispatches create, edit, and delete from rendered action buttons', async () => {
    const wrapper = await mountList()
    const buttons = wrapper.findAll('.action-button')

    await buttons[0].trigger('click')
    await buttons[1].trigger('click')
    await buttons[2].trigger('click')
    await resolveAll()

    expect(push).toHaveBeenCalledWith('/customsstation/create')
    expect(push).toHaveBeenCalledWith('/customsstation/edit/1')
    expect(runningStore.remove).toHaveBeenCalledWith(1)
  })

  it('updates persisted list state through rendered v-model controls', async () => {
    const wrapper = await mountList()
    const search = wrapper.find('[data-testid="v-text-field"] input')
    const table = wrapper.findComponent(defaultGlobalStubs['v-data-table'])

    await search.setValue('Москва')
    table.vm.$emit('update:itemsPerPage', 25)
    table.vm.$emit('update:page', 3)
    table.vm.$emit('update:sortBy', [{ key: 'number', order: 'asc' }])
    await resolveAll()

    expect(authStore.customsstations_search).toBe('Москва')
    expect(authStore.customsstations_per_page).toBe(25)
    expect(authStore.customsstations_page).toBe(3)
    expect(authStore.customsstations_sort_by).toEqual([{ key: 'number', order: 'asc' }])
  })

  it('deletes after confirmation', async () => {
    const wrapper = await mountList()

    await wrapper.vm.deleteCustomsStation(stations.value[0])

    expect(confirm).toHaveBeenCalledWith(expect.objectContaining({
      content: 'Удалить таможенный пост "Центральный пост"?'
    }))
    expect(runningStore.remove).toHaveBeenCalledWith(1)
  })

  it('does not delete when confirmation is declined', async () => {
    confirm.mockResolvedValueOnce(false)
    const wrapper = await mountList()

    await wrapper.vm.deleteCustomsStation(stations.value[0])

    expect(runningStore.remove).not.toHaveBeenCalled()
  })

  it('reports deletion failures and releases the running guard', async () => {
    runningStore.remove.mockRejectedValueOnce(new Error('failed'))
    const wrapper = await mountList()

    await wrapper.vm.deleteCustomsStation(stations.value[0])
    await wrapper.vm.deleteCustomsStation(stations.value[0])

    expect(alertError).toHaveBeenCalledWith('Ошибка при удалении таможенного поста')
    expect(confirm).toHaveBeenCalledTimes(2)
  })

  it('ignores a duplicate deletion while another action is running', async () => {
    let resolveConfirmation
    confirm.mockReturnValueOnce(new Promise((resolve) => {
      resolveConfirmation = resolve
    }))
    const wrapper = await mountList()

    const first = wrapper.vm.deleteCustomsStation(stations.value[0])
    await resolveAll()
    await wrapper.vm.deleteCustomsStation(stations.value[0])
    resolveConfirmation(false)
    await first

    expect(confirm).toHaveBeenCalledTimes(1)
  })

  it('hides mutation actions for users below senior logist', async () => {
    authStore.isSrLogistPlus = false
    const wrapper = await mountList()

    expect(wrapper.findAll('.action-button')).toHaveLength(0)
    expect(wrapper.text()).not.toContain('actions')
  })

  it('shows and clears alerts', async () => {
    alert.value = { type: 'alert-danger', message: 'Ошибка' }
    const wrapper = await mountList()

    expect(wrapper.text()).toContain('Ошибка')
    await wrapper.find('button.close').trigger('click')
    expect(alertClear).toHaveBeenCalled()
  })
})
